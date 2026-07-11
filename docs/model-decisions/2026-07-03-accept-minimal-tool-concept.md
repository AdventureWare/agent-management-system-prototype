# Model Decision: Accept Minimal Tool Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `Tool` as a core AMS/v2 domain concept.

A `Tool` is a callable software capability, command, connector, script, API surface, or external system that may be required by a task, made available through an execution surface, or used during a run.

Minimal accepted fields:

- `id`
- `name`
- `description`
- `kind`
- `owner`
- `status`
- `riskLevel`
- `approvalMode`

The accepted concept does not require production schema or migration in this decision. Existing preview records remain preview records until a later schema decision.

## Context

AMS already represents tool needs as strings such as task `requiredToolNames`, CLI/MCP command names, script names, and prose run summaries. The v2 preview implemented a preview-only tool registry and tool execution log, then exposed tool records through CLI, search, work packets, vertical reports, and the preview console.

The concept graduation review concluded that `Tool` has a stable identity and clear boundaries from nearby concepts.

## Alternatives Considered

- Keep tool requirements as task-level strings only.
- Treat `Tool` as a subtype of `Capability`.
- Treat `Tool` as part of `ExecutionSurface`.
- Accept `ToolExecution` together with `Tool`.
- Accept only the minimal `Tool` definition now.

## Rationale

`Tool` answers real AMS queries:

- Which callable surfaces are available?
- Which tasks require a particular tool?
- What risk and approval policy applies before use?
- Which execution surfaces or agents can use a tool?

It is not reducible to existing concepts:

- `Skill` is instruction/process guidance, not software invocation.
- `Capability` is an ability, not the callable surface that performs work.
- `Provider` is infrastructure/service metadata, not a specific command or connector.
- `ExecutionSurface` is where work runs, not the tool used inside that work.
- `Run` is a work attempt, not the callable affordance used by the attempt.

Accepting `Tool` now removes ambiguity without accepting the riskier execution-event model.

## Consequences

Easier:

- Tasks can refer to tools without treating tool names as ungoverned strings forever.
- Future execution-safety work has a stable concept for risk and approval policy.
- Work packets can distinguish tools from skills, capabilities, providers, and execution surfaces.

Harder:

- AMS must maintain the boundary between `Tool` and `ToolExecution`.
- Tool lifecycle/status must remain scoped to tool availability, not task/run status.
- Production schema still needs a separate migration decision.

Deferred at the time of this decision:

- `ToolExecution` acceptance.
- Tool launching remains out of scope.
- Tool-to-execution-surface availability rules remain to be modeled.
- Input/output schemas may be added later, but they are not part of the minimal accepted concept.

Post-decision note: `ToolExecution` was accepted as a minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`; tool launching and production schema remain deferred.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/v2_preview_concept_graduation_review_v0_1.md`
- `docs/stack_assessment/next_implementation_steps_v0_1.md`
