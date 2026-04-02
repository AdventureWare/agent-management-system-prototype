# Agent Management System Ontology v1

Date: 2026-04-01
Status: Draft
Scope: conceptual ontology and implementation guidance for the prototype's core domain model

This is a conceptual design note, not an OWL artifact. The goal is to give the product a coherent ontology that matches the system we are actually trying to build:

- better planning
- better coordination between humans and AIs
- better reuse of context and outputs
- higher productivity with lower operator effort, interruption, and frustration

The design intentionally stays lighter than a formal semantic-web ontology. For this product, a clear conceptual ontology plus application validation is the right v1.

## 1. Scope

This ontology is for the core work system, not yet for account administration.

In scope:

- goals and subgoals
- tasks and task decomposition via linked tasks
- work attempts
- human and AI participation
- execution surfaces
- roles, skills, tools, and resource needs
- context and artifacts
- planning as a session/process
- review, approval, and decision-making

Out of scope for v1:

- full user/account/org ontology
- billing, permissions, and enterprise administration
- formal OWL reasoning

## 2. Modeling stance

The main ontological commitments are:

- `Goal` is a desired future state.
- `Task` is a unit of action intended to advance a goal.
- `WorkAttempt` is an attempt to perform task work.
- `Thread` is a reusable AI work context, not the work itself.
- `Artifact` is output information.
- `ContextResource` is input information.
- `PlanningSession` is a process for reviewing and changing the body of work.
- A planning horizon is not a primary entity. It is a time window used by a planning session.

This means the ontology is centered on work and change over time, not on chat transcripts or UI screens.

## 3. Competency questions

The ontology should support questions like these:

1. What goals are we trying to achieve, and how do they decompose?
2. Which tasks advance each goal?
3. Which tasks depend on which other tasks?
4. Which actor should perform a task, and why?
5. What capabilities, tools, or resources does a task require?
6. What context is needed before starting work?
7. What artifacts have been produced, and by which work attempt?
8. What happened during the last attempt to execute a task?
9. Which thread should be reused for AI work on a task?
10. What changed during the last planning session?
11. Which tasks are blocked because of missing capability, tool, approval, or dependency?
12. Which coordination choices reduce operator effort and unnecessary intervention?

## 4. Core classes

### 4.1 Goal

Definition:

A desired state or outcome the system is trying to bring about.

Examples:

- "Agent Management System prototype milestone"
- "Kwipoo app + website release sync"

Key properties:

- `hasSubgoal`
- `isSubgoalOf`
- `isAdvancedByTask`
- `hasSuccessCriterion`
- `hasPriority`
- `hasTargetDate`
- `hasStatus`
- `belongsToProject` (optional)

Notes:

- Goals are not actions.
- Goals can decompose into subgoals.
- Goals should not be overloaded with execution detail that belongs to tasks.

### 4.2 Task

Definition:

A bounded unit of action intended to advance one or more goals.

Examples:

- "Add Target Date field to tasks"
- "Remove noise from prototype"

Key properties:

- `advancesGoal`
- `hasSubtask`
- `dependsOnTask`
- `requiresCapability`
- `requiresTool`
- `requiresResource`
- `assignedToActor`
- `hasDesiredRole`
- `hasPrimaryThread`
- `hasWorkAttempt`
- `hasContextResource`
- `producesArtifact`
- `hasEstimate`
- `hasTargetDate`
- `hasStatus`
- `hasRiskLevel`

Notes:

- Tasks are the primary operational work object.
- If task decomposition is needed, the current prototype should prefer linked tasks and dependencies over a special subtask lifecycle.
- Subtasks, if introduced later, should still be treated as tasks rather than a separate ontological kind.

### 4.3 WorkAttempt

Definition:

An attempt to perform work against a task.

This is the superclass that captures both AI execution attempts and human work attempts.

Subclasses:

- `Run`: an AI-mediated or tool-mediated execution attempt
- `HumanWorkSession` (optional later): a human effort interval or work block

Key properties:

- `attemptsTask`
- `performedByActor`
- `executedOnSurface`
- `usedThread`
- `consumedContextResource`
- `producedArtifact`
- `startedAt`
- `endedAt`
- `hasStatus`
- `hasSummary`
- `hasError`

Notes:

- This is one of the biggest missing abstractions in the current schema.
- The current `Run` entity is a good concrete subtype, but the broader system wants a parent concept above it.
- Do not force human work into the same level of machine-style logging if the data is not available; keep the superclass broad enough.

### 4.4 Thread

Definition:

A reusable AI work context container that may outlive any single work attempt.

Key properties:

- `supportsTask`
- `containsWorkAttempt`
- `hasLatestState`
- `hasResumability`
- `hasConversationHistory`

Notes:

- Thread is not the same thing as task.
- Thread is not the same thing as run.
- Thread should not use task completion semantics like `done`.

### 4.5 Artifact

Definition:

Output information produced by work and retained for downstream use, review, or delivery.

Examples:

