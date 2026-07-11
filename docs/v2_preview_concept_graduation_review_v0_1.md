# V2 Preview Concept Graduation Review v0.1

Date: 2026-07-03
Status: Completed graduation review; `Tool` and `EvaluationScenario` accepted as minimal concepts after follow-up hardening

## Purpose

The v2 preview system now has enough slices to inspect whether its preview concepts are useful. This review decides what should happen next to those concepts before AMS builds more runtime behavior.

This is a governance/design checkpoint, not an implementation migration.

## Scope

Reviewed concepts:

- `Tool`
- `ToolExecution`
- `EvaluationScenario`
- `EvaluationResult`
- `RoutingDecision`
- `DependencyReductionRecord`
- `MemoryItem`
- preview-created `Review`
- preview-created `Approval`
- read-side projections: vertical report, evidence timeline, grouped search, agent handoff packet, preview health

Sources inspected:

- `docs/domain-model-governance-protocol-v0.1.md`
- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md`
- `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`
- `docs/model-change-proposals/0003-preview-routing-decision.md`
- `docs/model-change-proposals/0004-preview-dependency-reduction-record.md`
- `docs/model-change-proposals/0005-preview-memory-item.md`
- `docs/model-change-proposals/0006-preview-review-approval-recording.md`
- `docs/model-evals/golden-scenarios.md`
- `src/lib/server/v2-preview-*-service.ts`
- `src/lib/server/v2-preview-work-packet.ts`
- `src/lib/server/v2-preview-report.ts`
- `src/lib/server/v2-preview-search.ts`
- `src/routes/app/v2-preview/`

## Graduation Criteria

A preview concept is ready to graduate only when it satisfies these criteria:

1. It supports a real workflow, query, decision, or validation need.
2. It has a clear identity boundary across time.
3. It is not just a UI projection, query result, derived view, or temporary packet.
4. It does not duplicate an accepted concept such as `Task`, `Run`, `Review`, `Approval`, `Decision`, `Artifact`, `Skill`, or `ExecutionSurface`.
5. It has clear examples and non-examples.
6. Its lifecycle/status fields affect behavior, filtering, validation, sequencing, or review.
7. It has enough preview evidence from services, CLI, work packets, search, reports, and UI to justify added schema complexity.
8. It has a migration path from v1 or a clear reason to be v2-native only.
9. It has known unresolved risks that can be bounded.
10. It has at least one golden scenario that becomes clearer because the concept exists.

## Competency Questions

The review used these questions:

1. Which tools are available or used for a task, and what evidence did each use produce?
2. Which evaluation scenarios exist, and what results show whether a capability is good enough?
3. Why was a provider/model/execution route selected for a task?
4. Which external AI affordances are still external-only, hybrid, locally assisted, locally reliable, or retired?
5. Which reusable local knowledge is trusted, proposed, draft, archived, or superseded?
6. Which governance records review or approve preview evidence?
7. Which preview surfaces are only read models and should never become domain entities?

## Summary Recommendation

Do **not** promote all preview concepts into accepted v2 schema yet.

The preview work proved that the concepts are useful for inspection, search, work-packet composition, and governance, but most still depend on unresolved boundaries around provider/model registry, capability taxonomy, evaluation semantics, memory governance, evidence targets, and routing policy.

Recommended maturity actions:

| Concept                     | Current status                    | Recommendation                                         | Rationale                                                                                            |
| --------------------------- | --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `Capability`                | Accepted minimal concept          | Keep accepted; defer taxonomy/schema/migration         | Stable ability concept needed by tasks, providers, models, evaluation, routing, and dependency work. |
| `Tool`                      | Accepted minimal concept          | Keep accepted; defer schema/migration/tool launching   | Stable kind with clear distinction from `Skill`, `Capability`, `Provider`, and `ExecutionSurface`.   |
| `ToolExecution`             | Accepted minimal concept          | Keep accepted; defer schema/migration/tool launching   | Stable evidence record once bounded as a granular tool-use event, not a replacement for `Run`.       |
| `Model`                     | Accepted minimal concept          | Keep accepted; defer registry/schema/migration         | Stable model/runtime identity concept needed by telemetry, evaluation, and routing evidence.         |
| `EvaluationScenario`        | Accepted minimal concept          | Keep accepted; defer schema/migration/result semantics | Stable reusable benchmark/rubric concept; distinct from `Task`, `Workflow`, and `Review`.            |
| `EvaluationResult`          | Accepted minimal concept          | Keep accepted; defer schema/migration/scoring policy   | Stable evidence record once bounded as a scenario outcome, not a replacement for `Run` or `Review`.  |
| `RoutingDecision`           | Experimental                      | Do not accept standalone; likely merge into `Decision` | Real need, but high duplication risk with `Decision` and premature routing policy.                   |
| `DependencyReductionRecord` | Experimental                      | Keep experimental; likely split before acceptance      | Strategically important but depends on mature `Capability`, provider/model, and routing concepts.    |
| `MemoryItem`                | Accepted minimal concept          | Keep accepted; defer schema/migration/retrieval policy | Stable governed knowledge concept once bounded by source evidence, scope, status, and supersession.  |
| preview-created `Review`    | Accepted concept; preview support | Keep accepted; preserve preview-write boundary         | No new entity; v2 preview proved safe creation without task-state mutation.                          |
| preview-created `Approval`  | Accepted concept; preview support | Keep accepted; keep UI write deferred unless needed    | Accepted concept, but richer evidence-target links are not proven yet.                               |
| vertical report             | Read model                        | Keep non-domain projection                             | Derived report over work packet/search/provenance; should not become persisted state.                |
| evidence timeline           | Read model                        | Keep non-domain projection                             | Presentation of existing records; no `Timeline` entity needed.                                       |
| grouped search              | Read model                        | Keep non-domain projection                             | Navigation aid over search results; not model vocabulary.                                            |
| agent handoff packet        | Read model                        | Keep non-domain projection                             | Bounded context transfer, not a prompt/session/entity source of truth.                               |
| preview health              | Operational metadata              | Keep non-domain projection                             | Runtime visibility over DB/index/source metadata; not product state.                                 |

## Concept Findings

### Tool

Recommendation: accepted minimal concept.

Why:

- The concept has a stable identity: a callable software capability or external system.
- The preview implementation has registry, CLI, search, work-packet, and report integration.
- It answers a recurring workflow question that v1 cannot answer with `Task.requiredToolNames`.
- It has clear boundaries from `Skill`, `Capability`, `Provider`, and `ExecutionSurface`.

Accepted by:

- `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`

Still deferred:

- production schema and migration
- tool launching
- richer input/output schema modeling
- final execution-surface/tool availability rules

### ToolExecution

Recommendation: accepted minimal concept.

Why:

- The concept is useful and distinct from `Run` when a work attempt uses multiple tools.
- Preview tests show creation, linking, work-packet inclusion, and search.

Accepted by:

- `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`

Still deferred:

- production schema and migration
- tool launching
- automatic telemetry capture
- richer input/output schema modeling
- final status vocabulary, retention, and redaction rules

Accepted boundary:

- `ToolExecution` is a granular evidence/event record linked to a task and accepted `Tool`.
- It may link to a `Run`, but it is not a full task work attempt.
- It may cite approval/artifact evidence, but it is not an approval or artifact.

### EvaluationScenario

Recommendation: accepted minimal concept.

Why:

- It is a reusable benchmark/rubric concept, not a task instance.
- It already exists informally in golden scenarios and tests.
- It is necessary for owned-agent dependency reduction because quality needs repeatable evidence.

Accepted by:

- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`

