# V2 Preview UI Write Governance Checkpoint v0.1

Date: 2026-07-03
Status: Recommendation checkpoint before additional preview UI writes

## Purpose

Decide whether `/app/v2-preview` should expose another write action after the first guarded `record-review` action.

This checkpoint is intentionally small. It does not accept new domain entities, alter schema, or authorize broad task editing.

## Current Surface

`/app/v2-preview` currently provides:

- read-only overview metrics
- task selection
- task detail summary
- work-packet readiness and requirements
- vertical-report counts
- provenance counts
- status counts
- optional search samples
- one explicit write action: record a preview review for the selected task

The write action:

- uses the accepted `Review` concept
- writes through `recordV2PreviewReview`
- writes only to the configured v2 preview DB
- preserves `ams-v2-preview` provenance
- requires a non-empty summary
- does not complete tasks, publish memory, rebuild search, launch tools, run agents, or migrate runtime data

## Candidate Next Write Actions

### Record Decision

Fit: High.

Reason: `Decision` is an accepted concept and the CLI already supports preview decision recording. A decision is a natural follow-up to inspection and review when the human is making a direction-setting choice.

Risks:

- Could become a general notes field if summary/rationale is too loose.
- Could duplicate review if used for accept/reject judgments.

Guardrails if implemented:

- Label it as "Record decision", not "Add note".
- Require a summary.
- Default `decision_type` to `preview_decision`.
- Do not change task status.
- Do not replace review or approval.

### Record Memory Item

Fit: Medium.

Reason: `MemoryItem` is now an accepted minimal concept, but UI support could imply publication, retrieval trust, or production editing before memory policy is ready.

Risks:

- Turns the preview UI into a memory editor too early.
- Makes `published` memory look trusted without review policy.
- Duplicates project memory prose and future retrieval policy.

Recommendation: Defer UI write support until publication, retrieval trust, and review policy are clearer.

### Record Dependency-Reduction Status

Fit: Medium.

Reason: Dependency reduction is central to the larger owned-agent goal, but the current preview record remains experimental and should likely split replacement state from evidence links before production acceptance.

Risks:

- Encourages subjective status updates before evidence is strong.
- Could become a dashboard metric without a reliable evaluation basis.

Recommendation: Defer UI write support until a read-focused dependency-reduction view makes evidence gaps obvious.

### Record Approval

Fit: Low for this UI.

Reason: Approval is accepted, but approval is a permission gate. Adding it here could confuse inspection/review with authorizing risky action.

Risks:

- Implies the preview UI can approve future execution, application, or state changes.
- Could bypass the existing governance/approval surfaces.

Recommendation: Do not add approval write UI here yet.

### Record Tool Execution, Evaluation Result, Routing Decision, Or Run

Fit: Low for this UI now.

Reason: These writes imply execution, benchmark evidence, routing policy, or work attempts. They belong behind clearer workflow-specific surfaces or CLI flows until safety boundaries are stronger.

Recommendation: Do not add these write actions to `/app/v2-preview` yet.

## Recommendation

Add `record-decision` next if another preview UI write action is needed.

Rationale:

- `Decision` is accepted.
- It complements review without replacing it.
- It helps the preview UI become a lightweight governance/inspection surface rather than a task editor.
- It can reuse existing preview governance service behavior and proof tables.
- It does not require a new model change proposal.

Defer all experimental-concept write actions from the UI until the concept-specific governance is clearer.

## Required Guardrails For `record-decision`

If implemented, the action should:

- use the existing `recordV2PreviewDecision` service
- require selected task and non-empty summary
- allow optional decision type only as a bounded text field or default it silently to `preview_decision`
- write only to the configured v2 preview DB
- preserve `ams-v2-preview` provenance
- refresh the current selected task/report view
- add server tests with temp preview DB
- add component tests for form rendering and feedback
- avoid creating tasks, changing task status, approving action, publishing memory, rebuilding search, running tools, launching agents, or migrating runtime data

## Non-Goals

- Do not turn `/app/v2-preview` into a full task editor.
- Do not add broad CRUD.
- Do not expose experimental memory/dependency/routing writes yet.
- Do not add accepted schema concepts.
- Do not write to `data/app.sqlite`.

## Next Step

Implement a guarded `record-decision` form on `/app/v2-preview`, or stop write UI expansion and move to richer read-side inspection.
