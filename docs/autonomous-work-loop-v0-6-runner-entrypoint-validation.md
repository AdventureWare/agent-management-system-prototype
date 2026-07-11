# Autonomous Work Loop v0.6 Runner Entrypoint Validation

Date: 2026-07-06

Source task: `task_c30fdd72-ed02-4f03-afee-e22df8b1e102`

Goal: `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`

## Result

Validated and lightly hardened the managed continuation runner as the explicit
next-step entrypoint.

The runner already covered the main branches from the v0.6 proof:

- materializable fallback preview without mutation
- `materialize_one` creating at most one fallback task and reading it back
- review gate stop without mutation
- actionable task work-packet preparation with stop-before-launch behavior

This pass added runner-level coverage for approval gates and stricter
actionable-path report-shape assertions.

## Code Changes

Updated:

- `src/lib/server/managed-continuation-runner.spec.ts`

The new coverage verifies:

- approval-gated tasks return `stop.reason = "approval_gate"`
- approval paths route to governance
- approval paths do not mutate task state
- approval paths do not change approval state
- approval paths do not auto-launch or auto-approve
- actionable task paths report the expected command sequence:
  - `goal-loop:get_operator_console`
  - `work-packet:get_agent_work_packet`
- actionable task paths still stop with no materialization, no auto-launch, and
  no auto-approval

No runtime schema, domain entity, UI, scheduler, launch mode, or direct database
write path was added.

## Validation

Focused tests:

```sh
npx vitest run src/lib/server/managed-continuation-runner.spec.ts src/lib/server/agent-goal-loop-actions.spec.ts src/lib/server/operator-goal-loop-console.spec.ts src/lib/server/agent-capability-manifest.spec.ts src/lib/server/ams-cli.spec.ts src/lib/server/ams-control-plane-mcp.spec.ts --project server
```

Result:

- 6 files passed
- 76 tests passed

Project check:

```sh
npm run check
```

Result:

- 0 errors
- 0 warnings

Live-safe runner smoke:

```sh
node scripts/ams-cli.mjs goal-loop managed_continuation_runner --json '{"taskId":"task_c30fdd72-ed02-4f03-afee-e22df8b1e102","mode":"preview"}'
```

Result:

- resolved project, Goal, and current task
- returned `operatorPath.kind = "execute"`
- executed `goal-loop:get_operator_console`
- executed `work-packet:get_agent_work_packet`
- returned `stop.reason = "actionable_task_ready"`
- returned `stop.mustStop = true`
- returned `safety.mutation = "none"`
- returned `safety.taskStateChanged = false`
- returned `safety.reviewStateChanged = false`
- returned `safety.approvalStateChanged = false`
- returned `safety.autoLaunch = false`
- returned `safety.autoApprove = false`

## Assessment

The managed continuation runner is now strong enough to treat as the explicit
next-step read/preview/materialize control-plane entrypoint for the current v0.6
scope.

It is not yet a scheduler or launcher. That boundary remains correct.

## Remaining Gap

The next useful slice is a design task, not implementation by default:

`Design narrow managed launch-mode contract after runner entrypoint validation`

That task should decide whether a future launch mode is warranted, what it may
launch, which gates must stop it, how runs should be recorded, and how to avoid
turning the runner into an implicit scheduler or approval authority.

## Review Recommendation

Approve this task if the added approval-gate and report-shape coverage is
sufficient for v0.6 entrypoint validation.
