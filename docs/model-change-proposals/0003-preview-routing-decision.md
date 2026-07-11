# Model Change Proposal: Preview Routing Decision

Date: 2026-07-03
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview provider/model routing decision slice

Post-hardening note: `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md` decides not to accept `RoutingDecision` as a standalone core entity. This proposal remains experimental for preview storage and route-rationale evidence. Production route choices should likely become accepted `Decision` records with routing-specific metadata, while reusable routing rules may later become a separate `RoutingPolicy`.

## Proposed Change

Add a preview-only `RoutingDecision` record so v2 can test structured provider/model routing rationale before accepting production routing schema or implementing automatic routing.

This proposal does not accept final routing policy, provider registry, model registry, or automatic model selection. It authorizes a limited preview implementation under the v2 preview database boundary.

## Type Of Construct

- `RoutingDecision`: event/decision-support record, experimental preview implementation record. It is not accepted as a standalone production entity.
- Provider/model identifiers: candidate metadata labels scoped to preview routing.
- Routing factors such as privacy, cost, capability, risk, and locality: candidate decision-basis vocabulary scoped to preview routing.

## Problem This Solves

AMS needs to choose between external providers, local models, tools, and human execution surfaces based on task context. Without structured routing rationale, those choices remain buried in prose and cannot be compared, audited, evaluated, or used to reduce external AI dependency.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- record why a provider/model was selected for a task
- record rejected alternatives in prose or compact structured text
- capture the decision basis across capability, privacy, cost, locality, risk, and evaluation evidence
- expose routing context in a task work packet
- index routing rationale for local search
- later compare routing decisions against evaluation results and dependency-reduction records

## Competency Question

For this task, what provider/model or execution option did AMS intend to use, why was that choice made, what alternatives were rejected, and what evidence or constraints influenced the decision?

## Existing Related Concepts

- `Decision`: accepted durable choice with rationale and evidence.
- `Run`: accepted task-linked work attempt/evidence record.
- `Provider`: draft v2 concept for runtime/provider organization or backend.
- `Model`: draft v2 concept for model/runtime option under a provider.
- `Capability`: accepted minimal ability concept; production registry/taxonomy remains deferred.
- `EvaluationResult`: accepted minimal evidence concept that can inform routing.
- `ToolExecution`: accepted minimal evidence/event concept.
- `ExecutionSurface`: accepted configured place or mechanism where work can run.

## Why Existing Concepts Are Insufficient

`Decision` can record the general choice, but it does not provide fields for selected provider/model, rejected alternatives, routing basis, privacy/cost/risk priorities, or capability target.

`Run` records what happened after work was attempted. It does not describe the prior routing rationale.

`Provider` and `Model` describe available options when accepted, but they do not themselves record task-specific selection rationale.

`EvaluationResult` can inform routing, but it should not become the routing decision.

## Classification

`RoutingDecision` is a temporary experimental concept in the Agent, tool, and capability bounded context, with links to Work and execution and Feedback and evaluation.

It is best treated as a decision-support event for the preview phase, not a core production entity. Future production work should likely attach routing metadata to accepted `Decision` records rather than preserve a parallel decision log.

## Examples

- Use provider `openai` and model `gpt-5-codex` for a high-context code review because local models have not yet passed the relevant benchmark.
- Use provider `local` and model `qwen-coder-local` for a low-risk summarization task because privacy matters more than peak reasoning quality.
- Reject an external provider for a repository-inspection task because source files should remain local.

## Non-Examples

- A normal task `Run` is not a routing decision.
- A provider catalog entry is not a routing decision.
- A benchmark result is not a routing decision, though it can inform one.
- A human approval to run a command is not a routing decision.

## Relationship To Existing Model

`RoutingDecision` may reference:

- a `Task`
- optionally a `Run`
- optionally provider/model labels
- optionally a capability name
- optionally evidence in prose until artifact/evaluation linking is accepted

Future production schema should likely merge task-specific route choices into `Decision` with structured routing metadata. A separate `RoutingPolicy` may be introduced later for reusable policy, but this preview proposal does not accept it.

Owned bounded context:

- primary: Agent, tool, and capability
- secondary: Work and execution, Feedback and evaluation

## Consequences Of Adding It

- Makes provider/model choice rationale inspectable and searchable.
- Gives work packets enough context to explain why an agent should use a given model/provider.
- Creates a path toward routing by privacy, cost, risk, locality, capability, and evaluation evidence.
- Risks duplicating `Decision` if this becomes a parallel decision log.
- Risks premature policy complexity if preview records are treated as automatic routing rules.

## Consequences Of Not Adding It

- Provider/model choices remain hidden in task prose, run summaries, or chat context.
- Local replacement progress cannot be tied cleanly to actual routing choices.
- Evaluation results cannot be connected to future provider-routing behavior.
- Routing implementation could be built before the rationale model is understood.

## Can Existing Concepts Represent This For Now?

Partially.

`Decision` can represent the choice in prose. For the preview slice, a structured preview `RoutingDecision` is useful because the next implementation question is specifically whether task context can carry provider/model routing rationale without implementing automatic routing.

## Failure Mode If Poorly Modeled

- Routing decisions become automatic routing policy before they are validated.
- Provider/model labels harden before the provider/model registry is accepted.
- The system creates a second durable decision log separate from accepted `Decision`.
- Cost, privacy, and risk fields become vague tags rather than decision criteria.
- Agents follow stale routing hints without checking task risk or current evaluation evidence.

## Decision

Experimental. Do not accept as standalone production entity.

The preview implementation may keep using preview-only routing decision records in the v2 preview database. These records must not be treated as accepted v2 runtime schema, a second durable decision log, or automatic routing behavior.

## Rationale

The owned-agent goal requires choosing between external AI, local models, tools, and human work based on explicit constraints. Capturing rationale is lower risk than implementing automatic routing, and it gives future routing work evidence to design against.

The minimum useful implementation should record and expose routing rationale. It should not create a provider registry, execute model calls, score providers, or enforce routing policy.

## Follow-Up

- Update `docs/domain-glossary.md` with candidate/experimental routing decision definitions.
- Update `docs/v2_domain_model_v0_1.md` to mark routing decision as preview-only.
- Keep implementation preview-only and separate from `data/app.sqlite`.
- Add tests proving routing decisions can be recorded, linked to tasks/runs, exposed in work packets, and searched.
- Revisit only when production `Decision` metadata, provider/model registry, capability taxonomy, and optional `RoutingPolicy` requirements are ready to model.
