# V2 Cross-Project Review Backlog Noise Audit v0.1

Date: 2026-07-15
Status: Audit result

## Purpose

Audit submitted artifacts that dominate cross-project `review_output` attention and define the smallest safe cleanup/classification sequence.

This audit does not mutate artifact statuses. It does not add schema, UI, entities, statuses, workflow machinery, scheduler behavior, or routing automation.

## Task

- Task: `task_ams_v2_review_backlog_noise_audit`
- Goal: `goal_ams_v2_cross_project_review_backlog_actionability`

## Readbacks

Commands and direct read-only summaries used:

- `npm run v2:core-db -- unreviewed-outputs --json`
- `npm run v2:core-db -- operator-console --limit 12 --json`
- read-only SQL summaries over:
  - `v2_core_artifacts`
  - `v2_core_tasks`
  - `v2_core_goals`
  - `v2_core_projects`
  - `v2_core_reviews`
- existing design rule:
  - `docs/design/ams_v2_entity_cards.md`

## Headline Finding

There are 208 submitted artifacts in the review queue.

192 of 208 are imported v1 artifacts with ids beginning `artifact_v1_`.

198 of 208 are attached to tasks that are already `done` or `canceled`.

This is review backlog noise, not a useful current review queue.

## Submitted Artifact Pattern Counts

| Pattern | Count |
| --- | ---: |
| `artifact_v1_run_path_*` | 108 |
| `artifact_v1_task_path_*` | 67 |
| `artifact_v1_task_attachment_*` | 17 |
| native v2 / other | 16 |

## Submitted Artifacts By Task Status

| Task status | Count |
| --- | ---: |
| `canceled` | 105 |
| `done` | 93 |
| `ready` | 9 |
| `blocked` | 1 |

## Top Projects By Submitted Artifact Count

| Project | Submitted | v1-like | Closed-task artifacts | Open-task artifacts |
| --- | ---: | ---: | ---: | ---: |
| 3920 Silver Oak St. | 68 | 68 | 66 | 2 |
| Agent Management System Prototype | 53 | 53 | 52 | 1 |
| AMS v2 Core | 16 | 0 | 16 | 0 |
| Personal Knowledge | 16 | 16 | 16 | 0 |
| Emergence Project | 12 | 12 | 12 | 0 |
| Kwipoo app | 11 | 11 | 5 | 6 |
| Sitcom World | 9 | 9 | 9 | 0 |
| Superstructure Ontology / Reality-Modeling Framework | 7 | 7 | 7 | 0 |
| 3D Modeling and Game Development Learning | 7 | 7 | 6 | 1 |
| Animal Welfare Monitoring System | 5 | 5 | 5 | 0 |
| Kwipoo | 2 | 2 | 2 | 0 |
| Content_OS | 2 | 2 | 2 | 0 |

## Dominant Duplicate Paths

Most review noise is repeated imported path evidence, not distinct current deliverables.

| Project | Title / URI | Count |
| --- | --- | ---: |
| 3920 Silver Oak St. | `/Users/colinfreed/Projects/3920 Silver Oak St.` | 61 |
| Agent Management System Prototype | `agent_output` | 39 |
| Personal Knowledge | `My Vault` | 13 |
| Emergence Project | `emergence` | 11 |
| Kwipoo app | `task-attachments` | 11 |
| Sitcom World | `sitcom-world` | 9 |
| 3D Modeling and Game Development Learning | `Sandbox Project` | 7 |
| Superstructure Ontology / Reality-Modeling Framework | `superstructure-ontology` | 6 |

## Open-Task Artifacts

There are 10 submitted artifacts attached to tasks that are not `done` or `canceled`.

These should not be bulk-classified with closed historical outputs.

They are imported v1 `task_path` records with role `evidence` and summaries like `Imported v1 task artifactPath. Exists locally: yes.`

Examples:

- 3920 Silver Oak St.
  - `Extract reusable property modeling workflow templates from Silver Oak`
  - `Capture and encode B-W08/B-W09 basement measurement clarifications`
- 3D Modeling and Game Development Learning
  - `Manual playtest Snack Run ship candidate after finish fix`
- Kwipoo app
  - six active ready move-flow tasks under `My Grandma and I consistently use Kwipoo`
- Agent Management System Prototype
  - one ready task under a superseded goal

Interpretation: these records look more like imported context/source pointers than current outputs awaiting review. They should remain out of the first cleanup batch until a task-level rule is defined.

## Native V2 Submitted Artifacts

There are 16 submitted artifacts in AMS v2 Core that are not imported v1 records.

All 16 are attached to completed minimal-loop implementation tasks, such as:

- `artifact_v2_core_cli_next_work`
- `artifact_v2_core_service_next_work`
- `artifact_v2_core_operator_console_service`
- `artifact_v2_core_operator_console_smoke`
- `artifact_v2_core_snapshot_export_import_cli`

