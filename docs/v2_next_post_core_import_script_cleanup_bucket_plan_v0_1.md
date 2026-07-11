# V2 Next Cleanup Bucket Plan After Core Import Script

Date: 2026-07-11

## Purpose

Select the next small cleanup bucket after commit `9bd2b00` without staging,
deleting, moving, reverting, or committing any remaining untracked files.

This pass is deliberately conservative. The remaining dirty work includes a
large `v2-preview` stack that overlaps with the accepted v2 core direction, so
the next bucket should preserve only work that is clearly useful and isolated.

## Current State Checked

- `git diff --cached --name-only` is empty.
- Remaining untracked work includes:
  - `scripts/v1-to-v2-import-preview.mjs`
  - `scripts/v1-to-v2-slice-fixture.mjs`
  - `scripts/v2-preview-db.ts`
  - `src/lib/server/v2-preview-*`
  - `src/routes/app/v2-preview/`
  - `src/lib/server/agent-work-loop-smoke.spec.ts`
  - `src/lib/types/control-plane-labels.spec.ts`

## Selected Bucket

Stage and validate only the control-plane label-formatting test bucket.

Included paths:

- `docs/v2_next_post_core_import_script_cleanup_bucket_plan_v0_1.md`
- `src/lib/types/control-plane-labels.spec.ts`

## Why This Bucket

`src/lib/types/control-plane-labels.spec.ts` is small, isolated, and tests an
existing shared helper: `formatEnumLabel` in `src/lib/types/control-plane.ts`.

It does not:

- add entities
- add fields
- add routes
- add storage
- add workflow states
- introduce a second v2 runtime path

The test supports existing operator/readback surfaces that display
snake-case loop values such as `actionable_now`, `awaiting_review`, and
`approval_required`.

## Explicit Exclusions

Do not stage in this bucket:

- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/v2-preview-*`
- `src/routes/app/v2-preview/`
- `data/**`

The `v2-preview` stack appears to be a broad experimental parallel
implementation path with its own database helpers, services, route, write
forms, and tests. It may contain useful ideas, but it should not be preserved
as-is without an explicit accept/reject review against the accepted v2 core
model.

`src/lib/server/agent-work-loop-smoke.spec.ts` is also broad and tied to the
prototype control-plane model. It should be reviewed separately rather than
bundled with a tiny formatter test.

## Validation Plan

Before staging:

- `git diff --cached --name-only`
- `git status --short`

After staging the exact included paths:

- `git diff --cached --name-only`
- `git diff --cached --stat`
- `git diff --cached --check`
- `npx vitest run src/lib/types/control-plane-labels.spec.ts`

## Commit Message Candidate

`Add control-plane label formatting test`

## Follow-Up

After this bucket is committed, perform an explicit preview-stack disposition
pass. That pass should decide whether each remaining preview file is:

- useful evidence to translate into v2 core
- duplicate architecture to leave uncommitted/archive
- a test idea to port
- obsolete prototype scaffolding

Do not commit the preview stack wholesale.
