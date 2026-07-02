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

Status: Candidate

Definition: An ability required by work or provided by a role, execution surface, tool, skill, or agent.

Current representation: capability/tool fields and routing metadata exist, but the concept is not yet a rich standalone model.
