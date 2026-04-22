# AMS CLI Reference

Run repo-local `node scripts/...` commands from the AMS project root.
If you are in a managed run launched from another project, use the helper CLI path shown in the run prompt or manifest instead of assuming these scripts exist in the target project's `scripts/` directory.

## Discovery

```bash
node scripts/ams-cli.mjs manifest
node scripts/ams-cli.mjs manifest --resource task
node scripts/ams-cli.mjs context current
node scripts/ams-cli.mjs context current --task <taskId>
node scripts/ams-cli.mjs context current --run <runId>
node scripts/ams-cli.mjs context current --thread <threadId>
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

`node scripts/ams-cli.mjs context current` automatically falls back to managed-run env vars when present:

- `AMS_AGENT_THREAD_ID`
- `AMS_AGENT_TASK_ID`
- `AMS_AGENT_RUN_ID`

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

1. Discover with `node scripts/ams-cli.mjs manifest`.
2. If a managed run already has thread, task, or run ids, anchor on canonical state first with `node scripts/ams-cli.mjs context current`.
3. Prefer a first-class `intent` command when the goal matches a common AMS workflow and you want readback context returned in one call.
4. Inspect the current project, goal, task, or thread state with `list` or `get` when no intent command fits.
5. Run the narrowest mutation command that matches the intent.
6. Read the changed state back with `get`, `list`, or `context current` before treating the operation as complete.

Agent-facing API errors now return structured guidance fields:

- `errorCode`
- `retryable`
- `suggestedNextCommands`
- optional `details`

The manifest also includes compact playbooks for common intents such as `create_task`, `prepare_task_for_review`, `prepare_task_for_approval`, `accept_child_handoff`, `reject_task_approval`, `request_child_handoff_changes`, and `coordinate_with_another_thread`.
For the most important commands, the manifest also includes compact `examples` with sample input and output shapes. Prefer copying those when the payload shape is uncertain.
For higher-risk approval, decomposition, and coordination flows, prefer a dry-run first with `validateOnly: true` when supported so you can inspect checks and preview output before mutating AMS state.

## First-class intents

These commands collapse common AMS playbooks into one call and return before/after readback context:

```bash
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
node scripts/ams-cli.mjs task update <taskId> --json '{"status":"in_progress"}'
node scripts/ams-cli.mjs task attach <taskId> --json '{"path":"<absolute-file-path>"}'
node scripts/ams-cli.mjs task remove-attachment <taskId> <attachmentId>
```

## Governance

```bash
node scripts/ams-cli.mjs task request-review <taskId> --json '{"summary":"Ready for review."}'
node scripts/ams-cli.mjs task request-review <taskId> --json '{"summary":"Ready for review.","validateOnly":true}'
node scripts/ams-cli.mjs task approve-review <taskId>
node scripts/ams-cli.mjs task approve-review <taskId> --validate-only true
node scripts/ams-cli.mjs task request-review-changes <taskId>
node scripts/ams-cli.mjs task request-review-changes <taskId> --validate-only true
node scripts/ams-cli.mjs task request-approval <taskId> --json '{"summary":"Ready for approval."}'
node scripts/ams-cli.mjs task request-approval <taskId> --json '{"summary":"Ready for approval.","validateOnly":true}'
node scripts/ams-cli.mjs task approve-approval <taskId>
node scripts/ams-cli.mjs task approve-approval <taskId> --validate-only true
node scripts/ams-cli.mjs task reject-approval <taskId>
node scripts/ams-cli.mjs task reject-approval <taskId> --validate-only true
```

## Delegation and sessions

```bash
node scripts/ams-cli.mjs task decompose <taskId> --json '{"children":[{"title":"<child title>","instructions":"<brief>","desiredRoleId":"<roleId>","delegationObjective":"<objective>","delegationDoneCondition":"<done condition>"}]}'
node scripts/ams-cli.mjs task decompose <taskId> --json '{"validateOnly":true,"children":[{"title":"<child title>","instructions":"<brief>","desiredRoleId":"<roleId>","delegationObjective":"<objective>","delegationDoneCondition":"<done condition>"}]}'
node scripts/ams-cli.mjs task accept-child-handoff <parentTaskId> --json '{"childTaskId":"<childTaskId>"}'
node scripts/ams-cli.mjs task accept-child-handoff <parentTaskId> --json '{"childTaskId":"<childTaskId>","validateOnly":true}'
node scripts/ams-cli.mjs task request-child-handoff-changes <parentTaskId> --json '{"childTaskId":"<childTaskId>","summary":"<follow-up summary>"}'
node scripts/ams-cli.mjs task request-child-handoff-changes <parentTaskId> --json '{"childTaskId":"<childTaskId>","summary":"<follow-up summary>","validateOnly":true}'
node scripts/ams-cli.mjs task launch-session <taskId>
node scripts/ams-cli.mjs task recover-session <taskId>
```

## Thread coordination

Use the thread CLI when the work requires another thread, not when the task is solvable through AMS state alone.

```bash
node scripts/ams-cli.mjs thread best-target
node scripts/ams-cli.mjs thread list --can-contact
node scripts/ams-cli.mjs thread resolve <query> --can-contact
node scripts/ams-cli.mjs thread contact <targetThreadIdOrHandle> --type <question|request_context|request_assignment|handoff|review_request|status_update> --context "<note>" --prompt "Need <instruction/context/assignment>. Reply back to thread $AMS_AGENT_THREAD_ID if needed."
```
