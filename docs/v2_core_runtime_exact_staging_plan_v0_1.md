# V2 Core Runtime Exact Staging Plan v0.1

Date: 2026-07-11
Status: Staging plan only

## Purpose

Provide an exact `git add` path list for a v2 core runtime commit without
staging, committing, deleting, moving, reverting, or implementing code.

AMS task/run:

- task: `task_v2_core_prepare_exact_v2_core_runtime_staging_plan`
- run: `run_v2_core_prepare_exact_v2_core_runtime_staging_plan`

## Evidence Reviewed

- `docs/current_repo_state_cleanup_buckets_v0_1.md`
- `docs/v2_core_runtime_commit_readiness_checklist_v0_1.md`
- `git status --short -- package.json scripts/v2-core-db.ts src/lib/server/v2-core-* src/routes/app/v2-core`
- `git status --short -- scripts/v1-to-v2-core-import.ts src/lib/server/v2-import-* src/lib/server/v2-seed-slice-fixture.spec.ts src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`
- `git status --short -- scripts/v2-preview-db.ts src/lib/server/v2-preview-* src/routes/app/v2-preview`
- `git diff -- package.json`
- `git ls-files --others --exclude-standard -- <v2 core runtime paths>`

## Decision On `package.json`

Do not include `package.json` in the first v2 core runtime commit as-is.

Reason:

- The current `package.json` diff adds `v2:core-db`, but it also adds preview,
  import, seed-fixture, and legacy smoke-test scripts:
  - `v2:import-preview`
  - `v2:core-import`
  - `v2:extract-seed-fixture`
  - `v2:core-db`
  - `v2:preview-db`
  - `test:agent-work-loop-smoke`
  - `test:v2-preview-work-loop-smoke`
- Including the full file in a v2 core-only commit would pull references to
  preview/import/prototype buckets into the core commit.
- Excluding it keeps the first commit clean. The v2 core CLI remains runnable by
  direct path:

```sh
node --experimental-strip-types scripts/v2-core-db.ts
```

Recommended follow-up:

- Create a tiny approved task to split `package.json` scripts into either:
  - a core-only script commit that adds only `v2:core-db`; or
  - a broader tooling commit that also stages/imports the corresponding
    preview/import files.

## Exact Staging Command For First Core Commit

Use explicit paths only:

```sh
git add \
  scripts/v2-core-db.ts \
  src/lib/server/v2-core-cli-work-loop-smoke.spec.ts \
  src/lib/server/v2-core-contract.ts \
  src/lib/server/v2-core-persistence.spec.ts \
  src/lib/server/v2-core-persistence.ts \
  src/lib/server/v2-core-service.ts \
  src/routes/app/v2-core/+page.server.ts \
  src/routes/app/v2-core/+page.svelte \
  'src/routes/app/v2-core/tasks/[taskId]/+page.server.ts' \
  'src/routes/app/v2-core/tasks/[taskId]/+page.svelte' \
  'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts' \
  'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts' \
  src/routes/app/v2-core/v2-core-page.server.spec.ts \
  src/routes/app/v2-core/v2-core-page.svelte.spec.ts
```

Expected commit message:

```text
Add AMS v2 core runtime loop
```

Expected commit body:

```text
- add isolated v2 core SQLite persistence and schema guardrails
- add v2 core service operations/read models for goals, tasks, runs, artifacts,
  reviews, decisions, memory, tools, providers, evaluation, retrieval, snapshots,
  and managed-run lifecycle closeout
- add v2 core CLI for local and agent work-loop operations
- add read-only v2 core operator and task UI routes with focused tests
- validate with focused v2 core server/browser tests and svelte-check
```

## Paths Explicitly Excluded From First Core Commit

Exclude package/tooling coupling:

- `package.json`

Exclude import/migration files:

- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `src/lib/server/v2-import-draft-validator.ts`
- `src/lib/server/v2-import-draft-validator.spec.ts`
- `src/lib/server/v2-import-mapper.ts`
- `src/lib/server/v2-import-mapper.spec.ts`
- `src/lib/server/v2-seed-slice-fixture.spec.ts`
- `src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`

Exclude v2 preview files:

- `scripts/v2-preview-db.ts`
- `src/lib/server/v2-preview-*.ts`
- `src/lib/server/v2-preview-*.spec.ts`
- `src/routes/app/v2-preview/*`

Exclude v1/prototype control-plane and UI changes:

- `scripts/ams-cli.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `src/lib/server/agent-*`
- `src/lib/server/ams-*`
- `src/lib/server/autonomous-*`
- `src/lib/server/goal-*`
- `src/lib/server/task-*`
- `src/routes/api/agent-goal-loop/[command]/+server.ts`
- `src/routes/app/autonomous-queue/*`
- `src/routes/app/goals/*`
- `src/routes/app/governance/*`
- `src/routes/app/runs/*`
- `src/routes/app/tasks/*`
- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`

Exclude docs/evidence/governance artifacts:

- `docs/current_repo_state_cleanup_buckets_v0_1.md`
- `docs/v2_core_runtime_commit_readiness_checklist_v0_1.md`
- `docs/v2_core_runtime_exact_staging_plan_v0_1.md`
- `docs/v2_first_real_dogfood_task_selection_v0_1.md`
- broad `docs/design/*`
- broad `docs/stack_assessment/*`
- broad `docs/model-change-proposals/*`
- broad `docs/model-decisions/*`
- other `docs/v2_*` milestone artifacts

## Pre-Commit Validation To Re-Run

Before staging or immediately after staging exact paths:

```sh
npx vitest run src/lib/server/v2-core-persistence.spec.ts src/lib/server/v2-core-cli-work-loop-smoke.spec.ts src/routes/app/v2-core/v2-core-page.server.spec.ts 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts'
```

```sh
VITEST_BROWSER=1 npx vitest run src/routes/app/v2-core/v2-core-page.svelte.spec.ts 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts' --project client
```

```sh
npm run check
```

## Verification After Staging

After staging exact paths, verify:

```sh
git diff --cached --name-only
```

Expected output should contain exactly:

```text
scripts/v2-core-db.ts
src/lib/server/v2-core-cli-work-loop-smoke.spec.ts
src/lib/server/v2-core-contract.ts
src/lib/server/v2-core-persistence.spec.ts
src/lib/server/v2-core-persistence.ts
src/lib/server/v2-core-service.ts
src/routes/app/v2-core/+page.server.ts
src/routes/app/v2-core/+page.svelte
src/routes/app/v2-core/tasks/[taskId]/+page.server.ts
src/routes/app/v2-core/tasks/[taskId]/+page.svelte
src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts
src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts
src/routes/app/v2-core/v2-core-page.server.spec.ts
src/routes/app/v2-core/v2-core-page.svelte.spec.ts
```

If `package.json`, `v2-preview`, `v2-import`, prototype control-plane, prototype
UI, or docs files appear in the cached diff, unstage before committing.

## Recommended Next Task

Create this follow-up before committing:

`task_v2_core_decide_package_json_script_split_for_core_commit`

Purpose:

- Decide and, if approved, minimally edit `package.json` so the v2 core runtime
  commit can include only the `v2:core-db` script without pulling preview/import
  script references into the same commit.

Alternative:

- Skip the package script for now and commit the exact v2 core runtime paths
  above.

## Result

This task did not stage, commit, delete, move, revert, or implement code. It
produced an exact staging plan only.
