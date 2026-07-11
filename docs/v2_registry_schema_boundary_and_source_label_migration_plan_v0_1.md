# V2 Registry Schema Boundary And Source-Label Migration Plan v0.1

Date: 2026-07-03
Status: Design boundary, no implementation authorized

## Purpose

Define how accepted `Capability`, `Tool`, and `Model` concepts should eventually become production registries, and how existing source labels should map into those registries without prematurely rewriting runtime state.

This document does not create tables, migrations, routes, CLI commands, UI writes, automatic routing, tool launching, benchmark execution, or provider-retirement policy.

## Current Decision State

Accepted minimal concepts:

- `Capability`: `docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md`
- `Tool`: `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`
- `Model`: `docs/model-decisions/2026-07-03-accept-minimal-model-concept.md`

Accepted existing implementation record:

- `Provider`

Accepted evidence concepts that may cite these registries later:

- `ToolExecution`
- `EvaluationScenario`
- `EvaluationResult`
- `MemoryItem`

Still experimental:

- preview `RoutingDecision`
- preview `DependencyReductionRecord`

Rejected as production standalone:

- standalone `RoutingDecision`

## Source Labels

A source label is a string or record field that appears to refer to an accepted concept, but has not yet been matched to a governed registry row.

Examples:

- `Task.requiredCapabilityNames`
- `Task.requiredToolNames`
- `Provider.capabilities`
- `Provider.defaultModel`
- `Provider.modelPricing[].model`
- `Run.modelUsed`
- `Run.observedModelUsed`
- preview `EvaluationScenario.capabilityName`
- preview `EvaluationResult.providerId`
- preview `EvaluationResult.modelId`
- preview `RoutingDecision.capabilityName`
- preview `RoutingDecision.providerId`
- preview `RoutingDecision.modelId`
- preview `DependencyReductionRecord.capabilityName`
- preview `DependencyReductionRecord.providerId`

Source labels must be preserved with provenance before any normalization. They are evidence, not registry truth.

## Competency Questions

The future registry layer should answer:

1. Which tasks require a capability, tool, or model-like engine?
2. Which providers, models, execution surfaces, tools, roles, workflows, or skills claim to support a capability?
3. Which labels from v1, preview tables, runs, evaluations, and routing evidence refer to the same concept?
4. Which labels are ambiguous, stale, conflicting, or unmapped?
5. Which model was intended, observed, evaluated, or selected for a task/run?
6. Which tool was required, available, used, or approved?
7. Which capability is being evaluated or targeted for dependency reduction?
8. What evidence supports promoting a source label into a governed registry row?

## Proposed Registry Boundaries

### Capability Registry

Purpose: governed vocabulary of reusable abilities.

Minimal future fields:

- `id`
- `name`
- `description`
- `category`
- `status`
- `canonicalLabel`
- `createdAt`
- `updatedAt`

Optional later fields:

- parent capability id
- aliases
- evidence threshold notes
- evaluation scenario ids
- dependency-reduction status id

Do not include in the first registry:

- automatic routing score
- local replacement status
- provider retirement policy
- benchmark pass/fail rollups

### Tool Registry

Purpose: governed vocabulary of callable software affordances.

Minimal future fields:

- `id`
- `name`
- `description`
- `kind`
- `owner`
- `status`
- `riskLevel`
- `approvalMode`
- `canonicalLabel`
- `createdAt`
- `updatedAt`

Optional later fields:

- input schema
- output schema
- execution-surface availability
- version
- redaction policy

Do not include in the first registry:

- execution log rows
- tool launcher configuration
- command approval grants
- artifact contents

### Model Registry

Purpose: governed vocabulary of model/runtime options under providers.

Minimal future fields:

- `id`
- `providerId`
- `name`
- `kind`
- `locality`
- `capabilityNames`
- `status`
- `contextWindow`
- `costSummary`
- `canonicalLabel`
- `createdAt`
- `updatedAt`

Optional later fields:

