from collections.abc import AsyncGenerator
from hmac import compare_digest
import os

from fastapi import Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncConnection

from ..core.embedder import Embedder
from ..core.registry import Registry


async def get_conn(request: Request) -> AsyncGenerator[AsyncConnection, None]:
    async with request.app.state.engine.begin() as conn:
        yield conn


def get_registry(request: Request) -> Registry:
    return request.app.state.registry


def get_embedder(request: Request) -> Embedder:
    return request.app.state.embedder


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _matches(token: str | None, expected: str | None) -> bool:
    return bool(token and expected and compare_digest(token, expected))


async def require_api_key(authorization: str | None = Header(default=None)) -> None:
    api_key = os.environ.get("DOCSEARCH_API_KEY")
    admin_key = os.environ.get("DOCSEARCH_ADMIN_KEY")
    if not api_key and not admin_key:
        return

    token = _bearer_token(authorization)
    if not (_matches(token, api_key) or _matches(token, admin_key)):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def require_admin_key(authorization: str | None = Header(default=None)) -> None:
    api_key = os.environ.get("DOCSEARCH_API_KEY")
    admin_key = os.environ.get("DOCSEARCH_ADMIN_KEY")
    if not api_key and not admin_key:
        return
    if not admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = _bearer_token(authorization)
    if not _matches(token, admin_key):
        raise HTTPException(status_code=401, detail="Unauthorized")
