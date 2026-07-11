# AMS Domain Glossary

Date: 2026-07-01
Status: Draft, initial seed

Use this glossary with `docs/ontology-v1.md` and `docs/domain-model-governance-protocol-v0.1.md`. Every accepted concept should eventually have a definition, examples, non-examples, and nearby concepts.

## Concept Maturity

- Candidate: plausible concept under consideration, not accepted.
- Experimental: allowed in limited artifacts or implementation slices, not yet core.
- Accepted: part of the project model and safe for implementation.
- Deprecated: kept for compatibility or historical context; avoid new use.
- Rejected: reviewed and intentionally not adopted.
- Merged: folded into another concept.
- Superseded: replaced by a newer concept or decision.

## Accepted Concepts

### Goal

Status: Accepted

Definition: A desired state or outcome AMS is trying to bring about.

Not the same as:

- Task: a bounded unit of action intended to advance a goal.
- Run: an execution attempt against a task.
- Project: the durable context container around goals, tasks, constraints, and memory.

Examples:

- "AMS useful prototype milestone"
- "Make managed agent work continue from durable Goal/Task/Run state."

Non-examples:

- "Run npm test" is a task or validation step, not a goal.

### Task

Status: Accepted

Definition: A bounded unit of action intended to advance one or more goals.

Not the same as:

- Goal: desired future state or outcome.
- Run: one attempt to execute task work.
- Workflow: reusable pattern of work.

Examples:

- "Add model-governance layer to AMS"
- "Create reviewed apply flow for progress-preview proposals"

Non-examples:

- "Build AMS" is too broad unless framed as a goal.

### Run

Status: Accepted

Definition: A concrete execution attempt or evidence record for task work, usually associated with an agent thread or execution surface.

Not the same as:

- Task: the work contract.
- Review: the human or governance decision surface.
- Thread: reusable AI work context.

Examples:

- A managed Codex run linked to a task.
- A failed execution attempt with validation evidence and blockers.

Non-examples:

- A final accept/reject decision belongs to review, approval, decision, and task state, not only to a run.

### Review

Status: Accepted

Definition: A governance record for evaluating submitted work evidence and deciding whether changes are approved, need revision, or should be dismissed.

Not the same as:

- Run evidence.
- Approval gate for permission to take an action.

Examples:

- Summary review required for an internal documentation change.
- Review changes requested after validation fails.

### Approval

Status: Accepted

Definition: A permission gate required before an agent may run, apply, complete, or otherwise perform work that exceeds the task's allowed autonomy or risk.

Not the same as:

- Review of completed work.
- Task status.

### Decision

Status: Accepted

Definition: A durable record of a meaningful planning, model, governance, or work-direction choice and its rationale.

Not the same as:

- A transient note.
- A run summary.

Examples:

- Choosing not to add a separate milestone abstraction.
- Accepting or rejecting a significant domain model change.

### Project

Status: Accepted

Definition: A durable context container for goals, tasks, constraints, non-goals, setup, validation expectations, instructions, current state, and decision memory.

Not the same as:

- Goal: desired future state.
- Repository: the codebase or workspace itself.

### Workflow

Status: Accepted

Definition: A reusable pattern or sequence for recurring work, separate from any single task instance.

Not the same as:

- Task: one bounded work item.
- Skill: reusable agent instruction or capability guidance.

### Skill

Status: Accepted

Definition: A reusable instruction set that helps an agent perform a class of work or use a project-specific process.

Not the same as:

- Role: desired perspective or responsibility.
- Tool: a callable capability or software surface.

### Execution Surface

Status: Accepted

Definition: A configured place or mechanism where work can be executed, such as a local coding agent, provider-backed assistant, or other runnable surface.

Not the same as:

- Provider: infrastructure or service metadata.
- Role: the intended working perspective.
- Agent thread: reusable context for a specific line of AI work.

### Tool

Status: Accepted

