#!/usr/bin/env python3
"""Seed the jobs deployment: init DB, define searchable fields, load documents.

Usage (from backend/):
    DATABASE_URL=... uvicorn deployments.jobs.main:app --port 8001 &
    python -m deployments.jobs.seed                              # init + fields only
    python -m deployments.jobs.seed example_data/jobs.json      # init + fields + data
    python -m deployments.jobs.seed example_data/jobs.json --base-url http://localhost:8001
"""

import argparse
import json
import os
import sys
import urllib.request

SEARCHABLE_FIELDS = [
    {"name": "jobTitle",       "json_path": "jobTitle",       "field_type": "string", "index_type": "trgm"},
    {"name": "jobLocation",    "json_path": "jobLocation",    "field_type": "string", "index_type": "trgm"},
    {"name": "employmentType", "json_path": "employmentType", "field_type": "string", "index_type": "trgm"},
    {"name": "datePosted",     "json_path": "datePosted",     "field_type": "string", "index_type": "btree"},
    {"name": "validThrough",   "json_path": "validThrough",   "field_type": "string", "index_type": "btree"},
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
    parser = argparse.ArgumentParser(description="Seed the jobs deployment")
    parser.add_argument("data_file", nargs="?", help="Path to jobs JSON file (omit to skip loading data)")
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
            print(f"  {result['id']}  {doc['url']}", file=sys.stderr)
    else:
        print("No data file provided — skipping document load.", file=sys.stderr)

    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
