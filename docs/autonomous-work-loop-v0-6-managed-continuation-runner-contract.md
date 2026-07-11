# Autonomous Work Loop v0.6 Managed Continuation-Runner Contract

Date: 2026-07-06

Source task: `task_b506bf94-02c4-49ec-9ec6-b67e1f9faae5`

Goal: `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`

## Purpose

v0.5 proved that AMS can answer "what should happen next?" from durable
Goal/task/review/run state. v0.6 should test one narrower question:

Can AMS safely run the next continuation-control step by sequencing existing
explicit commands, without adding a scheduler, a new workflow entity, or hidden
autonomous mutations?

The v0.6 runner is a control-plane wrapper. It is not an agent, scheduler,
planner, approval authority, or replacement for the existing Goal/Task/Run
workflow.

## Source of Truth

The runner must treat existing AMS state as authoritative:

- `Goal`
- `Task`
- `Run`
- `Review`
- `Approval`
- `Project`
- `Decision`
- attached artifacts
- task-loop and operator-console readbacks

Chat history can explain why the runner was invoked, but it must not be the
state source that determines whether work is actionable, approved, blocked, or
complete.

## Existing Operations to Reuse

The first v0.6 implementation should wrap existing command/API behavior:

- `context current`
- `goal-loop get_operator_console`
- `goal-loop get_task_loop_report`
- `goal-loop materialize_suggested_task`
- `goal-loop get_next_recommended_action`
- `work-packet get_agent_work_packet`
- existing run-result, review, and approval commands where a later task launch
  explicitly requires them

The runner must not write directly to `data/app.sqlite` or invent a parallel
state store.

## Runner Contract

### Inputs

The runner accepts one of these contexts:

- explicit `goalId`
- explicit `taskId`
- managed environment context such as `AMS_AGENT_GOAL_ID`,
  `AMS_AGENT_TASK_ID`, or `AMS_AGENT_RUN_ID`

If the context cannot be resolved to one unambiguous Goal or task path, the
runner stops without mutation.

### Step Sequence

1. Resolve current context.
2. Read `goal-loop get_operator_console`.
3. Classify the operator path.
4. If the path proposes a materializable fallback, run
   `goal-loop materialize_suggested_task` with `validateOnly: true`.
5. If and only if explicit runner mode permits materialization, create the
   draft task through `goal-loop materialize_suggested_task`.
6. After every mutation, read back `goal-loop get_task_loop_report` for the
   affected task and `context current` or goal-loop context for the active
   scope.
7. Emit a structured runner report.
8. Stop at the next gate. Do not launch another autonomous step in the same
   proof slice.

### Allowed Actions

The initial runner may:

- read current context
- read operator-console and task-loop reports
- run validate-only previews
- materialize one suggested planning, research, or clarification task through
  the existing `goal-loop materialize_suggested_task` command when explicit
  runner mode allows it
- prepare a work packet for an already actionable task
- report the next human or agent action

The initial runner must not:

- approve or reject reviews
- approve or reject approvals
- launch Codex, ChatGPT, or another execution surface by default
- create arbitrary tasks outside the existing materialization command
- update project memory or decisions directly
- bypass task readiness, autonomy, risk, review, approval, dependency, or
  blocker checks
- continue looping after one mutation/readback cycle

## Branch Behavior

### Goal Complete

If the operator path says the Goal is complete, the runner reports completion
evidence and stops. It does not close the broad Goal unless an explicit reviewed
operation already supports that transition.

### Review Gate

If work is awaiting review, the runner reports the review, linked task, artifact
evidence, and recommended review surface. It stops. It never approves,
rejects, or resolves requested changes.

### Approval Gate

If approval is required, the runner reports the approval request, risk, proposed
action, and required approver decision. It stops. It never approves or rejects.

### Blocked or Clarification Needed

If the next path is blocked, needs clarification, needs research, or lacks
enough task contract, the runner reports the smallest blocking condition and
stops. If the existing operator path includes a materializable research or
clarification fallback, the runner may validate that fallback before stopping
or materializing it in explicit materialization mode.

### Actionable Task

If the path selects an actionable task, the runner reads
`work-packet get_agent_work_packet` and reports the prepared execution packet.
The first v0.6 proof stops before launching an execution surface. A later
explicitly approved slice may add launch mode after this behavior is proven.

### Materializable Planning Fallback

If the Goal is running, no open work is actionable, and the operator console
recommends a suggested planning/research/clarification task:

1. The runner previews the materialization with `validateOnly: true`.
2. If validation fails, it reports the failure and stops.
3. If validation succeeds and materialization mode is disabled, it reports the
   proposed task and stops.
4. If validation succeeds and materialization mode is explicitly enabled, it
   materializes exactly that draft through `goal-loop materialize_suggested_task`.
5. It reads back the created task's task-loop report.
6. It stops without launching the task.

## Stop Conditions

The runner must stop when any of these are true:

- context is missing or ambiguous
- AMS API/CLI access is missing
- operator-console readback fails
- validate-only preview fails
- readback after mutation fails
- a review or approval gate exists
- a blocker or user clarification is required
- the next action is high/critical risk or outside allowed autonomy
- multiple candidate tasks require operator choice
- a new domain entity, status, enum, field, or schema change appears necessary
- execution would require direct database edits
- launch would require external network, spending, credentials, destructive
  commands, production mutation, or privileged access not already approved

## Runner Modes

The first implementation should support these modes:

| Mode | Behavior |
| --- | --- |
| `read_only` | Resolve context, read operator path, optionally prepare work packet, report, and stop. |
| `preview` | Same as read-only, plus validate-only materialization preview when available. |
| `materialize_one` | Preview first, then materialize exactly one suggested fallback task through the existing command, read back, and stop. |

`materialize_one` should be explicit. It should not be the default.

## Structured Runner Report

The runner output should be machine-readable and human-readable. It should
include:

- resolved project, Goal, task, and run context
- operator path kind and rationale
- commands executed
- whether any command was validate-only
- mutation performed, if any
- readback summary
- next stop reason
- next recommended human or agent action
- artifacts or task IDs created
- errors or blockers

This report can later be attached to a `Run` when the runner is invoked from a
task-scoped run. v0.6 should not add a new `RunnerRun` or `ContinuationEvent`
entity.

## Minimal v0.6 Implementation Slice

The implementation slice after this contract should be small:

1. Add a server helper or CLI command that executes the contract in `read_only`,
   `preview`, and `materialize_one` modes.
2. Add fixture-backed tests for:
   - running Goal with no open work creates no mutation in `preview`
   - the same path materializes one draft in `materialize_one`
   - review gate stops with no mutation
   - actionable task prepares work packet and stops before launch
3. Add one live smoke command only after fixture tests pass.
4. Update docs and CLI reference with the command and stop conditions.

The first implementation should not add UI, a scheduler, background polling,
auto-launch, or auto-approval.

## Acceptance Criteria

The v0.6 runner proof is acceptable when:

- every branch maps to an existing AMS command or readback surface
- validate-only preview occurs before any materialization mutation
- materialization creates at most one draft task per invocation
- all mutations are followed by task-loop readback
- review and approval gates always stop the runner
- actionable execution paths stop after work-packet preparation
- tests prove no mutation occurs in read-only or preview mode
- no new domain entity or schema change is required

## Recommendation

Proceed next with a narrow implementation task:

`Implement managed continuation runner dry-run/materialize-only proof`

That task should implement only the contract above. It should be treated as a
control-plane proof, not as the start of a scheduler or fully autonomous agent.