These are not stale imported v1 outputs. They are v2 implementation artifacts that appear to have remained `submitted` despite their tasks and milestones being completed.

Interpretation: these should probably be accepted through explicit approved reviews if the corresponding task already has accepted closeout evidence. Do not reject them as historical noise.

## Classification Rules

### Rule A: Native v2 completed implementation artifacts

Condition:

- artifact status is `submitted`;
- artifact id does not start with `artifact_v1_`;
- linked task is `done`;
- linked goal is completed or the task has accepted closeout evidence.

Recommended action:

- create an explicit approved review for the artifact;
- allow artifact status to become `accepted`;
- do not promote it to memory automatically.

Rationale:

These are actual v2 implementation deliverables and test artifacts. Leaving them submitted pollutes the queue, but rejecting them would be false.

### Rule B: Closed imported v1 artifacts

Condition:

- artifact status is `submitted`;
- artifact id starts with `artifact_v1_`;
- linked task is `done` or `canceled`.

Recommended action:

- create an explicit rejected review for the artifact with a summary saying the artifact is retained as historical import evidence but is not accepted as current review output;
- allow artifact status to become `rejected`;
- do not delete the artifact;
- do not promote it to memory.

Rationale:

These records are mostly historical path or attachment imports attached to closed work. They should remain auditable, but they should not compete with current review work.

This uses the existing artifact lifecycle. The v2 design accepts `rejected` and `deprecated` as artifact lifecycle states, but current service behavior only changes artifact status on `approved` or `rejected` reviews. Since `deprecated` is not currently exposed through the review path, `rejected` is the available non-accepted status that removes stale artifacts from `unreviewed-outputs`.

### Rule C: Open-task imported path artifacts

Condition:

- artifact status is `submitted`;
- artifact id starts with `artifact_v1_task_path_`;
- linked task is `ready` or `blocked`.

Recommended action:

- exclude from the first cleanup batch;
- inspect by task when that task is selected;
- later decide whether these should be accepted as context/source artifacts, rejected as non-actionable import noise, or re-attached through a clearer role.

Rationale:

These may still be useful context for active tasks. Bulk rejecting them would risk hiding task context.

## Safe Cleanup Sequence

1. Dry-run the exact affected ids for Rule A and Rule B.
2. For Rule A, record approved reviews for the 16 native v2 completed artifacts if no approved/rejected review already exists.
3. For Rule B, record rejected reviews for the 182 closed imported v1 artifacts if no approved/rejected review already exists.
4. Leave the 10 open-task imported path artifacts unchanged.
5. Read back:
   - `unreviewed-outputs`
   - global `operator-console`
   - `goal-continuity-audit`
   - sampled `inspect-task` for 3920 Silver Oak St., AMS v2 Core, Kwipoo app, and Agent Management System Prototype.
6. Confirm current review attention is no longer dominated by closed historical imports.

## What Should Remain Human-Reviewed

Keep visible for human review:

- current task outputs from active goals;
- artifacts produced by new v2 managed runs;
- imported artifacts attached to active ready/blocked tasks until the task is selected;
- anything with ambiguous task status or missing provenance.

Do not keep visible as current review work:

- repeated v1 run path artifacts for closed/canceled tasks;
- imported project folder paths attached to paused/superseded historical goals;
- completed v2 implementation artifacts that already have accepted closeout evidence.

## Follow-Up Task

Create one implementation task:

`Classify closed submitted artifacts out of the active review queue`

Success criteria:

- dry-run reports exact Rule A and Rule B artifact ids and counts;
- Rule A artifacts receive approved reviews and become accepted;
- Rule B artifacts receive rejected reviews and become rejected;
- Rule C artifacts remain submitted;
- no artifacts are deleted;
- no memory is promoted;
- no schema, status vocabulary, UI, entity, workflow, scheduler, or routing change is introduced;
- after cleanup, `unreviewed-outputs` and global `operator-console` no longer show closed historical imports as the dominant review-output attention.

## Non-Goals

- Do not manually inspect all 208 artifacts.
- Do not accept imported v1 artifacts as canonical memory.
- Do not delete imported records.
- Do not classify open active-task artifacts in the first cleanup batch.
- Do not create a new review backlog entity.
- Do not add `deprecated` status plumbing in this milestone unless a later task explicitly justifies that model/behavior change.
- Do not hide genuinely current review work to make the numbers look clean.

## Verdict

Proceed with a controlled cleanup task.

The backlog is not mainly real current work. It is mostly imported historical evidence stuck in `submitted` status. Cleaning it through existing `Review` and `Artifact` behavior will make cross-project attention more trustworthy without adding a new governance layer.
