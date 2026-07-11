# Autonomous Work Loop v0.6 Runner Proof Implementation

Date: 2026-07-06

Source task: `task_8ce63b5e-30d6-4cd0-a3c7-e2aac01cbf89`

Goal: `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`

## Result

Implemented the v0.6 managed continuation-runner proof as a bounded
control-plane wrapper around existing AMS operations.

The runner supports:

- `read_only`
- `preview`
- `materialize_one`

It reads the operator-console path, optionally previews a materializable
fallback, optionally materializes at most one fallback draft task, reads back
task-loop state, prepares a work packet for actionable tasks, and stops.

It does not:

- launch execution
- approve reviews
- resolve approvals
- continue into a second loop step
- add a scheduler
- add a new domain entity
- add a schema change

## Primary Files

- `src/lib/server/managed-continuation-runner.ts`
- `src/lib/server/managed-continuation-runner.spec.ts`
- `src/routes/api/agent-goal-loop/[command]/+server.ts`
- `src/lib/server/agent-capability-commands.js`
- `scripts/ams-cli.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `src/lib/server/ams-cli.spec.ts`
- `docs/ams-cli-reference.md`

## Behavior Proved

- Preview mode does not mutate task state.
- `materialize_one` validates first and creates at most one fallback task.
- Materialization readback includes the created task's task-loop report.
- Review gates stop without mutation.
- Actionable task paths prepare a work packet and stop before launch.
- CLI managed-run scope resolution passes `projectId`, `goalId`, and `taskId`
  to the managed runner without changing the older materialization command's
  Goal-scoped payload.
- The manifest/MCP registry has schema coverage for the new command.

## Validation

Focused tests:

```sh
npx vitest run src/lib/server/managed-continuation-runner.spec.ts src/lib/server/agent-goal-loop-actions.spec.ts src/lib/server/operator-goal-loop-console.spec.ts src/lib/server/agent-capability-manifest.spec.ts src/lib/server/ams-cli.spec.ts src/lib/server/ams-control-plane-mcp.spec.ts --project server
```

Result:

- 6 files passed
- 75 tests passed

Type/Svelte check:

```sh
npm run check
```

Result:

- 0 errors
- 0 warnings

Live no-mutation preview smoke:

```sh
node scripts/ams-cli.mjs goal-loop managed_continuation_runner --json '{"taskId":"task_8ce63b5e-30d6-4cd0-a3c7-e2aac01cbf89","mode":"preview"}'
```

Result:

- command returned `mode="preview"`
- resolved the selected implementation task
- returned `operatorPath.kind="execute"`
- returned a work packet
- returned `stop.mustStop=true`
- returned `safety.taskStateChanged=false`
- returned `safety.autoLaunch=false`
- returned `safety.autoApprove=false`

## Remaining Notes

This is still a proof slice. It deliberately stops before live launch,
review/approval resolution, scheduler behavior, or repeated autonomous looping.

The next useful step after review is either:

- run `managed_continuation_runner` against a Goal-level no-open-work fixture or
  live-safe scenario in `materialize_one` mode, or
- add a small UI/readback surface only if operators need visibility into runner
  reports beyond CLI/API/MCP.
