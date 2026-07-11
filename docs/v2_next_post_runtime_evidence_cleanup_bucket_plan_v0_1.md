# V2 Next Post-Runtime-Evidence Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Exact staging plan; not staged

## Purpose

Select the next small cleanup bucket after commit `985a59f Add AMS v2 runtime cleanup evidence`.

This plan is documentation-only. It does not authorize staging application code, runtime data, preview/import implementation, autonomous-loop implementation, or broad documentation indexes.

## Current Evidence

- Latest committed cleanup bucket: `985a59f Add AMS v2 runtime cleanup evidence`.
- `git diff --cached --name-only` returned no paths.
- `git status --short` still shows a mixed dirty tree:
  - modified prototype/control-plane code and UI;
  - modified prototype/control-plane docs;
  - untracked autonomous-loop docs;
  - untracked v2 preview/import implementation files;
  - untracked model-change proposals and model decisions;
  - remaining untracked v2 milestone/evidence docs.
- `git diff --stat` still shows 59 modified tracked files with 3,587 insertions and 249 deletions.

## Selected Bucket

Stage the model-governance docs for v2 preview concept graduation and minimal concept acceptance.

Reason:

- These files are docs-only.
- They explain which preview concepts were accepted, rejected, or kept experimental.
- They update the canonical model references consistently: glossary, ontology, diagram, domain-model source map, and golden scenarios.
- They reduce future bloat risk by preserving the distinction between accepted minimal concepts, preview-only storage, and deferred production schema.
- They are separable from implementation files and from the broader docs index.

## Included Paths

Stage exactly these paths:

```text
docs/domain-glossary.md
docs/domain-model.md
docs/model-diagram.md
docs/model-evals/golden-scenarios.md
docs/ontology-v1.md
docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md
docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md
docs/model-change-proposals/0003-preview-routing-decision.md
docs/model-change-proposals/0004-preview-dependency-reduction-record.md
docs/model-change-proposals/0005-preview-memory-item.md
docs/model-change-proposals/0006-preview-review-approval-recording.md
docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md
docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md
docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md
docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md
docs/model-decisions/2026-07-03-accept-minimal-model-concept.md
docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md
docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md
docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md
docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md
docs/model-decisions/2026-07-03-v2-preview-concept-graduation-review.md
docs/v2_next_post_runtime_evidence_cleanup_bucket_plan_v0_1.md
```

## Exact Staging Command

```sh
git add docs/domain-glossary.md \
  docs/domain-model.md \
  docs/model-diagram.md \
  docs/model-evals/golden-scenarios.md \
  docs/ontology-v1.md \
  docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md \
  docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md \
  docs/model-change-proposals/0003-preview-routing-decision.md \
  docs/model-change-proposals/0004-preview-dependency-reduction-record.md \
  docs/model-change-proposals/0005-preview-memory-item.md \
  docs/model-change-proposals/0006-preview-review-approval-recording.md \
  docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-model-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md \
  docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md \
  docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md \
  docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md \
  docs/model-decisions/2026-07-03-v2-preview-concept-graduation-review.md \
  docs/v2_next_post_runtime_evidence_cleanup_bucket_plan_v0_1.md
```

## Expected Cached Path List

After staging, `git diff --cached --name-only` should return exactly:

```text
docs/domain-glossary.md
docs/domain-model.md
docs/model-diagram.md
docs/model-evals/golden-scenarios.md
docs/ontology-v1.md
docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md
docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md
docs/model-change-proposals/0003-preview-routing-decision.md
docs/model-change-proposals/0004-preview-dependency-reduction-record.md
docs/model-change-proposals/0005-preview-memory-item.md
docs/model-change-proposals/0006-preview-review-approval-recording.md
docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md
docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md
docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md
docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md
docs/model-decisions/2026-07-03-accept-minimal-model-concept.md
docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md
docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md
docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md
docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md
docs/model-decisions/2026-07-03-v2-preview-concept-graduation-review.md
docs/v2_next_post_runtime_evidence_cleanup_bucket_plan_v0_1.md
```

## Excluded Paths

Do not stage these in this bucket:

- `docs/README.md`
- `.agents/*`
- `docs/autonomous-*`
- `docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md`
- `docs/stack_assessment/v2_preview_*`
- `docs/v2_*`
- `scripts/*`
- `src/*`

`docs/README.md` is excluded because its current diff indexes several broader v2 and autonomous-loop docs that remain in separate cleanup buckets. This bucket should only commit the model-governance source-of-truth set.

## Validation Before Commit

Before committing:

1. Run `git diff --cached --name-only`.
2. Confirm the path list exactly matches the expected cached path list above.
3. Run `git diff --cached --stat`.
4. Confirm the staged diff is docs-only.
5. Inspect representative staged docs:
   - `docs/domain-glossary.md`
   - `docs/ontology-v1.md`
   - `docs/model-decisions/2026-07-03-v2-preview-concept-graduation-review.md`
6. Confirm no code, runtime data, preview/import implementation, autonomous-loop implementation, or broad docs index path is staged.

## Suggested Commit Message

```text
Add AMS v2 model governance decisions
```

## Next Task

Create or run a follow-up task to stage exactly this bucket, verify the cached set, and stop before committing.
