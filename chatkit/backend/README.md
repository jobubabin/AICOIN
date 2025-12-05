# ChatKit Self-Hosted Backend

Lightweight FastAPI service that powers the self-hosted ChatKit starter UI.
It keeps conversations in memory and forwards user messages to OpenAI via
the ChatKit server library.

## Prerequisites

- Python 3.11+
- `OPENAI_API_KEY` set in your shell

## Setup

```bash
cd chatkit/backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Run the server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The frontend defaults to `http://127.0.0.1:8000/chatkit`. Adjust
`NEXT_PUBLIC_CHATKIT_API_URL` if you move the backend to a different host/port.

## Deployment notes

- The in-memory store is for local/dev only. Swap `MemoryStore` with a persistent
  implementation before shipping.
- Register a domain key in the OpenAI dashboard and set
  `NEXT_PUBLIC_CHATKIT_API_DOMAIN_KEY` in production.

