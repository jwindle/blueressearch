# Jetstream docsearch ingester

This package consumes ATProto Jetstream commit events and forwards matching
records to the docsearch HTTP API.

The ingester uses the AT URI as the document `url`:

```
at://{did}/{collection}/{rkey}
```

Creates and updates call `POST /documents`. Deletes call
`DELETE /documents?url={encoded_at_uri}`.

## Usage

Run from `backend/` using a config file:

```sh
python -m jetstream.cli --config jetstream/jobs.yaml
python -m jetstream.cli --config jetstream/resumes.yaml
```

Copy an example config to get started:

```sh
cp jetstream/jobs.yaml.example jetstream/jobs.yaml
cp jetstream/resumes.yaml.example jetstream/resumes.yaml
```

## Configuration

| Key                     | Required | Default                                          | Description                                      |
|-------------------------|----------|--------------------------------------------------|--------------------------------------------------|
| `collection`            | yes      | —                                                | ATProto collection NSID to ingest                |
| `base_url`              | yes      | —                                                | Base URL of the docsearch API                    |
| `api_key`               | no       | `$DOCSEARCH_API_KEY`                             | Bearer token for the docsearch API               |
| `endpoint`              | no       | `wss://jetstream2.us-west.bsky.network/subscribe`| Jetstream websocket endpoint                     |
| `cursor`                | no       | —                                                | Microsecond timestamp to replay from             |
| `max_message_size_bytes`| no       | `0` (unlimited)                                  | Drop messages larger than this                   |
| `log_level`             | no       | `INFO`                                           | Logging level                                    |

`api_key` can be set via the config file or the `DOCSEARCH_API_KEY` environment variable.
