# Coordination Design Notes

Status: Planning note for improving coordination between AI workers and humans in the loop

Last reviewed: 2026-04-06

## Short answer

Yes. There is useful, converging knowledge here.

The strongest pattern is not "let many agents talk freely and hope a swarm emerges." The stronger pattern is:

- keep work decomposed into bounded tasks
- use explicit roles and handoff contracts
- centralize planning or routing in one orchestrator when coordination is needed
- keep humans responsible for prioritization, approvals, ambiguity, and exception handling
- evaluate collaboration directly instead of assuming good solo agents will collaborate well

## Problem framing

This prototype is trying to become a real work orchestration system, not a chat wrapper or agent demo.

The coordination problem is therefore practical:

- how should work move between people and agents
- when should work stay with one worker versus split into sub-work
- how should handoffs happen without losing context
- where should human attention be spent
- how should the system notice coordination failure early

## Current product observations

The current repo already has the right center of gravity for this:

- `Task` as the work object
- `Worker` as capacity
- `Thread` as reusable context
- `Run` as execution attempt
- `Review`, `Approval`, and `Decision` as governance surfaces
- `Artifact` paths as durable outputs

That means the next coordination pass should mostly strengthen contracts, handoffs, and review flow inside the existing model. It does not need a speculative swarm architecture.

## What seems established

### 1. Simpler coordination patterns beat agent theater

Anthropic's December 19, 2024 guidance says the most successful teams were using simple, composable patterns rather than complex frameworks, and it makes a clear distinction between predefined workflows and more autonomous agents.

Implication for this project:

- default to the smallest coordination pattern that fits the task
- prefer workflow-first execution for repeatable paths
- only add multi-agent coordination when the task is actually decomposable

### 2. Multi-agent systems work best when the work is truly parallelizable

Anthropic's June 13, 2025 writeup on their Research system reports strong gains from an orchestrator-worker pattern on breadth-first research, but it also says many coding tasks are not highly parallelizable and that agents are still not great at coordinating and delegating to each other in real time.

Implication for this project:

- use multi-agent coordination mainly for broad research, discovery, comparison, and evidence gathering
- use single-worker execution more often for focused implementation tasks
- do not assume "more agents" means "faster" or "better"

### 3. Delegation quality matters more than role labels

Anthropic's production lessons are very explicit here: subagents need a concrete objective, expected output format, tool guidance, and clear task boundaries. They also found that effort budgets should scale with task complexity instead of being left implicit.

Implication for this project:

- a handoff should be a contract, not a vibe
- each delegated run should carry a bounded brief, artifact expectations, and stop conditions
- the orchestrator should control subtask count and effort budget

### 4. External artifacts reduce coordination loss

Anthropic also recommends persisting plans, summaries, and subagent outputs outside the chat loop. Their filesystem pattern is meant to reduce the "game of telephone" between coordinator and worker agents.

Implication for this project:

- treat artifacts as first-class coordination objects
- pass references to artifacts, not long transcript summaries, when possible
- make review cards summary-first and artifact-first

### 5. Human-agent collaboration needs more than interaction

Microsoft's human-agent collaboration work distinguishes interaction from collaboration. Their formulation is useful: collaboration involves mutual goal understanding, preemptive task co-management, and shared progress tracking.

Implication for this project:

- operator intent must be explicit in the task, not buried in prompts
- progress tracking should be shared and inspectable
- the system should expose why a worker is doing something, what is next, and what is blocked

### 6. Human-in-the-loop design needs explicit controls

Microsoft's Human-AI Interaction Guidelines emphasize making capabilities and uncertainty clear, supporting efficient dismissal and correction, scoping behavior when uncertain, encouraging granular feedback, and providing global controls.

Implication for this project:

- make worker capability and confidence visible before dispatch
- give operators fast ways to cancel, reroute, request changes, and override defaults
- expose why a run escalated or why the system chose a worker

### 7. Good solo agents do not automatically become good collaborators

Microsoft Research's November 2025 "The Collaboration Gap" reports that models that perform well alone often degrade when required to collaborate. The same work found that having the stronger agent lead before handing off improved outcomes.

Implication for this project:

- evaluate collaboration as its own capability
- prefer a lead-worker pattern over symmetric peer swarms
- assign ownership explicitly instead of assuming agents will negotiate it cleanly

### 8. More tools and more agents can make coordination worse

Microsoft's Magentic-One work shows the value of a top-level orchestrator that plans, tracks progress, and replans after errors. Related Microsoft Research work on tool-space interference also shows that adding tools or agents can reduce end-to-end performance.

Implication for this project:

- keep worker capabilities legible and bounded
- avoid giant undifferentiated tool menus
- add specialization only when it improves routing clarity

## Coordination topology options

### Option A: Peer swarm

Structure:

- many agents talk to each other with weak central control
- ownership emerges dynamically

Tradeoffs:

- flexible in theory
- expensive to observe and debug
- high duplication risk
- weak fit for reviewable operations software

Assessment:

- not a good default for this product

### Option B: Orchestrator-worker with review gates

Structure:

- one planner or coordinator decomposes and routes work
- workers execute bounded subtasks
- reviewer or operator checks outputs at explicit gates

Tradeoffs:

- easier to reason about
- easier to instrument
- may underuse parallelism if the orchestrator is too conservative

Assessment:

- best default for this product

### Option C: Workflow-first pipeline with optional agent steps

Structure:

- deterministic system flow for common paths
- agents invoked at specific steps for planning, synthesis, or execution

Tradeoffs:

- strong reliability for recurring work
- less flexible on novel tasks
- simpler to evaluate than an open agent network