- code changes
- research notes
- screenshots
- logs
- handoff docs

Key properties:

- `producedByWorkAttempt`
- `outputOfTask`
- `artifactKind`
- `artifactPath`
- `summarizesOutcome`
- `isInputToTask`

Notes:

- In the product, artifacts are durable outputs.
- An artifact can later become context for another task.

### 4.6 ContextResource

Definition:

Input information or reference material relevant to performing a task.

Examples:

- design brief
- repo path
- spec document
- prior thread
- previous artifact
- attached image

Key properties:

- `contextForTask`
- `consumedByWorkAttempt`
- `contextKind`
- `sourcePathOrUri`

Notes:

- In practice, artifacts and context often convert into each other over time.
- The same underlying object can play different roles in different workflows.
- That is why "artifact" and "context" are best understood as roles an information object can play, not always as mutually exclusive kinds.

### 4.7 Actor

Definition:

A participant that can hold responsibility, perform work, review work, or approve work.

Subclasses:

- `HumanActor`
- `AIActor`

Key properties:

- `hasCapability`
- `playsRole`
- `ownsGoal`
- `isAssignedTask`
- `reviewsArtifact`
- `approvesDecision`

Notes:

- This is broader than the current `Worker` type.
- The ontology needs this because the product is explicitly about coordination between humans and AIs.

### 4.8 ExecutionSurface

Definition:

A concrete environment or surface on which work attempts are executed.

Examples:

- local Codex worker on a Mac
- cloud agent worker
- provider-backed research worker

Key properties:

- `supportsCapability`
- `usesProvider`
- `hasTooling`
- `hasSandboxPolicy`
- `executesWorkAttempt`

Notes:

- The current `Worker` entity mostly behaves like an execution surface.
- The current `Provider` entity is supporting infrastructure metadata for that surface.

### 4.9 Role

Definition:

A responsibility or capability contract that an actor may play for a piece of work.

Examples:

- coordinator
- reviewer
- app worker
- market researcher

Key properties:

- `roleName`
- `roleDescription`
- `roleLane`

Notes:

- Role is not the same as actor.
- Role is not the same as capability.
- A single actor may play multiple roles.

### 4.10 Capability

Definition:

A reusable ability relevant to planning, routing, or execution.

Examples:

- Svelte development
- market research
- iOS debugging
- repo refactoring
- citation gathering

Key properties:

- `capabilityName`
- `heldByActor`
- `requiredByTask`
- `supportedByExecutionSurface`

Notes:

- This should exist as a first-class concept even if the app initially stores it as strings.

### 4.11 Tool

Definition:

A software or external system needed to perform task work.

Examples:

- Codex
- Playwright
- Obsidian CLI
- GitHub

Key properties:

- `requiredByTask`
- `availableOnExecutionSurface`

Notes:

- Tools are not roles.
- Tools are not capabilities.

### 4.12 ResourceRequirement

Definition:

A requirement for some resource, access, dependency, or condition needed before work can proceed.

Examples:

- access to repo
- artifact root configured
- simulator available
- source brief attached
- dependency task complete

Key properties:

- `requirementForTask`
- `requirementType`
- `satisfiedBy`
- `isSatisfied`

Notes:

- This is broader and more useful than only modeling blocked reasons as free text.

### 4.13 Review

Definition:

A quality-control act that evaluates work or outputs.

Key properties:

- `reviewsTask`
- `reviewsArtifact`
- `reviewsWorkAttempt`
- `performedByActor`
- `reviewStatus`
- `reviewSummary`

### 4.14 Approval

Definition:

A governance act that authorizes a transition, action, or completion.

Key properties:

- `approvesTask`
- `approvesWorkAttempt`
- `approvalMode`
- `approvalStatus`
- `performedByActor`

### 4.15 Decision

Definition:

A recorded coordination choice that changes work state, priority, scope, assignment, or plan shape.

Examples:

- reprioritize a goal
- split task into subtasks
- reassign task
- defer work
- approve completion

Key properties:

- `madeInPlanningSession`
- `affectsGoal`
- `affectsTask`
- `madeByActor`
- `decisionType`
- `decisionSummary`

Notes:

- This is missing from the current model and is important.
- Planning is mostly made of decisions over the work graph.

### 4.16 PlanningSession

Definition:

A planning process in which actors review and modify the current body of work.

Key properties:

- `sessionWindowStart`
- `sessionWindowEnd`
- `considersGoal`
- `considersTask`
- `producesDecision`
- `performedByActor`
- `hasSummary`

Notes:

- Planning is modeled as a process, not as a primary work entity.
- The horizon/window is an attribute of the planning session, not a peer to goals and tasks.
- If the app wants to save reusable planning presets later, that should be treated as a saved filter or configuration, not as the ontological center of planning.

### 4.17 Project

Definition:

A persistent context container that groups related work and provides workspace defaults.

Key properties:

- `containsGoal`
- `containsTask`
- `hasWorkspaceDefault`
- `hasArtifactRoot`
- `hasRepo`

