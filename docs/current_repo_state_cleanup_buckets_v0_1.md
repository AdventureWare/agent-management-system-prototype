# Current Repo State Cleanup Buckets v0.1

Date: 2026-07-11
Status: Read-only classification

## Purpose

Classify the current dirty repository state into reviewable cleanup buckets
without moving, deleting, reverting, staging, committing, or implementing code.

AMS task/run:

- task: `task_v2_core_classify_current_repo_state_for_cleanup`
- run: `run_v2_core_classify_current_repo_state_for_cleanup`

## Read-Only Evidence

Commands run:

- `git branch --show-current`
- `git status --short`
- `git diff --name-status`
- `git diff --stat`
- `git ls-files --others --exclude-standard`
- representative `git diff -- <path>` reads for:
  - `package.json`
  - `.agents/skills/ams-agent-interface/SKILL.md`
  - `scripts/ams-cli.mjs`
  - `src/lib/server/agent-capability-commands.js`
- representative path listing for:
  - `src/routes/app/v2-core`
  - `docs/design`
  - `docs/stack_assessment`
  - `docs/model-change-proposals`
  - `docs/model-decisions`

Current branch:

- `main`

Current tracked diff summary:

- 60 modified tracked files
- 3,594 insertions
- 249 deletions

There are also many untracked files, mostly documentation, v2/v2-preview
implementation files, tests, scripts, and route files.

## Bucket 1: Current Dogfood Artifacts

Representative files:

- `docs/v2_next_milestone_after_lifecycle_helper_v0_1.md`
- `docs/v2_first_real_dogfood_task_selection_v0_1.md`
- `docs/current_repo_state_cleanup_buckets_v0_1.md`

Likely source/ownership:

- Current AMS v2 dogfood work.

Risk:

- Low. Documentation only.

Recommended action:

- Keep together or include in a small "AMS v2 dogfood milestone evidence" commit.

Do not:

- Mix these files into large implementation commits if the goal is clean review.

## Bucket 2: AMS v2 Core Runtime

Representative files:

- `scripts/v2-core-db.ts`
- `src/lib/server/v2-core-contract.ts`
- `src/lib/server/v2-core-persistence.ts`
- `src/lib/server/v2-core-service.ts`
- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- `src/lib/server/v2-core-persistence.spec.ts`
- `src/routes/app/v2-core/+page.server.ts`
- `src/routes/app/v2-core/+page.svelte`
- `src/routes/app/v2-core/v2-core-page.server.spec.ts`
- `src/routes/app/v2-core/v2-core-page.svelte.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.server.ts`
- `src/routes/app/v2-core/tasks/[taskId]/+page.svelte`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.server.spec.ts`
- `src/routes/app/v2-core/tasks/[taskId]/v2-core-task-page.svelte.spec.ts`

Likely source/ownership:

- New v2 core implementation: SQLite persistence, service/read models, CLI work
  loop, operator/task routes, and tests.

Risk:

- High value, medium-to-high review risk because this is the central v2
  implementation surface and many files are untracked.

Recommended action:

- Review as a dedicated implementation bucket.
- Validate with focused v2 core tests and `npm run check` before commit.
- Keep separate from v1 autonomous-loop/control-plane changes.

Do not:

- Squash into design docs or v2-preview experiments without review.
- Delete or rename untracked v2 core files casually; many are likely live
  implementation state.

## Bucket 3: V2 Preview / Import / Migration Experiments

Representative files:

- `scripts/v2-preview-db.ts`
- `scripts/v1-to-v2-core-import.ts`
- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`
- `src/lib/server/v2-preview-*.ts`
- `src/lib/server/v2-preview-*.spec.ts`
- `src/lib/server/v2-import-*.ts`
- `src/lib/server/v2-import-*.spec.ts`
- `src/lib/server/v2-seed-slice-fixture.spec.ts`
- `src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`
- `src/routes/app/v2-preview/+page.server.ts`
- `src/routes/app/v2-preview/+page.svelte`
- `src/routes/app/v2-preview/v2-preview-page.server.spec.ts`
- `src/routes/app/v2-preview/v2-preview-page.svelte.spec.ts`

Likely source/ownership:

- Earlier v2 preview/import proof work and migration scaffolding.

Risk:

