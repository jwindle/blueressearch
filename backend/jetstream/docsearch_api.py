from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DocsearchApi:
    base_url: str
    api_key: str | None = None
    timeout: float = 30.0

    def _request(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        req = urllib.request.Request(
            f"{self.base_url.rstrip('/')}{path}",
            data=data,
            headers=headers,
            method=method,
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as response:
            raw = response.read()
        return json.loads(raw) if raw else {}

    def upsert_document(self, url: str, data: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/documents", {"url": url, "data": data})

    def delete_document_by_url(self, url: str) -> bool:
        query = urllib.parse.urlencode({"url": url})
        try:
            self._request("DELETE", f"/documents?{query}")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return False
            raise
        return True

