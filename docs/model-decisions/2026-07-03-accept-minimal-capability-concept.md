# Model Decision: Accept Minimal Capability Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `Capability` as a core AMS/v2 concept.

A `Capability` is a reusable ability, competency, or work affordance required by a task or provided by an actor, role, model, provider, execution surface, tool, workflow, or skill.

Minimal accepted fields:

- `id`
- `name`
- `description`
- `category`
- `status`

The accepted concept does not require a production capability table, controlled taxonomy, migration, routing policy, or dependency-reduction status in this decision. Existing capability strings remain source/candidate labels until a later schema decision accepts registry persistence and normalization rules.

## Context

AMS already uses capability names in tasks, providers, execution-surface fit checks, task templates, ontology projections, v2 preview evaluation scenarios, routing rationale, and dependency-reduction records. The concept is already central to planning and routing, but today it is mostly represented as strings.

Recent hardening kept `DependencyReductionRecord` experimental partly because `Capability` had not yet been accepted. Accepting the minimal concept gives routing, evaluation, and dependency-reduction evidence a stable vocabulary without forcing a complete taxonomy.

## Alternatives Considered

- Keep capability only as free text forever.
- Treat capabilities as roles.
- Treat capabilities as skills.
- Treat capabilities as tools.
- Accept a full controlled taxonomy now.
- Accept only the minimal concept and defer registry/taxonomy policy.

## Rationale

`Capability` answers real AMS questions:

- What ability does this task require?
- What ability does this provider, model, execution surface, role, tool, workflow, or skill provide?
- Which evaluation scenarios test a capability?
- Which external affordances are being replaced for a capability?

It is not reducible to existing concepts:

- `Role` is a responsibility or perspective, not the ability itself.
- `Skill` is reusable agent instruction or procedure.
- `Tool` is a callable affordance.
- `Provider` supplies infrastructure or model/runtime access.
- `ExecutionSurface` is where work runs.

Accepting `Capability` now removes ambiguity in the ontology while keeping normalization and policy work deferred.

## Consequences

Easier:

- Evaluation, routing, provider/model, and dependency-reduction docs can cite one accepted ability concept.
- Future taxonomy work has a stable target.
- Agents can distinguish capability labels from roles, tools, skills, and providers.

Harder:

- Capability labels must not become an uncontrolled synonym pile.
- Capability status and category need future governance.
- Production schema still needs a separate migration decision.

Deferred:

- Production capability registry.
- Controlled taxonomy and alias handling.
- Capability hierarchy.
- Capability replacement status.
- Routing policy based on capability.
- Provider/model capability conformance tests.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/ontology-v1.md`
