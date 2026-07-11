# V2 Core Runtime Commit Readiness Checklist v0.1

Date: 2026-07-11
Status: Commit-readiness review

## Purpose

Review the v2 core runtime bucket for commit readiness without staging,
committing, deleting, moving, reverting, or implementing code.

AMS task/run:

- task: `task_v2_core_review_v2_core_runtime_bucket_for_commit_readiness`
- run: `run_v2_core_review_v2_core_runtime_bucket_for_commit_readiness`

## Scope Reviewed

Core runtime:

- `scripts/v2-core-db.ts`
- `src/lib/server/v2-core-contract.ts`
- `src/lib/server/v2-core-persistence.ts`
- `src/lib/server/v2-core-service.ts`

Core tests:

- `src/lib/server/v2-core-persistence.spec.ts`
- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`

Core UI:

- `src/routes/app/v2-core/+page.server.ts`
- `src/routes/app/v2-core/+page.svelte`
- `src/routes/app/v2-core/v2-core-page.server.spec.ts`
- `src/routes/app/v2-core/v2-core-page.svelte.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.server.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.svelte`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts`

Supporting package entry:

- `package.json` v2 scripts that support the v2 core runtime.

## Validation Run

Passed:

```sh
npx vitest run src/lib/server/v2-core-persistence.spec.ts src/lib/server/v2-core-cli-work-loop-smoke.spec.ts src/routes/app/v2-core/v2-core-page.server.spec.ts 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts'
```

Result:

- 4 test files passed
- 29 tests passed

Passed:

```sh
npm run check
```

Result:

- `svelte-check` found 0 errors and 0 warnings

Passed after rerun outside the sandbox:

```sh
VITEST_BROWSER=1 npx vitest run src/routes/app/v2-core/v2-core-page.svelte.spec.ts 'src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts' --project client
```

Result:

- 2 test files passed
- 4 tests passed

Note:

- The first sandboxed browser-spec run failed before loading tests with
  `listen EPERM` on `127.0.0.1`. That was an environment permission issue, not a
  v2 core code failure. The same focused command passed when allowed to bind the
  local test server.

## Readiness Assessment

Recommendation:

- The v2 core runtime bucket is commit-ready after normal human review of the
  diff.

Reason:

- Focused server tests passed.
- Focused browser component tests passed.
- Full Svelte/TypeScript check passed.
- The implementation is coherently grouped around one runtime slice:
  persistence, service/read models, CLI, operator route, task route, and tests.
- The bucket avoids the v1 runtime database and v2-preview database through
  explicit v2-core DB guards.
- The lifecycle helper, task closeout gates, snapshot import guard, and source
  reference behavior have direct test coverage in the focused smoke suite.

## Suggested Commit Contents

Include these files together:

