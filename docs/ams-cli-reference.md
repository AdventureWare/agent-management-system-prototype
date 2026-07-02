# AMS CLI Reference

Run repo-local `node scripts/...` commands from the AMS project root.
If you are in a managed run launched from another project, use the helper CLI path shown in the run prompt or manifest instead of assuming these scripts exist in the target project's `scripts/` directory.

## Discovery

```bash
node scripts/ams-cli.mjs doctor
node scripts/ams-cli.mjs manifest
node scripts/ams-cli.mjs manifest --resource task
node scripts/ams-cli.mjs manifest --resource goal-loop
node scripts/ams-cli.mjs manifest --resource work-packet
node scripts/ams-cli.mjs manifest --resource run-result
node scripts/ams-cli.mjs manifest --resource review
node scripts/ams-cli.mjs manifest --resource intent --command interpret_intent
node scripts/ams-cli.mjs context current
node scripts/ams-cli.mjs context current --task <taskId>
node scripts/ams-cli.mjs context current --run <runId>
node scripts/ams-cli.mjs context current --thread <threadId>
node scripts/ams-cli.mjs context get_relevant_prior_runs --task <taskId> --limit 5
node scripts/ams-cli.mjs context get_relevant_prior_runs --goal <goalId> --status completed
node scripts/ams-cli.mjs context get_relevant_prior_runs --project <projectId>
node scripts/ams-cli.mjs goal-loop list_active_goals --project <projectId>
node scripts/ams-cli.mjs goal-loop get_goal_context --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_goal_progress --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_goal_success_criteria --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_goal_blockers --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_actionable_work --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_blocked_work --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_awaiting_review --goal <goalId>
node scripts/ams-cli.mjs goal-loop get_next_recommended_action --goal <goalId>
node scripts/ams-cli.mjs goal-loop explain_task_eligibility --task <taskId> --goal <goalId>
node scripts/ams-cli.mjs work-packet get_agent_work_packet --goal <goalId>
node scripts/ams-cli.mjs run-result record_run_result --json '{"runId":"<runId>","status":"completed","resultSummary":"<what changed>","validationSummary":"<checks run>"}'
node scripts/ams-cli.mjs run-result record_validation_result --json '{"runId":"<runId>","validationSummary":"<checks run and outcome>"}'
node scripts/ams-cli.mjs run-result record_blocker --json '{"runId":"<runId>","blocker":"<blocking condition>"}'
node scripts/ams-cli.mjs run-result record_followup_recommendations --json '{"runId":"<runId>","followUpTaskIds":["<taskId>"]}'
node scripts/ams-cli.mjs run-result create_followup_task --json '{"runId":"<runId>","title":"<follow-up title>","summary":"<why this supports the same goal>"}'
node scripts/ams-cli.mjs run-result request_review_from_run --json '{"runId":"<runId>","validateOnly":true,"summary":"Ready for review."}'
node scripts/ams-cli.mjs run-result mark_task_blocked_from_run --json '{"runId":"<runId>","validateOnly":true,"blocker":"<blocking condition>"}'
node scripts/ams-cli.mjs run-result preview_progress_updates --json '{"runId":"<runId>"}'
node scripts/ams-cli.mjs run-result apply_progress_updates --json '{"runId":"<runId>","selectedProposalIndexes":[0],"validateOnly":true}'
node scripts/ams-cli.mjs review get_review_status --task <taskId>
node scripts/ams-cli.mjs review get_review_status --goal <goalId>
node scripts/ams-cli.mjs intent interpret_intent --json '{"rawIntent":"<messy operator intent>","projectId":"<projectId>","goalId":"<goalId>"}'
node scripts/ams-cli.mjs intent prepare_task_for_review --json '{"taskId":"<taskId>","attachment":{"path":"<absolute-file-path>"},"review":{"summary":"Ready for review."}}'
node scripts/ams-cli.mjs intent prepare_task_for_review --json '{"taskId":"<taskId>","validateOnly":true,"review":{"summary":"Ready for review."}}'
node scripts/ams-cli.mjs intent prepare_task_for_approval --json '{"taskId":"<taskId>","approval":{"summary":"Ready for approval."}}'
node scripts/ams-cli.mjs intent prepare_task_for_approval --json '{"taskId":"<taskId>","validateOnly":true,"approval":{"summary":"Ready for approval.","mode":"before_complete"}}'
node scripts/ams-cli.mjs intent coordinate_with_another_thread --json '{"targetThreadIdOrHandle":"<thread-handle-or-id>","prompt":"Need <help or context>. Reply back to thread $AMS_AGENT_THREAD_ID if needed."}'
node scripts/ams-cli.mjs intent coordinate_with_another_thread --json '{"targetThreadIdOrHandle":"<thread-handle-or-id>","prompt":"Need <help or context>. Reply back to thread $AMS_AGENT_THREAD_ID if needed.","validateOnly":true}'
node scripts/ams-cli.mjs telemetry summary
node scripts/ams-cli.mjs telemetry summary --thread <threadId>
node scripts/ams-cli.mjs telemetry summary --task <taskId>
node scripts/ams-cli.mjs telemetry summary --run <runId>
node scripts/ams-cli.mjs telemetry summary --tool ams_thread_contact --outcome error --since 24h
node scripts/ams-cli.mjs project list
node scripts/ams-cli.mjs project get <projectId>
node scripts/ams-cli.mjs goal list --project <projectId>
node scripts/ams-cli.mjs goal get <goalId>
node scripts/ams-cli.mjs task list --project <projectId>
node scripts/ams-cli.mjs task get <taskId>
```

