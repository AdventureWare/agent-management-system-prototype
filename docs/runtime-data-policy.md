# Runtime Data Policy

AMS uses SQLite for normal writable runtime state. JSON files are explicit snapshots for seed, export, import, and recovery workflows, not the live store.

## Runtime Sources

- `data/app.sqlite` is the normal runtime source of truth for control-plane records and app-managed agent thread state.
- Runtime mutations must go through the app server, AMS CLI/API/MCP helpers, or server-side repository helpers that persist to SQLite.
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
