from __future__ import annotations

import asyncio
import logging
import os

from jsonargparse import CLI

JETSTREAM_ENDPOINT = "wss://jetstream2.us-west.bsky.network/subscribe"


def run(
    collection: str,
    base_url: str,
    api_key: str | None = None,
    endpoint: str = JETSTREAM_ENDPOINT,
    cursor: int | None = None,
    max_message_size_bytes: int = 0,
    log_level: str = "INFO",
) -> None:
    """Run the Jetstream ingester in the foreground."""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    from .ingester import JetstreamConfig, JetstreamDocsearchIngester

    config = JetstreamConfig(
        collection=collection,
        docsearch_base_url=base_url,
        docsearch_api_key=api_key or os.environ.get("DOCSEARCH_API_KEY"),
        endpoint=endpoint,
        cursor=cursor,
        max_message_size_bytes=max_message_size_bytes,
    )
    asyncio.run(JetstreamDocsearchIngester(config).run_forever())


if __name__ == "__main__":
    CLI(run)
