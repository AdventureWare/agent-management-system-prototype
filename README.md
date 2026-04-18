# Agent Management System Prototype

This prototype is the start of a small remote-work control plane for Codex.

Current scope:

- server-backed task, run, thread, and supporting control-plane data in `data/app.sqlite`, with JSON mirrors kept for fallback/export
- a task-first operator UI under `/app/*`
- background Codex thread launching, reuse, and follow-up prompts
- run history, prompt digests, logs, artifacts, and last-message capture
- supporting control-plane directories for projects, goals, planning windows, execution surfaces, roles, and providers
- thread APIs under `/api/agents/threads/*` with session aliases kept for compatibility

## Why this slice exists

The immediate problem is not advanced orchestration. It is having one shared place where you can:

- submit a task from a browser
- start a background Codex run on your laptop
- see how many runs are active or finished
- inspect logs and the last agent message
- send a follow-up prompt into the same thread later

That gives you the first useful "work while I am away" loop before adding auth, queueing, or richer orchestration.

## How to read the prototype right now

The current center of gravity is:

- `Tasks`: the main work queue and launch point
- `Runs`: the execution ledger
- `Threads`: the resumable Codex context container

The rest of the top-level surfaces are real, but mostly play supporting roles today:

- `Projects`: workspace and repo defaults
- `Goals`: outcome grouping and relationship mapping
- `Planning`: date-window review over the existing goals/tasks/execution-surface model
- `Execution surfaces`, `Roles`, `Providers`: routing and capacity metadata
  See `docs/README.md` for the current documentation index and surviving design notes.

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

Legacy JSON files:

```sh
npm run db:export-json
```

The prototype now uses `data/app.sqlite` as the runtime source of truth for the control-plane store and app-managed agent threads. The JSON files under `data/` are for explicit export/import and recovery workflows, not normal runtime persistence.

Database helpers:

```sh
npm run db:migrate
npm run db:import-json
npm run db:export-json
```

## Remote access

Preferred near-term path: local Node runtime plus Tailscale Serve.

Build the app and start the local server:

```sh
cp .env.example .env.local
npm run build
npm run app:server:start
```

Enable remote access through the vendor-neutral wrapper:

```sh
npm run remote:access:start
```

Check the current remote URL:

```sh
npm run remote:access:status
```

Stop the access layer when you are done:

```sh
npm run remote:access:stop
```

Related docs:

- [`docs/tailscale-remote-access.md`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/docs/tailscale-remote-access.md)
- [`docs/remote-phone-access.md`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/docs/remote-phone-access.md) for the older localhost.run-based fallback path

## Codex threads

The first thread layer uses discrete background Codex runs:

- start a run with `codex exec --json`
- capture the discovered `thread_id`
- send a follow-up prompt later with `codex exec resume <thread_id> --json`

This is not a browser-hosted live terminal. It is a resumable run queue with logs and last-message capture.

UI:

- `/app/threads`

API:

- `GET /api/agents/threads`
- `POST /api/agents/threads`
- `GET /api/agents/threads/:threadId`
- `POST /api/agents/threads/:threadId/messages`
- `POST /api/agents/threads/:threadId/cancel`

Environment:

```sh
export CODEX_BIN="$(which codex)"
```

If `CODEX_BIN` is not set, the prototype uses `codex` from `PATH`.

Thread records live in:

- `data/agent-threads.json`
- `data/agent-threads/<threadId>/runs/<runId>/`

The runner script is:

- `scripts/agent-thread-runner.mjs`

## Recommended next steps

1. Add user authentication before exposing this publicly.
2. Add live thread streaming or websocket updates instead of pure polling.
3. Add a very small task inbox so tasks launch threads automatically.
4. Add deployment or secure remote access so the laptop-hosted app is reachable when you are away.

## Product docs

- `docs/README.md`
