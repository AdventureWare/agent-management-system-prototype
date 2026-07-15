# Runtime Data Policy

AMS uses SQLite for normal writable runtime state. This repository currently
contains separate prototype/v1 and v2-core runtimes. JSON files are explicit
snapshots for seed, export, import, and recovery workflows, not live stores.

## Runtime Sources

- `data/app.sqlite` is the prototype/v1 source of truth for control-plane records and app-managed agent thread state.
- `data/v2-core.sqlite` is the current v2-core source of truth for v2 projects, goals, tasks, runs, artifacts, reviews, decisions, and related v2 records.
- Every operation must select one runtime authority explicitly. Do not infer that a prototype CLI/API/MCP mutation updates v2, and do not dual-write the two databases.
- Prototype mutations must go through the prototype app server, AMS CLI/API/MCP helpers, or prototype server-side repositories.
- V2-core mutations must go through `npm run v2:core-db -- ...` or the v2-core services that persist to `data/v2-core.sqlite`.
- Do not patch `data/control-plane.json` to change live task, goal, run, review, approval, project, workflow, or skill state.

## JSON Snapshots

- `data/control-plane.json` is intentionally tracked as a seed/export/recovery snapshot.
- Other JSON files under `data/`, such as `data/agent-threads.json`, are runtime export or recovery artifacts unless a task explicitly says to update a seed snapshot.
- Refresh JSON snapshots from SQLite with `npm run db:export-json`.
- Replace SQLite from JSON only with `npm run db:import-json`; the helper creates a SQLite backup before import.

## Ignored Runtime Data

- `data/app.sqlite`, SQLite backup files, agent-thread run directories, and operator runtime logs are local runtime data and should stay untracked.
- `agent_output/` is local generated output for managed runs, operator scripts, remote-access status, screenshots, and scratch deliverables unless an artifact is intentionally moved to a repo-owned docs or source path.
- Python bytecode, `__pycache__/`, `.DS_Store`, Playwright reports, screenshots, and other generated tool output should not be committed.

## Commit Hygiene

The lightweight staged-file guard in `scripts/prevent-junk-commits.mjs` blocks common generated artifacts without blocking legitimate tracked snapshot files such as `data/control-plane.json`. If a generated artifact needs to become durable project documentation, move it into `docs/` or another source path and give it a human-readable name.