The same machine-readable manifest is available over the bearer-token API at `/api/agent-capabilities`.
The current-context helper is available at `/api/agent-context/current`.
The prior-runs helper is available at `/api/agent-context/relevant-prior-runs`; pass one of
`taskId`, `goalId`, or `projectId`, with optional `status` and `limit`. It is read-only and returns
bounded run summaries with task title, run status, result summary, validation summary, artifact
paths, updated timestamp, and an inclusion reason for each run.
Run `node scripts/ams-cli.mjs doctor` or `npm run app:doctor` before a managed run depends on
AMS helper commands. The doctor reports operator API reachability, token availability, manifest
access, managed-run context resolution when environment ids are present, and concrete next commands
such as `npm run app:server:start` when starting the local operator is actually viable.

If doctor reports `local_listener_permission` with `EPERM` or `EACCES`, the current worker
environment cannot bind a local operator listener. Do not keep retrying `app:server:start` from that
worker. Finish repo or artifact work when safe, report that AMS state could not be read or mutated,
and run AMS readback/mutations from an environment with a reachable operator API or set
`AMS_AGENT_API_BASE_URL` to an already-running operator.

## Storage Contract

`data/app.sqlite` is the only writable runtime store for control-plane records. Normal mutations must
go through the app server, AMS CLI/API/MCP helpers, or the server repository helpers that persist to
SQLite. `data/control-plane.json` is an explicit snapshot artifact for seed, export, import, and
recovery workflows; it is not a concurrent live mirror and should not be patched to change runtime
state.

Use `npm run db:export-json` to refresh JSON snapshots from SQLite. Use
`npm run db:import-json` only when intentionally replacing SQLite from JSON; the helper creates a
SQLite backup before import. In development, if an existing JSON snapshot differs from SQLite, the
runtime logs a loud warning that points to these explicit import/export commands.

`node scripts/ams-cli.mjs context current` automatically falls back to managed-run env vars when present:

- `AMS_AGENT_THREAD_ID`
- `AMS_AGENT_TASK_ID`
- `AMS_AGENT_RUN_ID`

Current-task CLI and MCP mutations also fall back to managed-run context when task or run ids are absent from the environment:

- Commands such as `task get`, `task update`, `task request-review`, `task request-approval`, `task approve-review`, `task approve-approval`, and `task reject-approval` can omit `[taskId]` inside a managed run.
- The helper resolves the canonical task from `AMS_AGENT_THREAD_ID`, `AMS_AGENT_TASK_ID`, and `AMS_AGENT_RUN_ID` before issuing the task-scoped API call.
- If no task can be resolved, the command fails with an explicit instruction to run `node scripts/ams-cli.mjs context current` or pass the task id manually.

Each `summary.recommendedNextActions` item now includes:

- `reason`: the short recommendation
- `stateSignals`: the exact current-state facts that triggered it
- `expectedOutcome`: what the action should accomplish
- `suggestedReadbackCommands`: what to read back immediately after acting
- `shouldValidateFirst`: whether the recommendation should be dry-run first
- `validationMode`: currently `validateOnly` when preview mode is available
- `validationReason`: why preview-first is recommended for this action

The telemetry summary is local operator data derived from managed-run MCP usage. It lets you compare the manifest playbooks against actual tool sequences seen in managed runs, including guidance gaps such as observed tools with no playbook coverage and playbook tools that never appear in telemetry. By default the local store retains up to 5000 events from the last 30 days, and older events are pruned automatically.

## Reliable usage pattern

