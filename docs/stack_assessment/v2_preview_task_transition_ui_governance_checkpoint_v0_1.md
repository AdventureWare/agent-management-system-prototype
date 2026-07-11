# V2 Preview Task-Transition UI Governance Checkpoint v0.1

Date: 2026-07-04
Status: Accepted for narrow preview implementation

## Purpose

Decide whether `/app/v2-preview` should expose a guarded task-state transition action as part of the Autonomous Work Loop Preview v0 milestone.

This checkpoint does not authorize a broad task editor, new task statuses, new workflow states, schema changes, production runtime mutations, or agent/tool launching.

## Current Surface

`/app/v2-preview` currently provides:

- preview DB health and source counts
- task selection and selected-task inspection
- next-action recommendation
- vertical report counts
- evidence/governance/provenance timeline
- copyable agent handoff packet
- guarded `record-decision` and `record-review` actions

The preview work loop already has a validated CLI path for:

- `next-action`
- `transition-task`
- `record-run`
- `record-review`
- `record-decision`
- `inspect`
- `work-packet`
- `vertical-report`

## Decision Question

Should the preview console remain an inspection/governance surface only, or should it also support selected-task lifecycle transitions?

## Recommendation

Add a narrow `transition-task` UI action to `/app/v2-preview`.

Rationale:

- `Task.status` and the accepted task status lifecycle already exist.
- `transitionV2PreviewTaskStatus` already validates accepted status values, allowed transitions, terminal states, task existence, and optional run ownership.
- The CLI smoke procedure proved that task status transition is a required step in the end-to-end autonomous work loop.
- The preview page can already recommend next action and record governance evidence, but requiring CLI use for status movement leaves the operator loop split across surfaces.
- A selected-task transition action advances the preview from read-only inspection plus notes toward an actually repeatable work loop.

## Guardrails

The implementation should:

- use the existing `transitionV2PreviewTaskStatus` service
- write only to the configured isolated v2 preview database
- require a selected task
- require a target accepted task status
- require a non-empty transition summary
- rely on service-side allowed-transition validation
- optionally link only the latest run already associated with the selected task
- preserve `ams-v2-preview` provenance through the service
- record the transition as a decision with `preview_task_status_transition`
- refresh the selected task/read model after the action
- add focused server and component tests

The implementation should not:

- add, rename, or reinterpret task statuses
- add new schema tables or fields
- add task editing beyond status transition
- create tasks, runs, reviews, approvals, memory items, registry entries, tools, or model-routing records
- approve risky action
- complete review automatically
- launch agents or tools
- mutate `data/app.sqlite`
- migrate prototype data

## Options Considered

### Keep Transitions CLI-Only

Fit: Medium.

This keeps the preview UI safer and simpler, but leaves the human/operator loop split. The page can say what to do next, yet cannot move the selected task through the accepted lifecycle.

### Add Broad Task Editing

Fit: Low.

This would create too much surface area and could silently turn the preview into a second task-management UI before the v2 model is ready.

### Add Narrow Selected-Task Transition

Fit: High.

This uses an existing accepted concept and existing service validation. It closes the current preview-loop gap without introducing new ontology or broad CRUD behavior.

## Acceptance Criteria

- `/app/v2-preview` exposes one guarded status-transition form for the selected task.
- The server action rejects missing task, missing status, and missing summary.
- The server action uses `transitionV2PreviewTaskStatus`.
- A successful transition updates the selected task status and records a preview transition decision.
- Component tests cover form rendering and feedback.
- Server tests cover at least one successful transition and one validation failure.
- Documentation states this is preview-only and does not mutate `data/app.sqlite`.

## Next Implementation

Implement the narrow selected-task transition action in `/app/v2-preview` with focused tests, then update the next-implementation-step document to mark this checkpoint and slice complete.