Still deferred:

- production schema and migration
- benchmark execution
- production schema and migration for result records
- numeric score semantics

### EvaluationResult

Recommendation: accepted minimal concept.

Why:

- It is useful evidence, and preview tests show task/run/tool/provider/model links.
- It supports dependency-reduction and routing decisions.

Accepted by:

- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`

Still deferred:

- production schema and migration
- benchmark execution
- global score normalization
- automatic routing
- provider/model registry links
- dependency-retirement policy

Accepted boundary:

- `EvaluationResult` is status-bearing evidence for one accepted `EvaluationScenario` outcome.
- It may cite task, run, tool execution, provider, model, and artifact evidence.
- It is not a task `Run`, human/governance `Review`, or durable `Decision`.
- Numeric scores are scenario-scoped until a later decision defines comparability.

- Define a minimal result shape that separates objective benchmark outcome from human review.

### RoutingDecision

Recommendation: keep experimental.

Why:

- Routing rationale is important to the owned-agent goal.
- The preview record makes privacy, cost, capability, locality, and rejected alternatives inspectable.

Do not accept yet because:

- It risks becoming a second `Decision` log.
- It may be better as structured metadata on accepted `Decision`.
- It may split into `RoutingPolicy` plus task-specific routing record later.
- Provider/model production registry is not accepted yet.

Next decision needed:

- Production route choices should likely be accepted `Decision` records with routing-specific metadata.
- A reusable `RoutingPolicy` concept may be introduced later if policy reuse becomes concrete.

### DependencyReductionRecord

Recommendation: keep experimental.

Why:

- It directly represents the larger goal: replacing external AI affordances with owned/local capability.
- It connects evaluation and routing evidence to capability-level progress.

Do not accept yet because:

- `Capability` is now an accepted minimal concept, but production taxonomy/registry and evidence thresholds remain deferred.
- Provider/model links and routing evidence are still experimental.
- Replacement statuses risk implying provider retirement before evidence is strong.
- It may later split into capability status, provider retirement policy, and evidence links.

Next decision needed:

- Define capability replacement state and source-linked evidence separately before production acceptance.

- Define a capability taxonomy and evidence threshold before accepting replacement-status records.

### MemoryItem

Recommendation: accepted minimal concept.

Why:

- Governed local memory is central to replacing external chat memory.
- The preview concept has source evidence, lifecycle status, and scoped work-packet exposure.

Accepted by:

- `docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md`

Still deferred:

- production schema and migration
- automatic memory extraction
- automatic publication
- retrieval ranking
- expiration and conflict policy
- skill promotion
- splitting memory into project facts, procedural lessons, constraints, retrieval documents, and skill candidates

Accepted boundary:

- `MemoryItem` is source-linked reusable local knowledge scoped to a project and optionally a task.
- Status controls whether the item is draft, proposed, published, archived, or superseded.
- It is not a transcript, prompt cache, decision, run, artifact, skill, or broad project memory prose.
- Published memory is not proof of permanent global truth; supersession and review policy remain required.

### Review And Approval

Recommendation: keep accepted; preserve preview boundary.

Why:

- They are already accepted concepts.
- The preview slice did not create duplicate governance entities.
- Tests and UI smoke prove that preview review/decision writes can preserve provenance without mutating task state.

Open issue:

- Preview `Review` and `Approval` currently target task/run only. Future workflows may need richer evidence-target links to memory/evaluation/routing/dependency records, but that should be a separate model proposal.

## Read-Side Projection Findings

These should remain explicitly non-domain:

- vertical report
- evidence timeline
- grouped search result groups
- agent handoff packet
- preview health panel

They help people and agents inspect data, but none carries durable identity or workflow authority.

Failure mode to avoid: creating persisted `Report`, `Timeline`, `SearchGroup`, `HandoffPacket`, or `Health` entities because the UI is useful.

## Graduation Queue

Recommended order after hardening:

1. `EvaluationResult`
2. `ToolExecution`
3. `MemoryItem`
4. `RoutingDecision`
5. `DependencyReductionRecord`

Reasoning:

- `Tool` and `EvaluationScenario` are now accepted minimal definitions.
- `EvaluationResult` and `ToolExecution` are evidence/event records that depend on those definitions and still need lifecycle/status hardening.
- `MemoryItem` needs governance and retrieval policy before acceptance.
- `RoutingDecision` and `DependencyReductionRecord` depend on provider/model/capability/evaluation maturity.

## Completed Follow-Up Milestone

**Tool And EvaluationScenario Acceptance Candidate Hardening**

Completed:

- Created focused accepted model decision records for minimal `Tool` and `EvaluationScenario`.
- Defined only the smallest core fields.
- Decided what stays preview-only.
- Updated glossary, model, schema-contract, and diagram docs.
- Added no runtime migration.
- Kept `ToolExecution`, `EvaluationResult`, `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` experimental at that point, pending follow-up hardening.

**EvaluationResult And ToolExecution Evidence Hardening**

Completed:

- Accepted minimal `ToolExecution` and `EvaluationResult` evidence concepts.
- Defined their narrow boundaries from `Run`, `Tool`, `Review`, `Decision`, `Approval`, and `Artifact`.
- Rejected current use of `EvaluationRun` in favor of `EvaluationResult`.
- Kept preview tables as preview storage.
- Added no runtime migration.
- Kept `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` experimental at that point, pending follow-up hardening.

**MemoryItem Governance And Retrieval Boundary Hardening**

Completed:

- Accepted minimal `MemoryItem` governed knowledge concept.
- Defined source, scope, lifecycle, supersession, and retrieval-trust boundaries.
- Kept preview tables as preview storage.
- Added no runtime migration.
- Kept automatic extraction, publication, ranking, expiration, conflict handling, and skill promotion deferred.
- Kept `RoutingDecision` and `DependencyReductionRecord` experimental.

**RoutingDecision And DependencyReductionRecord Policy Boundary Hardening**

Completed:

- Decided not to accept `RoutingDecision` as a standalone production entity.
- Set production direction toward accepted `Decision` records with routing-specific metadata, with `RoutingPolicy` deferred.
- Kept `DependencyReductionRecord` experimental.
- Set production direction toward splitting capability/external-affordance replacement state from source-linked evidence.
- Added no runtime migration, production schema, automatic routing, or provider-retirement behavior.

## Completed Mid-Size Milestone

**Capability Taxonomy And Provider/Model Registry Boundary Hardening**

Completed:

- Accepted minimal `Capability` concept.
- Accepted minimal `Model` concept.
- Confirmed `Provider` remains an accepted existing implementation record.
- Kept production capability taxonomy, model registry, pricing refresh, benchmark execution, automatic routing, and provider-retirement policy deferred.
- Added no runtime migration or production registry schema.

## Completed Mid-Size Milestone

**Registry Schema Boundary And Source-Label Migration Plan**

Completed:

- Decide production registry schema boundaries for accepted `Capability`, `Tool`, and `Model` concepts.
- Define how source labels from tasks, providers, runs, evaluations, routing, and dependency-reduction preview records map into registries.
- Define alias/version policy before migration.
- Add no runtime migration.
- Keep automatic routing and provider-retirement policy deferred.

## Recommended Next Mid-Size Milestone

**Registry Schema Proof In Preview DB**

Done means:

- Add preview-only proof tables for registry rows and source-label mappings in an isolated preview DB.
- Load labels from the existing import preview fixture.
- Preserve raw labels and source references.
- Demonstrate ambiguous/unmapped/accepted mapping states.
- Add tests only against temp/preview storage.
- Add no production migration.

## Non-Goals

- Do not migrate preview tables into production state.
- Do not accept all preview concepts as core v2 schema.
- Do not implement automatic routing.
- Do not publish memory automatically.
- Do not create a production provider/model registry in this review.
- Do not create a tool launcher.
- Do not add new UI write actions.

## Decision

The current preview concepts should remain under the preview boundary, except that `Tool` and `EvaluationScenario` are accepted as minimal concepts by focused follow-up decisions.

Source-of-truth glossary maturity statuses are changed only for `Tool` and `EvaluationScenario`.
