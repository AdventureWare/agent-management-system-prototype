# Planning System Spec

Date: 2026-03-31
Project: Agent Management System Prototype
Scope: planning page, planning data model, capacity-aware sequencing, and future AI-assisted planning

## Why this needs its own surface

The repo already has durable primitives for:

- goals with hierarchy and linked projects/tasks
- tasks with dependencies, approvals, and runs
- workers with capacity and role/provider routing

What it does not yet have is a planning layer that answers:

- what horizon are we planning for right now
- which goals fit inside that horizon
- what sequence of subgoals and tasks gets those goals done
- whether available worker capacity can actually absorb that plan
- what the AI should be allowed to propose versus execute

The planning page should fill that gap. It should sit above `/app/goals`, `/app/projects`, and `/app/tasks`, not replace them.

## Current repo findings

Relevant starting points already exist in the codebase:

- `Goal.horizon` exists today, but is a freeform string rather than a structured planning window.
- Goal hierarchy already exists through `parentGoalId`.
- Goal-to-project and goal-to-task relationships already exist and are surfaced in the goal routes.
- Tasks already support `dependencyTaskIds`, `riskLevel`, `approvalMode`, `requiresReview`, and run linkage.
- Workers already expose `capacity`, but only as a coarse execution slot count rather than planning capacity over time.

This means the first planning slice should extend the current control-plane model, not create a separate planner database.

## Research inputs

The product direction below is informed by the current repo and a small set of official references:

- Atlassian Goals and program modeling: goals are outcome-oriented, can have sub-goals, and link projects and delivery work.
- Linear Initiatives, timelines, milestones, and dependencies: keep portfolio planning distinct from granular issue execution while preserving rollups and sequencing.
- Asana capacity planning: long-range staffing and task assignment are related but not identical views.
- Notion subtasks and dependencies: decomposition and blockage need to be first-class planning tools.
- Linear AI agents and Notion AI project planning: AI is most useful when it proposes, decomposes, summarizes, and delegates within a governed work model.

Sources:

- https://support.atlassian.com/platform-experiences/docs/what-is-a-goal/
- https://support.atlassian.com/platform-experiences/docs/modeling-large-programs-of-work-with-goals-and-projects/
- https://linear.app/docs/initiatives
- https://linear.app/docs/sub-initiatives
- https://linear.app/docs/timeline
- https://linear.app/docs/project-milestones
- https://linear.app/docs/project-dependencies
- https://help.asana.com/s/article/capacity-planning
- https://www.notion.com/help/guides/tasks-manageable-steps-sub-tasks-dependencies
- https://linear.app/docs/agents-in-linear
- https://www.notion.com/help/notion-academy/lesson/plan-projects-with-ai

## Product principles

### 1. Horizons should be explicit

Freeform goal horizon text is useful as narrative, but planning requires a real object with dates, scope, and status.

### 2. Planning stays outcome-first

Goals and subgoals define intended outcomes. Projects provide context and workspace defaults. Tasks remain execution units. The planning page should connect these layers, not blur them.

### 3. Capacity is a planning input, not a vanity metric

The system should show whether a horizon is underloaded, balanced, or overloaded by role and by worker before work is launched.

### 4. Back-planning should produce editable structure

The system should help derive milestones, subgoals, and tasks backward from a target date, but humans must be able to adjust sequence, estimates, and dependencies directly.

### 5. AI should suggest before it commits

For planning, silent autonomous writes are the wrong default. The assistant should generate options, rationale, and diffs that a human accepts.

## Recommended information architecture

Add a new top-level route:

- `/app/planning`

Purpose:

- plan a time-bounded horizon
- slot goals into that horizon
- decompose goals into subgoals, milestones, and tasks
- check feasibility against available capacity
- hand accepted plan elements into the existing goals/tasks/runs system

The page should have five zones.

### 1. Horizon bar

Shows:

- current horizon selector
- date range
- draft or active state
- total capacity
- planned load
- overload or slack signal

Actions:

- create horizon
- duplicate prior horizon
- close horizon
- open AI planning assistant

### 2. Goal slate

A ranked list of goals committed to the selected horizon.

Each goal card should show:

- goal name and status
- parent goal if present
- linked projects
- success signal
- target date
- confidence
- effort estimate
- current rollup progress

Primary interactions:

