# V2 Core Package Script Split Decision v0.1

Date: 2026-07-11
Status: Accepted package-script split

## Purpose

Resolve whether `package.json` can be included in the first v2 core runtime
commit without pulling preview/import/prototype script references into that
commit.

AMS task/run:

- task: `task_v2_core_decide_package_json_script_split_for_core_commit`
- run: `run_v2_core_decide_package_json_script_split_for_core_commit`

## Evidence Reviewed

- `docs/v2_core_runtime_exact_staging_plan_v0_1.md`
- `git diff -- package.json`
- `npm run v2:core-db -- overview --json`
- `npm run check`

## Decision

Minimally edit `package.json` so the first v2 core runtime commit includes only:

```json
"v2:core-db": "node --experimental-strip-types scripts/v2-core-db.ts"
```

Remove the unrelated script additions from the current diff:

- `v2:import-preview`
- `v2:core-import`
- `v2:extract-seed-fixture`
- `v2:preview-db`
- `test:agent-work-loop-smoke`
- `test:v2-preview-work-loop-smoke`

## Rationale

The first v2 core runtime commit should contain only the v2 core runtime loop.
The preview/import/prototype smoke scripts reference files from other cleanup
buckets and would make the commit boundary ambiguous.

Keeping `v2:core-db` is useful because it provides a stable npm entry point for
the v2 core CLI being committed in the same bucket.

## Validation

After the edit:

- `git diff -- package.json` shows only the `v2:core-db` script addition.
- `npm run v2:core-db -- overview --json` succeeds.
- `npm run check` succeeds with 0 errors and 0 warnings.

## Updated Staging Plan

The v2 core runtime commit may now include `package.json` along with the exact
v2 core runtime paths from `docs/v2_core_runtime_exact_staging_plan_v0_1.md`.

Updated first staging command:

```sh
git add \
  package.json \
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

## Result

This task edited only `package.json`, did not stage or commit anything, and did
not delete, move, or revert files.
