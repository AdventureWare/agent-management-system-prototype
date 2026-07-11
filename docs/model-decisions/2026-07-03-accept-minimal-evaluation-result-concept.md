# Model Decision: Accept Minimal EvaluationResult Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `EvaluationResult` as a core AMS/v2 evidence concept.

An `EvaluationResult` is a status-bearing evidence record that reports how one task, run, tool execution, provider, model, or workflow performed against an accepted `EvaluationScenario`.

Minimal accepted fields:

- `id`
- `scenarioId`
- `taskId`
- `runId`
- `toolExecutionId`
- `providerId`
- `modelId`
- `status`
- `score`
- `rubricSummary`
- `resultSummary`
- `failureSummary`
- `createdAt`

The accepted concept does not require production schema, migration, benchmark execution, global score normalization, automatic model routing, or provider retirement policy in this decision. Existing preview records remain preview records until a later schema decision.

## Context

AMS needs durable evaluation evidence to decide whether owned/local workflows are improving, whether model/provider routing is justified, and whether external AI affordances can be reduced. Existing tests, golden scenarios, reviews, and release notes contain evaluation evidence, but they do not provide a stable record for scenario-linked results.

The v2 preview implemented preview-only evaluation results linked to tasks, runs, tool executions, providers, models, and scenarios. Those records are searchable, included in work packets, and used as evidence for routing and dependency-reduction exploration. The later acceptance of minimal `EvaluationScenario` makes `EvaluationResult` stable enough to define as a narrow evidence record.

## Alternatives Considered

- Keep results only in test output, docs, or release notes.
- Treat evaluation results as `Review` records.
- Treat evaluation results as task `Run` records.
- Wait for a benchmark runner before accepting `EvaluationResult`.
- Accept only the minimal evidence concept now.

## Rationale

`EvaluationResult` answers real AMS queries:

- Which scenario was run or assessed?
- What subject was evaluated?
- What status, score, rubric summary, and failure evidence were recorded?
- Which routing, decision, memory, or dependency-reduction records cite the result?

It is not reducible to existing concepts:

- `EvaluationScenario` defines the reusable test/rubric; the result records one outcome.
- `Run` is a work attempt, not the scored evidence about a scenario.
- `Review` is a human/governance acceptance surface, not a benchmark result.
- `Decision` may cite evaluation evidence, but is not itself that evidence.

Accepting `EvaluationResult` now gives AMS stable language for evidence without accepting immature automation around scoring, routing, or external-provider replacement.

## Consequences

Easier:

- Dependency-reduction work can cite scenario-linked evidence instead of anecdotes.
- Routing experiments can distinguish evaluation evidence from routing rationale.
- Work packets can include repeatable benchmark evidence alongside runs, reviews, and artifacts.

Harder:

- Score semantics must remain scenario-scoped until a later decision defines comparability.
- Evaluation status must not replace review status or task status.
- Production storage needs a separate migration and retention decision.

Deferred:

- Benchmark runners remain out of scope.
- Global score normalization remains out of scope.
- Provider/model routing policy remains out of scope.
- Production table names, indexes, and migration remain out of scope.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/ontology-v1.md`
- `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`
