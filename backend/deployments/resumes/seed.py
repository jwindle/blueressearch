#!/usr/bin/env python3
"""Seed the resumes deployment: init DB, define searchable fields, load documents.

Usage (from backend/):
    DATABASE_URL=... uvicorn deployments.resumes.main_sentence_transformers:app --port 8001 &
    python -m deployments.resumes.seed                                # init + fields only
    python -m deployments.resumes.seed example_data/resumes.json     # init + fields + data
    python -m deployments.resumes.seed example_data/resumes.json --base-url http://localhost:8001
"""

import argparse
import json
import os
import sys
import urllib.request

SEARCHABLE_FIELDS = [
    {"name": "lastModified", "json_path": "meta.lastModified", "field_type": "string", "index_type": "btree"},
    {"name": "title",        "json_path": "meta.title",        "field_type": "string", "index_type": "trgm"},
    {"name": "label",        "json_path": "basics.label",      "field_type": "string", "index_type": "trgm"},
    {"name": "name",         "json_path": "basics.name",       "field_type": "string", "index_type": "trgm"},
]


def post(url: str, body: dict, api_key: str | None = None) -> dict:
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the resumes deployment")
    parser.add_argument("data_file", nargs="?", help="Path to resumes JSON file (omit to skip loading data)")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    api_key = os.environ.get("DOCSEARCH_API_KEY")
    admin_key = os.environ.get("DOCSEARCH_ADMIN_KEY")

    print("Initializing database...", file=sys.stderr)
    post(f"{base}/admin/init", {}, admin_key)
    print("  done", file=sys.stderr)

    print("Registering searchable fields...", file=sys.stderr)
    for field in SEARCHABLE_FIELDS:
        post(f"{base}/admin/searchable-fields", field, admin_key)
        print(f"  {field['name']}", file=sys.stderr)

    if args.data_file:
        with open(args.data_file) as f:
            documents = json.load(f)
        print(f"Loading {len(documents)} document(s)...", file=sys.stderr)
        for doc in documents:
            result = post(f"{base}/documents", doc, api_key)
            name = doc.get("data", {}).get("basics", {}).get("name", result["id"])
            print(f"  {result['id']}  {name}", file=sys.stderr)
    else:
        print("No data file provided — skipping document load.", file=sys.stderr)

    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
