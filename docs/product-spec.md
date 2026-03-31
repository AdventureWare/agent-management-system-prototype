# Agent Management System Product Spec

## Product Definition

### One-line definition

An agent management system is a work orchestration layer that converts goals into executable tasks, routes those tasks across human and AI workers, and keeps meaningful work moving with visibility, control, and minimal oversight cost.

### Product framing

This product should be treated as operations software for AI work, not as a wrapper around agent chats.

The center of gravity is:

- goals
- tasks
- workers
- runs
- approvals
- artifacts

Agents are labor capacity. Sessions are execution attempts. The product exists to keep that capacity pointed at the highest-value work with the least downtime and the right amount of human oversight.

### Non-goals

This product is not primarily:

- a generic chatbot shell
- a novelty multi-agent demo
- a dashboard for agent theater
- a remote terminal with no work model
- a fully autonomous system with no human governance

## Problem

Without a system like this, AI work is fragmented:

1. A human notices a task.
2. A human manually prompts an agent.
3. The human waits, checks logs, decides next steps, and restarts context.
4. Work stalls whenever the human is unavailable.
5. Agent capacity sits idle even when useful work exists.

The product solves that operational gap by giving AI work a shared backlog, routing layer, execution history, and oversight model.

## North Star

Build a system where useful work keeps moving forward, even when the operator is away, by giving AI agents structured work, monitoring progress, intervening only when needed, and keeping execution aligned with real goals.

## Success Criteria

The prototype is successful when:

- a small pool of workers can pull from a prioritized backlog
- tasks stay tied to explicit goals and artifact paths
- low-risk work can continue without manual babysitting
- blocked, risky, or ambiguous work surfaces quickly for review
- the operator can understand system state in one glance from any device
- work continuity survives session restarts, worker changes, and provider changes

## Current Product Slice

The current repo already contains the first useful slice of the system:

- remote-backed Codex session launching
- resumable threads
- thread logs and last-message capture
- work-centered control-plane entities for goals, tasks, workers, providers, and roles
- worker registration, heartbeat, task polling, task claiming, and task status updates

Existing product surfaces:

- `/app/home`: operator dashboard
- `/app/sessions`: direct thread control
- `/app/goals`: top-level efforts
- `/app/tasks`: queue and assignment
- `/app/workers`: execution capacity
- `/app/providers`: execution backends
- `/app/roles`: routing and responsibility model

Existing worker APIs:

- `POST /api/workers/register`
- `POST /api/workers/heartbeat`
- `POST /api/workers/poll`
- `POST /api/workers/tasks/claim`
- `POST /api/workers/tasks/update`

This means the product is already moving from "session launcher" toward "work orchestration control plane."

## Product Principles

### 1. Center on work, not agents

Goals, tasks, approvals, and artifacts must remain meaningful even if the worker, model, or provider changes.

### 2. Keep humans in the loop only where it matters

Humans should spend attention on prioritization, approvals, ambiguity, and quality control, not on routine dispatch.

### 3. Visibility must be cheap

The operator should be able to answer "what is running, blocked, waiting, or done" without reading full transcripts.

### 4. Execution must be resumable

If a session dies, the work item survives and can be retried or reassigned.

### 5. Degrade gracefully

If autonomy is weak, the system should fall back to explicit queues, reviews, and assignments instead of pretending to be autonomous.

### 6. Optimize for useful completed work

The main question is not "did agents run?" It is "did meaningful work advance?"

## User Roles

### Operator

Owns goals, priorities, approvals, and interventions. Uses mobile and desktop views to monitor and steer work.

### Worker

A local or cloud execution surface that can claim eligible tasks, report heartbeat, perform runs, and submit status updates.

### Reviewer

A human or AI role that checks outputs for correctness, completeness, provenance, or release readiness before closure.

## Core Domain Model

The product should use this hierarchy:

1. Goal
2. Task
3. Run
4. Artifact
5. Approval
6. Worker
7. Provider
8. Role

### Goal

Purpose: the top-level effort that defines why downstream work matters.

Required fields:

- `id`
- `name`
- `lane`
- `status`
- `summary`
- `artifactPath`

Recommended next fields:

- `priority`
- `owner`
- `successCriteria`
- `dueAt`
- `tags`
- `blockedReason`

### Task

Purpose: a discrete unit of work in service of one goal.

Current fields already present:

- `id`
- `title`
- `summary`
- `lane`
- `goalId`
- `priority`
- `status`
- `desiredRoleId`
- `assigneeWorkerId`
- `artifactPath`
- `createdAt`
- `updatedAt`

Required next fields:

- `riskLevel`: `low | medium | high`
- `approvalMode`: `none | before_run | before_apply | before_complete`
- `requiresReview`: boolean
- `blockedReason`: string
- `readyCondition`: short rule for when work is eligible
- `dependencyTaskIds`: string[]
- `runCount`: number
- `latestRunId`: string | null

