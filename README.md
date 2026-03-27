# Agent Management System Prototype

This prototype is the start of a very small remote-work control plane for Codex.

Current scope:

- server-backed Codex session data in `data/agent-sessions.json`
- one main UI at `/app/sessions`
- background Codex session launching and follow-up prompts
- logs, state files, and last-message capture per run
- session APIs under `/api/agents/sessions/*`

## Why this slice exists

The immediate problem is not advanced orchestration. It is having one shared place where you can:

- submit a task from a browser
- start a background Codex run on your laptop
- see how many runs are active or finished
- inspect logs and the last agent message
- send a follow-up prompt into the same session later

That gives you the first useful "work while I am away" loop before adding auth, queueing, or richer orchestration.

## Run locally

```sh
npm install
npm run dev
```

Validation:

```sh
npm run check
npm run lint
npm run test
```

## Codex sessions

The first session layer uses discrete background Codex runs:

- start a run with `codex exec --json`
- capture the discovered `thread_id`
- send a follow-up prompt later with `codex exec resume <thread_id> --json`

This is not a browser-hosted live terminal. It is a resumable run queue with logs and last-message capture.

UI:

- `/app/sessions`

API:

- `GET /api/agents/sessions`
- `POST /api/agents/sessions`
- `GET /api/agents/sessions/:sessionId`
- `POST /api/agents/sessions/:sessionId/messages`
- `POST /api/agents/sessions/:sessionId/cancel`

Environment:

```sh
export CODEX_BIN="$(which codex)"
```

If `CODEX_BIN` is not set, the prototype uses `codex` from `PATH`.

Session data lives in:

- `data/agent-sessions.json`
- `data/agent-sessions/<sessionId>/runs/<runId>/`

The runner script is:

- `scripts/agent-session-runner.mjs`

## Recommended next steps

1. Add user authentication before exposing this publicly.
2. Add live session streaming or websocket updates instead of pure polling.
3. Add a very small task inbox so tasks launch sessions automatically.
4. Add deployment or secure remote access so the laptop-hosted app is reachable when you are away.

## Product docs

- `docs/product-spec.md`
