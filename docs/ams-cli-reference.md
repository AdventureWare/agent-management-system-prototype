# AMS CLI Reference

Run all commands from the project root.

## Discovery

```bash
node scripts/ams-cli.mjs manifest
node scripts/ams-cli.mjs manifest --resource task
node scripts/ams-cli.mjs project list
node scripts/ams-cli.mjs project get <projectId>
node scripts/ams-cli.mjs goal list --project <projectId>
node scripts/ams-cli.mjs goal get <goalId>
node scripts/ams-cli.mjs task list --project <projectId>
node scripts/ams-cli.mjs task get <taskId>
```

The same machine-readable manifest is available over the bearer-token API at `/api/agent-capabilities`.

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
node scripts/ams-cli.mjs task approve-review <taskId>
node scripts/ams-cli.mjs task request-review-changes <taskId>
node scripts/ams-cli.mjs task request-approval <taskId> --json '{"summary":"Ready for approval."}'
node scripts/ams-cli.mjs task approve-approval <taskId>
node scripts/ams-cli.mjs task reject-approval <taskId>
```

## Delegation and sessions

```bash
node scripts/ams-cli.mjs task decompose <taskId> --json '{"children":[{"title":"<child title>","instructions":"<brief>","desiredRoleId":"<roleId>","delegationObjective":"<objective>","delegationDoneCondition":"<done condition>"}]}'
node scripts/ams-cli.mjs task accept-child-handoff <parentTaskId> --json '{"childTaskId":"<childTaskId>"}'
node scripts/ams-cli.mjs task request-child-handoff-changes <parentTaskId> --json '{"childTaskId":"<childTaskId>","summary":"<follow-up summary>"}'
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
