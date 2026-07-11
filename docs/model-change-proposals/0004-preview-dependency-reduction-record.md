# Model Change Proposal: Preview Dependency Reduction Record

Date: 2026-07-03
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview external-AI dependency reduction tracking slice

Post-hardening note: `docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md` keeps the current `DependencyReductionRecord` preview record experimental. Production modeling should likely split capability/external-affordance replacement state from source-linked evidence before accepting schema.

## Proposed Change

Add a preview-only `DependencyReductionRecord` so v2 can test tracking whether owned/local workflows are replacing external AI affordances.

This proposal does not accept final capability, provider, evaluation, or routing schema. It authorizes a limited preview implementation under the v2 preview database boundary.

## Type Of Construct

- `DependencyReductionRecord`: evidence/status record, experimental implementation record for preview.
- Replacement status: candidate lifecycle vocabulary scoped to external dependency reduction.
- Evidence links: candidate metadata scoped to preview records.

## Problem This Solves

The larger AMS goal is not just to log agent work. It is to progressively replace affordances currently supplied by external AI systems.

Without explicit dependency-reduction records, AMS can store tasks, runs, evaluations, and routing decisions but cannot answer whether a capability is still external-only, hybrid, locally assisted, locally reliable, or retired from external use.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- record the current replacement status for a capability or external affordance
- name the external affordance/provider being replaced
- cite evaluation and routing evidence in a lightweight preview form
- explain why the status was assigned
- expose task-linked dependency-reduction context in a work packet
- index dependency-reduction records for local search

## Competency Question

For this capability or external AI affordance, what is the current replacement status, what evidence supports that status, and what must improve before external dependency can be reduced further?

## Existing Related Concepts

- `Capability`: accepted minimal ability concept; production registry/taxonomy remains deferred.
- `Provider`: draft v2 concept for runtime/provider organization or backend.
- `EvaluationResult`: accepted minimal evidence about performance against a scenario.
- `RoutingDecision`: experimental preview rationale for selecting provider/model routes.
- `Decision`: accepted durable choice with rationale and evidence.
- `Run`: accepted task-linked work attempt/evidence record.

## Why Existing Concepts Are Insufficient

`EvaluationResult` says how something performed in a scenario, but it does not state whether an external affordance has been replaced.

`RoutingDecision` says why a provider/model route was chosen, but it does not summarize replacement progress over time.

`Decision` can record a dependency choice in prose, but it does not provide queryable replacement status, external affordance, or capability tracking fields.

`Run` records work evidence, not capability replacement state.

## Classification

`DependencyReductionRecord` is a temporary experimental concept in the Feedback and evaluation bounded context, with links to Agent, tool, and capability.

It is an evidence/status record for the preview phase, not accepted production schema, provider retirement command, or automatic routing input.

## Examples

- Capability `code-review`: `hybrid` because provider-backed models still outperform local models on high-context review.
- Capability `work-packet-summary`: `local_assisted` because local search plus structured packets can replace provider chat for context assembly.
- External affordance `ChatGPT ad hoc planning`: `external_only` because no local workflow has passed planning quality checks yet.

## Non-Examples

- A single evaluation result is not a dependency-reduction record.
- A provider route choice is not a dependency-reduction record.
- A command to disable an external provider is not a dependency-reduction record.
- A vague note that "local is getting better" is not enough without evidence/rationale.

## Relationship To Existing Model

`DependencyReductionRecord` may reference:

- optionally a `Task`
- a capability label
- an external affordance label
- optionally a provider label
- optionally one preview `EvaluationResult`
- optionally one preview `RoutingDecision`

Future production schema should likely split this into capability/external-affordance replacement state and source-linked evidence. Provider retirement policy, if needed, should be a separate later decision.

Owned bounded context:

- primary: Feedback and evaluation
- secondary: Agent, tool, and capability

## Consequences Of Adding It

- Makes external-AI dependency reduction explicit and queryable.
- Connects evaluation evidence and routing decisions to the larger owned-agent goal.
- Creates a practical review surface for deciding what to build locally next.
- Risks false progress if statuses are assigned without evidence.
- Risks premature policy if records are treated as provider retirement commands.

## Consequences Of Not Adding It

- AMS can improve locally without tracking what external affordance was replaced.
- Provider/model routing decisions remain disconnected from the dependency-reduction goal.
- Evaluation evidence accumulates without a capability-level progress view.
- It remains hard to choose the next local capability investment.

## Can Existing Concepts Represent This For Now?

Partially.

`Decision`, `EvaluationResult`, and `RoutingDecision` can approximate the evidence, but none directly records replacement status for an external affordance or capability.

For the preview slice, use an experimental record with explicit status and evidence summary.

## Failure Mode If Poorly Modeled

- Replacement status becomes a vague confidence score.
- Records imply external providers are retired before quality, cost, privacy, and reliability evidence supports that move.
- Capability labels drift into duplicates.
- Dependency-reduction status becomes a hidden routing policy.
- Evaluation and routing evidence are cited without enough provenance.

## Decision

Experimental. Do not accept current shape as production concept.

The preview implementation may keep using preview-only dependency-reduction records in the v2 preview database. These records must not be treated as accepted v2 runtime schema, automatic routing policy, provider retirement behavior, or proof of locally reliable capability.

## Rationale

The owned-agent goal needs a visible measure of progress away from external AI affordances. A preview record is low-risk and lets AMS test whether capability, evaluation, routing, and provider concepts are sufficient before accepting production schema.

The minimum useful implementation should record status and evidence. It should not enforce routing, disable providers, or claim replacement without reviewable rationale.

## Follow-Up

- Update `docs/domain-glossary.md` with the experimental dependency-reduction definition.
- Update `docs/v2_domain_model_v0_1.md` with preview maturity and boundary notes.
- Keep implementation preview-only and separate from `data/app.sqlite`.
- Add tests proving records can be created, linked to tasks/evaluation/routing evidence, exposed in work packets, and searched.
- Revisit only after `Capability`, provider/model links, evidence thresholds, and replacement-status semantics are ready to model.
