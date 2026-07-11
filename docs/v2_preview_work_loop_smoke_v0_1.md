# V2 Preview Work-Loop Smoke v0.1

Date: 2026-07-03
Status: CLI smoke procedure for the isolated v2 preview work loop

## Purpose

Verify that the v2 preview database can support one bounded work loop without becoming the production runtime system.

This smoke flow proves:

- a preview DB can be seeded from the checked-in v2 import fixture
- AMS can recommend a next action from current preview task, dependency, review, approval, and run state
- a preview task can be created under an imported goal
- task state can move through `ready -> in_progress -> review -> done`
- a run result, review, closeout decision, and transition decisions can be linked to the task
- work-packet and vertical-report readbacks show the final evidence chain and provenance
- all writes stay in the explicit preview DB
- no agent, tool, model provider, production migration, or `data/app.sqlite` write is involved

## Boundary

Use an explicit temp preview DB:

```sh
export AMS_V2_WORK_LOOP_SMOKE_DB=/tmp/ams-v2-work-loop-smoke.sqlite
export AMS_V2_WORK_LOOP_GOAL=goal_26a850e3-5eac-4150-a96f-0574cd483595
export AMS_V2_WORK_LOOP_TASK=task_preview_work_loop_smoke_doc
export AMS_V2_WORK_LOOP_RUN=run_3bd5dea1-f145-427f-a761-4d285267558b
```

Do not point `AMS_V2_WORK_LOOP_SMOKE_DB` at `data/app.sqlite`.

The command sequence below uses deterministic task/review/decision IDs where the CLI supports them. `record-run` currently generates a run ID, so set `AMS_V2_WORK_LOOP_RUN` from the command output before the review transition.

## 1. Load Seed

```sh
npm run v2:preview-db -- load-seed --db "$AMS_V2_WORK_LOOP_SMOKE_DB" --reset
```

Expected:

- command succeeds
- output reports one imported project, one imported goal, imported tasks, runs, reviews, approvals, decisions, artifacts, import sources, and candidate requirements
- only the explicit preview DB path is reset

## 2. Create A Preview Task

```sh
npm run v2:preview-db -- create-task \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --id "$AMS_V2_WORK_LOOP_TASK" \
  --goal "$AMS_V2_WORK_LOOP_GOAL" \
  --title "Preview work-loop smoke procedure" \
  --summary "Validate the preview-only work loop from selection through done transition." \
  --success "The task reaches done with run, review, decision, provenance, and work-packet readback." \
  --ready "The isolated preview DB is loaded." \
  --outcome "A complete preview work-loop evidence chain exists." \
  --validation "Run the documented CLI smoke commands."
```

Expected:

- task is created with the explicit ID
- task status is `ready`
- source provenance is `ams-v2-preview:preview_tasks:<task-id>`
- no v1 runtime state is changed

## 3. Check Next Action

```sh
npm run v2:preview-db -- next-action \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --goal "$AMS_V2_WORK_LOOP_GOAL" \
  --limit 5
```

Expected:

- command opens the preview DB read-only
- output includes the preview smoke task as a `start_task` candidate
- if the seed contains an existing approval or review gate, that gate may be recommended before the smoke task
- the selector does not mutate task state

## 4. Start The Task

```sh
npm run v2:preview-db -- transition-task \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --status in_progress \
  --summary "Start the documented preview work-loop smoke." \
  --id decision_preview_work_loop_smoke_started
```

Expected:

- task status changes from `ready` to `in_progress`
- a `v2_decisions` evidence row is created with `decision_type = 'preview_task_status_transition'`
- transition provenance is `ams-v2-preview:preview_task_status_transitions:decision_preview_work_loop_smoke_started`

## 5. Record Run Evidence

```sh
npm run v2:preview-db -- record-run \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --result "Preview work-loop smoke command chain completed through run recording." \
  --validation "Seed load, create-task, next-action, transition-task, and record-run commands executed against isolated preview DB." \
  --action "Executed CLI-only preview work-loop smoke." \
  --model preview-model
```

Expected:

- command records one completed preview run
- output includes the generated run ID
- set `AMS_V2_WORK_LOOP_RUN` to that generated run ID before continuing

Example:

```sh
export AMS_V2_WORK_LOOP_RUN=<generated-run-id>
```

## 6. Move To Review

