# Model Decision: Keep DependencyReductionRecord Experimental

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Keep `DependencyReductionRecord` experimental. Do not accept it as a core AMS/v2 concept yet.

The preview concept is useful, but production modeling should likely split the current record into at least:

- a capability or affordance replacement status concept, and
- source-linked evidence records or decision links that justify that status.

This decision does not reject the need to track external-AI dependency reduction. It rejects accepting the current preview record as the final ontology boundary.

## Context

The v2 preview implemented dependency-reduction records with capability labels, external affordance labels, provider labels, replacement status, evaluation-result links, routing-decision links, evidence summaries, trends, and next steps. Tests show that these records can be capability-level or task-linked, link to evaluation/routing evidence, appear in work packets, and be searched.

The strategic need is clear: AMS should track whether owned/local workflows are replacing affordances currently provided by external AI systems. The modeling risk is also clear: current records mix capability state, evidence summary, trend notes, provider label, and future policy implications.

## Alternatives Considered

- Accept `DependencyReductionRecord` as a core entity now.
- Reject dependency-reduction tracking and rely on decisions/evaluations only.
- Merge dependency-reduction status into `MemoryItem`.
- Merge dependency-reduction status into `Decision`.
- Keep the preview record experimental and define the split before production schema.

## Rationale

Dependency-reduction tracking answers real AMS questions:

- Which external affordance is still needed?
- Which local or owned workflow is replacing it?
- What evidence supports the current replacement status?
- What must improve before external dependency can be reduced further?

But the current preview record combines several concerns:

- capability or affordance replacement state
- provider/model dependency status
- evidence links
- trend notes
- next-step planning
- possible provider-retirement implications

`Capability` and `Model` are now accepted minimal concepts, but their production registries, alias/version policies, provider/model links, and evidence thresholds are still deferred. `RoutingDecision` should not become standalone production schema. Accepting `DependencyReductionRecord` now would imply more maturity than the surrounding registry and policy layer supports.

## Consequences

Easier:

- AMS avoids turning replacement-status notes into provider-retirement policy.
- Future modeling can distinguish durable replacement state from supporting evidence.
- Dependency-reduction work can continue in preview without hardening premature schema.

Harder:

- External-AI dependency tracking remains preview-only.
- Capability replacement dashboards and policy automation remain deferred.
- A later decision must name the production concepts and statuses.

Deferred:

- Accepted capability taxonomy.
- Accepted provider/model registry links.
- Production replacement-status schema.
- Provider retirement policy.
- Automatic routing behavior from replacement status.
- Evidence threshold rules for `locally_reliable` or `external_retired`.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/model-change-proposals/0004-preview-dependency-reduction-record.md`
