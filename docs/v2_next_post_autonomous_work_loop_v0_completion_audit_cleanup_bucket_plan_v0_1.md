# Next Cleanup Bucket After Autonomous Work Loop v0 Completion Audit Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `c818cca Add autonomous work loop v0 completion audit`.

The remaining dirty tree is no longer just documentation. It includes a production operator/task-loop readback slice, CLI/MCP command expansion, managed continuation-runner work, prompt-context trimming, v2 preview/import code, v2-core navigation, and broad docs/skill updates. This plan chooses one coherent production source bucket and avoids staging adjacent work that should be reviewed separately.

## Selected Bucket

Commit the read-only operator/task-loop readback slice.

This bucket adds:

- shared goal-loop count row helpers
- task-loop report helper and tests
- operator goal-loop console helper and tests
- task detail readback panel
- task detail, goal detail, governance, and autonomous queue read-only surface integration
- focused tests for those readback surfaces

It does not add scheduler behavior, managed runner behavior, schema changes, import code, preview persistence, or new v2 navigation.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_autonomous_work_loop_v0_completion_audit_cleanup_bucket_plan_v0_1.md
src/lib/goal-loop-readback.ts
src/lib/goal-loop-readback.spec.ts
src/lib/types/control-plane.ts
src/lib/components/tasks/TaskLoopReportPanel.svelte
src/lib/server/task-loop-report.ts
src/lib/server/task-loop-report.spec.ts
src/lib/server/operator-goal-loop-console.ts
src/lib/server/operator-goal-loop-console.spec.ts
src/lib/server/task-detail-page-data.ts
src/lib/server/task-detail-page-data.spec.ts
src/lib/server/task-governance.ts
src/lib/server/task-governance.spec.ts
src/lib/server/autonomous-queue.ts
src/lib/server/autonomous-queue.spec.ts
src/routes/app/tasks/[taskId]/TaskDetailPageContent.svelte
src/routes/app/tasks/[taskId]/task-detail-page.server.spec.ts
src/routes/app/tasks/[taskId]/task-detail-page.svelte.spec.ts
src/routes/app/goals/[goalId]/+page.server.ts
src/routes/app/goals/[goalId]/+page.svelte
src/routes/app/governance/+page.svelte
src/routes/app/governance/governance-page.svelte.spec.ts
src/routes/app/autonomous-queue/+page.svelte
```

## Why This Bucket

- It is read-only control-plane behavior.
- It gives operators and agents the same answer for "what is the next path for this task or goal?"
- It uses existing Goal, Task, Run, Review, Approval, Decision, Workflow, and Project records.
- It avoids a new lifecycle, scheduler, dashboard, schema, or import path.
- It is internally coherent: the UI changes consume the helper outputs, and the focused tests exercise the helper and surface readbacks.

## Explicit Exclusions

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `scripts/ams-cli.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `src/lib/server/agent-capability-commands.js`
- `src/lib/server/agent-capability-manifest.spec.ts`
- `src/lib/server/agent-capability-playbooks.js`
- `src/lib/server/agent-current-context.ts`
- `src/lib/server/agent-current-context.spec.ts`
- `src/lib/server/agent-goal-loop.ts`
- `src/lib/server/agent-goal-loop.spec.ts`
- `src/lib/server/agent-goal-loop-actions.ts`
- `src/lib/server/agent-goal-loop-actions.spec.ts`
- `src/lib/server/agent-run-results.ts`
- `src/lib/server/agent-run-results.spec.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/agent-work-packets.ts`
- `src/lib/server/agent-work-packets.spec.ts`
- `src/lib/server/ams-cli.spec.ts`
- `src/lib/server/ams-control-plane-mcp.spec.ts`
- `src/lib/server/control-plane-repository.ts`
- `src/lib/server/control-plane-sqlite.spec.ts`
- `src/lib/server/goal-run-result-preview.ts`
- `src/lib/server/goal-run-result-preview.spec.ts`
- `src/lib/server/goal-work-loop.ts`
- `src/lib/server/goal-work-loop.spec.ts`
- `src/lib/server/goal-work-packets.ts`
- `src/lib/server/goal-work-packets.spec.ts`
- `src/lib/server/managed-continuation-runner.ts`
- `src/lib/server/managed-continuation-runner.spec.ts`
- `src/lib/server/task-launch-planning.ts`
- `src/lib/server/task-threads.ts`
- `src/lib/server/task-threads.spec.ts`
- `src/lib/workflow-prompts.ts`
- `src/lib/workflow-prompts.spec.ts`
- `src/routes/api/agent-goal-loop/[command]/+server.ts`
- `src/routes/app/runs/[runId]/+page.svelte`
- `src/routes/app/runs/[runId]/run-detail-page.svelte.spec.ts`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/fixtures/**`
- `src/lib/server/v2-*.ts`
- `src/lib/server/v2-*.spec.ts`
- `src/routes/app/v2-preview/**`
- `data/**`

Also do not stage runtime databases, seed/import fixtures, v2 preview files, managed continuation-runner files, CLI/MCP command expansion, run-result approval transitions, prompt-context trimming, docs index/reference updates, or agent skill updates.

## Validation Before Commit

Before staging, verify:

```sh
git diff --cached --name-only
```

is empty.

Then stage only the selected paths with exact path arguments.

After staging, verify:

```sh
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
```

Expected staged scope:

- production read-only helper code
- existing UI surface readback integration
- focused tests for the included helpers/surfaces
- no CLI/MCP command expansion
- no managed runner
- no preview/import files
- no runtime data

Recommended focused validation:

```sh
npx vitest run src/lib/goal-loop-readback.spec.ts src/lib/server/task-loop-report.spec.ts src/lib/server/operator-goal-loop-console.spec.ts src/lib/server/task-detail-page-data.spec.ts src/lib/server/task-governance.spec.ts src/lib/server/autonomous-queue.spec.ts 'src/routes/app/tasks/[taskId]/task-detail-page.server.spec.ts' 'src/routes/app/tasks/[taskId]/task-detail-page.svelte.spec.ts' src/routes/app/governance/governance-page.svelte.spec.ts --project server
```

If the Svelte/browser spec requires a browser project instead of the server project, split it into the existing project-specific validation command rather than broadening the commit.

## Commit Message Candidate

```text
Add operator task loop readback surfaces
```

## Next Bucket After This

After this bucket, inspect the remaining command/API cluster separately. The likely next source bucket is manifest-backed agent-facing command expansion for `get_operator_console`, `get_task_loop_report`, guarded approval request from run evidence, and materializable suggested tasks. That should be reviewed apart from this read-only UI/helper bucket because it changes CLI/API/MCP behavior.