Definition: A callable software capability, command, connector, script, API surface, or external system that may be required by a task, made available through an execution surface, or used during a run.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`

Minimal accepted fields:

- `id`
- `name`
- `description`
- `kind`
- `owner`
- `status`
- `riskLevel`
- `approvalMode`

Current representation: task `requiredToolNames`, MCP/CLI/script affordances, v2 preview tool records, and prose run summaries. Production schema remains deferred.

Not the same as:

- Skill: reusable agent instruction or process guidance.
- Capability: an ability such as research, coding, or citation gathering.
- Provider: infrastructure or service metadata.
- ExecutionSurface: the configured environment where work runs.
- Run: the work attempt in which tools may be used.

Examples:

- `git`
- `playwright`
- `npm`
- `obsidian-cli`
- `github`

Non-examples:

- "Researcher" is a role, not a tool.
- "Can debug Svelte apps" is a capability, not a tool.
- A single `npm test` invocation is a `ToolExecution`, not the `Tool`.

### EvaluationScenario

Status: Accepted

Definition: A reusable benchmark, golden scenario, rubric-backed prompt/task, or capability check used to evaluate whether AMS, a model, provider, tool, or workflow performs a class of work well enough.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`

Minimal accepted fields:

- `id`
- `projectId`
- `title`
- `capabilityName`
- `promptOrTask`
- `rubric`
- `status`
- `version`

Current representation: `docs/model-evals/golden-scenarios.md`, tests, release readiness checks, and v2 preview scenario records. Production schema remains deferred.

Not the same as:

- Task: one bounded unit of operational work.
- Workflow: reusable sequence for doing work.
- Review: governance evaluation of submitted work evidence.
- Decision: durable choice that may cite evaluation evidence.

Examples:

- "Can AMS produce a provenance-aware work packet for one task?"
- "Can a local model summarize task evidence without inventing files?"
- "Can a provider/tool workflow pass a source-linked retrieval check?"

Non-examples:

- "Fix the search command" is a task, not an evaluation scenario.
- "Approved after review" is a review outcome, not an evaluation scenario.
- A scored pass/fail record is an `EvaluationResult`, not the scenario itself.

### ToolExecution

Status: Accepted

Definition: A task-linked event/log record that describes one requested, completed, failed, skipped, or otherwise recorded use of an accepted `Tool`.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`

Minimal accepted fields:

- `id`
- `taskId`
- `runId`
- `toolId`
- `status`
- `inputSummary`
- `resultSummary`
- `validationSummary`
- `errorSummary`
- `startedAt`
- `endedAt`
- `approvalId`

Current representation: run summaries, validation evidence, CLI/MCP/script interactions, v2 preview tool execution records, and work-packet evidence. Production schema, automatic telemetry capture, and tool launching remain deferred.

Not the same as:

- Run: a broader task-linked work attempt that may contain several tool executions.
- Tool: the callable affordance used by the execution.
- Approval: a permission gate that may authorize a risky tool execution.
- Artifact: durable output that may be produced by a tool execution.

Examples:

- A recorded `npm test` execution for a task with a result summary.
- A failed `playwright` browser automation attempt with an error summary.
- A logged `git diff` inspection associated with a review task.

Non-examples:

- A whole Codex session or managed run.
- A task requiring `codex` before any execution happened.
- The `npm` tool definition itself.

### EvaluationResult

Status: Accepted

Definition: A status-bearing evidence record that reports how one task, run, tool execution, provider, model, or workflow performed against an accepted `EvaluationScenario`.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`

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

Current representation: tests, release readiness checks, model-eval notes, v2 preview evaluation result records, work-packet evidence, routing evidence, and dependency-reduction evidence. Production schema, benchmark execution, global score normalization, and automatic routing remain deferred.

Not the same as:

- EvaluationScenario: the reusable scenario/rubric being evaluated.
- Run: the broader task-linked work attempt that may be evaluated.
- Review: the human/governance decision surface.
- Decision: the durable choice that may use evaluation evidence.
- ToolExecution: a logged use of a tool that may be evaluated.

