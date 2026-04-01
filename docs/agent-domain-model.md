# Agent Domain Model

This project works best when the core concepts stay separate:

- `Task`: the unit of work with a finish line.
- `Worker`: the executor that can pick up work.
- `Thread`: the conversation/context container used to work on something over time.
- `Run`: one execution against a thread.

## Recommended Responsibilities

### Task

Tasks should answer: "What work needs to get done?"

Good task statuses:

- `In Draft`
- `Ready`
- `In Progress`
- `In Review`
- `Done`
- Optional: `Blocked`, `Canceled`

Tasks should be the primary work-tracking object.

### Worker

Workers should answer: "Who can do work right now?"

Good worker states:

- `Offline`
- `Idle`
- `Busy`

Workers are capacity/execution resources, not the work itself.

### Thread

Threads should answer: "What context/history are we using?"

A thread can outlive any single task. It should not use task-style states like `Done`.

Good thread-level states:

- `Starting`
- `Waiting for response`
- `Working`
- `Available`
- `Needs attention`
- `Idle`
- Optional: `Not resumable`

In this project, the current "session" concept is best understood as a thread-like container:

- one Codex thread id
- many runs over time
- resumability metadata
- logs and last-response capture

### Run

Runs should answer: "What happened when we executed?"

Good run statuses:

- `Queued`
- `Running`
- `Completed`
- `Failed`
- `Canceled`

Runs are execution attempts, not durable work objects.

## Relationship Model

Recommended shape:

- A `Task` may have zero or one primary `Thread`.
- A `Thread` may be linked to a `Task`, but can also exist as general exploration context.
- A `Thread` contains many `Runs`.
- A `Worker` may execute many runs over time.

## UI Guidance

The UI should teach the model clearly:

- task pages talk about work status
- worker pages talk about capacity and assignments
- thread pages talk about context, conversation, and latest run state
- run details talk about execution outcomes

Avoid using `completed` or `done` to describe a thread. That language belongs to tasks and runs, not conversation containers.

## Incremental Migration Guidance

Short term:

- Keep route and API names stable if needed.
- Change user-facing copy from "session" to "thread" or "work thread".
- Show thread state separately from latest run status.

Later:

- Rename internal storage/API types if the old naming keeps causing confusion.
- Add explicit task-to-thread links in the control plane.
