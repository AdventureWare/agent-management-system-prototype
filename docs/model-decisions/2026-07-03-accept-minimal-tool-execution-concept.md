# Model Decision: Accept Minimal ToolExecution Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `ToolExecution` as a core AMS/v2 evidence concept.

A `ToolExecution` is a task-linked event/log record that describes one requested, completed, failed, skipped, or otherwise recorded use of an accepted `Tool`.

Minimal accepted fields:

- `id`
- `taskId`
- `runId`
- `toolId`
- `status`
- `inputSummary`
- `resultSummary`
- `validationSummary`
- `errorSummary`
- `startedAt`
- `endedAt`
- `approvalId`

The accepted concept does not require production schema, migration, tool launching, or automatic telemetry capture in this decision. Existing preview records remain preview records until a later schema decision.

## Context

AMS already needs to distinguish broad task work attempts from individual command/tool uses. Current run summaries, validation notes, CLI/MCP interactions, and work packets contain tool-use evidence, but without a stable record boundary they cannot cleanly answer which tool was used, what happened, whether validation was performed, or which approval applied.

The v2 preview implemented preview-only tool execution records linked to tasks, runs, and tools. Those records are exposed through search, work packets, reports, and the preview console. The later acceptance of minimal `Tool` makes `ToolExecution` stable enough to define as a narrow evidence record.

## Alternatives Considered

- Keep tool execution evidence only inside prose run summaries.
- Treat each tool execution as a full `Run`.
- Treat tool execution as an `Artifact`.
- Wait for tool launching before accepting `ToolExecution`.
- Accept only the minimal event/evidence concept now.

## Rationale

`ToolExecution` answers real AMS queries:

- Which tool uses occurred during a task or run?
- What input and result summaries are available for review?
- Did a tool execution pass, fail, skip, or require follow-up validation?
- Which approval or artifact evidence is associated with the tool use?

It is not reducible to existing concepts:

- `Run` is the broader task-linked work attempt that may contain many tool executions.
- `Tool` is the callable affordance, not a specific use of that affordance.
- `Approval` is a permission gate, not evidence that work was performed.
- `Artifact` is durable input/output, not the event that may produce it.

Accepting `ToolExecution` now gives AMS a stable evidence noun without accepting arbitrary command execution or a production telemetry system.

## Consequences

Easier:

- Work packets can include granular tool-use evidence.
- Reviews and evaluations can cite a concrete command/tool event instead of prose.
- Safety work can distinguish the approval policy for a tool from an individual approved execution.

Harder:

- AMS must preserve the boundary between `Run` and `ToolExecution`.
- Tool execution status must not become a duplicate task/run lifecycle.
- Production storage needs a separate migration and status decision.

Deferred:

- Tool launching remains out of scope.
- Automatic shell/MCP telemetry capture remains out of scope.
- Input/output schemas and redaction rules remain out of scope.
- Production table names, indexes, and retention policy remain out of scope.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/ontology-v1.md`
- `docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md`
