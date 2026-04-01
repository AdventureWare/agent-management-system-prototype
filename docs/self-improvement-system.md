# Self-Improvement System

## Problem Framing

The agent management system already has enough operational data to start improving itself:

- tasks carry status, priority, blockers, dependencies, and thread links
- runs capture execution attempts, failures, and summaries
- reviews and approvals capture governance outcomes
- sessions capture reusable thread context and continuity signals

What is missing is a structured loop that turns those signals into deliberate system improvements.

The goal is not full autonomy. The goal is to make the system better at:

- detecting recurring execution problems
- adapting routing and recovery behavior
- capturing useful knowledge from work history
- refining reusable skills and checklists
- escalating to humans only when needed

## Current-State Observations

The current prototype already supports the raw ingredients of a learning loop:

- `ControlPlaneData` is the durable operational record for tasks, runs, reviews, approvals, workers, providers, and projects.
- `agent-sessions.ts` and the worker APIs give the system thread continuity and execution traces.
- `task-work-items.ts` already computes stale-work signals.
- `task-thread-suggestions.ts` already derives reusable-context hints.
- reviews, approvals, and blocked tasks already represent explicit quality and coordination feedback.

This means the right next step is not a separate "AI learning subsystem." It is a distillation layer on top of the current control plane.

## Recommended Architecture

### 1. Observation Layer

Emit structured feedback signals from existing workflow events.

Primary signal sources:

- run failures and blocked runs
- stale tasks and stale threads
- blocked tasks and unmet dependencies
- review outcomes, especially `changes_requested`
- approval rejections or repeated review loops
- successful thread reuse decisions

This layer should stay simple: derive signals from current records first before adding new event infrastructure.

### 2. Opportunity Distillation Layer

Group raw signals into concrete improvement opportunities.

Each opportunity should answer:

- what pattern is happening
- why it matters
- what evidence supports it
- what change the system should try next

This is the minimum useful self-improvement loop, and it is what is implemented in this pass.

### 3. Knowledge Capture Layer

Once an opportunity is accepted or resolved, distill the lesson into a durable knowledge object.

Recommended future record types:

- `FeedbackSignal`: one structured observation from a run, task, review, approval, or thread
- `LearningLoop`: a grouped problem/opportunity with status, owner, and outcome
- `KnowledgeItem`: a durable note, decision, checklist, or troubleshooting pattern
- `SkillCandidate`: a reusable prompt, skill patch, or automation rule derived from repeated knowledge items
- `Experiment`: a controlled rollout of a new heuristic or automation rule

Keep these as explicit domain records. Do not hide them in free-form transcripts.

### 4. Skill Refinement Layer

Repeated knowledge items should graduate into reusable assets:

- project-local skills in `.agents/skills`
- prompt templates
- preflight checks
- task decomposition heuristics
- thread assignment heuristics
- stale-work recovery rules

Promotion into a reusable skill should happen only after repeated evidence, not after every isolated issue.

### 5. Governance Layer

Self-improvement must stay governed.

Recommended guardrails:

- the system may detect and draft improvement tasks automatically
- the system may attach evidence and proposed actions automatically
- the system should not silently rewrite core behavior without approval
- changes to routing heuristics, prompt templates, or skills should go through review
- high-confidence, low-risk adaptations can later be auto-applied behind an explicit policy

## Implemented Foundation

This pass adds the first concrete slice:

- `src/lib/server/self-improvement.ts`
  - derives structured improvement opportunities from the current control-plane and session data
- `src/routes/api/improvement/opportunities/+server.ts`
  - exposes the report as an API endpoint
- `src/lib/server/self-improvement.spec.ts`
  - verifies that current signals become concrete opportunities

Current opportunity sources:

- `failed_runs`
- `blocked_tasks`
- `stale_tasks`
- `review_feedback`
- `thread_reuse_gap`

Current categories:

- `reliability`
- `coordination`
- `quality`
- `knowledge`
- `automation`

This is intentionally modest. It gives the system a grounded way to notice where it should improve before introducing heavier storage or automation.

## Recommended Next Phases

### Phase 1: Persist Learning Loops

Add durable storage for:

- feedback signals
- grouped learning loops
- outcomes and resolution notes

Use this to prevent rediscovering the same issue repeatedly.

### Phase 2: Turn Opportunities into Draft Tasks

Allow the operator to:

- inspect opportunities
- accept or dismiss them
- create draft remediation tasks directly from the suggestion payload

This should reuse the current task model instead of inventing a second backlog.

### Phase 3: Capture Durable Knowledge

When a remediation task is completed, require one of:

- a knowledge note
- a checklist update
- a skill update
- a reason for why no durable artifact was needed

This creates an actual memory and refinement loop.

### Phase 4: Measure Improvement Outcomes

Track whether accepted improvement work actually helped:

- fewer failures for the same path
- fewer stale tasks
- fewer review change requests
- faster task completion
- better thread reuse acceptance

Do not claim learning if outcomes are not improving.

### Phase 5: Adaptive Automation

Only after the above exists, consider limited automation such as:

- auto-creating low-risk improvement tasks
- auto-recommending thread reassignment
- auto-triggering stale-work recovery
- auto-applying approved skill or checklist updates

## Practical Implementation Plan

1. Add a small UI surface for `/api/improvement/opportunities` on the home page or a dedicated improvement page.
2. Let the operator create draft tasks from an opportunity with one click.
3. Persist opportunity status so accepted, dismissed, and resolved items are tracked.
4. Add artifact conventions for durable knowledge capture in `docs/` or a dedicated knowledge area.
5. Promote repeated accepted opportunities into local skills or workflow rules.

## Design Constraints

- Keep the learning model explicit and inspectable.
- Reuse existing task/run/review/session data before introducing new storage.
- Favor draft tasks, notes, and heuristics over opaque autonomous mutation.
- Measure whether the system is improving, not just whether it generated more analysis.