Assessment:

- best for stable, repeated operating loops

## Recommendation

Use a hybrid of Option B and Option C:

- default to workflow-first coordination for known paths
- use an orchestrator only when decomposition, routing, or replanning is needed
- keep peer-to-peer agent collaboration rare and tightly bounded

This matches the current prototype's product principles:

- work-centered model
- cheap visibility
- resumable execution
- explicit review and approval
- graceful fallback when autonomy is weak

## Recommended coordination model for this project

### Roles

- `Operator`: sets priority, risk tolerance, approvals, and final acceptance
- `Orchestrator`: decomposes tasks, chooses workers, defines handoff contracts, tracks progress, replans
- `Worker`: performs one bounded execution attempt
- `Reviewer`: checks output quality, completeness, provenance, and contract satisfaction

The reviewer can be human or AI, but irreversible actions should still route through human approval.

### Coordination objects

These should be explicit in the product model, even if some start as derived fields rather than new tables:

- `Task Brief`: goal, scope, success criteria, risk, artifact root, dependencies
- `Delegation Packet`: subtask objective, allowed tools, required sources, output contract, effort budget
- `Checkpoint`: short structured progress update with next action and blocker state
- `Handoff Artifact`: the durable result passed to the next worker or reviewer
- `Escalation Record`: why the run stopped or asked for help
- `Review Decision`: accepted, rejected, changes requested, deferred

### Core rules

- one owner per task at a time
- one explicit reason for every escalation
- every delegated run must have a defined output contract
- artifact references should be preferred over transcript forwarding
- the orchestrator should replan only at checkpoints or on failure, not continuously
- human review should be consumed at explicit gates, not by forcing transcript inspection

## Candidate product changes

### 1. Strengthen task contracts

Add or normalize fields like:

- `successCriteria`
- `scopeBoundary`
- `riskLevel`
- `approvalMode`
- `dependencyTaskIds`
- `requiredCapabilities`
- `expectedArtifacts`
- `escalationPolicy`

The goal is not more metadata for its own sake. The goal is to make delegation and review less ambiguous.

### 2. Make run handoffs structured

Add or derive fields like:

- `checkpointSummary`
- `nextActionSuggestion`
- `escalationReason`
- `inputArtifactPaths`
- `outputArtifactPaths`
- `contractSatisfied`

This would make run details more useful than raw logs for coordination.

### 3. Add a delegation tree to task detail

The operator should be able to see:

- parent task
- child or delegated runs
- current owner
- current checkpoint
- waiting reason
- review state

This is likely more valuable than showing more transcript.

### 4. Add an escalation inbox

Humans should be pulled in for:

- ambiguity the worker cannot resolve
- missing context or access
- conflicting requirements
- approval-required actions
- repeated failures after bounded retries

This keeps "human in the loop" narrow and intentional.

### 5. Evaluate coordination, not just execution

Track metrics like:

- duplicate work rate
- handoff churn
- review change-request rate
- blocked-task dwell time
- escalation accuracy
- replan frequency
- task completion time by coordination pattern
- cost by coordination pattern

Without this, the system cannot tell whether more coordination is helping or merely adding overhead.

## Risks and failure modes

- over-decomposition: the coordination cost exceeds the work value
- thread/task confusion: reusable context gets mistaken for work state
- tool sprawl: too many tools hurt routing and tool choice quality
- review collapse: humans end up reading transcripts because summaries are weak
- fake autonomy: the system hides uncertainty instead of escalating
- schema bloat: the data model grows faster than the product's real operating loops

## Suggested phased plan

### Phase 1: Better contracts and visibility

1. Add task-level success criteria, scope boundary, and escalation policy.
2. Add run-level checkpoint and escalation summaries.
3. Improve task and run detail pages so handoffs are summary-first and artifact-first.

### Phase 2: Structured delegation

1. Add explicit delegation packets for orchestrated work.
2. Add a small delegation tree on task detail.
3. Restrict orchestrated multi-agent work to tasks marked as decomposable.

### Phase 3: Coordination evals

1. Create a small benchmark set from real AMS tasks.
2. Compare single-worker, orchestrator-worker, and workflow-first patterns.
3. Measure completion, review churn, latency, and cost.

### Phase 4: Human governance tightening

1. Add an escalation inbox and approval queue.
2. Add better reason codes for rejection, replan, and reroute.
3. Feed these signals into the self-improvement system as coordination-quality inputs.

## Bottom line

The main design lesson is straightforward:

Reliable coordination comes less from giving many agents freedom and more from making work contracts, ownership, checkpoints, artifacts, and review gates explicit.

For this prototype, that means building a clearer orchestrator-worker-review loop on top of the current task/run/thread/artifact model, while keeping humans responsible for goals, approvals, and exceptions.

## Sources checked

These sources were checked on 2026-04-06.

- Anthropic, "Building effective agents" (published December 19, 2024): https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, "How we built our multi-agent research system" (published June 13, 2025): https://www.anthropic.com/engineering/multi-agent-research-system
- Microsoft Research, "Guidelines for human-AI interaction design" (published February 1, 2019): https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/
- Microsoft Research, "Human-Agent Collaboration: Can an Agent be a Partner?" (published May 2017): https://www.microsoft.com/en-us/research/publication/human-agent-collaboration-can-an-agent-be-a-partner/
- Microsoft Research, "Magentic-One: A Generalist Multi-Agent System for Solving Complex Tasks" (published November 2024): https://www.microsoft.com/en-us/research/publication/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/
- Microsoft Research, "The Collaboration Gap" (published November 2025): https://www.microsoft.com/en-us/research/publication/the-collaboration-gap/
