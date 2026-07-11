# Next Cleanup Bucket After Operator Task-Loop Readback Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `75516a7 Add operator task loop readback surfaces`.

The remaining dirty tree contains several unrelated themes: agent-facing command expansion, managed continuation-runner behavior, run-result approval closeout, packet/prompt guidance, anti-stall continuation reconciliation, docs/skill updates, v2 preview/import code, and v2 navigation. This plan chooses one production command-surface bucket and leaves adjacent work for later review.

## Selected Bucket

Commit the agent-facing continuation command and run-closeout control surfaces.

This bucket adds:

- manifest-backed `goal-loop:get_operator_console` and `goal-loop:get_task_loop_report` exposure
- guarded `goal-loop:materialize_suggested_task`
- guarded `goal-loop:managed_continuation_runner`
- `run-result:request_approval_from_run`
- CLI and MCP schema exposure for those commands
- focused tests for the command helpers, CLI, MCP, and run-result approval conversion

It does not add scheduler behavior, auto-launch behavior, auto-approval behavior, prompt trimming, v2 preview/import code, navigation changes, or schema changes.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_operator_task_loop_readback_cleanup_bucket_plan_v0_1.md
scripts/ams-cli.mjs
scripts/ams-control-plane-mcp.mjs
src/routes/api/agent-goal-loop/[command]/+server.ts
src/lib/server/agent-capability-commands.js
src/lib/server/agent-capability-manifest.spec.ts
src/lib/server/agent-capability-playbooks.js
src/lib/server/agent-goal-loop.ts
src/lib/server/agent-goal-loop.spec.ts
src/lib/server/agent-goal-loop-actions.ts
src/lib/server/agent-goal-loop-actions.spec.ts
src/lib/server/agent-run-results.ts
src/lib/server/agent-run-results.spec.ts
src/lib/server/ams-cli.spec.ts
src/lib/server/ams-control-plane-mcp.spec.ts
src/lib/server/goal-run-result-preview.ts
src/lib/server/goal-run-result-preview.spec.ts
src/lib/server/managed-continuation-runner.ts
src/lib/server/managed-continuation-runner.spec.ts
```

## Why This Bucket

- It makes existing v2 loop state usable through structured agent-facing commands.
- It uses existing Goal, Task, Run, Review, Approval, Decision, Project, and work-packet helpers.
- It keeps managed continuation bounded to one read, preview, or materialization step.
- It explicitly avoids auto-launch, auto-approval, and broad scheduler behavior.
- It lets agents convert run evidence into review, approval, blocker, or follow-up paths without manually inventing task mutations.

## Explicit Exclusions

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `src/lib/server/agent-current-context.ts`
- `src/lib/server/agent-current-context.spec.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/agent-work-packets.ts`
- `src/lib/server/agent-work-packets.spec.ts`
- `src/lib/server/control-plane-repository.ts`
- `src/lib/server/control-plane-sqlite.spec.ts`
- `src/lib/server/goal-work-loop.ts`
- `src/lib/server/goal-work-loop.spec.ts`
- `src/lib/server/goal-work-packets.ts`
- `src/lib/server/goal-work-packets.spec.ts`
- `src/lib/server/task-launch-planning.ts`
- `src/lib/server/task-threads.ts`
- `src/lib/server/task-threads.spec.ts`
- `src/lib/workflow-prompts.ts`
- `src/lib/workflow-prompts.spec.ts`
- `src/routes/app/runs/[runId]/+page.svelte`
- `src/routes/app/runs/[runId]/run-detail-page.svelte.spec.ts`
- `src/routes/app/tasks/+page.server.ts`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/fixtures/**`
- `src/lib/server/v2-*.ts`
- `src/lib/server/v2-*.spec.ts`
- `src/lib/types/control-plane-labels.spec.ts`
- `src/routes/app/v2-preview/**`
- `data/**`

Also do not stage runtime databases, seed/import fixtures, preview persistence, navigation, docs index/reference updates, skill updates, prompt-context trimming, continuation-reconciliation fixes, or run detail UI changes.

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

- manifest-backed command metadata and playbook updates
- CLI/MCP exposure for the selected commands
- goal-loop POST route support
- command helper code for materialization and managed continuation
- run-result approval request from run evidence
- focused unit tests for the included surfaces
- no prompt trimming, UI navigation, v2 preview/import files, runtime data, or schema changes

Recommended focused validation:

```sh
npx vitest run src/lib/server/agent-capability-manifest.spec.ts src/lib/server/ams-cli.spec.ts src/lib/server/ams-control-plane-mcp.spec.ts src/lib/server/agent-goal-loop.spec.ts src/lib/server/agent-goal-loop-actions.spec.ts src/lib/server/managed-continuation-runner.spec.ts src/lib/server/agent-run-results.spec.ts src/lib/server/goal-run-result-preview.spec.ts --project server
```

## Commit Message Candidate

```text
Add agent-facing continuation commands
```

## Next Bucket After This

After this bucket, inspect the remaining packet/prompt guidance and current-context readback changes separately. The likely next source bucket is structured command guidance in work packets and managed prompt context, but it should be reviewed apart from this command-surface bucket because it changes how agents are instructed, not which commands exist.
