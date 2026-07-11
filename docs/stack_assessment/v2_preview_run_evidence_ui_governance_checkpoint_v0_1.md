# V2 Preview Run-Evidence UI Governance Checkpoint v0.1

Date: 2026-07-04
Status: Accepted for narrow preview implementation

## Purpose

Decide whether `/app/v2-preview` should expose a guarded run-evidence capture action as part of the Autonomous Work Loop Preview v0 milestone.

This checkpoint does not authorize agent launching, tool execution, provider routing, work-session control, broad run editing, schema changes, production runtime mutations, or automatic task-state changes.

## Current Surface

`/app/v2-preview` currently provides:

- preview DB health and source counts
- task selection and selected-task inspection
- next-action recommendation
- work-packet and vertical-report readback
- evidence/governance/provenance timeline
- copyable agent handoff packet
- guarded selected-task writes for task transition, review, and decision

The preview CLI already supports `record-run`, and the automated work-loop smoke regression proves the CLI can complete the full loop from seed through final `done` readback.

## Decision Question

Should run evidence remain CLI-only, or should the preview console support a narrow selected-task `record-run` action so the operator loop can be completed without switching surfaces?

## Recommendation

Add a narrow `record-run` UI action to `/app/v2-preview`.

Rationale:

- `Run` is an accepted AMS concept and already exists in the preview schema/read model.
- `recordV2PreviewRunResult` already writes preview-only completed run evidence with source provenance.
- The autonomous work loop requires durable run evidence before review and closeout.
- The preview page can already recommend work, transition status, review, and record decisions; keeping run evidence CLI-only leaves the UI loop incomplete.
- A guarded run-evidence form captures what happened after work was performed elsewhere. It does not execute work.

## Guardrails

The implementation should:

- use the existing `recordV2PreviewRunResult` service
- write only to the configured isolated v2 preview database
- require a selected task
- require non-empty result summary
- require non-empty validation summary
- allow optional action summary
- allow optional provider, execution surface, and model labels as evidence metadata
- preserve `ams-v2-preview` provenance through the service
- refresh selected task, work-packet, vertical-report, and timeline readback after submission
- add focused server and component tests

The implementation should not:

- launch agents, tools, commands, models, or browsers
- route model providers
- create work sessions
- change task status automatically
- create reviews, approvals, decisions, artifacts, memory items, registry entries, or evaluation records
- infer success from the presence of a run
- mutate `data/app.sqlite`
- migrate prototype data

## Options Considered

### Keep Run Capture CLI-Only

Fit: Medium.

This keeps `/app/v2-preview` smaller, but splits the main operator loop. The page can inspect and govern work but cannot capture the central evidence record needed before review.

### Add Full Execution/Launcher UI

Fit: Low.

This would conflate evidence capture with execution. Launching agents, tools, commands, or model calls requires stronger approval and execution-surface policy than this preview page should own.

### Add Narrow Selected-Task Run Evidence Capture

Fit: High.

This records evidence produced elsewhere using an accepted existing service. It closes the preview operator-loop gap without adding a new entity, status, execution engine, or broad CRUD surface.

## Acceptance Criteria

- `/app/v2-preview` exposes one guarded run-evidence form for the selected task.
- The server action rejects missing task, missing result summary, and missing validation summary.
- The server action uses `recordV2PreviewRunResult`.
- A successful submission records one completed preview run with `ams-v2-preview` provenance.
- The selected task readback shows one additional run and latest-run evidence.
- Component tests cover form rendering and feedback.
- Server tests cover at least one successful run capture and one validation failure.
- Documentation states this is preview-only evidence capture and does not execute work or mutate `data/app.sqlite`.

## Next Implementation

Implement the narrow selected-task run-evidence action in `/app/v2-preview` with focused tests, then update the next-implementation-step document to mark this checkpoint and slice complete.
