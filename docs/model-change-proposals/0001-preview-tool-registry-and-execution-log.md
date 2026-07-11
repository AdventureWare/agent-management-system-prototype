# Model Change Proposal: Preview Tool Registry And Execution Log

Date: 2026-07-02
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview tool registry and execution-log slice

Post-hardening note: `Tool` is now an accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`. `ToolExecution` is now an accepted minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`. This proposal remains experimental for preview storage, tool execution status vocabulary beyond the minimal record, tool launching, automatic telemetry capture, and production schema/migration.

## Proposed Change

Add preview-only representations for `Tool` and `ToolExecution` so v2 can test tool affordance modeling and execution evidence before accepting production schema.

This proposal does not accept final v2 tool schema. It authorizes a limited preview implementation under the v2 preview database boundary.

## Type Of Construct

- `Tool`: accepted minimal domain concept; preview implementation record remains preview-only.
- `ToolExecution`: accepted minimal event/evidence concept; preview implementation record remains preview-only.
- Tool fields beyond the minimal accepted concept: candidate fields.
- Tool execution fields beyond the minimal accepted concept: candidate event/log metadata and evidence fields.
- Tool execution status values beyond the minimal accepted record: candidate vocabulary scoped to tool execution only.

## Problem This Solves

AMS needs to track which callable capabilities exist, which tasks require them, when they were used, what happened, and whether the use required approval or produced evidence.

Without this distinction, v2 risks continuing the v1 pattern where tool needs are stored as strings in task fields or prose summaries. That makes it hard to answer what tools are available, what tools were used, whether a tool call was safe, and which artifacts or decisions came from the tool use.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- register a tool affordance without launching it
- record that a tool was used, requested, skipped, failed, or completed
- link a tool execution to a task and optionally a run/session
- inspect tool-use evidence from a task work packet
- search tool execution summaries
- decide later whether a real tool launcher may call the tool

## Competency Question

Which tools were available or used for this task, what result did each tool use produce, and did any use require approval or create evidence that should be reviewed?

## Existing Related Concepts

- `Tool` in `docs/ontology-v1.md`: software or external system needed to perform task work.
- `Task.requiredToolNames` in `src/lib/types/control-plane.ts`: current string representation of required tools.
- `Skill` in `docs/domain-glossary.md`: accepted reusable instruction set.
- `ExecutionSurface` in `docs/domain-glossary.md`: accepted configured place or mechanism where work can be executed.
- `Run` in `docs/domain-glossary.md`: accepted concrete execution attempt or evidence record for task work.
- `Approval` in `docs/domain-glossary.md`: accepted permission gate before risky action.
- `Artifact` candidate concept: durable output/input information tracked by AMS.
- v2 draft docs: `docs/v2_domain_model_v0_1.md`, `docs/v2_minimal_vertical_slice_v0_1.md`, and `docs/v2_architecture_v0_1.md`.

## Why Existing Concepts Are Insufficient

`Task.requiredToolNames` can say that a task needs "codex" or "playwright", but it cannot define the tool, version, permission policy, risk level, input contract, or execution history.

`Run` can summarize a work attempt, but it is too coarse to represent multiple tool calls inside a run. A run may include search, file inspection, tests, browser automation, and artifact registration. Each tool use may have separate inputs, outputs, approvals, errors, and artifacts.

`ExecutionSurface` describes where work runs. It is not the same as the callable capability used during work.

`Skill` describes reusable agent instruction. It is not a software call or execution event.

## Classification

`Tool` is an accepted minimal domain concept in the Agent, tool, and capability bounded context. The preview registry table and any production schema/migration remain preview-only until a later implementation decision.

`ToolExecution` is an accepted minimal event/evidence concept in the Work and execution plus Agent, tool, and capability bounded contexts. The preview execution-log table and any production schema/migration remain preview-only until a later implementation decision.

## Examples

- Tool: `git`, with description "local Git command interface", risk level `medium`, approval mode `before_write`.
- Tool: `playwright`, with description "browser automation for UI validation", risk level `medium`.
- ToolExecution: task `task_make_sqlite_runtime_store_single_source_of_truth` recorded use of `npm test` with result summary "Focused v2 preview suite passed."
- ToolExecution: a failed browser automation attempt with an error summary and no produced artifact.

## Non-Examples

- A role such as "researcher" is not a tool.
- A skill such as `ams-agent-interface` is not a tool execution.
- A whole Codex task run is not one tool execution; it is a `Run` that may contain several tool executions.
- An artifact path is not itself a tool, though it may be produced by a tool execution.

## Relationship To Existing Model

`Task` may require tools by name today and may later reference accepted `Tool` records.

`Run` may contain many `ToolExecution` records.

`ToolExecution` may reference:

- a `Task`
- optionally a `Run`
- a `Tool`
- optionally an `Approval`
- optionally produced `Artifact` records

`ExecutionSurface` may provide or permit tools, but this relationship should remain candidate until the registry proves useful.

Owned bounded context:

- primary: Agent, tool, and capability
- secondary: Work and execution

## Consequences Of Adding It

- Adds a clearer place to record tool availability and tool use.
- Makes work packets and reviews more evidence-rich.
- Creates new modeling responsibility around tool status, risk levels, approval modes, and execution lifecycle.
- Risks duplicating `Run` if tool executions are treated as full work attempts rather than granular events inside or alongside runs.
- Requires source/provenance handling so preview-created tool records are not confused with imported v1 data.

## Consequences Of Not Adding It

- Tool use remains hidden inside run summaries, task strings, and chat transcripts.
- AMS cannot reliably answer which tools were used, failed, approved, or produced artifacts.
- Safe execution and approval gates remain hard to model.
- External-AI dependency tracking remains coarse because tool affordances are not separable from provider/model runs.

## Can Existing Concepts Represent This For Now?

Partially.

`Task.requiredToolNames`, `Run.actionSummary`, `Run.resultSummary`, `Approval`, and `Artifact` can approximate tool use, but they cannot cleanly answer tool registry, safety, or per-tool execution questions.

For the next slice, use preview records rather than accepted production schema.

## Failure Mode If Poorly Modeled

- `Tool`, `Skill`, `Capability`, `Provider`, and `ExecutionSurface` collapse into one vague label bucket.
- `ToolExecution` duplicates `Run` instead of recording a granular action/event.
- Tool status becomes a global workflow status with unclear lifecycle.
- Approval gates become after-the-fact notes rather than enforceable policy.
- Preview schema hardens into production before field boundaries are proven.

## Decision

Accepted concept; experimental preview storage.

The preview implementation may keep using preview-only tool registry and tool execution log records in the v2 preview database. These records must not be treated as accepted v2 runtime schema, tool-launching behavior, or automatic telemetry capture.

## Rationale

The owned-agent goal requires tool affordance and execution evidence, but the correct production boundary is not yet proven. A preview-only slice lets AMS test the workflow while preserving ontology discipline.

The minimum useful implementation should record definitions and logs, not launch real tools.

## Follow-Up

- Update production schema only after a separate migration decision.
- Define tool execution status vocabulary, retention, approval links, and redaction rules before production persistence.
- Keep next implementation preview-only and separate from `data/app.sqlite`.
- Add tests proving tool records can be created, linked to tasks/runs, inspected, and searched.
- Revisit after the preview slice to decide whether to accept, refine, merge, or reject these constructs.