- provider model id
- version family
- alias labels
- pricing rows
- benchmark summary links
- context-window source
- deprecation/supersession link

Do not include in the first registry:

- automatic routing policy
- live catalog sync
- provider retirement status
- benchmark execution results

## Source-Label Mapping Boundary

Future migration should introduce source-label mapping as a separate layer from registry rows.

Minimal future source-label fields:

- `id`
- `sourceSystem`
- `sourceCollection`
- `sourceRecordId`
- `sourceField`
- `rawLabel`
- `normalizedLabel`
- `candidateConceptType`
- `candidateRegistryId`
- `mappingStatus`
- `mappingRationale`
- `createdAt`
- `updatedAt`

Suggested `candidateConceptType` values:

- `capability`
- `tool`
- `model`
- `provider`
- `skill`
- `unknown`

Suggested `mappingStatus` values:

- `unmapped`
- `candidate`
- `accepted`
- `ambiguous`
- `rejected`
- `superseded`

Rules:

- Never overwrite raw labels.
- Do not auto-accept a mapping only because normalized strings match.
- Allow one raw label to remain ambiguous until a human/model-governance review resolves it.
- Preserve labels that point to concepts not yet governed, such as skills or future routing policy.
- Treat provider/model labels from preview routing as evidence, not production route choices.

## Alias And Version Policy

Capability aliases:

- Use aliases for spelling, pluralization, and local synonyms.
- Do not use aliases to hide genuinely different capabilities.
- Record ambiguous labels rather than forcing one match.

Tool aliases:

- Keep command names, package names, MCP tool names, and product names distinguishable when needed.
- A tool alias should not imply approval to execute the tool.

Model aliases:

- Separate provider-facing model id, local display name, and family/version label.
- Do not collapse model families into one model when evaluation or routing behavior may differ.
- Treat pricing and context-window data as source-attributed and freshness-sensitive.

## Migration Sequence

1. Inventory source labels from existing v1 and preview sources.
2. Normalize labels with deterministic rules for comparison only.
3. Create candidate source-label mapping rows.
4. Review high-frequency labels manually before accepting registry rows.
5. Create minimal registry rows for unambiguous high-value labels.
6. Link source labels to registry rows with mapping rationale.
7. Keep task/provider/run/evaluation/routing records readable through their original labels during transition.
8. Only after read paths and tests pass, propose migrations that add registry foreign keys to production records.

## Acceptance Gates Before Implementation

Before creating production registry tables:

- A schema decision must define table names, indexes, constraints, and source-label mapping tables.
- Migration tests must prove raw labels are preserved.
- Fixtures must include ambiguous labels and rejected mappings.
- Work-packet/search/read-model tests must show both raw labels and registry links.
- Provider/model pricing data must be marked with source and freshness.
- Registry writes must be reviewable and reversible.

## Non-Goals

- Do not implement registry tables in this pass.
- Do not migrate `data/app.sqlite`.
- Do not rewrite task/provider/run records.
- Do not create automatic routing.
- Do not create model-catalog sync.
- Do not create tool launching.
- Do not infer provider retirement from registry data.

## Recommended Next Milestone

**Registry Schema Proof In Preview DB**

Implemented in `src/lib/server/v2-preview-registry-service.ts` and `src/lib/server/v2-preview-registry-service.spec.ts`. Inspectable through `npm run v2:preview-db -- registry-proof`.

Done means:

- Add preview-only proof tables for registry rows and source-label mappings in an isolated preview DB.
- Load labels from the existing import preview fixture.
- Preserve raw labels and source references.
- Demonstrate ambiguous/unmapped/accepted mapping states.
- Add tests only against temp/preview storage.
- Add no production migration.

Remaining boundary:

- The proof preserves source-label occurrences, not just unique labels.
- Registry entry writes are explicit preview records with `ams-v2-preview` provenance.
- Mapping an imported label to a registry row requires an explicit mapping update and rationale.
- This proof does not add production foreign keys, rewrite imported records, route models, launch tools, or sync a model catalog.