- add existing goal to horizon
- create a new goal directly in the horizon
- reorder by importance
- expand into plan breakdown

### 3. Breakdown workspace

The main interactive area for turning a goal into a plan.

Default view:

- phases or milestones from left to right
- subgoals under the goal
- tasks under milestones or subgoals
- dependency lines

Alternative views:

- outline view for fast editing
- timeline view for dates and overlap

### 4. Capacity sidebar

Shows planned load for the selected horizon by:

- role
- worker
- project
- risk band

It should also call out:

- overloaded workers
- goals with no feasible owner
- dependencies that push work past the horizon end
- work with no estimate

### 5. AI planning drawer

The assistant should work inside the current horizon and selected goal context.

Supported actions later:

- propose goal decomposition
- propose milestones
- create draft tasks
- suggest estimates and dependencies
- rebalance overloaded work
- summarize plan risks and missing information

## Recommended data model changes

The first implementation should extend the control-plane schema with one new entity and a focused set of fields.

### New entity: `PlanningHorizon`

Recommended shape:

- `id`
- `name`
- `kind`: `week | month | quarter | custom`
- `status`: `draft | active | closed`
- `startDate`
- `endDate`
- `notes`
- `capacityUnit`: `hours | points | slots`
- `createdAt`
- `updatedAt`

Why:

- it gives the planning page a real home
- it replaces the current freeform-only horizon concept with something schedulable
- it supports historical comparisons across horizons

### Extend `Goal`

Add:

- `planningHorizonId: string | null`
- `targetStartDate: string | null`
- `targetDate: string | null`
- `planningPriority: number`
- `confidence: 'low' | 'medium' | 'high'`
- `health: 'on_track' | 'at_risk' | 'off_track'`
- `ownerWorkerId: string | null`
- `metricDefinition: string`

Keep:

- `horizon` as narrative copy for now during migration

### Extend `Task`

Add:

- `parentTaskId: string | null`
- `planningHorizonId: string | null`
- `milestone: string`
- `estimateHours: number | null`
- `remainingHours: number | null`
- `earliestStartDate: string | null`
- `targetDate: string | null`
- `scheduledStartDate: string | null`
- `scheduledEndDate: string | null`
- `planningOrder: number`
- `source: 'manual' | 'ai_proposed' | 'ai_accepted'`

Why:

- back-planning needs subtasks
- capacity planning needs effort estimates and dates
- AI planning needs provenance

### Extend `Worker`

Add:

- `weeklyCapacityHours: number | null`
- `focusFactor: number`
- `skills: string[]`
- `costClass: 'low' | 'medium' | 'high'`
- `maxConcurrentRuns: number | null`

Interpretation:

- existing `capacity` remains useful for live dispatch
- `weeklyCapacityHours` becomes the planning input

### Derived, not stored initially

Compute these in server helpers before deciding to persist them:

- horizon utilization percent
- worker slack or overload
- goal effort rollups
- dependency critical path length
- spillover past horizon end

## Planning behaviors

### Horizon setup

The operator should be able to create:

- a weekly execution horizon
- a monthly coordination horizon
- a quarterly strategic horizon
- a custom date range

Recommended default:

- quarter for goals
- month for milestone review
- week for executable task planning

### Goal slotting

When a goal is added to a horizon, the page should require or strongly suggest:

- linked project context
- target date
- success signal
- effort estimate or confidence placeholder
- owner

If the goal is too large for the selected horizon, the UI should push the user toward:

- splitting it into subgoals
- deferring lower-priority work
- creating explicit spillover into a later horizon

### Back-planning flow

For each goal:

1. Start from the target date.
2. Add milestone checkpoints or subgoals.
3. Break each checkpoint into tasks and subtasks.
4. Add dependencies.
5. Estimate effort.
6. Assign owner role or worker.
7. Check feasibility against capacity.

The main interaction should allow both:

- manual editing
- AI-generated first draft

### Capacity calculation

For the first useful implementation, use:

- `worker weeklyCapacityHours * focusFactor`
- minus estimated hours from tasks scheduled inside the horizon

Roll up by:

- worker
- desired role
- project

Do not block saving a plan when estimates are incomplete. Instead:

- mark missing estimates clearly
- show reduced-confidence utilization math

### Readiness and execution handoff

The planning page should not automatically launch work by default.

