# Task Readiness, Autonomy, and Risk Metadata

AMS stores Autonomous Progress Loop v0 metadata on the existing task record. There is no duplicate task-like entity.

Task records and task templates support:

- `expectedOutcome`: what should be true when the task is complete.
- `scope`: files, areas, project sections, or artifacts in bounds.
- `nonGoals`: work the agent should not do.
- `successCriteria`: acceptance criteria.
- `validationSteps`: tests, commands, manual checks, screenshots, artifacts, or review steps.
- `readinessLevel`: `R0_IDEA`, `R1_FRAMED`, `R2_SPECIFIED`, `R3_EXECUTABLE`, `R4_REVIEWABLE`, or `R5_AUTOMATABLE`.
- `autonomyLevel`: `A0_HUMAN_ONLY`, `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`, `A2_AGENT_MAY_DRAFT_ARTIFACTS`, `A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE`, `A4_AGENT_MAY_CREATE_REVIEWABLE_DIFF_OR_PR`, or `A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE`.
- `riskLevel`: `low`, `medium`, `high`, or `critical`.
- `blockedReason`: blocker text. Blocked task filters treat either `status === "blocked"` or blocker text as blocked.
- `allowedActionNames`: v0 free-form allowed action/tool labels.
- `reviewRequirement`: `NONE`, `SUMMARY_REVIEW`, `DIFF_REVIEW`, or `EXPLICIT_APPROVAL_REQUIRED`.

Legacy tasks are normalized with conservative defaults: `R1_FRAMED`, `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`, and `SUMMARY_REVIEW` unless existing review/approval fields imply otherwise.

The task list exposes filters for readiness, autonomy, risk, and blocked/unblocked state. Use the readiness and risk filters together to find R3/R4 low- or medium-risk work.

The task API accepts the same fields on create/update. `GET /api/tasks` also supports `readinessLevel`, `autonomyLevel`, `riskLevel`, and `blocked=true|false` filters.
