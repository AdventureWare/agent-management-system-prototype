# Prototype To V2 Stack Migration Plan v0.1

Date: 2026-07-02
Status: Migration planning draft

## Strategy

Build v2 in parallel. Preserve v1 as the current operating tool and evidence corpus. Migrate selectively through tested import adapters, not by refactoring the live prototype in place.

## Keep

- TypeScript and Node as the main implementation stack.
- SQLite as the local persistence base.
- SvelteKit as optional/local operator UI path.
- Vitest, Svelte tests, Playwright where useful.
- CLI/API/MCP structured agent affordance pattern.
- Runtime data policy.
- Model governance docs.
- Existing v1 data snapshots and tests.
- Agent capability manifest ideas.
- Codex/thread runner lessons.

## Archive

- Full `data/app.sqlite` backups before any future migration.
- JSON exports from v1.
- Agent thread logs/directories.
- Existing docs as historical context.
- V1 route behavior as reference, not a parity contract.

## Translate

Translate these into explicit v2 schema/services:

- `Project` -> `projects`.
- `Goal` -> `goals`.
- `Task` -> `tasks` plus dependencies and candidate requirements.
- `Run` -> `runs`.
- `AgentThread`/external IDs -> `work_sessions` after boundary review.
- `Review` -> `reviews`.
- `Approval` -> `approvals`.
- `Decision` -> `decisions`.
- Task attachments/run paths -> `artifacts` and source references.
- Provider/execution surface -> provider/model/execution surface records.
- Required tool/capability/skill strings -> candidate records first, accepted registries later.

## Rebuild

Rebuild these rather than porting directly:

- v2 explicit SQLite schema.
- service layer around work/execution/governance/artifact/memory/retrieval/evaluation.
- CLI-first v2 operator commands.
- retrieval index.
- tool registry and execution logging.
- provider routing and evaluation loop.
- minimal v2 UI.

## Do Not Migrate Blindly

- Every v1 field on `Task`.
- Every route/page.
- Generic payload-table storage.
- Prose project memory as accepted `MemoryItem`.
- Project `decisionLog` prose as structured decisions without parsing/review.
- Full historical run/thread logs before import rules are stable.

## Suggested Sequence

1. Keep v1 operational.
2. Maintain v1 export/import and backup paths.
3. Continue v2 preview DB work in a separate SQLite file.
4. Add v2 schema migration discipline for preview DB only.
5. Add read-only v2 query/work-packet services.
6. Add one controlled write workflow in v2 preview DB.
7. Add artifact registry write path.
8. Add review/approval/decision write path.
9. Add retrieval baseline using SQLite FTS.
10. Add provider/model routing record and evaluation fixture.
11. Add minimal UI only after CLI/service behavior proves useful.
12. Decide whether v2 remains separate DB or gets an app migration path.

## Migration Validation

Each migration step should prove:

- source record references preserved
- record counts match expectations
- unmapped fields reported
- foreign keys pass
- read models answer target questions
- rollback is available
- v1 runtime data is untouched

## Archival Policy

V1 should remain available until:

- v2 can import active project/goal/task/run state
- v2 can answer "what should happen next?"
- v2 can record a run result and review decision
- v2 can preserve artifacts and source evidence
- v2 can produce at least one useful evaluation/dependency report

Only then should active operational migration be considered.
