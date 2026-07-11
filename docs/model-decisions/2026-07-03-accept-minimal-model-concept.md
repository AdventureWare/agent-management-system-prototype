# Model Decision: Accept Minimal Model Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `Model` as a core AMS/v2 concept.

A `Model` is a specific AI model, local model, runtime option, or model-like engine offered by a `Provider` or local runtime and usable for work, evaluation, routing, or telemetry.

Minimal accepted fields:

- `id`
- `providerId`
- `name`
- `kind`
- `locality`
- `capabilityNames`
- `status`
- `contextWindow`
- `costSummary`

The accepted concept does not require a production model registry table, model-catalog sync, pricing schema, benchmark runner, automatic routing, or provider retirement policy in this decision. Existing provider default-model strings, pricing rows, run model fields, and preview labels remain source/candidate records until a later schema decision accepts persistence and normalization rules.

## Context

AMS already records model information in provider defaults, provider model pricing, launch context, run telemetry, observed model fields, evaluation results, routing rationale, and dependency-reduction evidence. The current representation is fragmented across strings and provider metadata.

Routing and dependency-reduction work needs to distinguish provider identity from the specific model/runtime option. Accepting the minimal `Model` concept gives AMS stable vocabulary without committing to a production registry or current external model catalog.

## Alternatives Considered

- Keep model names only as strings on providers and runs.
- Treat model identity as part of `Provider`.
- Treat model identity as part of `ExecutionSurface`.
- Accept a full model registry and pricing schema now.
- Accept only the minimal model concept and defer registry details.

## Rationale

`Model` answers real AMS questions:

- Which model was intended for a run?
- Which model was actually used?
- Which model was evaluated against a scenario?
- Which model was selected or rejected in routing rationale?
- Which model capabilities, locality, cost, and context limits matter for work?

It is not reducible to existing concepts:

- `Provider` is the organization/backend/runtime source; a provider can offer many models.
- `ExecutionSurface` is where work runs; it may use a provider/model.
- `Run` records one work attempt and may cite model usage.
- `EvaluationResult` records scenario outcome, not model identity.

Accepting `Model` now clarifies identity while avoiding brittle catalog implementation.

## Consequences

Easier:

- Run telemetry, evaluation evidence, and routing rationale can refer to a stable concept.
- Provider and model boundaries become clearer.
- Future local/open model support has a vocabulary independent of external provider names.

Harder:

- Model names, aliases, versions, and provider-specific IDs need later normalization.
- Pricing and context-window data need freshness governance.
- Production schema still needs a separate migration decision.

Deferred:

- Production model registry.
- Model alias/version policy.
- Pricing schema and refresh process.
- Benchmark execution.
- Automatic routing.
- Provider retirement policy.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/ontology-v1.md`
