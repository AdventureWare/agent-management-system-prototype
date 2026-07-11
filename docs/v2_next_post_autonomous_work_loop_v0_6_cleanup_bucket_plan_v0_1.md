# Next Cleanup Bucket After Autonomous Work Loop v0.6 Docs Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `c998e9d Add autonomous work loop v0.6 runner docs`.

The remaining worktree is mixed: broad production source changes, agent-facing docs, CLI/API changes, preview/import implementation files, and one untracked milestone audit. This plan intentionally chooses the smallest separable docs-only artifact and avoids staging source code or runtime state.

## Selected Bucket

Commit the broad Autonomous Goal-Directed Work Loop v0 completion audit as a standalone documentation artifact.

Include exactly:

- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md`
- `docs/v2_next_post_autonomous_work_loop_v0_6_cleanup_bucket_plan_v0_1.md`

## Why This Bucket

- It is docs-only.
- It records milestone evidence and remaining gaps without changing behavior.
- It is separable from the production source, CLI/API, MCP, UI, preview, and import changes still in the dirty tree.
- It supports cleanup by preserving the broad audit before larger source buckets are reviewed.
- It has low risk because it does not modify schemas, runtime data, generated state, or application code.

## Explicit Exclusions

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `scripts/ams-cli.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
- `src/**`
- `src/routes/**`
- `data/**`

Also do not stage preview/import implementation files, production task-loop source files, UI route changes, tests, runtime database files, or generated artifacts.

## Validation Before Commit

Before committing, verify:

```sh
git diff --cached --name-only
```

is empty before staging.

Then stage only the selected paths:

```sh
git add docs/autonomous-goal-directed-work-loop-v0-completion-audit.md docs/v2_next_post_autonomous_work_loop_v0_6_cleanup_bucket_plan_v0_1.md
```

After staging, verify:

```sh
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
```

Expected staged paths:

```text
docs/autonomous-goal-directed-work-loop-v0-completion-audit.md
docs/v2_next_post_autonomous_work_loop_v0_6_cleanup_bucket_plan_v0_1.md
```

Expected staged scope:

- documentation only
- no source code
- no runtime data
- no preview/import implementation files
- no broad docs index/reference changes

## Commit Message Candidate

```text
Add autonomous work loop v0 completion audit
```

## Next Bucket After This

After this commit, select a source-code bucket rather than continuing to peel off incidental docs. The likely next review target is the production autonomous work-loop/control-surface source cluster, but it should be inspected separately before staging because it spans CLI, MCP, server helpers, UI readbacks, and tests.
