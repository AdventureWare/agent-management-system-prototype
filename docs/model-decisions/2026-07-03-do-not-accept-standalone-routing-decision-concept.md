# Model Decision: Do Not Accept Standalone RoutingDecision Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Do not accept `RoutingDecision` as a standalone core AMS/v2 domain entity.

For now, keep `RoutingDecision` as preview-only structured routing rationale. Future production work should either:

- merge routing rationale into the accepted `Decision` concept with routing-specific fields or decision type, or
- introduce a separate `RoutingPolicy` concept for reusable policy while keeping task-specific route choices as `Decision` records.

The preview `RoutingDecision` name and table remain useful experimental evidence, but they must not become production schema or a second durable decision log.

## Context

The v2 preview implemented task-linked routing records that capture provider/model labels, capability label, routing basis, selected reason, rejected options, risk, privacy, cost priority, and status. Tests show that these records can be linked to tasks/runs, exposed in work packets, indexed in search, and cited by dependency-reduction records.

The preview also showed the main modeling risk: the thing being recorded is a task-specific choice and rationale. AMS already has an accepted `Decision` concept for durable choices with rationale and evidence.

## Alternatives Considered

- Accept `RoutingDecision` as a standalone core entity.
- Reject routing rationale entirely and keep it only in prose.
- Merge all routing fields immediately into `Decision`.
- Add `RoutingPolicy` now.
- Keep preview `RoutingDecision` records while deciding that production route choices should be `Decision`-backed.

## Rationale

Routing rationale answers real AMS questions:

- Why was a local, external, human, or tool route selected?
- Which alternatives were rejected?
- What privacy, cost, risk, locality, or capability constraints mattered?
- Which evaluation evidence influenced the route?

But the stable concept is not a new kind of decision entity. It is a routing-specific decision view:

- `Decision` already owns durable choices and rationale.
- `Run` records what happened after a route was selected.
- `EvaluationResult` records quality evidence that may inform route choice.
- `Provider`, `Model`, and `Capability` are not mature enough for production routing policy.

Accepting a standalone `RoutingDecision` would create a parallel decision log. That would make it unclear whether humans and agents should inspect `Decision`, `RoutingDecision`, or both before acting.

## Consequences

Easier:

- AMS avoids duplicate decision systems.
- Future production routing can reuse accepted governance surfaces.
- Preview routing evidence remains available for design and migration.

Harder:

- The preview route-rationale table stays experimental.
- A later schema decision must define how routing metadata attaches to `Decision`.
- A reusable `RoutingPolicy` concept remains deferred.

Deferred:

- Production routing schema.
- Automatic routing.
- Provider/model registry integration.
- Capability taxonomy.
- Reusable routing policy.
- Status enum for selected/proposed/rejected route choices.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/model-change-proposals/0003-preview-routing-decision.md`
