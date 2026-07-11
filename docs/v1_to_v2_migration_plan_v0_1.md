# V1 To V2 Migration Plan v0.1

Date: 2026-07-02
Status: Draft migration and archival plan

## Principle

Preserve v1 files and data. Do not mutate v1 live runtime state during v2 design or import testing.

V1 remains the operating prototype until v2 proves a minimal vertical slice and an explicit cutover plan exists.

## What To Preserve

- Entire git history.
- `data/app.sqlite` and backups.
- JSON snapshots: `data/control-plane.json`, `data/agent-threads.json`, `data/self-improvement.json`, `data/agent-use-telemetry.json`.
- `data/agent-threads/` run directories.
- `agent_output/` only where artifacts are intentionally promoted or archived.
- Existing docs and model governance files.
- Existing tests.
- MCP plugin and scripts as reference implementations.

## Archive Steps

1. Create a read-only v1 archive snapshot.
2. Export JSON from v1 using `npm run db:export-json`.
3. Copy SQLite and JSON exports to an archive location with timestamp.
4. Record source commit hash and export timestamp.
5. Record counts for major collections.
6. Mark whether the archive is complete, partial, or redacted.

Suggested manifest fields:

- `archiveId`
- `createdAt`
- `sourceCommit`
- `sourcePaths`
- `collectionCounts`
- `sqlitePath`
- `jsonPaths`
- `notes`

## Import Strategy

Use staged import, not direct migration.

Stages:

1. Read v1 export.
2. Validate source shape and counts.
3. Create an import preview with mapped, unmapped, ambiguous, and skipped fields.
4. Import a small project/goal/task/run subset into v2 staging.
5. Review mapping quality.
6. Promote selected records into v2 active tables.
7. Keep source v1 IDs as external references.

## Initial Mapping

| V1                                     | V2                                               |
| -------------------------------------- | ------------------------------------------------ |
| `Project`                              | `Project`                                        |
| `Goal`                                 | `Goal`                                           |
| `Task`                                 | `Task`                                           |
| `Task.dependencyTaskIds`               | `task_dependencies`                              |
| `Task.attachments`                     | `Artifact`                                       |
| `Task.artifactPath`                    | `Artifact` or artifact root reference            |
| `Run`                                  | `Run`                                            |
| `Run.threadId` / `Run.agentThreadId`   | `WorkSession` reference                          |
| `Run.artifactPaths`                    | `Artifact`                                       |
| `Review`                               | `Review`                                         |
| `Approval`                             | `Approval`                                       |
| `Decision`                             | `Decision`                                       |
| `Provider`                             | `Provider`                                       |
| provider pricing/default model         | `Model` concept source labels                    |
| `ExecutionSurface`                     | `ExecutionSurface`                               |
| required capability names              | `Capability` concept source labels               |
| required tool names                    | `Tool` candidates                                |
| `AgentThread`                          | `WorkSession`                                    |
| `AgentRun`                             | process/session event or supporting run metadata |
| `SelfImprovementKnowledgeItem`         | `MemoryItem` candidate                           |
| self-improvement signals/opportunities | evaluation/memory/task proposal candidates       |
| agent-use telemetry                    | `ToolExecution` or usage telemetry candidates    |

## Ambiguous Mappings

Review manually before bulk import:

- `Decision` vs project prose `decisionLog`.
- `Task.closeoutState` vs `Review.status` vs task `status`.
- `Run` vs `AgentRun`.
- Agent thread logs and transcripts.
- Artifact paths that no longer exist.
- Self-improvement suggestion decisions versus durable work decisions.
- Tool/capability string names.
- Provider/model fields when the run observed a different model than the launch expected.

## Data Quality Checks

Before promotion into v2:

- Every imported task has a project.
- Every imported run has a task or is explicitly skipped.
- Every imported artifact path is marked existing, missing, or external.
- Every imported session has source thread metadata if available.
- Dependencies do not point to missing tasks without a recorded unresolved reference.
- Reviews and approvals point to existing task/run records or are skipped with reason.
- Decision links are preserved where source IDs exist.
- Unmapped fields are reported, not silently dropped.

## Cutover Plan

Do not cut over all operations at once.

Phases:

1. V2 read-only import preview.
2. V2 vertical slice with copied data.
3. V2 active for one new low-risk project/goal.
4. V2 active for AMS self-work while v1 remains archive/reference.
5. Selective migration of active v1 projects/goals.
6. V1 frozen as historical archive.

## Rollback

Rollback is simple until final cutover:

- Continue using v1 as the operating system.
- Delete or ignore v2 imported copies.
- Keep v1 archive snapshots unchanged.

After cutover, rollback requires:

- v2 export of changed records
- manual reconciliation or adapter back to v1 if needed
- explicit operator decision

Avoid needing this by keeping v2 parallel during validation.

## Prototype Archival Policy

V1 should be archived as:

- source code
- docs
- SQLite snapshot
- JSON exports
- selected generated artifacts
- migration reports

Do not clean or delete historical runtime data during the v2 design phase. Cleanup can be a separate archival task after v2 import requirements are final.

## First Migration Task

Build a read-only import preview that:

- reads `data/control-plane.json` from a copied or current export
- maps one selected project, its goals, tasks, runs, reviews, approvals, and decisions
- reports unmapped fields and missing artifact paths
- writes no v2 active state unless explicitly requested

Initial helper:

```sh
npm run v2:import-preview -- --project <projectId>
npm run v2:import-preview -- --project-name "Sitcom World" --goal <goalId> --limit 2
npm run v2:import-preview -- --project <projectId> --json
```

The helper prints a read-only mapping preview for one selected project slice. It reports source collection counts, included goals/tasks/runs/reviews/approvals/decisions, proposed v2 target counts, capability/tool/model source labels, ambiguous fields, relationship warnings, and artifact path checks. It writes no files and does not mutate v1 or v2 state.

Selected first seed slice:

```sh
npm run v2:import-preview -- --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --goal goal_26a850e3-5eac-4150-a96f-0574cd483595 --limit 1
```

See `docs/v2_seed_slice_import_preview_v0_1.md` for the current seed-slice decision and first schema/import test plan.