Examples:

- A pass/fail result for a local retrieval scenario.
- A numeric score plus rubric summary for a provider/model comparison.
- A failed result showing that a tool workflow omitted required validation evidence.

Non-examples:

- A raw test run with no scenario or rubric context.
- A casual note saying the output seemed good.
- A human approval that accepts task completion.

## Candidate Or Under-Modeled Concepts

### WorkAttempt

Status: Candidate

Definition: A conceptual superclass for attempts to perform task work. Current implementation uses `Run` as the concrete AI/tool-mediated attempt.

Open question: Is a first-class `WorkAttempt` implementation record needed, or is the conceptual superclass enough for now?

### Artifact

Status: Candidate

Definition: Output information produced by work and retained for downstream use, review, or delivery.

Current representation: mostly task attachments, run evidence, file paths, and prose references.

### ContextResource

Status: Candidate

Definition: Input information needed before or during task work.

Current representation: mostly work packets, project memory, docs, task fields, linked artifacts, and prompts.

### Capability

Status: Accepted

Definition: A reusable ability, competency, or work affordance required by a task or provided by an actor, role, model, provider, execution surface, tool, workflow, or skill.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md`

Minimal accepted fields:

- `id`
- `name`
- `description`
- `category`
- `status`

Current representation: task `requiredCapabilityNames`, provider capabilities, execution-surface fit checks, roles, skills, evaluation scenarios, routing labels, dependency-reduction labels, and ontology projections. Production registry, controlled taxonomy, hierarchy, aliases, and migration remain deferred.

Not the same as:

- Role: responsibility or perspective for doing work.
- Skill: reusable instruction/process guidance.
- Tool: callable software affordance.
- Provider: backend or runtime source.
- ExecutionSurface: configured place or mechanism where work runs.

Examples:

- `code-review`
- `context-assembly`
- `local-retrieval`
- `citation-gathering`
- `svelte-development`

Non-examples:

- `reviewer` is a role, not a capability.
- `playwright` is a tool, not a capability.
- `openai` is a provider, not a capability.

### Model

Status: Accepted

Definition: A specific AI model, local model, runtime option, or model-like engine offered by a `Provider` or local runtime and usable for work, evaluation, routing, or telemetry.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-model-concept.md`

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

Current representation: provider `defaultModel`, provider model pricing rows, task launch context, run `modelUsed`/`observedModelUsed`, evaluation result labels, routing labels, and dependency-reduction evidence. Production registry, pricing schema, alias/version normalization, and catalog refresh remain deferred.

Not the same as:

- Provider: organization/backend/runtime source that may offer many models.
- ExecutionSurface: configured place where work runs.
- Run: a work attempt that may use or observe a model.
- EvaluationResult: scored evidence about performance, not model identity.

Examples:

- `gpt-5-codex` under provider `openai`
- `qwen-coder-local` under provider `local`
- `local-summary-model`

Non-examples:

- `openai` is a provider, not a model.
- A benchmark score is an evaluation result, not a model.
- A local shell where the model runs is an execution surface, not a model.

### RoutingDecision

Status: Experimental

Definition: A task-linked provider/model or execution-option selection rationale that records what route was selected or proposed, why it was selected, and what alternatives or constraints shaped the choice.

Current representation: not accepted in v1; authorized only for v2 preview experimentation by `docs/model-change-proposals/0003-preview-routing-decision.md`.

Model decision: `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md` decides not to accept `RoutingDecision` as a standalone core entity. Production route choices should likely become accepted `Decision` records with routing-specific metadata, or be separated from a future reusable `RoutingPolicy`.

Not the same as:

- Decision: accepted durable choice record. A routing decision may later merge into `Decision` metadata.
- Run: the work attempt that may follow a routing decision.
- Provider: the backend or organization that can supply model/runtime access.
- Model: the specific runtime option being considered.
- EvaluationResult: scored evidence that may inform routing.

