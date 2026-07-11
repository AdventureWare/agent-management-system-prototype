# V2 Core Runtime Staged Paths Review v0.1

Date: 2026-07-11
Status: Staged for pre-commit review

## Purpose

Stage the exact v2 core runtime commit paths accepted by the package-script
split decision, verify the cached path list, and stop before committing.

AMS task/run:

- task: `task_v2_core_stage_exact_v2_core_runtime_commit`
- run: `run_v2_core_stage_exact_v2_core_runtime_commit`

## Commands Run

```sh
npm run v2:core-db -- inspect-task --task task_v2_core_stage_exact_v2_core_runtime_commit --json
git diff --cached --name-only
npm run v2:core-db -- launch-provider-run --id decision_v2_core_stage_exact_runtime_commit_launch --run run_v2_core_stage_exact_v2_core_runtime_commit --task task_v2_core_stage_exact_v2_core_runtime_commit --provider provider_codex_external --input "Stage the exact v2 core runtime commit paths." --action "Run exact git add path list from accepted package script split decision, verify cached diff matches expected list, and stop before commit." --json
git add package.json scripts/v2-core-db.ts src/lib/server/v2-core-cli-work-loop-smoke.spec.ts src/lib/server/v2-core-contract.ts src/lib/server/v2-core-persistence.spec.ts src/lib/server/v2-core-persistence.ts src/lib/server/v2-core-service.ts src/routes/app/v2-core/+page.server.ts src/routes/app/v2-core/+page.svelte 'src/routes/app/v2-core/tasks/[taskId]/+page.server.ts' 'src/routes/app/v2-core/tasks/[taskId]/+page.svelte' 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts' 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts' src/routes/app/v2-core/v2-core-page.server.spec.ts src/routes/app/v2-core/v2-core-page.svelte.spec.ts
git diff --cached --name-only
git diff --cached --stat
```

## Staged Paths

`git diff --cached --name-only` returned exactly:

```text
package.json
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

## Validation

- The staged path list matches the expected exact v2 core runtime path list.
- No paths were staged before this task began.
- `git diff --cached --stat` shows only the expected v2 core runtime files
  plus the single `package.json` script addition.
- Prior focused validation for this staged set passed:
  - v2 core server tests: 4 files / 29 tests passed.
  - v2 core browser specs: 2 files / 4 tests passed after sandbox-safe rerun.
  - `npm run check`: 0 errors / 0 warnings.
  - package script split validation: `package.json` diff contains only
    `v2:core-db`, and `npm run v2:core-db -- overview --json` succeeds.

## Explicitly Excluded

The staging command did not include preview, import, prototype smoke, migration,
or documentation cleanup files outside the accepted v2 core runtime bucket.
Those remain outside this pre-commit staged set.

## Result

The exact v2 core runtime path set is staged for review. No commit was made.

## Next Step

Review the staged diff, then commit with message
`Add AMS v2 core runtime loop` if the staged diff is acceptable. The commit
should include only the currently staged files and should not touch unrelated
dirty or untracked paths.
