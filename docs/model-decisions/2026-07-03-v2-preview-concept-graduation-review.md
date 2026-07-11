# Model Decision: V2 Preview Concept Graduation Review

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Do not promote the v2 preview concepts wholesale into accepted production schema.

Keep these concepts experimental:

- `ToolExecution`
- `EvaluationResult`
- `RoutingDecision`
- `DependencyReductionRecord`
- `MemoryItem`

Treat these concepts as acceptance candidates that deserve focused follow-up decisions:

- `Tool`
- `EvaluationScenario`

Follow-up completed:

- `Tool` accepted as a minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`.
- `EvaluationScenario` accepted as a minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`.

Keep preview-created `Review` and `Approval` as preview write support for already accepted concepts.

Keep these surfaces explicitly non-domain read-side projections:

- vertical report
- evidence timeline
- grouped search
- agent handoff packet
- preview health

## Context

The v2 preview milestone implemented enough evidence to inspect task-centered work:

- preview SQLite seed/import boundary
- task, run, artifact, decision, review, approval, tool, evaluation, routing, dependency-reduction, and memory preview services
- local SQLite FTS search
- work-packet and vertical report read models
- `/app/v2-preview` inspection/governance console
- guarded preview review and decision writes
- smoke procedure against an explicit temp preview DB

The preview concepts are now useful, but usefulness in preview does not automatically mean the concepts should become accepted schema.

## Alternatives Considered

- Accept all preview concepts into v2 core schema now.
- Keep all preview concepts experimental indefinitely.
- Accept only `Review` and `Approval` because they already exist.
- Promote `Tool` and `EvaluationScenario` first, while keeping evidence/event/policy-dependent concepts experimental.

## Rationale

`Tool` and `EvaluationScenario` are stable definition-like concepts. They have clear boundaries from nearby accepted concepts and support recurring queries that v1 cannot answer cleanly.

At the time of this decision, `ToolExecution`, `EvaluationResult`, `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` were useful but still carried unresolved modeling risk:

- `ToolExecution` could duplicate `Run`.
- `EvaluationResult` could duplicate `Review` or imply false precision.
- `RoutingDecision` could duplicate `Decision` or become premature routing policy.
- `DependencyReductionRecord` depends on unresolved capability, evaluation, and routing models.
- `MemoryItem` could pollute trusted context without stronger governance and retrieval policy.

Post-decision note: `ToolExecution`, `EvaluationResult`, and `MemoryItem` were later accepted as minimal concepts by focused 2026-07-03 model decisions. `RoutingDecision` was later rejected as a standalone production entity, and `DependencyReductionRecord` was kept experimental pending a split between replacement state and evidence links. All preview tables remain preview storage.

Read-side projections are valuable UI/read-model constructs, but they should not become domain entities merely because they are useful.

## Consequences

Easier:

- Continue v2 preview work without schema drift.
- Focus next model work on the two most stable candidate concepts.
- Avoid hardening preview-only event/status records into production prematurely.

Harder:

- Runtime v2 cannot yet rely on accepted production schema for tool execution logs, evaluation results, routing rationale, dependency-reduction status, or governed memory.
- More focused model decisions are needed before migration.

Required:

- Create focused acceptance decisions before changing glossary maturity, production schema, API vocabulary, or migration behavior for `Tool` and `EvaluationScenario`.
- Keep preview tables and services clearly labeled as preview/experimental.
- Keep `data/app.sqlite` out of v2 preview experiments.

## Source Updates

- `docs/v2_preview_concept_graduation_review_v0_1.md`
- `docs/README.md`
- `docs/stack_assessment/next_implementation_steps_v0_1.md`
- `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`
- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`
