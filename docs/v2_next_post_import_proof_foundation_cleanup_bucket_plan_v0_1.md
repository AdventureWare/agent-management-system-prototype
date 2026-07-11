# V2 Next Cleanup Bucket Plan After Import Proof Foundation

Date: 2026-07-11

## Purpose

Select the next small cleanup bucket after commit `26a341b` without staging, deleting,
moving, reverting, or committing any remaining untracked files.

This is part of the dirty-tree cleanup sequence for AMS v2 core. The goal is to
turn useful prototype-derived work into small reviewable commits and leave
speculative or oversized work unstaged until it has a clear purpose.

## Current State Checked

- `git diff --cached --name-only` is empty.
- Remaining untracked work includes:
  - direct v1-to-v2 core importer script
  - older preview import scripts
  - v2 preview database/service/read-model/search/routing/tool/evaluation/memory files
  - v2 preview route and page tests
  - agent work-loop smoke test
  - control-plane label test

## Selected Bucket

Stage and validate only the direct v1-to-v2 core importer bucket.

Included paths:

- `docs/v2_next_post_import_proof_foundation_cleanup_bucket_plan_v0_1.md`
- `scripts/v1-to-v2-core-import.ts`

## Why This Bucket

The importer directly answers the current migration question: which prototype
goals, tasks, runs, reviews, decisions, providers, and artifacts can be carried
into the accepted v2 core model without importing the prototype's bloat.

It is a better next bucket than the preview stack because it:

- uses the committed v2 core persistence and service layer
- is dry-run by default
- requires `--write` before mutating v2 core state
- never mutates v1 state
- imports only accepted v2 core entities
- records source references for auditability
- reports deferred concepts instead of creating new schema

## Explicit Exclusions

Do not stage in this bucket:

- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/v2-preview-*`
- `src/lib/types/control-plane-labels.spec.ts`
- `src/routes/app/v2-preview/`
- `data/**`

The preview stack is broad enough to need a separate accept/reject pass. It
should not be smuggled into the core importer commit.

## Validation Plan

Before staging:

- `git diff --cached --name-only`
- `git status --short`

After staging the exact included paths:

- `git diff --cached --name-only`
- `git diff --cached --stat`
- `git diff --cached --check`
- `node --experimental-strip-types scripts/v1-to-v2-core-import.ts --help`
- `node --experimental-strip-types scripts/v1-to-v2-core-import.ts --source data/control-plane.json --project-name "Agent Management System Prototype" --limit 2 --json`

Do not pass `--write` during validation.

## Commit Message Candidate

`Add v1 to v2 core import script`

## Follow-Up

After this bucket is committed, select the next bucket from the remaining
preview stack, smoke tests, and label tests. That selection should decide
whether each remaining area is still useful for v2 core, needs shrinking, or
should stay archived as experimental work.