Notes:

- Project is not the same as goal.
- Project is not the same as plan.
- Project is closer to a durable work context or workstream.

## 5. Core relations

These are the most important first-class relations in the v1 ontology.

- `Task advances Goal`
- `Goal hasSubgoal Goal`
- `Task hasSubtask Task`
- `Task dependsOn Task`
- `Task hasWorkAttempt WorkAttempt`
- `Run subClassOf WorkAttempt`
- `Thread contains WorkAttempt`
- `Task hasPrimaryThread Thread`
- `WorkAttempt used Thread`
- `WorkAttempt produced Artifact`
- `Task hasContextResource ContextResource`
- `Artifact isInputTo Task`
- `Task assignedTo Actor`
- `Task hasDesiredRole Role`
- `Task requiresCapability Capability`
- `Task requiresTool Tool`
- `Task requiresResource ResourceRequirement`
- `Actor hasCapability Capability`
- `Actor playsRole Role`
- `ExecutionSurface executes WorkAttempt`
- `ExecutionSurface uses Provider`
- `PlanningSession produces Decision`
- `Decision affects Task`
- `Decision affects Goal`
- `Review reviews Task|Artifact|WorkAttempt`
- `Approval approves Task|WorkAttempt`

## 6. Important distinctions

These distinctions matter a lot for keeping the model clean.

### Goal vs Task

- Goal = desired state
- Task = action to move toward that state

### Task vs WorkAttempt

- Task = what should be done
- WorkAttempt = an attempt to do it

### Thread vs WorkAttempt

- Thread = reusable AI context
- WorkAttempt = an execution event

### Artifact vs ContextResource

- Artifact = output role
- ContextResource = input role

The same information object may play both roles at different times.

### Actor vs ExecutionSurface

- Actor = participant with responsibility or agency
- ExecutionSurface = runtime or environment where work is carried out

### Role vs Capability vs Tool

- Role = responsibility contract
- Capability = ability
- Tool = means

These should not be collapsed into one string bucket.

### PlanningSession vs Planning Window

- PlanningSession = process/event
- Planning window = date-range parameter used during that process

## 7. Mapping from the current schema

Current types in `src/lib/types/control-plane.ts` map roughly like this:

- `Goal` -> `Goal`
- `Task` -> `Task`
- `Run` -> `Run`, which should be treated as a subtype of `WorkAttempt`
- `Worker` -> mostly `ExecutionSurface`, not the full `Actor` concept
- `Provider` -> provider/infrastructure metadata used by `ExecutionSurface`
- `Role` -> `Role`
- `Review` -> `Review`
- `Approval` -> `Approval`
- `Project` -> `Project`
- `PlanningHorizon` -> should be downgraded conceptually into either:
  - a planning-session date window, or
  - a saved planning preset/filter

Current missing or under-modeled concepts:

- `Actor`
- `Capability`
- `Tool`
- `ResourceRequirement`
- `Decision`
- `WorkAttempt` as a superclass
- `ContextResource` as a first-class concept
- `Artifact` as a rich first-class entity

## 8. Minimal implementation guidance

You do not need a large schema rewrite to start using this ontology.

Recommended v1 implementation steps:

1. Keep `Goal`, `Task`, `Run`, `Project`, `Review`, and `Approval`.
2. Treat `Run` explicitly as a subtype of a broader conceptual `WorkAttempt`.
3. Rename the user-facing `session` concept fully to `Thread`.
4. Add first-class `Capability` and `Tool` concepts, even if stored simply at first.
5. Add a structured `Decision` record for planning and coordination changes.
6. Reframe `PlanningHorizon` into `PlanningSession` plus window fields or saved filters.
7. Make `Artifact` and `ContextResource` richer over time instead of relying mostly on paths.

## 9. Anti-patterns to avoid

- Treating planning horizon as a peer entity to goal or task.
- Treating thread/session as the same thing as a task.
- Treating worker as the only kind of actor in the system.
- Treating role, skill, tool, and provider as interchangeable routing labels.
- Treating artifacts only as file paths forever.
- Encoding important coordination state only as free-text summaries.

## 10. Why this ontology better matches the product goal

The product is not just trying to record work. It is trying to make work move with less human strain.

This ontology supports that better because it gives the system the right conceptual handles to answer:

- what are we trying to achieve
- what actions advance that outcome
- who or what should do the work
- what context is needed
- what happened when we tried
- what outputs exist now
- what decisions changed the plan
- where coordination friction is coming from

That is a much better fit for a human+AI planning and execution system than a flatter CRUD model of pages and tables.

## 11. Open questions for v2

- Should `Artifact` and `ContextResource` share a common parent such as `InformationObject`?
- Should human work attempts be captured explicitly, or only inferred from state changes and comments?
- Do we need `Team` or `Organization` before multi-user support becomes a priority?
- Should `Goal` advance other goals directly, or only through tasks and subgoals?
- Do we want explicit `Constraint` and `Policy` entities early, or later?
