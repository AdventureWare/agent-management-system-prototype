# V2 Seed Slice Import Preview v0.1

Date: 2026-07-02
Status: Draft seed-slice finding

## Decision

Use the AMS project and the `AMS useful prototype milestone` goal as the first v2 import fixture.

Selected v1 records:

- Project: `Agent Management System Prototype`
- Project id: `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- Goal: `AMS useful prototype milestone`
- Goal id: `goal_26a850e3-5eac-4150-a96f-0574cd483595`

This slice is large enough to exercise v2 model boundaries, but smaller than the whole AMS project.

## Alternatives Checked

### Whole AMS Project

Command:

```sh
npm run v2:import-preview -- --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --limit 1
```

Result:

- Goals: 8
- Tasks: 82
- Runs: 81
- Reviews: 105
- Approvals: 8
- Decisions: 167
- Unique artifact path references: 57
- Thread references: 77

Assessment: representative but too broad for the first fixture.

### Agent And Work Management Long-Term Vision

Command:

```sh
npm run v2:import-preview -- --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --goal goal_5c952025-6248-46eb-882e-9cca1b5b17c3 --limit 1
```

Result:

- Goals: 1
- Tasks: 1
- Runs: 1
- Reviews: 1
- Approvals: 0
- Decisions: 3
- Unique artifact path references: 2
- Thread references: 1

Assessment: too small to exercise migration boundaries.

### AMS Useful Prototype Milestone

Command:

```sh
npm run v2:import-preview -- --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --goal goal_26a850e3-5eac-4150-a96f-0574cd483595 --limit 1
```

Result:

- Goals: 1
- Tasks: 34
- Task dependencies: 10
- Runs: 37
- Reviews: 51
- Approvals: 8
- Decisions: 86
- Artifact path references: 111
- Unique artifact path references: 38
- Missing artifact path references: 0
- Capability source labels: 4
- Tool candidates: 1
- Skill candidates: 3
- Provider references: 1
- Thread references: 33

Assessment: best first seed. It includes tasks, dependencies, runs, reviews, approvals, decisions, artifacts, tool/capability candidates, skills, and thread/session candidates.

## Import Implications

The selected seed requires v2 to handle these mappings before it can claim a useful import:

- `Project` to `Project`
- `Goal` to `Goal`
- `Task` to `Task`
- `Task.dependencyTaskIds` to `TaskDependency`
- `Run` to `Run`
- thread ids and agent-thread ids to `WorkSession` candidates
- `Review` to `Review`
- `Approval` to `Approval`
- `Decision` to `Decision`
- task attachments, task `artifactPath`, goal `artifactPath`, and run `artifactPaths` to `Artifact` candidates
- required capability names to `Capability` source labels
- required tool names to `Tool` candidates
- required prompt skill names to skill/context policy candidates

## Ambiguous Fields To Preserve For Review

The import preview found no unmapped fields in the selected core records, but several fields require policy decisions before promotion:

- `Project.currentStateMemo`: likely `MemoryItem` source, but may remain project summary context.
- `Project.decisionLog`: likely decision source, but prose entries need manual splitting.
- `Project.skillAvailabilityPolicies`: candidate skill/memory policy records.
- `Task.artifactPath`: may be a project directory rather than a produced artifact.
- `Task.attachments`: likely artifacts, but each path should be checked.
- `Task.closeoutState`: needs reconciliation with review status and task status.
- `Task.closeoutSummary`: may be review evidence or decision evidence.
- `Task.requiredCapabilityNames`: `Capability` source labels until registry schema/migration exists.
- `Task.requiredToolNames`: candidate `Tool` records.
- `Task.agentThreadId`: candidate `WorkSession` reference.
- `Run.threadId`, `Run.agentThreadId`, and `Run.agentThreadRunId`: require a clean `WorkSession`/`Run`/process-event boundary.
- `Run.inputPrompt`: preserve as source evidence, not source of truth.

## First Schema Test Plan

Create a v2 import fixture from this selected slice and write tests that assert:

1. The import preview is read-only and does not mutate v1 files.
2. The selected project imports as one `Project`.
3. The selected goal imports as one `Goal` with source id preserved.
4. All 34 selected tasks import as `Task` records.
5. All 10 task dependencies import as `TaskDependency` records or unresolved references with reasons.
6. All 37 runs import as `Run` records linked to imported tasks.
7. Thread references produce 33 `WorkSession` candidates.
8. Reviews and approvals import without becoming task status substitutes.
9. Decisions import and preserve source links.
10. Artifact candidates dedupe to 38 unique path references while preserving 111 source references.
11. Missing artifact paths are recorded explicitly; current preview shows zero missing paths.
12. Capability/tool strings now refer to accepted minimal concepts but remain candidate/source labels until registry schema and migration exist; skill strings remain candidates until model governance accepts them.

## First Implementation Task

After approving this seed, implement a fixture generator or test helper that can materialize this exact v1 slice into a small JSON fixture under a test fixture directory. The fixture should contain only the selected project, goal, linked tasks, runs, reviews, approvals, decisions, and artifact path metadata needed for import tests.

Do not create active v2 state yet. The next implementation should still be import-test infrastructure, not the v2 app.

Implemented fixture command:

```sh
npm run v2:extract-seed-fixture
```

Current fixture path:

```text
src/lib/server/fixtures/v2-ams-useful-prototype-slice.json
```

Current guard test:

```text
src/lib/server/v2-seed-slice-fixture.spec.ts
```

Current test-only mapper:

```text
src/lib/server/v2-import-mapper.ts
src/lib/server/v2-import-mapper.spec.ts
```

The mapper currently creates plain v2 draft objects for `Project`, `Goal`, `Task`, task dependencies, `Run`, `WorkSession` candidates, `Review`, `Approval`, `Decision`, and `ArtifactCandidate`. It preserves v1 source IDs and keeps capabilities, tools, skills, sessions, and artifact references as candidates where v2 governance still needs a concrete model decision. It does not create database tables, routes, runtime state, or active v2 records.
