from __future__ import annotations

import argparse
import asyncio
import logging
import os
import signal
import subprocess
import sys
from pathlib import Path


def run_deployment_cli(
    *,
    deployment_name: str,
    collection: str,
    module_name: str,
    default_base_url: str = "http://localhost:8000",
) -> None:
    parser = argparse.ArgumentParser(description=f"Manage the {deployment_name} Jetstream ingester")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run the ingester in the foreground")
    add_ingester_args(run_parser, default_base_url)

    start_parser = subparsers.add_parser("start", help="Start the ingester in the background")
    add_ingester_args(start_parser, default_base_url)
    start_parser.add_argument("--pid-file", default=f".jetstream-{deployment_name}.pid")
    start_parser.add_argument("--log-file", default=f".jetstream-{deployment_name}.log")

    stop_parser = subparsers.add_parser("stop", help="Stop the background ingester")
    stop_parser.add_argument("--pid-file", default=f".jetstream-{deployment_name}.pid")

    status_parser = subparsers.add_parser("status", help="Check whether the background ingester is running")
    status_parser.add_argument("--pid-file", default=f".jetstream-{deployment_name}.pid")

    args = parser.parse_args()
    if args.command == "run":
        asyncio.run(run_ingester(args, collection))
    elif args.command == "start":
        start_ingester(args, module_name)
    elif args.command == "stop":
        stop_ingester(Path(args.pid_file))
    elif args.command == "status":
        show_status(Path(args.pid_file))


def add_ingester_args(parser: argparse.ArgumentParser, default_base_url: str) -> None:
    parser.add_argument("--base-url", default=os.environ.get("DOCSEARCH_BASE_URL", default_base_url))
    parser.add_argument("--api-key", default=os.environ.get("DOCSEARCH_API_KEY"))
    parser.add_argument(
        "--endpoint",
        default=os.environ.get("JETSTREAM_ENDPOINT", "wss://jetstream2.us-west.bsky.network/subscribe"),
    )
    parser.add_argument("--wanted-did", action="append", default=[], dest="wanted_dids")
    parser.add_argument("--cursor", type=int, default=None)
    parser.add_argument("--max-message-size-bytes", type=int, default=0)
    parser.add_argument("--log-level", default=os.environ.get("LOG_LEVEL", "INFO"))


async def run_ingester(args: argparse.Namespace, collection: str) -> None:
    from .ingester import JetstreamConfig, JetstreamDocsearchIngester

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = JetstreamConfig(
        collection=collection,
        docsearch_base_url=args.base_url,
        docsearch_api_key=args.api_key,
        endpoint=args.endpoint,
        wanted_dids=args.wanted_dids,
        cursor=args.cursor,
        max_message_size_bytes=args.max_message_size_bytes,
    )
    await JetstreamDocsearchIngester(config).run_forever()


def start_ingester(args: argparse.Namespace, module_name: str) -> None:
    pid_file = Path(args.pid_file)
    if read_running_pid(pid_file) is not None:
        raise SystemExit(f"Ingester already running: {pid_file}")

    command = [sys.executable, "-m", module_name, "run"]
    for option in (
        "base_url",
        "endpoint",
        "cursor",
        "max_message_size_bytes",
        "log_level",
    ):
        value = getattr(args, option)
        if value not in (None, "", 0):
            command.extend([f"--{option.replace('_', '-')}", str(value)])
    for did in args.wanted_dids:
        command.extend(["--wanted-did", did])
    env = os.environ.copy()
    if args.api_key:
        env["DOCSEARCH_API_KEY"] = args.api_key

    log_path = Path(args.log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab") as log:
        process = subprocess.Popen(
            command,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            env=env,
        )
    pid_file.write_text(f"{process.pid}\n")
    print(f"Started ingester pid={process.pid} log={log_path}")


def stop_ingester(pid_file: Path) -> None:
    pid = read_pid(pid_file)
    if pid is None:
        raise SystemExit(f"No pid file found: {pid_file}")
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pid_file.unlink(missing_ok=True)
        print(f"Removed stale pid file: {pid_file}")
        return
    pid_file.unlink(missing_ok=True)
    print(f"Stopped ingester pid={pid}")


def show_status(pid_file: Path) -> None:
    pid = read_running_pid(pid_file)
    if pid is None:
        print("stopped")
    else:
        print(f"running pid={pid}")


def read_pid(pid_file: Path) -> int | None:
    try:
        return int(pid_file.read_text().strip())
    except (FileNotFoundError, ValueError):
        return None


def read_running_pid(pid_file: Path) -> int | None:
    pid = read_pid(pid_file)
    if pid is None:
        return None
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return None
    return pid