Optional later fields:

- `estimate`
- `costBudget`
- `confidence`
- `sourceBriefPath`
- `resultSummary`

### Run

Purpose: one execution attempt by one worker against one task.

This is the largest missing model in the current prototype. Session history exists, but it is not yet a first-class control-plane entity.

Required fields:

- `id`
- `taskId`
- `workerId`
- `providerId`
- `status`
- `startedAt`
- `endedAt`
- `threadId`
- `sessionId`
- `promptDigest`
- `artifactPaths`
- `summary`
- `lastHeartbeatAt`
- `errorSummary`

Status values:

- `queued`
- `starting`
- `running`
- `awaiting_approval`
- `blocked`
- `failed`
- `canceled`
- `completed`

### Artifact

Purpose: a durable output or reference produced by a run or attached to a goal or task.

Required fields:

- `id`
- `kind`
- `path`
- `taskId`
- `runId`
- `createdAt`
- `summary`

Kinds:

- `document`
- `code_change`
- `log`
- `research`
- `handoff`
- `screenshot`
- `other`

### Approval

Purpose: a structured checkpoint that consumes scarce human attention only when required.

Required fields:

- `id`
- `taskId`
- `runId`
- `kind`
- `status`
- `requestedAt`
- `decidedAt`
- `requestedReason`
- `decisionSummary`
- `requestedByWorkerId`

Kinds:

- `destructive_action`
- `costly_action`
- `low_confidence`
- `quality_review`
- `completion_review`
- `clarification_needed`

Status values:

- `pending`
- `approved`
- `rejected`
- `expired`

### Worker

Purpose: a reachable execution surface with known capabilities and limits.

Current fields already present are a good baseline:

- `id`
- `name`
- `providerId`
- `roleId`
- `location`
- `status`
- `capacity`
- `registeredAt`
- `lastSeenAt`
- `note`
- `tags`

Recommended next fields:

- `maxConcurrentRuns`
- `costClass`
- `toolAccess`
- `repoAccess`
- `approvalScope`
- `healthNote`

### Provider

Purpose: an abstract execution backend that can be swapped without changing the work model.

Recommended next fields:

- `capabilities`
- `costNotes`
- `supportsResume`
- `supportsInteractiveApproval`

### Role

Purpose: the routing contract between work and worker capability.

Recommended next fields:

- `allowedTaskKinds`
- `approvalDefault`
- `skillSummary`

## State Machines

### Goal State Machine

States:

- `ready`
- `running`
- `review`
- `blocked`
- `done`

Transitions:

- `ready -> running`: first child task starts
- `running -> review`: all child tasks complete and goal-level review remains
- `running -> blocked`: no eligible next task can proceed or a critical dependency is blocked
- `review -> running`: review sends work back for changes
- `review -> done`: success criteria met and approved

### Task State Machine

Current states:

- `ready`
- `running`
- `review`
- `blocked`
- `done`

Recommended near-term expansion:

- `draft`
- `ready`
- `queued`
- `running`
- `awaiting_approval`
- `review`
- `blocked`
- `done`
- `canceled`

Key transitions:

- `draft -> ready`: brief is complete and dependencies are satisfied
- `ready -> queued`: dispatcher selects the task
- `queued -> running`: worker has claimed and started the run
- `running -> awaiting_approval`: worker hits a gated action or low confidence checkpoint
- `running -> review`: work output is ready for human or reviewer validation
- `running -> blocked`: worker cannot proceed without external input
- `review -> ready`: changes requested
- `review -> done`: output accepted
- `blocked -> ready`: blocker resolved

### Run State Machine

States:

- `queued`
- `starting`
- `running`
- `awaiting_approval`
- `blocked`
- `failed`
- `canceled`
- `completed`

Transitions:

- `queued -> starting`: scheduler assigns a worker
- `starting -> running`: runtime is active and heartbeat is healthy
- `running -> awaiting_approval`: gated action reached
- `running -> blocked`: environment, dependency, or clarification issue
- `running -> failed`: non-recoverable execution failure
- `running -> completed`: run reaches planned outcome
- `awaiting_approval -> running`: approval granted
- `awaiting_approval -> blocked`: approval rejected or clarification required

## Primary Screens

### `/app/home`

Purpose: operator mission control.

Should answer:

- what is active
- what is blocked
- what needs approval
- what just completed
- where capacity is idle

### `/app/goals`

Purpose: portfolio and top-level effort management.

Should answer:

- what are the active efforts
- what matters most
- which goals are blocked or under review

### `/app/tasks`

Purpose: backlog, queue discipline, and routing.

Should answer:

- what is ready
- what is assigned
- what is safe to auto-run
- what is blocked by dependencies or approvals

### `/app/workers`

Purpose: capacity and health view.

Should answer:

- what execution surfaces are online
- what each worker is good at
- who is busy, idle, or unhealthy

### `/app/sessions`

Purpose: low-level execution inspection and manual control.

Should remain available, but should become subordinate to task and run views rather than the main product center.

## API Direction

The worker API is already a good seed. The next slice should keep the same posture but become more task- and run-aware.

### Keep

- worker registration
- heartbeat
- poll
- claim
- task update

### Add next

- `POST /api/workers/tasks/next`
- `POST /api/workers/runs/start`
- `POST /api/workers/runs/:runId/heartbeat`
- `POST /api/workers/runs/:runId/artifacts`
- `POST /api/workers/runs/:runId/block`
- `POST /api/workers/runs/:runId/request-approval`
- `POST /api/approvals/:approvalId/approve`
- `POST /api/approvals/:approvalId/reject`

The system should eventually make claiming one task and starting one run separate concepts. Assignment is control-plane state. Execution is run state.

## Metrics

The product should track:

- ready task count
- blocked task count
- approval queue count
- worker utilization
- median time in each task state
- run success rate
- rerun rate
- task throughput by lane
- cost per completed task when available
- idle capacity duration

## Phased Implementation Plan

### Phase 0: Current foundation

Already present in the repo:

- session launch and resume
- control-plane data model for goals, tasks, workers, providers, roles
- worker bootstrap, polling, claiming, and heartbeats
- operator views for sessions and control-plane entities

### Phase 1: Make work explicit

Outcome: move from "task board plus sessions" to "task system with real routing and governance."

Deliver:

- add task `riskLevel`
- add task `approvalMode`
- add task `requiresReview`
- add task `dependencyTaskIds`
- add task `blockedReason`
- add queue filters and badges in `/app/tasks`
- add approval-needed and blocked summaries to `/app/home`

Repo impact:

- `src/lib/types/control-plane.ts`
- `src/lib/server/control-plane.ts`
- `data/control-plane.json`
- `/app/home`
- `/app/tasks`

### Phase 2: Add first-class runs

Outcome: every task execution attempt is observable and resumable independent of the task record.

Deliver:

- create `Run` model and persistence
- link task to latest run and run count
- show run history on task detail or session view
- separate run status from task status
- capture run summaries and artifact paths

Repo impact:

- new run types and persistence module
- session runner integration
- `/app/sessions`
- `/app/tasks`
- operator dashboard summaries

### Phase 3: Add approvals and interventions

Outcome: human attention is requested only at explicit control points.

Deliver:

- approval model and queue
- mobile-friendly approve/reject surfaces
- worker ability to request approval with reason
- summary-first review cards so the operator avoids transcript digging

Repo impact:

- approval types and storage
- approval APIs
- `/app/home` attention module
- new `/app/approvals` view or embedded queue card

### Phase 4: Add automatic dispatch

Outcome: low-risk work can keep moving without manual assignment.

Deliver:

- scheduler that picks the next eligible ready task
- worker capacity-aware dispatch
- dependency checks before assignment
- simple eligibility rules based on role, provider, risk, and approval mode

Repo impact:

- dispatch service
- worker polling contract
- task readiness evaluation
- dashboard metrics for idle capacity and queue health

### Phase 5: Add continuity and quality loops

Outcome: the system behaves like an operating system for ongoing work instead of a launch console.

Deliver:

- retry and reassignment flows
- reviewer role loop
- artifact summaries and handoff quality checks
- richer metrics and audit trail

## Architectural Guidance

### What should remain abstract

- model provider
- runtime backend
- worker location
- session transport

### What should remain first-class

- goals
- tasks
- runs
- approvals
- artifacts
- workers

### Important boundary

Sessions are runtime detail. Tasks and runs are product truth.

That boundary should stay clean. If the system becomes centered on raw Codex sessions, it will collapse back into a session cockpit instead of becoming a durable operations layer.

## MVP Decision Filter

A feature belongs in the product if it increases the system's ability to turn available AI capacity into useful, goal-aligned output with low oversight cost.

If it does not improve throughput, quality, continuity, or oversight efficiency, it is probably a side quest.

## Recommended Immediate Build Order

The next concrete build order for this repo should be:

1. Extend the task model with risk, review, dependency, and blocker fields.
2. Update `/app/tasks` and `/app/home` to surface those fields operationally.
3. Introduce a first-class `Run` entity that links tasks to actual execution attempts.
4. Add an approval queue and explicit approval APIs.
5. Add auto-pick logic for safe tasks only.

That sequence keeps the prototype grounded in useful operations behavior and avoids premature autonomy theater.
