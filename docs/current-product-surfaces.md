# Current Product Surfaces

Date: 2026-04-01
Project: Agent Management System Prototype

This audit is based on the current routes, server loaders/actions, and seeded data. It is meant to answer a simple question:

What is each top-level surface actually doing today, versus what it may grow into later?

## Current center of gravity

The prototype already models a broad control plane, but the main working loop is narrower:

1. Create or review a `Task`
2. Start or reuse a `Thread`
3. Record one or more `Runs`
4. Inspect outputs, blockers, approvals, reviews, and artifacts

That means the most operational surfaces today are:

- `Tasks`
- `Runs`
- `Threads` (currently stored and routed as sessions)
- `Home`, which aggregates signals from those surfaces

## Surface audit

### Home

Route: `/app/home`

What it is doing now:

- Acts as an operator dashboard, not as a primary editing surface.
- Aggregates session/thread state, task attention items, stale-work detection, and self-improvement opportunities.
- Provides a fast scan across active work, blocked work, resumable threads, and emerging operational issues.

What it is not doing:

- It is not the canonical source of truth for editing most entities.
- It does not replace the task, run, or thread detail pages.

### Tasks

Route: `/app/tasks`

What it is doing now:

- This is the strongest primary workflow surface in the app.
- Lets you create tasks, attach files, and optionally launch work immediately.
- Connects tasks to projects, workers, threads, runs, approvals, and reviews.
- Includes project skill visibility alongside the task queue and create flow.

Task detail: `/app/tasks/[taskId]`

- This is where execution control becomes concrete.
- Shows thread suggestions, run history, approvals, reviews, attachments, and artifact paths.
- Supports starting work, reusing a compatible thread, and managing task execution state.

Current read:

- `Task` is the main unit of work in the prototype today.

### Threads

Route: `/app/sessions`

What it is doing now:

- Despite the route name, this is effectively the thread registry.
- Stores resumable Codex context containers with many runs over time.
- Supports starting, resuming, archiving, refreshing, and following up on existing work.
- Still uses session naming in storage and APIs, but the UI already treats these records more like threads.

Current read:

- This surface is operationally important and sits very close to the core loop.

### Runs

Route: `/app/runs`

What it is doing now:

- Acts as an execution ledger.
- Lets you filter historical run records by status, task, worker, provider, and time.
- Exposes prompt digests, heartbeat timing, thread links, error summaries, and artifact paths.

What it is not doing:

- It is mostly inspect/filter today rather than a control surface for changing execution.

Current read:

- `Run` is a real first-class model and useful for auditability, debugging, and traceability.

### Projects

Route: `/app/projects`

What it is doing now:

- Works as a context directory for default paths and repo/workspace configuration.
- Captures project root, artifact root, repo path/URL, branch, and sandbox defaults.
- Helps tasks and threads inherit the right working context.

Project detail: `/app/projects/[projectId]`

- Lets you edit those defaults and inspect linked goals/tasks.

Current read:

- `Project` is currently a durable context container, not the center of execution.

### Goals

Route: `/app/goals`

What it is doing now:

- Provides an outcome layer above tasks.
- Supports parent/child goals plus links to projects and tasks.
- Helps define artifact paths and organize work under larger efforts.

Current read:

- Goals are real and useful, but they are not yet the main day-to-day operating surface.
- In the current seeded data, many tasks are not strongly goal-linked, which makes goals feel more structural than operational right now.

### Planning

Route: `/app/planning`

What it is doing now:

- Reviews and edits planning fields over the existing control-plane data.
- Works over date windows, goal scope, worker scope, and scheduled versus unscheduled work.
- Includes saved planning windows, capacity summaries, and editable goal planning fields.

What it is not doing yet:

- It is not a full autonomous planning engine.
- It does not yet feel like the dominant workflow for creating and sequencing work.

Current read:

- Planning is a real slice, but still reads as a planning overlay on top of goals/tasks/workers rather than the app's center of gravity.

### Workers

Route: `/app/workers`

What it is doing now:

- Functions as an executor registry.
- Tracks provider, role, capacity, location, status, tags, and recent run timing.
- Supports manual creation and status changes.

Current read:

- Workers matter for routing and capacity, but this is a support surface rather than a daily work queue.

### Roles

Route: `/app/roles`

What it is doing now:

- Serves as a routing taxonomy and staffing view.
- Shows role definitions plus relative demand and worker coverage.
- Is largely read-only in the current implementation.

Current read:

- Roles help the model make sense, but this surface is closer to reference/configuration than active operations.

### Providers

Route: `/app/providers`

What it is doing now:

- Acts as a directory of execution backends and operational defaults.
- Stores service, auth mode, launcher, model, sandbox, capabilities, and setup status.
- Provides the metadata that workers and task execution use for routing.

Current read:

- Providers are real infrastructure metadata, but this is still a setup surface rather than a core operator loop.

## Supporting systems that matter but are not top-level nav destinations

### Self-improvement

Current entry points:

- `/app/home`
- `/api/improvement/opportunities`

What it is doing now:

- Derives improvement opportunities from failures, blockers, stale work, reviews, and thread reuse gaps.
- Can create draft tasks from surfaced opportunities.

Current read:

- This is a meaningful system already, but it is still secondary to the main work-routing loop.

### Reviews and approvals

Current entry points:

- mostly task and run detail context

What they are doing now:

- Provide governance state around execution.
- Surface when work needs human or reviewer intervention before progressing or closing.

Current read:

- These are important supporting primitives, but not standalone product surfaces yet.

## Bottom line

If you want the shortest honest description of the app today, it is this:

The prototype is currently a task-and-thread execution control plane with growing support structure around projects, goals, planning, workers, roles, providers, and self-improvement.

That support structure is real and useful, but it should not be mistaken for ten equally mature product pillars. The clearest current operating loop is still:

- tasks
- threads
- runs
- operator review