Instead it should move accepted plan items into existing execution surfaces:

- goals remain visible in `/app/goals`
- tasks become visible in `/app/tasks`
- worker assignment and dispatch stay compatible with current worker APIs

Later, a horizon can expose:

- `Promote ready tasks`
- `Auto-queue low-risk planned tasks`

## AI assistance design

AI planning should arrive after the manual planning loop works.

### Good AI jobs

- turn a goal brief into candidate milestones, subgoals, and tasks
- infer likely dependencies
- draft estimates with explicit confidence
- spot missing project links, owners, or success criteria
- propose a rebalance when capacity is overloaded
- summarize tradeoffs between multiple planning options
- update plans when dependencies slip or goals change

### Bad AI defaults

- silently rewriting goals or tasks
- assigning dates without capacity context
- auto-closing planning gaps by inventing facts
- launching execution immediately after plan generation

### Required governance

Every AI planning action should return:

- proposed changes
- rationale
- confidence
- affected entities
- a human approval affordance

Accepted changes should stamp provenance into stored fields such as `source` and future activity logs.

## Suggested phased implementation

### Phase 1: Manual planning foundation

Outcome:

- a useful planning page exists even with no AI

Deliver:

- add `PlanningHorizon` model
- add structured goal and task scheduling fields
- add `/app/planning`
- allow horizon creation and goal slotting
- support manual breakdown into milestones, subgoals, tasks, and subtasks
- show dependency-aware outline view

Recommended repo impact:

- `src/lib/types/control-plane.ts`
- `src/lib/server/control-plane.ts`
- `src/lib/server/planning.ts` (new)
- `src/routes/app/planning/+page.server.ts` (new)
- `src/routes/app/planning/+page.svelte` (new)
- `src/lib/components/Sidebar.svelte`
- `data/control-plane.json`

### Phase 2: Capacity-aware planning

Outcome:

- the page can tell whether a plan fits the available team

Deliver:

- add worker planning-capacity fields
- add task estimates and scheduled dates
- compute utilization and overload warnings
- add capacity panel and summary badges
- show spillover beyond the horizon end

Recommended repo impact:

- `src/lib/server/planning.ts`
- `src/routes/app/planning/+page.server.ts`
- new planning UI components for utilization and warnings
- worker forms and worker detail routes

### Phase 3: AI-assisted plan drafting

Outcome:

- the system can draft and revise plans, but only through explicit review

Deliver:

- prompt builders for goal decomposition and horizon planning
- AI draft generation into temporary proposal objects
- accept or reject flow for proposed tasks and edits
- provenance tracking on accepted entities

Recommended repo impact:

- `src/lib/server/planning-ai.ts` (new)
- planning actions on `/app/planning`
- optional session reuse for planning threads

### Phase 4: Adaptive planning and auto-execution

Outcome:

- accepted plans can adapt when work slips, completes early, or capacity changes

Deliver:

- replan suggestions on missed dependencies or overload
- auto-promotion of safe planned tasks into ready execution
- policy controls for which work AI may queue automatically

This phase should only come after planning quality is trustworthy.

## Recommended first build

If only one slice gets built now, build this:

1. Add `PlanningHorizon`.
2. Add `Task.parentTaskId` and `Task.estimateHours`.
3. Add `/app/planning` with:
   - horizon selector
   - goal slate
   - outline-based decomposition editor
   - dependency editor
   - simple capacity summary by worker role
4. Keep AI out of the critical path.

That is the smallest slice that turns planning from a note-taking exercise into an operational control surface.

## Open questions

- Should planning be primarily quarter-oriented, month-oriented, or week-oriented for this product's first user?
- Should subgoals remain only at the goal layer, or should the product also support milestone entities explicitly?
- Is worker capacity best measured in hours, points, or concurrent slots for this operator's workflow?
- Should AI proposals persist as draft records in the control plane, or remain ephemeral until accepted?
- Does the operator want one shared horizon across all lanes, or separate planning horizons by lane or project?

## Bottom line

The right implementation is not "add a smarter goals page."

The right implementation is:

- a dedicated planning route
- a structured planning horizon
- editable decomposition from goal to subgoal to task to subtask
- dependency and capacity awareness
- AI assistance that proposes and adapts plans under human control

That fits the repo's current architecture and creates a credible path from strategic intent to executable work.