Follow this default loop when using AMS as a tool:

1. Run `node scripts/ams-cli.mjs doctor`.
2. If doctor reports local-listener denial, stop AMS mutations and report the control-plane mismatch.
3. Discover with `node scripts/ams-cli.mjs manifest`.
4. If a managed run already has thread, task, or run ids, anchor on canonical state first with `node scripts/ams-cli.mjs context current`.
5. Prefer a first-class `intent` command when the goal matches a common AMS workflow and you want readback context returned in one call.
6. Inspect the current project, goal, task, or thread state with `list` or `get` when no intent command fits.
7. Run the narrowest mutation command that matches the intent.
8. Read the changed state back with `get`, `list`, or `context current` before treating the operation as complete.

Agent-facing API errors now return structured guidance fields:

- `errorCode`
- `retryable`
- `suggestedNextCommands`
- optional `details`

The manifest also includes compact playbooks for common intents such as `create_task`, `prepare_task_for_review`, `prepare_task_for_approval`, `accept_child_handoff`, `reject_task_approval`, `request_child_handoff_changes`, and `coordinate_with_another_thread`.
For the most important commands, the manifest also includes compact `examples` with sample input and output shapes. Prefer copying those when the payload shape is uncertain.
For higher-risk approval, decomposition, and coordination flows, prefer a dry-run first with `validateOnly: true` when supported so you can inspect checks and preview output before mutating AMS state.

## Capability registry ownership

The canonical place to add or change an agent-facing AMS capability is
`src/lib/server/agent-capability-commands.js`. Update that registry entry first, then keep the
matching implementation surfaces in sync:

1. Add or update the route handler under `src/routes/api/...`.
2. Add or update CLI dispatch in `scripts/ams-cli.mjs`.
3. Add or update the generated MCP input schema or path/body metadata in
   `scripts/ams-control-plane-mcp.mjs`.
4. Update `plugins/ams-control-plane/README.md` and this CLI reference when the user-facing command
   set or workflow changes.

The focused manifest tests are the drift guard for this path. They fail when registry command keys
are duplicated, a registry API path no longer maps to a SvelteKit `+server.ts` route, CLI support is
missing for a registry command, or MCP schema/tool metadata no longer covers the same command key.
Run:

```bash
npm run test:unit -- --run src/lib/server/agent-capability-manifest.spec.ts src/lib/server/ams-control-plane-mcp.spec.ts src/lib/server/ams-cli.spec.ts
```

## First-class intents

These commands collapse common AMS playbooks into one call and return before/after readback context:

```bash
node scripts/ams-cli.mjs intent interpret_intent --json '{"rawIntent":"<messy operator intent>","projectId":"<projectId>","goalId":"<goalId>","taskId":"<taskId>"}'
node scripts/ams-cli.mjs intent prepare_task_for_review --json '{"taskId":"<taskId>","attachment":{"path":"<absolute-file-path>"},"review":{"summary":"Ready for review."}}'
node scripts/ams-cli.mjs intent prepare_task_for_approval --json '{"taskId":"<taskId>","approval":{"summary":"Ready for approval.","mode":"before_complete"}}'
node scripts/ams-cli.mjs intent prepare_task_for_approval --json '{"taskId":"<taskId>","validateOnly":true,"approval":{"summary":"Ready for approval.","mode":"before_complete"}}'
node scripts/ams-cli.mjs intent reject_task_approval --json '{"taskId":"<taskId>"}'
node scripts/ams-cli.mjs intent reject_task_approval --json '{"taskId":"<taskId>","validateOnly":true}'
node scripts/ams-cli.mjs intent accept_child_handoff --json '{"parentTaskId":"<parentTaskId>","childTaskId":"<childTaskId>"}'
node scripts/ams-cli.mjs intent accept_child_handoff --json '{"parentTaskId":"<parentTaskId>","childTaskId":"<childTaskId>","validateOnly":true}'
node scripts/ams-cli.mjs intent request_child_handoff_changes --json '{"parentTaskId":"<parentTaskId>","childTaskId":"<childTaskId>","summary":"<follow-up summary>"}'
node scripts/ams-cli.mjs intent request_child_handoff_changes --json '{"parentTaskId":"<parentTaskId>","childTaskId":"<childTaskId>","summary":"<follow-up summary>","validateOnly":true}'
node scripts/ams-cli.mjs intent coordinate_with_another_thread --json '{"targetThreadIdOrHandle":"<thread-handle-or-id>","prompt":"Need <instruction/context/assignment>. Reply back to thread $AMS_AGENT_THREAD_ID if needed.","type":"question","context":"<focused context note>"}'
node scripts/ams-cli.mjs intent coordinate_with_another_thread --json '{"targetThreadIdOrHandle":"<thread-handle-or-id>","prompt":"Need <instruction/context/assignment>. Reply back to thread $AMS_AGENT_THREAD_ID if needed.","type":"question","context":"<focused context note>","validateOnly":true}'
```

