# Release Readiness

Use `npm run release:readiness` when a feature looks complete but the branch may still carry
repo-wide risk.

The report intentionally separates:

- feature readiness: targeted validation for the specific slice
- branch readiness: repo gates, unrelated worktree changes, and known release blockers

Example:

```bash
npm run release:readiness -- \
  --feature "Task detail dependency picker" \
  --scope src/lib/components/tasks/TaskDetailEditorForm.svelte \
  --scope 'src/routes/app/tasks/[taskId]/task-detail-page.svelte.spec.ts' \
  --feature-validation "task-detail browser spec passed" \
  --repo-gate "npm run check passed" \
  --output agent_output/release-readiness/task-detail-dependency-picker.md
```

If files outside the declared scope are modified, the report marks branch readiness as blocked
even when feature-specific validation passed. That keeps lint debt, generated artifacts, and
unrelated worktree changes from being mislabeled as feature failures.
