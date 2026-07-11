# Model Change Proposal: Preview Evaluation Scenario And Result

Date: 2026-07-03
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview evaluation scenario/result slice

Post-hardening note: `EvaluationScenario` is now an accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`. `EvaluationResult` is now an accepted minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`. This proposal remains experimental for preview storage, score/status semantics beyond the minimal record, benchmark execution, global score normalization, automatic routing, and production schema/migration.

## Proposed Change

Add preview-only representations for `EvaluationScenario` and `EvaluationResult` so v2 can test storing benchmark/evaluation evidence before accepting production evaluation schema.

This proposal does not accept final evaluation schema. It authorizes a limited preview implementation under the v2 preview database boundary.

## Type Of Construct

- `EvaluationScenario`: accepted minimal domain concept; preview implementation record remains preview-only.
- `EvaluationResult`: accepted minimal event/evidence concept; preview implementation record remains preview-only.
- Score/status fields beyond the minimal accepted record: candidate evaluation vocabulary scoped to preview evaluation only.
- Scenario fields beyond the minimal accepted concept: candidate metadata.

## Problem This Solves

AMS needs evidence about whether a model, provider, tool, workflow, or local replacement is actually good enough for a class of work.

Without evaluation records, v2 can log activity but cannot tell whether the owned-agent system is improving capability, reducing dependence on external AI affordances, or maintaining acceptable quality.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- define or register a reusable evaluation scenario
- record an evaluation result against a task and optionally a run/tool execution/provider/model
- store score/status, rubric summary, result summary, failure summary, and evidence links
- read evaluation evidence through a task work packet or dedicated read command
- use evaluation evidence later for dependency-reduction decisions

## Competency Question

For this capability or workflow, what evaluation evidence shows whether AMS can perform the work locally, with a provider, with a tool, or with a hybrid approach at acceptable quality and risk?

## Existing Related Concepts

- `Run`: accepted task-linked work attempt/evidence record.
- `ToolExecution`: accepted minimal event/evidence concept.
- `Review`: accepted governance record for evaluating submitted work evidence.
- `Decision`: accepted durable choice with rationale and evidence.
- `Artifact`: candidate output/input information tracked by AMS.
- `Capability`: accepted minimal ability concept; production registry/taxonomy remains deferred.
- `docs/model-evals/golden-scenarios.md`: current model-level evaluation scenarios.
- `docs/v2_domain_model_v0_1.md`: currently names `EvaluationScenario` and `EvaluationResult`.
- `docs/v2_architecture_v0_1.md`: names `EvaluationService` and evaluation scoring records.
- `docs/v2_minimal_vertical_slice_v0_1.md`: includes one evaluation scenario and result.

## Why Existing Concepts Are Insufficient

`Run` records that work happened, but it does not define a reusable benchmark or score a capability against a rubric.

`Review` evaluates a submitted work product, but it is a governance surface, not a benchmark dataset or repeatable scenario.

`Decision` can cite evaluation evidence, but it should not be the evaluation evidence itself.

`ToolExecution` records tool use, but it does not judge whether the tool/provider/local workflow met a capability threshold.

## Classification

`EvaluationScenario` is an accepted minimal domain concept in the Feedback and evaluation bounded context. The preview scenario table and any production schema/migration remain preview-only until a later implementation decision.

`EvaluationResult` is an accepted minimal event/evidence concept in the Feedback and evaluation bounded context. The preview result table and any production schema/migration remain preview-only until a later implementation decision.

The earlier draft term `EvaluationRun` has been rejected for current docs and preview implementation because it is too easy to confuse with task `Run`. Use `EvaluationResult`.

## Examples

- EvaluationScenario: "Can the local AMS workflow produce a source-linked v2 work packet for a task?"
- EvaluationScenario: "Can a local model summarize task evidence with no hallucinated files?"
- EvaluationResult: task `task_make_sqlite_runtime_store_single_source_of_truth` passed a scenario with score `0.9` and summary "Work packet included task, run, tool, and provenance context."
- EvaluationResult: a provider-backed run failed a scenario because it omitted validation evidence.

## Non-Examples

- A normal task `Run` is not an evaluation result unless it is scored against an evaluation scenario.
- A human review approval is not an evaluation scenario.
- A generic note that "this worked well" is not an evaluation result unless it has scenario/rubric context.

## Relationship To Existing Model

`Project` may contain many evaluation scenarios.

`EvaluationResult` may reference:

- a `Project`
- optionally a `Task`
- optionally a `Run`
- optionally a `ToolExecution`
- optionally provider/model labels
- optionally artifacts as evidence

`Decision` and future dependency-reduction records may cite evaluation results as evidence.

Owned bounded context:

- primary: Feedback and evaluation
- secondary: Agent, tool, and capability

## Consequences Of Adding It

- Makes quality and capability evidence queryable instead of buried in prose.
- Creates a path to compare local, provider, tool, and hybrid workflows.
- Supports external-AI dependency reduction tracking.
- Adds modeling responsibility around score/status/rubric vocabulary.
- Risks duplicating `Review` if evaluation results become human acceptance records.
- Risks duplicating `Run` if evaluation results are treated as work attempts rather than scored evidence about a scenario.

## Consequences Of Not Adding It

- AMS can keep logging work but cannot tell whether capability is improving.
- Provider/local model routing remains anecdotal.
- External-AI dependency reduction cannot be measured.
- Evaluation evidence remains scattered across tests, docs, run summaries, and decisions.

## Can Existing Concepts Represent This For Now?

Partially.

`Run`, `Review`, `Decision`, and `Artifact` can approximate some evaluation evidence, but they do not represent reusable scenarios, scoring, rubric criteria, or capability comparison cleanly.

For the next slice, use preview records rather than accepted production schema.

## Failure Mode If Poorly Modeled

- Evaluation results become another review/approval surface.
- Evaluation scenarios become tasks or workflows under another name.
- Scores are added without saying what decision they support.
- Numeric scores imply false precision.
- Provider/model comparisons harden before enough evidence exists.
- Evaluation records get used as production routing policy without model governance.

## Decision

Accepted concept; experimental preview storage.

The preview implementation may keep using preview-only evaluation scenario and evaluation result records in the v2 preview database. These records must not be treated as accepted v2 runtime schema, benchmark execution, global scoring policy, automatic routing policy, or provider-retirement policy.

## Rationale

The owned-agent goal requires evidence that local or owned workflows can replace external AI affordances. Evaluation records are necessary, but final naming, scoring, rubric, and routing relationships are not yet proven.

The minimum useful implementation should record scenarios and results. It should not perform automatic model routing, benchmark execution, or dependency-retirement decisions.

## Follow-Up

- Update production schema only after a separate migration decision.
- Define evaluation status vocabulary, scenario versioning, score comparability, retention, and evidence-link rules before production persistence.
- Keep next implementation preview-only and separate from `data/app.sqlite`.
- Add tests proving evaluation records can be created, linked to tasks/runs/tool executions, inspected, and searched.
- Revisit after the preview slice to decide whether to accept, refine, rename, merge, or reject these constructs.