## Project and goal mutation

```bash
node scripts/ams-cli.mjs project create --json '{"name":"<name>","summary":"<summary>"}'
node scripts/ams-cli.mjs project update <projectId> --json '{"defaultArtifactRoot":"<absolute-path>"}'
node scripts/ams-cli.mjs goal create --json '{"name":"<name>","summary":"<summary>","projectIds":["<projectId>"]}'
node scripts/ams-cli.mjs goal update <goalId> --json '{"status":"running"}'
```

## Task mutation

```bash
node scripts/ams-cli.mjs task create --json '{"title":"<title>","summary":"<summary>","projectId":"<projectId>"}'
node scripts/ams-cli.mjs task update [taskId] --json '{"status":"in_progress"}'
node scripts/ams-cli.mjs task attach [taskId] --json '{"path":"<absolute-file-path>"}'
node scripts/ams-cli.mjs task remove-attachment <taskId> <attachmentId>
```

Attachment mutations return structured readback fields including `taskId`, `attachmentId`,
`attachments`, and `attachmentCount`. Run `task get` afterward when you need the full current
task state before opening a review, approval, or handoff.

## Governance

```bash
node scripts/ams-cli.mjs task request-review [taskId] --json '{"summary":"Ready for review."}'
node scripts/ams-cli.mjs task request-review [taskId] --json '{"summary":"Ready for review.","validateOnly":true}'
node scripts/ams-cli.mjs task approve-review [taskId]
node scripts/ams-cli.mjs task approve-review [taskId] --validate-only true
node scripts/ams-cli.mjs task request-review-changes [taskId]
node scripts/ams-cli.mjs task request-review-changes [taskId] --validate-only true
node scripts/ams-cli.mjs task request-approval [taskId] --json '{"summary":"Ready for approval."}'
node scripts/ams-cli.mjs task request-approval [taskId] --json '{"summary":"Ready for approval.","validateOnly":true}'
node scripts/ams-cli.mjs task approve-approval [taskId]
node scripts/ams-cli.mjs task approve-approval [taskId] --validate-only true
node scripts/ams-cli.mjs task reject-approval [taskId]
node scripts/ams-cli.mjs task reject-approval [taskId] --validate-only true
```

## Delegation and sessions

```bash
node scripts/ams-cli.mjs task decompose [taskId] --json '{"children":[{"title":"<child title>","instructions":"<brief>","desiredRoleId":"<roleId>","delegationObjective":"<objective>","delegationDoneCondition":"<done condition>"}]}'
node scripts/ams-cli.mjs task decompose [taskId] --json '{"validateOnly":true,"children":[{"title":"<child title>","instructions":"<brief>","desiredRoleId":"<roleId>","delegationObjective":"<objective>","delegationDoneCondition":"<done condition>"}]}'
node scripts/ams-cli.mjs task accept-child-handoff [parentTaskId] --json '{"childTaskId":"<childTaskId>"}'
node scripts/ams-cli.mjs task accept-child-handoff [parentTaskId] --json '{"childTaskId":"<childTaskId>","validateOnly":true}'
node scripts/ams-cli.mjs task request-child-handoff-changes [parentTaskId] --json '{"childTaskId":"<childTaskId>","summary":"<follow-up summary>"}'
node scripts/ams-cli.mjs task request-child-handoff-changes [parentTaskId] --json '{"childTaskId":"<childTaskId>","summary":"<follow-up summary>","validateOnly":true}'
node scripts/ams-cli.mjs task launch-session [taskId]
node scripts/ams-cli.mjs task recover-session [taskId]
```

## Thread coordination

Use the thread CLI when the work requires another thread, not when the task is solvable through AMS state alone.

```bash
node scripts/ams-cli.mjs thread best-target
node scripts/ams-cli.mjs thread list --can-contact
node scripts/ams-cli.mjs thread resolve <query> --can-contact
node scripts/ams-cli.mjs thread contact <targetThreadIdOrHandle> --type <question|request_context|request_assignment|handoff|review_request|status_update> --context "<note>" --prompt "Need <instruction/context/assignment>. Reply back to thread $AMS_AGENT_THREAD_ID if needed."
```
