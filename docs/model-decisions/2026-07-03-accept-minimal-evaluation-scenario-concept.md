# Model Decision: Accept Minimal EvaluationScenario Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `EvaluationScenario` as a core AMS/v2 domain concept.

An `EvaluationScenario` is a reusable benchmark, golden scenario, rubric-backed prompt/task, or capability check used to evaluate whether AMS, a model, provider, tool, or workflow performs a class of work well enough.

Minimal accepted fields:

- `id`
- `projectId`
- `title`
- `capabilityName`
- `promptOrTask`
- `rubric`
- `status`
- `version`

The accepted concept does not require production schema or migration in this decision. Existing preview scenario records remain preview records until a later schema decision.

## Context

AMS already uses model golden scenarios, tests, smoke procedures, and release/readiness checks to evaluate whether domain concepts and workflows work. The v2 preview implemented preview-only evaluation scenarios and evaluation results, exposed them through work packets/search/reports, and used them as evidence for dependency-reduction and routing exploration.

The concept graduation review concluded that `EvaluationScenario` is a stable reusable definition, while `EvaluationResult` still needs more status/score/rubric governance before acceptance.

## Alternatives Considered

- Keep evaluation scenarios only as Markdown docs and tests.
- Treat each evaluation scenario as a `Task`.
- Treat evaluation scenarios as `Workflow` records.
- Accept `EvaluationResult` together with `EvaluationScenario`.
- Accept only the reusable `EvaluationScenario` definition now.

## Rationale

`EvaluationScenario` answers real AMS queries:

- Which capability checks exist for a project?
- What rubric defines acceptable quality for a class of work?
- Which scenarios should be rerun when model/provider/tool behavior changes?
- Which scenarios support dependency-reduction or routing decisions?

It is not reducible to existing concepts:

- `Task` is one bounded operational work item; a scenario is reusable evaluation context.
- `Workflow` describes how to do recurring work; a scenario describes how to judge capability.
- `Review` evaluates submitted evidence; a scenario defines repeatable criteria.
- `Decision` may cite evaluation evidence but is not the scenario itself.

Accepting `EvaluationScenario` now gives AMS stable vocabulary for benchmark definitions without accepting immature score/result semantics.

## Consequences

Easier:

- Golden scenarios can be discussed as first-class model artifacts.
- Future evaluation services can use stable scenario definitions.
- Dependency-reduction and routing work can cite scenarios without conflating them with tasks.

Harder:

- Scenario versioning must be treated carefully.
- Scenario status must remain separate from task/review/result status.
- Production schema still needs a separate migration decision.

Deferred at the time of this decision:

- `EvaluationResult` acceptance.
- Benchmark execution remains out of scope.
- Numeric score semantics remain out of scope.
- Provider/model registry links remain out of scope.

Post-decision note: `EvaluationResult` was accepted as a minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`; benchmark execution, global score normalization, provider/model registry links, and production schema remain deferred.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/v2_preview_concept_graduation_review_v0_1.md`
- `docs/stack_assessment/next_implementation_steps_v0_1.md`