- `package.json`
- `scripts/v2-core-db.ts`
- `src/lib/server/v2-core-contract.ts`
- `src/lib/server/v2-core-persistence.ts`
- `src/lib/server/v2-core-service.ts`
- `src/lib/server/v2-core-persistence.spec.ts`
- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- `src/routes/app/v2-core/+page.server.ts`
- `src/routes/app/v2-core/+page.svelte`
- `src/routes/app/v2-core/v2-core-page.server.spec.ts`
- `src/routes/app/v2-core/v2-core-page.svelte.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.server.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.svelte`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts`

Optional but related if the commit message explicitly covers import/migration
support:

- `scripts/v1-to-v2-core-import.ts`
- `src/lib/server/v2-import-draft-validator.ts`
- `src/lib/server/v2-import-draft-validator.spec.ts`
- `src/lib/server/v2-import-mapper.ts`
- `src/lib/server/v2-import-mapper.spec.ts`
- `src/lib/server/v2-seed-slice-fixture.spec.ts`
- `src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`

Recommendation for commit hygiene:

- Prefer keeping the optional import/migration files in a second commit unless
  the first commit is explicitly "v2 core runtime plus import seed path."

## Do Not Include In This Commit

Keep these out of the v2 core runtime commit:

- `src/lib/server/v2-preview-*`
- `scripts/v2-preview-db.ts`
- `src/routes/app/v2-preview/*`
- prototype control-plane changes under `scripts/ams-cli.mjs`,
  `scripts/ams-control-plane-mcp.mjs`, and `src/lib/server/agent-*`
- prototype UI changes under existing `/app/goals`, `/app/tasks`,
  `/app/governance`, `/app/runs`, and `/app/autonomous-queue`
- broad design/stack/model-decision docs
- current dogfood artifacts

Reason:

- Those are separate buckets with different review risk and ownership. Mixing
  them would recreate the current cleanup problem inside the commit history.

## Risks To Review Before Staging

### Large Service File

`src/lib/server/v2-core-service.ts` is about 5.6k lines and contains most domain
operations, read models, retrieval, reports, snapshots, and agent packets.

Risk:

- Future changes can become hard to review if this file keeps growing.

Commit blocker:

- No. It is acceptable for the current v2 slice, but a later refactor should be
  evidence-driven and not done during cleanup.

### Route Loader Formatting

`src/routes/app/v2-core/tasks/[taskId]/+page.server.ts` contains an over-indented
block around the `hasApprovedReview` / `hasReviewEvidence` return path.

Risk:

- Low. `npm run check` passed, so this is readability/formatting, not a
  behavioral failure.

Commit blocker:

- No. It can be left alone or fixed later by normal formatting if desired.

### Package Script Coupling

`package.json` adds v2 core, v2 preview, import, and smoke-test scripts together.

Risk:

- Medium. If committing only v2 core runtime, package scripts reference preview
  and import files that may be left uncommitted.

Commit blocker:

- Potentially. Before staging `package.json`, decide whether the commit also
  includes the referenced preview/import files or whether package-script changes
  should be split/adjusted in a separate approved implementation task.

### V2 Core Runtime Depends On Generated State Being Out Of Git

The runtime uses `data/v2-core.sqlite` by default, but the DB itself is runtime
state and should remain out of the code commit unless the project explicitly
decides otherwise.

Risk:

- Low if existing ignore/runtime-data policy is followed.

Commit blocker:

- No, but check `git status --ignored` only if there is uncertainty.

## Commit Checklist

Before staging:

- Confirm whether `package.json` should be included with only v2 core files or
  split because it also references preview/import scripts.
- Re-run the focused server tests.
- Re-run the focused browser tests in an environment that can bind localhost.
- Re-run `npm run check`.
- Review `scripts/v2-core-db.ts` help output for command list accuracy.
- Confirm no `data/*.sqlite` runtime database is staged.
- Confirm no v2-preview or prototype control-plane files are staged by accident.

During staging:

- Stage exact paths only.
- Do not use `git add .`.
- Do not stage unrelated prototype UI/control-plane changes.
- Do not stage dogfood docs unless the commit is explicitly an evidence/docs
  commit.

Suggested commit message:

```text
Add AMS v2 core runtime loop
```

Suggested commit body:

```text
- add isolated v2 core SQLite schema and persistence guardrails
- add v2 core service operations/read models for goals, tasks, runs, artifacts,
  reviews, decisions, memory, tools, providers, evaluation, retrieval, snapshots,
  and managed-run lifecycle closeout
- add v2 core CLI for local/agent work-loop operations
- add read-only v2 core operator and task UI routes with focused tests
- validate with focused v2 core server/browser tests and svelte-check
```

## Recommended Next Task

Create a small staging-plan task before committing:

`task_v2_core_prepare_exact_v2_core_runtime_staging_plan`

Purpose:

- Produce the exact `git add` path list for the v2 core runtime commit, including
  a decision on `package.json` and import/migration files.

Why not stage immediately:

- The current repository has many unrelated modified and untracked files. Exact
  staging should be prepared explicitly to avoid pulling in prototype or preview
  work by accident.

## Result

This review did not stage, commit, delete, move, revert, or implement code. It
produced a commit-readiness checklist and validation evidence only.
