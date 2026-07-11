# V2 Core Agent-Control Surface v0.1

Date: 2026-07-10
Status: Implemented CLI contract

## Purpose

Provide one bounded agent-facing command surface over the existing v2 core work
loop.

This is not a new domain model, API product, scheduler, approval system, or MCP
mutation suite. It is a thin CLI adapter around existing v2 core service
operations so agents can use the proven loop without coordinating many separate
commands from chat context.

## Command

```sh
npm run v2:core-db -- agent-control --agent-action <action> [options] --json
```

## Actions

### `next`

Reads next work for a project or goal and returns the selected task's agent work
packet.

Useful options:

- `--project <id>`
- `--goal <id>`
- `--task <id>` to force a selected task
- `--limit <number>`

### `packet`

Returns a source-linked agent work packet for a task.

Required:

- `--task <id>`

### `start`

Transitions a ready task to `in_progress`.

Required:

- `--task <id>`

Optional:

- `--id <decisionId>`
- `--summary <text>`

### `record-run`

Records run evidence for a task.

Required:

- `--task <id>`

Optional:

- `--id <runId>`
- `--provider <id>`
- `--status <text>`
- `--input <text>`
- `--action <text>`
- `--result <text>`
- `--validation <text>`

### `record-tool`

Records tool execution evidence for a task/run.

Required:

- `--task <id>`
- `--tool <id>`
- `--input <text>`

Optional:

- `--id <toolExecutionId>`
- `--run <id>`
- `--status <text>`
- `--result <text>`
- `--error <text>`

### `attach-artifact`

Registers artifact evidence for a task/run.

Required:

- `--task <id>`
- `--uri <text>`
- `--title <text>`

Optional:

- `--id <artifactId>`
- `--run <id>`
- `--role <text>`
- `--status <text>`
- `--summary <text>`

### `submit-review`

Transitions a task from `in_progress` to `review`.

Required:

- `--task <id>`

Optional:

- `--id <decisionId>`
- `--run <id>`
- `--summary <text>`

### `accept-output`

Records an `accept_task_output` decision and transitions the reviewed task to
`done`.

Required:

- `--task <id>`

Optional:

- `--id <decisionId>`
- `--run <id>`
- `--review <id>`
- `--summary <text>`
- `--rationale <text>`

This action still relies on the existing closeout gate: the task must have an
approved review and an acceptance decision before it can become `done`.

### `follow-up`

Creates a ready follow-up task with source lineage from the source task.

Required:

- `--task <sourceTaskId>`
- `--title <text>`
- `--success <text>`
- `--validation <text>`
- `--rationale <text>`

Optional:

- `--id <taskId>`
- `--goal <id>`
- `--summary <text>`
- `--status <text>`

## Boundary

The agent-control surface deliberately does not add:

- new entities
- new lifecycle states
- new schema tables
- autonomous scheduling
- broad MCP/API mutation scope
- routing policy
- local model orchestration
- broad retrieval/search
- approval redesign
- workflow or skill promotion automation

## Validation

Focused coverage lives in:

- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`

The smoke test proves that `agent-control` can:

- fetch next work and a work packet
- fetch a packet directly
- start a task
- record run evidence
- record tool evidence
- attach artifact evidence
- submit evidence for review
- accept reviewed output through the existing gate
- create a source-linked follow-up task