- Medium. Useful learning and possibly reusable code, but may be superseded by
  v2 core runtime decisions.

Recommended action:

- Review after Bucket 2.
- Decide whether each preview module is retained, archived, or superseded by v2
  core.
- Commit separately if still needed; otherwise archive deliberately in a later
  cleanup task with operator approval.

Do not:

- Treat preview files as production v2 core without explicit review.
- Delete preview files in this cleanup pass.

## Bucket 4: V2 Design, Stack, Ontology, and Migration Docs

Representative files:

- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_traceability_matrix.md`
- `docs/design/ams_v2_entity_cards.md`
- `docs/design/ams_v2_design_bloat_audit.md`
- `docs/stack_assessment/*`
- `docs/prototype_audit_v0_1.md`
- `docs/v2_*_v0_1.md`
- `docs/v1_to_v2_migration_plan_v0_1.md`

Likely source/ownership:

- Accepted analysis/design work from the v2 rebuild/refactor and stack passes,
  plus subsequent v2 implementation milestone artifacts.

Risk:

- Low-to-medium. Mostly docs, but numerous docs can become noise if not grouped.

Recommended action:

- Split into logical documentation commits:
  - source-of-truth/design docs;
  - stack/rebuild assessment docs;
  - v2 milestone evidence docs;
  - migration/import docs.

Do not:

- Delete older docs solely because they are numerous. Some are accepted AMS
  artifacts and source evidence.

## Bucket 5: Domain Governance / Model Decisions

Representative files:

- `docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md`
- `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`
- `docs/model-change-proposals/0003-preview-routing-decision.md`
- `docs/model-change-proposals/0004-preview-dependency-reduction-record.md`
- `docs/model-change-proposals/0005-preview-memory-item.md`
- `docs/model-change-proposals/0006-preview-review-approval-recording.md`
- `docs/model-decisions/2026-07-03-*.md`
- modified `docs/domain-glossary.md`
- modified `docs/ontology-v1.md`
- modified `docs/model-diagram.md`
- modified `docs/model-evals/golden-scenarios.md`

Likely source/ownership:

- Domain-model governance and ontology cleanup work.

Risk:

- Medium. These docs constrain future schema/entity choices, so they should be
  reviewed for consistency before being treated as canonical.

Recommended action:

- Review as a dedicated "domain governance" bucket.
- Check for contradictions with `docs/design/ams_v2_*` before committing.

Do not:

- Treat every proposed preview concept as accepted without its model decision.

## Bucket 6: Autonomous Work Loop v0.5/v0.6 Artifacts

Representative files:

- `docs/autonomous-work-loop-v0-5-*.md`
- `docs/autonomous-work-loop-v0-6-*.md`
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md`
- modified `docs/autonomous-goal-directed-work-loop-v0.md`
- modified `.agents/skills/ams-agent-interface/SKILL.md`

Likely source/ownership:

- Work-loop continuation, runner, closeout, and agent-facing behavior updates
  from the prototype/control-plane line.

Risk:

- Medium. These may still matter for v1/prototype operation, but some may be
  superseded by v2 core workflow.

Recommended action:

- Review separately from v2 core.
- Keep the agent skill change if it still reflects current operating discipline.
- Archive or mark superseded docs only in a later explicit documentation cleanup.

Do not:

- Rewrite the AMS agent skill while cleaning v2 code unless the current task is
  specifically about agent workflow instructions.

## Bucket 7: Existing Prototype Control-Plane / Agent API Changes

Representative modified files:

- `scripts/ams-cli.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `src/lib/server/agent-capability-commands.js`
- `src/lib/server/agent-capability-manifest.spec.ts`
- `src/lib/server/agent-capability-playbooks.js`
- `src/lib/server/agent-current-context.ts`
- `src/lib/server/agent-goal-loop.ts`
- `src/lib/server/agent-run-results.ts`
- `src/lib/server/agent-work-packets.ts`
- `src/lib/server/ams-cli.spec.ts`
- `src/lib/server/ams-control-plane-mcp.spec.ts`
- `src/lib/server/goal-work-loop.ts`
- `src/lib/server/task-governance.ts`
- `src/routes/api/agent-goal-loop/[command]/+server.ts`

Observed representative diff:

- `scripts/ams-cli.mjs` adds operator-console, task-loop-report,
  materialize-suggested-task, managed-continuation-runner, and approval-related
  surfaces.
- `src/lib/server/agent-capability-commands.js` expands the manifest with
  task-loop readbacks, managed continuation, operator console, and approval
  commands.

Likely source/ownership:

- Prototype/v1 control-plane enhancements that predate or sit beside v2 core.

Risk:

- High. This is production/prototype behavior, not just docs. It touches agent
  capabilities, CLI/API contract, run results, governance, and tests.

Recommended action:

- Review in its own bucket before any commit.
- Run the relevant prototype/control-plane test suite before accepting.
- Do not mix with v2 core commits.

Do not:

- Revert these changes without understanding whether the current operator relies
  on them.

## Bucket 8: Existing Prototype UI Changes

Representative modified files:

- `src/lib/app-navigation.ts`
- `src/lib/components/Sidebar.svelte`
- `src/routes/app/autonomous-queue/+page.svelte`
- `src/routes/app/goals/[goalId]/+page.server.ts`
- `src/routes/app/goals/[goalId]/+page.svelte`
- `src/routes/app/governance/+page.svelte`
- `src/routes/app/runs/[runId]/+page.svelte`
- `src/routes/app/tasks/+page.server.ts`
- `src/routes/app/tasks/[taskId]/TaskDetailPageContent.svelte`
- related Svelte/server specs

Likely source/ownership:

- Prototype UI/operator-surface improvements, probably related to goal-loop,
  governance, task detail, and run detail affordances.

Risk:

- Medium-to-high. UI behavior should be checked visually or with browser tests
  before committing.

Recommended action:

- Review after control-plane changes, because UI likely depends on new server
  read models/actions.
- Keep separate from v2 route additions.

Do not:

- Assume UI edits are safe just because tests pass; visual inspection may still
  be needed.

## Bucket 9: Package Scripts

Representative file:

- `package.json`

Observed diff:

- Adds v2 import/core/preview scripts and smoke-test scripts.

Likely source/ownership:

- Cross-cutting support for v2 core, v2 preview, import, and work-loop smoke
  tests.

Risk:

- Low-to-medium. Small diff, but it links multiple buckets.

Recommended action:

- Commit with the bucket that first needs those scripts, or split into a small
  support commit before v2 core/preview commits.

Do not:

- Remove scripts before checking which accepted docs/tasks reference them.

## Bucket 10: Unknown Or Needs Operator Review

Representative areas:

- Any generated/runtime artifacts not shown in the tracked diff but present in
  untracked status.
- Any file that may contain local state, credentials, private customer notes, or
  machine-specific paths.
- Any untracked file whose purpose is not clear from name/path.

Risk:

- Unknown.

Recommended action:

- Inspect individually before staging.
- Ask operator before deleting, moving, committing, or publishing anything that
  may contain private local state.

Do not:

- Use broad cleanup commands.
- Use `git add .`.
- Use destructive git commands.

## Suggested Review / Commit Sequence

1. Commit current dogfood artifacts.
2. Review and commit v2 source-of-truth/design/stack docs.
3. Review and commit domain-governance/model-decision docs.
4. Review and commit v2 core runtime, CLI, routes, and tests.
5. Review v2 preview/import experiments and either commit or explicitly mark
   superseded.
6. Review prototype control-plane/API changes.
7. Review prototype UI changes.
8. Review autonomous-loop v0.5/v0.6 docs and skill updates.
9. Sweep unknown/generated/local artifacts with explicit operator approval.

This sequence keeps high-risk code separated from analysis artifacts and avoids
blending v2 core with older prototype affordance work.

## Immediate Next Cleanup Task

The best next cleanup task is:

Review v2 core runtime bucket for commit readiness.

Scope:

- inspect `scripts/v2-core-db.ts`, `src/lib/server/v2-core-*`,
  `src/routes/app/v2-core/*`, and associated specs;
- confirm validation commands;
- produce a commit-ready checklist;
- do not stage or commit until operator approves.

Reason:

- v2 core is the current system of record for the new version and has the most
  immediate value to stabilize.

## Result

This task did not modify existing source files, delete files, move files, stage
files, commit files, or implement code. The only repo change from this task is
this classification artifact.