```sh
npm run v2:preview-db -- transition-task \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --run "$AMS_V2_WORK_LOOP_RUN" \
  --status review \
  --summary "Run evidence is ready for preview review." \
  --id decision_preview_work_loop_smoke_review
```

Expected:

- task status changes from `in_progress` to `review`
- transition decision links to the run evidence
- run evidence from another task would be rejected

## 7. Record Review

```sh
npm run v2:preview-db -- record-review \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --id review_preview_work_loop_smoke_approved \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --run "$AMS_V2_WORK_LOOP_RUN" \
  --status approved \
  --summary "Preview work-loop smoke review approved."
```

Expected:

- one approved review is recorded
- review provenance is `ams-v2-preview:preview_reviews:review_preview_work_loop_smoke_approved`
- review recording alone does not complete the task

## 8. Record Closeout Decision

```sh
npm run v2:preview-db -- record-decision \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --id decision_preview_work_loop_smoke_closeout \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --run "$AMS_V2_WORK_LOOP_RUN" \
  --type preview_closeout \
  --summary "Preview work-loop smoke can close after approved review evidence."
```

Expected:

- one closeout decision is recorded
- decision provenance is `ams-v2-preview:preview_decisions:decision_preview_work_loop_smoke_closeout`
- decision recording alone does not complete the task

## 9. Complete The Task

```sh
npm run v2:preview-db -- transition-task \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --run "$AMS_V2_WORK_LOOP_RUN" \
  --status done \
  --summary "Approved review and closeout decision complete the preview smoke." \
  --id decision_preview_work_loop_smoke_done
```

Expected:

- task status changes from `review` to `done`
- a final transition decision is recorded
- the command does not auto-publish memory, apply artifacts, run tools, or route models

## 10. Verify Readback

```sh
npm run v2:preview-db -- inspect \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK"

npm run v2:preview-db -- work-packet \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK"

npm run v2:preview-db -- vertical-report \
  --db "$AMS_V2_WORK_LOOP_SMOKE_DB" \
  --task "$AMS_V2_WORK_LOOP_TASK" \
  --query "work-loop smoke"
```

Expected:

- `inspect` shows task status `done`
- `inspect` shows one run, one review, and transition/closeout decisions
- `work-packet` shows the latest run, approved review, latest transition decision, and `ams-v2-preview` provenance
- `vertical-report` shows the same task status, counts, latest record IDs, and provenance
- if `index-search` was not run, vertical-report may report the missing search index while still loading the rest of the report

## Validated Run

This procedure was manually validated against:

```text
/tmp/ams-v2-work-loop-smoke.sqlite
```

Observed final readback:

- task: `task_preview_work_loop_smoke_doc`
- status: `done`
- runs: `1`
- reviews: `1`
- decisions: `4` during the main loop, plus one extra explicit-ID verification decision after the loop
- latest run: `run_3bd5dea1-f145-427f-a761-4d285267558b`
- latest review: `review_preview_work_loop_smoke_approved`

## Automated Regression

The CLI work-loop sequence is covered by:

```sh
npm run test:v2-preview-work-loop-smoke
```

The regression test:

- creates an isolated temp preview DB
- runs `load-seed --reset`
- creates a preview task under the imported goal
- verifies `next-action` includes the preview task as a `start_task` candidate
- transitions the task `ready -> in_progress -> review -> done`
- records one completed run
- records one approved review
- records one closeout decision
- verifies `inspect`, `work-packet`, and `vertical-report` readbacks
- asserts preview provenance is present
- removes the temp DB directory after the test

This regression does not use the default preview DB, mutate `data/app.sqlite`, launch agents or tools, route models, publish memory, or migrate production data.

- latest transition decision: `decision_preview_work_loop_smoke_done`
- provenance: `ams-v2-preview`

## Stop Condition

The smoke passes when:

- seed load succeeds
- next-action can read candidate work without writing
- a preview task can be created with explicit provenance
- task can move `ready -> in_progress -> review -> done`
- run evidence can be recorded and linked
- review and decision evidence can be recorded
- readback surfaces final task state, evidence counts, latest IDs, and provenance
- no command uses or mutates `data/app.sqlite`

The smoke fails if:

- a command writes to `data/app.sqlite`
- task state changes without an explicit `transition-task`
- review or decision recording silently completes a task
- run evidence from another task can be linked to a transition
- the readback cannot show the evidence chain
- an agent, tool, model provider, or migration is launched as part of the procedure
