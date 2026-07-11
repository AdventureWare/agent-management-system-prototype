# Next Cleanup Bucket After V2 Core Navigation Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `f605e07 Add v2 core navigation link`.

The remaining dirty tree is all untracked and mixes several concerns: a direct v1-to-v2-core importer, a preview database CLI, preview services, a preview route, import mapping/proof code, fixtures, and smoke tests. This plan chooses the import/proof foundation because the preview services and route depend on it, and because it can be validated in isolation without committing a broad experimental app surface.

## Selected Bucket

Commit the v2 import draft and SQLite proof foundation.

This bucket adds:

- a read-only AMS prototype seed-slice fixture.
- a mapper from selected v1 control-plane records into v2 import draft records.
- a validator for the draft relationship/source-reference contract.
- an isolated in-memory SQLite proof schema and loader.
- focused tests for fixture stability, mapping, validation, and SQLite relationship enforcement.

It does not write runtime data, import into `data/v2-core.sqlite`, create migrations, expose UI, add navigation, add preview services, add preview CLI commands, or create accepted new v2 domain entities.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_v2_core_navigation_cleanup_bucket_plan_v0_1.md
src/lib/server/fixtures/v2-ams-useful-prototype-slice.json
src/lib/server/v2-import-mapper.ts
src/lib/server/v2-import-mapper.spec.ts
src/lib/server/v2-import-draft-validator.ts
src/lib/server/v2-import-draft-validator.spec.ts
src/lib/server/v2-sqlite-proof.ts
src/lib/server/v2-sqlite-proof.spec.ts
src/lib/server/v2-seed-slice-fixture.spec.ts
```

## Why This Bucket

- It is the smallest coherent base for any later preview/import work.
- It keeps v1 data as read-only evidence and validates relationships before any runtime write path.
- It proves the selected prototype slice can fit an isolated relational shape without touching production v1 or v2 runtime databases.
- It avoids committing the much larger preview UI/service/CLI stack before the foundation is reviewed.
- It keeps candidate capabilities/tools/skills/artifacts as candidates rather than promoting them to accepted v2 entities.

## Explicit Exclusions

Do not stage:

- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/v2-preview-*.ts`
- `src/lib/server/v2-preview-*.spec.ts`
- `src/lib/types/control-plane-labels.spec.ts`
- `src/routes/app/v2-preview/**`
- `data/**`

Also do not stage runtime databases, generated exports, preview route files, preview services, preview CLI scripts, direct core-import scripts, smoke tests, or broad generated artifacts.

## Validation Before Commit

Before staging, verify:

```sh
git diff --cached --name-only
```

is empty.

After staging only the selected paths, verify:

```sh
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
```

Expected staged scope:

- seed fixture
- import mapper and spec
- import draft validator and spec
- isolated SQLite proof and spec
- seed fixture stability spec
- this plan artifact
- no scripts, UI routes, preview services, runtime databases, or generated output

Recommended focused validation:

```sh
npx vitest run src/lib/server/v2-seed-slice-fixture.spec.ts src/lib/server/v2-import-mapper.spec.ts src/lib/server/v2-import-draft-validator.spec.ts src/lib/server/v2-sqlite-proof.spec.ts --project server
```

If the focused validation fails, do not broaden the bucket. Fix only issues inside the selected import/proof foundation or stop and record the blocker.

## Commit Message Candidate

```text
Add v2 import proof foundation
```

## Next Bucket After This

After this bucket, inspect either:

- the direct v1-to-v2-core importer as a separate write-path candidate, or
- the v2 preview service/read-model stack as a separate experimental preview candidate.

Do not mix both paths in one commit.
