# Next Cleanup Bucket After Agent-Facing Continuation Commands Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `25764e9 Add agent-facing continuation commands`.

The remaining dirty tree includes docs/skill updates, packet and prompt guidance, current-context readback suggestions, launch-context readback, navigation, large v2 preview/import work, and a small continuation-loop correctness fix. This plan chooses the small production correctness fix first because it directly protects the active Goal loop from either stalling or duplicating continuation tasks.

## Selected Bucket

Commit the continuation-loop correctness fix.

This bucket does two things:

- Keeps `running` Goals with only closed accepted work in the planning loop instead of classifying them as complete.
- Prevents repository reconciliation from recreating a continuation-planning task when the continuation task itself is being canceled or otherwise updated.

It does not add a scheduler, new status, new entity, new schema, preview/import behavior, UI navigation, docs reference updates, or prompt rewriting.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_agent_facing_commands_cleanup_bucket_plan_v0_1.md
src/lib/server/control-plane-repository.ts
src/lib/server/control-plane-sqlite.spec.ts
src/lib/server/goal-work-loop.ts
src/lib/server/goal-work-loop.spec.ts
```

## Why This Bucket

- It is a small correctness fix for existing Goal/Task/reconciliation behavior.
- It supports the current invariant that active incomplete Goals should not silently stall.
- It avoids duplicate continuation-planning tasks after the operator cancels one.
- It has focused tests already adjacent to the changed code.
- It is independent from prompt/packet guidance, v2 preview/import code, and navigation.

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

Also do not stage runtime databases, seed/import fixtures, preview persistence, docs index/reference updates, skill updates, prompt-context trimming, launch-context readback, packet command-guidance changes, or navigation changes.

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

- one `goal-work-loop` condition change
- repository reconciliation guard for continuation-planning task updates
- focused tests covering running-goal fallback and continuation-task cancellation behavior
- no docs/skill updates beyond this plan artifact
- no UI, prompt, packet, v2 preview/import, runtime data, or schema changes

Recommended focused validation:

```sh
npx vitest run src/lib/server/goal-work-loop.spec.ts src/lib/server/control-plane-sqlite.spec.ts --project server
```

## Commit Message Candidate

```text
Fix continuation planning loop edge cases
```

## Next Bucket After This

After this bucket, inspect the packet/prompt/current-context readback changes as a separate slice. That likely includes structured command guidance in work packets and task-scoped prompt context, but it should be reviewed independently because it changes what agents are told, not the core continuation-loop correctness behavior.