Examples:

- Select `openai` / `gpt-5-codex` for a high-context coding task because local model evaluation is not yet strong enough.
- Select `local` / `local-summary-model` for a low-risk summary because privacy and cost matter more than peak capability.
- Reject an external provider for repository inspection because source files should stay local.

Non-examples:

- A provider catalog entry is not a routing decision.
- A benchmark score alone is not a routing decision.
- A command approval is not a routing decision.

Production direction:

- Keep preview `RoutingDecision` records as experimental evidence.
- Do not create a second accepted decision log.
- Define production routing metadata on `Decision` or a separate `RoutingPolicy` only after provider/model/capability boundaries are stronger.

### DependencyReductionRecord

Status: Experimental

Definition: A capability or affordance-level status/evidence record that tracks movement away from an external AI dependency toward owned, local, or hybrid replacement.

Current representation: not accepted in v1; authorized only for v2 preview experimentation by `docs/model-change-proposals/0004-preview-dependency-reduction-record.md`.

Model decision: `docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md` keeps the current preview record experimental. Production modeling should likely split replacement state from source-linked evidence before accepting schema.

Replacement statuses:

- `external_only`
- `hybrid`
- `local_assisted`
- `locally_reliable`
- `external_retired`

Not the same as:

- EvaluationResult: scored evidence that may support a replacement status.
- RoutingDecision: route-selection rationale that may support a replacement status.
- Decision: accepted durable choice that may cite dependency-reduction evidence.
- Provider: the external or local backend involved.
- Capability: the ability whose replacement progress is being tracked.

Examples:

- `context-assembly` is `local_assisted` because work packets and local search reduce provider chat use.
- `code-review` is `hybrid` because provider-backed models still outperform local models on high-context review.
- `ad hoc project planning` is `external_only` because local workflows have not passed planning scenarios yet.

Non-examples:

- A single benchmark score is not a dependency-reduction record.
- A provider route choice is not a dependency-reduction record.
- Disabling an API key is not a dependency-reduction record.

Production direction:

- Keep preview `DependencyReductionRecord` records as experimental evidence.
- Do not treat replacement status as provider-retirement policy.
- Define accepted capability replacement state only after `Capability`, provider/model links, and evidence thresholds are stronger.

### MemoryItem

Status: Accepted

Definition: A source-linked reusable local knowledge record scoped to a project and optionally a task, with lifecycle status controlling whether it can be treated as candidate or trusted retrieval context.

Accepted by: `docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md`

Minimal accepted fields:

- `id`
- `projectId`
- `taskId`
- `scope`
- `title`
- `summary`
- `body`
- `status`
- `sourceTaskId`
- `sourceRunId`
- `sourceDecisionId`
- `sourceEvaluationResultId`
- `sourceDependencyReductionId`
- `supersedesId`
- `createdAt`
- `publishedAt`

Current representation: project memory prose, decisions, docs, self-improvement knowledge, and v2 preview records. Production schema, automatic extraction, automatic publication, retrieval ranking, and skill promotion remain deferred.

Memory statuses:

- `draft`
- `proposed`
- `published`
- `archived`
- `superseded`

Not the same as:

- Project memory prose: broad project context fields.
- Decision: a durable choice and rationale.
- Run: task execution evidence.
- Skill: reusable instruction/process guidance.
- Artifact: a durable file or output.
- Transcript: raw conversation history.

Examples:

- "Use preview DBs for v2 experiments; do not write to `data/app.sqlite`."
- "SQLite FTS is the first local retrieval layer; embeddings are deferred."
- "Dependency-reduction records are evidence summaries, not provider retirement commands."

Non-examples:

- A whole chat transcript is not a memory item.
- A task result summary is not a memory item unless curated as reusable knowledge.
- A draft note is not trusted published memory.
