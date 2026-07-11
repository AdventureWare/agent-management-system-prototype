# Next Cleanup Bucket After Continuation Loop Edge Cases Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `4841b65 Fix continuation planning loop edge cases`.

The remaining dirty tree includes packet/prompt/current-context readback, docs/skill/reference updates, launch-context readback, navigation, smoke tests, and large v2 preview/import work. This plan chooses the context/readback slice because it is directly connected to the recently committed agent-facing command surfaces and reduces prompt dependence without changing the domain model.

## Selected Bucket

Commit the structured packet, prompt, and launch-context readback slice.

This bucket adds:

- `goal-loop:get_task_loop_report` to current-context suggested readbacks after task-scoped mutations.
- structured command guidance in goal-loop work packets and agent work packet responses.
- task-only work-packet scope resolution to the selected task project and goal.
- task-scoped project context for executor, research, and reviewer prompts to reduce broad project-memory dumping.
- launch-run `contextSummary` with durable AMS readback commands.
- run detail display and test coverage for launch-context readback.

It does not add new entities, schema, lifecycle states, scheduler behavior, preview/import code, navigation, docs reference updates, or skill changes.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_continuation_loop_edge_cases_cleanup_bucket_plan_v0_1.md
src/lib/server/agent-current-context.ts
src/lib/server/agent-current-context.spec.ts
src/lib/server/agent-work-packets.ts
src/lib/server/agent-work-packets.spec.ts
src/lib/server/goal-work-packets.ts
src/lib/server/goal-work-packets.spec.ts
src/lib/workflow-prompts.ts
src/lib/workflow-prompts.spec.ts
src/lib/server/task-launch-planning.ts
src/lib/server/task-threads.ts
src/lib/server/task-threads.spec.ts
src/routes/app/runs/[runId]/+page.svelte
src/routes/app/runs/[runId]/run-detail-page.svelte.spec.ts
src/routes/app/tasks/+page.server.ts
```

## Why This Bucket

- It keeps the source of truth in structured AMS commands and readbacks rather than long prompt text.
- It uses existing Run.contextSummary instead of adding a new entity or field.
- It aligns work packets, managed launch prompts, current-context guidance, and run detail readback around the same task-loop report and work-packet commands.
- It reduces prompt stuffing in task-scoped executor/research/reviewer prompts while preserving planner prompts separately.
- It is independent from docs index updates, skill wording, navigation, smoke tests, and the large v2 preview/import code.

## Explicit Exclusions

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
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

Also do not stage runtime databases, seed/import fixtures, preview persistence, docs index/reference updates, skill updates, navigation, or smoke-test files.

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

- packet/current-context command guidance
- task-scoped prompt context reduction
- launch `Run.contextSummary` creation and run-detail readback
- focused tests for the above
- no docs/skill/navigation/v2 preview/import/runtime data changes

Recommended focused validation:

```sh
npx vitest run src/lib/server/agent-current-context.spec.ts src/lib/server/agent-work-packets.spec.ts src/lib/server/goal-work-packets.spec.ts src/lib/workflow-prompts.spec.ts src/lib/server/task-threads.spec.ts --project server
VITEST_BROWSER=1 npx vitest run 'src/routes/app/runs/[runId]/run-detail-page.svelte.spec.ts' --project client
```

If the browser test hits sandbox listener restrictions, rerun that exact command with escalation rather than broadening validation.

## Commit Message Candidate

```text
Add structured context readbacks to work packets
```

## Next Bucket After This

After this bucket, inspect docs/skill/reference updates separately. Those should document the committed command and context-readback behavior, but should not be mixed with runtime source changes.
