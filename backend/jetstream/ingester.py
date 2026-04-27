from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlencode

import websockets

from .docsearch_api import DocsearchApi

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JetstreamConfig:
    collection: str
    docsearch_base_url: str
    docsearch_api_key: str | None = None
    endpoint: str = "wss://jetstream2.us-west.bsky.network/subscribe"
    wanted_dids: list[str] = field(default_factory=list)
    cursor: int | None = None
    max_message_size_bytes: int = 0
    reconnect_min_seconds: float = 1.0
    reconnect_max_seconds: float = 60.0


class JetstreamDocsearchIngester:
    def __init__(self, config: JetstreamConfig) -> None:
        self.config = config
        self.api = DocsearchApi(
            base_url=config.docsearch_base_url,
            api_key=config.docsearch_api_key,
        )
        self.cursor = config.cursor

    async def run_forever(self) -> None:
        delay = self.config.reconnect_min_seconds
        while True:
            try:
                await self._run_once()
                delay = self.config.reconnect_min_seconds
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Jetstream connection failed; reconnecting in %.1fs", delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, self.config.reconnect_max_seconds)

    async def _run_once(self) -> None:
        url = self._subscribe_url()
        max_size = self.config.max_message_size_bytes or None
        logger.info("Connecting to Jetstream for %s", self.config.collection)
        async with websockets.connect(url, max_size=max_size) as websocket:
            logger.info("Connected to Jetstream")
            async for raw_message in websocket:
                await self.handle_message(raw_message)

    async def handle_message(self, raw_message: str | bytes) -> None:
        event = json.loads(raw_message)
        if event.get("kind") != "commit":
            return

        commit = event.get("commit") or {}
        if commit.get("collection") != self.config.collection:
            return

        operation = commit.get("operation")
        did = event.get("did")
        rkey = commit.get("rkey")
        if not did or not rkey:
            logger.warning("Skipping commit without did/rkey: %s", event)
            return

        at_uri = f"at://{did}/{self.config.collection}/{rkey}"
        if operation in {"create", "update"}:
            record = commit.get("record")
            if not isinstance(record, dict):
                logger.warning("Skipping %s without record: %s", operation, at_uri)
                return
            await asyncio.to_thread(self.api.upsert_document, at_uri, record)
            logger.info("Upserted %s", at_uri)
        elif operation == "delete":
            deleted = await asyncio.to_thread(self.api.delete_document_by_url, at_uri)
            if deleted:
                logger.info("Deleted %s", at_uri)
            else:
                logger.info("Delete ignored for missing document %s", at_uri)
        else:
            logger.debug("Skipping unsupported operation %r for %s", operation, at_uri)
            return

        time_us = event.get("time_us")
        if isinstance(time_us, int):
            self.cursor = time_us

    def _subscribe_url(self) -> str:
        params: list[tuple[str, str]] = [("wantedCollections", self.config.collection)]
        for did in self.config.wanted_dids:
            params.append(("wantedDids", did))
        if self.cursor is not None:
            params.append(("cursor", str(self.cursor)))
        if self.config.max_message_size_bytes:
            params.append(("maxMessageSizeBytes", str(self.config.max_message_size_bytes)))

        separator = "&" if "?" in self.config.endpoint else "?"
        return f"{self.config.endpoint}{separator}{urlencode(params)}"
