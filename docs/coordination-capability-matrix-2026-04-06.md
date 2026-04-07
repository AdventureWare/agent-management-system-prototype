# Coordination Capability Matrix

Status: Current-state review and smallest-next-pass recommendation

Last reviewed: 2026-04-06

## Purpose

This note turns the current repo review into a simple answer:

- which coordination capabilities are already present
- which are only partial
- which are still missing
- what the smallest high-value next implementation pass should be

This is based on current repo truth, not on the full product intent.

## Capability matrix

| Capability                              | Current state | Read                                                                                                                                                         |
| --------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Work-centered control plane             | Present       | The system is already centered on tasks, workers, runs, approvals, reviews, and artifacts.                                                                   |
| Role/capability/tool-based routing      | Present       | Worker fit is ranked using desired role, capability names, tool names, worker status, and assigned load.                                                     |
| Dependency gating                       | Present       | Tasks can declare dependencies, and workers cannot claim tasks whose dependencies are incomplete.                                                            |
| Before-run approval gate                | Present       | Worker claim flow blocks tasks waiting on `before_run` approval.                                                                                             |
| Task-local human review and approval    | Present       | Task detail exposes open review and pending approval controls.                                                                                               |
| Resumable thread reuse                  | Present       | Task detail supports thread suggestions, assigned thread reuse, and latest compatible thread reuse.                                                          |
| Artifact-aware task workspace           | Partial       | The task detail page has attachments and an artifact browser, but handoff artifacts are not yet typed coordination objects.                                  |
| Explicit task contract                  | Partial       | Tasks carry routing and governance fields, but the execution brief is still mostly title plus free-text instructions.                                        |
| Global human governance queue           | Partial       | Governance exists, but it is still mainly task-local rather than a dedicated inbox or queue.                                                                 |
| Coordination self-improvement signals   | Partial       | The system can derive improvement opportunities from blockers, failures, review feedback, and thread reuse gaps, but not from explicit coordination metrics. |
| Capacity-aware dispatch enforcement     | Missing       | Worker records include capacity and concurrency hints, but current poll and claim flows do not appear to enforce them.                                       |
| Structured run checkpoints and handoffs | Missing       | Runs do not yet carry typed checkpoint, next-action, escalation, or contract-satisfaction fields.                                                            |
| First-class delegation model            | Missing       | There is no parent/child task or run model, no delegation packet, and no orchestrator-owned subwork representation.                                          |
| Global escalation inbox                 | Missing       | There is no standalone surface for cross-task escalations, rejected approvals, or review attention items.                                                    |
| Coordination evaluation loop            | Missing       | The system does not yet compare single-worker versus orchestrated patterns on latency, churn, or cost.                                                       |

## What this means

The prototype is already a legitimate execution control plane.

It is not yet a full coordination system in the stronger sense of:

- explicit contracts between planner, worker, and reviewer
- durable handoff records
- centralized human intervention queues
- capacity-aware dispatch
- first-class delegation structures

That is a good place to be. The current foundation is strong enough that the next pass can be incremental.

## Smallest next pass

Recommendation: do one coordination-hardening pass before adding explicit multi-agent orchestration.

That pass should improve:

1. task contracts
2. run handoffs
3. human governance visibility
4. capacity-aware dispatch

### Scope

#### 1. Strengthen task contracts

Add a small number of task fields:

- `successCriteria`
- `readyCondition`
- `resultSummary` or `expectedOutcome`

Reason:

- gives workers a clearer finish line
- makes review less subjective
- creates a stronger handoff to future orchestrators without introducing a new entity yet

#### 2. Add structured run handoff fields

Add a small number of run fields:

- `checkpointSummary`
- `nextAction`
- `escalationReason`
- `contractSatisfied`

Reason:

- turns runs into coordination records instead of only execution logs
- makes human review cheaper
- creates a better substrate for later agent-to-agent handoff

#### 3. Add one operator governance queue

Add a small home-page section or dedicated page that aggregates:

- open reviews
- pending approvals
- blocked tasks with explicit blocker reasons
- stalled active runs

Reason:

- keeps human attention narrow and cheap
- turns task-local governance into actual operator workflow

#### 4. Enforce worker concurrency limits

Use existing worker fields before adding new planning logic:

- `capacity`
- `maxConcurrentRuns`

Apply them in worker poll and claim behavior.

Reason:

- improves coordination realism immediately
- reduces over-assignment risk
- uses fields the schema already carries

## Explicitly out of scope for the next pass

Do not add these yet:

- a free-form peer swarm model
- a new orchestrator entity
- automatic task decomposition
- a full parent/child task tree
- autonomous replanning across many workers

Those become much safer after contracts, handoffs, and queues are stronger.

## Suggested implementation order

1. Add task contract fields to the type, storage normalization, task create flow, and task detail page.
2. Add run handoff fields to the type, run creation/update paths, and run/task detail UI.
3. Add a compact governance queue on `/app/home`.
4. Enforce worker concurrency limits in poll and claim flows.

## Exit criteria

The pass is complete when:

- a task can express not just instructions, but also what counts as done
- a run can express not just status, but also checkpoint, next action, and escalation reason
- an operator can see review, approval, blocker, and stalled-run attention in one place
- workers no longer receive work beyond their declared concurrency limit

## After that

Only after the pass above should the product introduce a stronger delegation model such as:

- parent and child tasks
- delegation packets
- orchestrator-owned subruns
- coordination metrics by pattern

At that point, the system would be ready to move from "execution control plane" toward "explicit coordination plane" without skipping the hard parts.
