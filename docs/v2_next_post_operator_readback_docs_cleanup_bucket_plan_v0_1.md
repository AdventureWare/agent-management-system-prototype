# Next Cleanup Bucket After Operator Readback Docs Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `f95476d Document AMS operator readback commands`.

The remaining dirty tree contains a tiny navigation diff plus a large untracked v2 preview/import/proof/smoke-test set. This plan chooses the navigation cleanup slice, but only after narrowing it to the committed `/app/v2-core` route. The current dirty navigation diff also adds `/app/v2-preview`, but that route is still untracked and should not be linked from the main sidebar until its route and validation are committed as their own bucket.

## Selected Bucket

Commit a v2 core navigation link.

The staging task should first narrow the current navigation diff by removing the uncommitted preview link:

- remove `v2Preview` from `AppNavigationLinkId`
- remove `/app/v2-preview` from `AppNavigationRoute`
- remove `{ id: 'v2Preview', label: 'V2 preview', href: '/app/v2-preview' }`
- remove the `v2Preview: DatabaseIcon` icon mapping

Then stage only the v2 core navigation changes and this plan artifact.

This bucket adds the already-committed `/app/v2-core` read-only operator console to the existing navigation. It does not expose the uncommitted v2 preview route.

## Included Paths

Stage exactly these paths after narrowing the diff:

```text
docs/v2_next_post_operator_readback_docs_cleanup_bucket_plan_v0_1.md
src/lib/app-navigation.ts
src/lib/components/Sidebar.svelte
```

Expected staged application behavior:

- `AppNavigationLinkId` includes `v2Core`, not `v2Preview`.
- `AppNavigationRoute` includes `/app/v2-core`, not `/app/v2-preview`.
- the Context section includes `V2 core` pointing to `/app/v2-core`.
- `Sidebar.svelte` imports `DatabaseIcon` and maps `v2Core` to it.
- no sidebar link points to `/app/v2-preview`.

## Why This Bucket

- `/app/v2-core` already exists on `HEAD` and has committed page/server specs.
- Adding a navigation link to an existing route is a small usability follow-through, not a domain/model change.
- Excluding `/app/v2-preview` prevents the main UI from pointing at an uncommitted experimental route.
- The large v2 preview/import/proof set has many dependencies and should be reviewed as a separate experimental or migration bucket.

## Explicit Exclusions

Do not stage:

- `src/routes/app/v2-preview/**`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/fixtures/**`
- `src/lib/server/v2-import-*.ts`
- `src/lib/server/v2-import-*.spec.ts`
- `src/lib/server/v2-preview-*.ts`
- `src/lib/server/v2-preview-*.spec.ts`
- `src/lib/server/v2-seed-slice-fixture.spec.ts`
- `src/lib/server/v2-sqlite-proof.ts`
- `src/lib/server/v2-sqlite-proof.spec.ts`
- `src/lib/types/control-plane-labels.spec.ts`
- `data/**`

Also do not stage runtime databases, preview/import implementation, fixtures, proof code, smoke tests, generated files, or any v2 preview route.

## Validation Before Commit

Before editing or staging, verify:

```sh
git diff --cached --name-only
```

is empty.

After narrowing the navigation diff and staging only the selected paths, verify:

```sh
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
git diff --cached -- src/lib/app-navigation.ts src/lib/components/Sidebar.svelte
```

Expected staged scope:

- this plan artifact
- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `v2Core` additions only
- no `v2Preview` additions

Recommended focused validation:

```sh
npm run check
```

If `npm run check` is too broad or fails for unrelated pre-existing dirty preview/import files, record that explicitly and fall back to verifying the staged diff plus TypeScript/Svelte diagnostics relevant to `src/lib/app-navigation.ts` and `src/lib/components/Sidebar.svelte`.

## Commit Message Candidate

```text
Add v2 core navigation link
```

## Next Bucket After This

After this bucket, inspect the large v2 preview/import/proof set separately. That work should be split into a coherent experimental preview/import bucket with its own validation plan, or deferred/archived if it no longer fits the current v2 direction.
