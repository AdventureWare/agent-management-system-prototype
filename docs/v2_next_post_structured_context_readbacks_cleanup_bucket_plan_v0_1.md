# Next Cleanup Bucket After Structured Context Readbacks Commit

Date: 2026-07-11

## Purpose

Select the next narrow cleanup bucket after commit `99fb7e6 Add structured context readbacks to work packets`.

The remaining dirty tree includes docs/skill/reference updates, navigation pointing at v2 core and preview routes, an untracked preview/import implementation set, and a smoke-test file. This plan chooses the docs/skill/reference slice because it documents behavior that has already been committed and does not mix reference updates with navigation or experimental preview/import work.

## Selected Bucket

Commit the agent-facing documentation and skill reference updates for the current operator path, task-loop readback, guarded closeout commands, and autonomous-work-loop status.

This bucket records:

- `goal-loop get_operator_console` as the canonical operator path for managed agents and operator surfaces.
- `goal-loop get_task_loop_report` as the post-mutation task-scoped readback.
- `request_approval_from_run` and closeout-first run-result guidance in the agent-facing command references.
- current autonomous-work-loop status after v0.5/v0.6 evidence and prompt/context reduction.
- docs index links for v2 design, stack, migration, preview evidence, and completion-audit artifacts already committed.

It does not add code, schema, navigation, route files, preview/import implementation, smoke tests, lifecycle states, or new domain concepts.

## Included Paths

Stage exactly these paths:

```text
docs/v2_next_post_structured_context_readbacks_cleanup_bucket_plan_v0_1.md
.agents/skills/ams-agent-interface/SKILL.md
docs/README.md
docs/agent-facing-ams-interface-v0.md
docs/ams-cli-reference.md
docs/autonomous-goal-directed-work-loop-v0.md
```

## Why This Bucket

- It is a documentation-only follow-through from committed agent-facing and structured-readback behavior.
- It keeps agent instructions aligned with the actual command loop before more cleanup work continues.
- It avoids mixing docs with navigation that references an uncommitted preview route.
- It avoids staging the large preview/import implementation set before that work is reviewed as its own coherent slice.
- It preserves the anti-bloat direction: document existing committed affordances and current milestones, but do not create new workflow ceremonies.

## Explicit Exclusions

Do not stage:

- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `src/routes/app/v2-preview/**`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `scripts/v2-preview-db.ts`
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

Also do not stage runtime databases, route/navigation changes, preview persistence, import mapping code, fixtures, smoke tests, or generated artifacts.

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

- docs/skill/reference files plus this plan artifact only
- no application source except `.agents/skills/ams-agent-interface/SKILL.md`
- no navigation, route, preview/import, smoke-test, fixture, or runtime data changes

Recommended focused validation:

```sh
git diff --cached --check
```

No runtime tests are required for this docs/skill-only bucket. If a later staging task chooses to run a broader check, keep it informational and do not stage unrelated formatting churn.

## Commit Message Candidate

```text
Document AMS operator readback commands
```

## Next Bucket After This

After this bucket, inspect navigation and preview/import work separately. Navigation should not be committed unless the target route is included or already exists on `HEAD`; the preview/import implementation should be reviewed as a larger experimental slice with its own validation plan.
