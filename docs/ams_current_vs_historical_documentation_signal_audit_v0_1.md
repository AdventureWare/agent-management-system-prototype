# AMS Current-Vs-Historical Documentation Signal Audit v0.1

Date: 2026-07-15
Status: Audit artifact

## Purpose

Identify where AMS documentation can mislead agents about what is current
direction versus historical evidence, and recommend the smallest changes needed
to keep broad AMS v2 work oriented.

This audit does not propose moving, deleting, renaming, or archiving files. The
docs directory is useful as evidence. The problem is weak status signaling.

## Files Inspected

- `AGENTS.md`
- `docs/README.md`
- `docs/ams_v2_current_operating_state.md`
- `docs/ams_goal_task_creation_guide.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_traceability_matrix.md`
- `docs/design/ams_v2_entity_cards.md`
- `docs/ams_capability_system_goal_project_mapping_v0_1.md`
- `docs/ams_top_level_mission_capability_goal_decision_v0_1.md`
- `docs/ams_owned_ai_external_ai_boundary_v0_1.md`
- `docs/v2_next_milestone_after_review_backlog_cleanup_v0_1.md`
- `docs/v2_continuous_goal_work_control_plan_v0_1.md`
- `docs/v2_owned_multi_goal_agent_execution_first_real_cycle_v0_1.md`
- representative `docs/v2_*`, `docs/autonomous-*`, and
  `docs/stack_assessment/*` filenames from `rg --files`.

## Recommended Reading Categories

### Current Orientation

These should be treated as first-read or live-orientation documents for broad
AMS v2 work:

- `AGENTS.md`
- `docs/ams_v2_current_operating_state.md`
- `docs/ams_goal_task_creation_guide.md`
- `docs/runtime-data-policy.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `docs/agent-facing-ams-interface-v0.md`

Why: these documents tell agents how to select work, preserve continuity, avoid
duplicate model expansion, and respect runtime state.

### Design Source Of Truth

These should be treated as source-of-truth design constraints, not current task
selection:

- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_traceability_matrix.md`
- `docs/design/ams_v2_entity_cards.md`
- `docs/design/ams_v2_design_bloat_audit.md`
- `docs/domain-model-governance-protocol-v0.1.md`
- `docs/domain-model.md`
- `docs/domain-glossary.md`
- `docs/model-diagram.md`

Why: these constrain entities, fields, relations, and anti-bloat behavior. They
do not decide the next task by themselves.

### Current Strategy / Alignment Evidence

These are recent strategic references. They should inform current work, but
live AMS state should decide what is active:

- `docs/ams_capability_system_goal_project_mapping_v0_1.md`
- `docs/ams_top_level_mission_capability_goal_decision_v0_1.md`
- `docs/ams_owned_ai_external_ai_boundary_v0_1.md`

Why: they clarified the long-term capability-system frame and the AMS versus
owned-AI boundary. They are not a replacement for `next-work`,
`goal-triage`, or the continuity audit.

### Historical Proof / Milestone Evidence

These should be treated as preserved evidence of completed or proposed slices
unless live AMS state points at them:

- `docs/v2_owned_multi_goal_agent_execution_first_real_cycle_v0_1.md`
- `docs/v2_first_manual_managed_provider_run_proof_v0_1.md`
- `docs/v2_first_real_dogfood_task_selection_v0_1.md`
- `docs/v2_cross_project_operator_control_closure_assessment_v0_1.md`
- `docs/v2_next_milestone_after_review_backlog_cleanup_v0_1.md`
- `docs/v2_next_milestone_after_cross_project_operator_control_v0_1.md`
- `docs/v2_next_milestone_after_minimal_slice_v0_1.md`
- `docs/v2_next_milestone_after_lifecycle_helper_v0_1.md`
- `docs/v2_next_implementation_milestone_selection_v0_1.md`
- `docs/autonomous-work-loop-v0-5-checkpoint.md`
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md`
- `docs/stack_assessment/*`

Why: these files remain useful as rationale and evidence, but many contain
phrases like "next milestone" or "next implementation" that are stale after the
associated goal or task is completed.

## Signal Problems Found

1. `docs/README.md` is a flat mixed list.
   Current orientation, design source-of-truth docs, historical proof docs,
   planning artifacts, cleanup plans, and old stack assessments are adjacent.
   This is searchable, but weak for agent orientation.

2. Many historical files use active-sounding names.
   Names such as `v2_next_milestone_*`, `next_implementation_steps`, and
   `*_plan_*` can look current even when they are preserved evidence.

3. Some documents include status text, but the index does not expose that
   status.
   Agents scanning only `docs/README.md` can miss that a file is a proof,
   selection artifact, planning artifact, closure assessment, or current
   orientation source.

4. `docs/ams_v2_current_operating_state.md` can itself become stale if its
   "Current Next Work" section is not updated after accepted tasks.
   This is acceptable only if agents also use live `next-work`,
   `goal-triage`, and `goal-continuity-audit` readbacks.

5. The docs directory still contains many cleanup-bucket plans.
   Those are useful for evidence and commit hygiene history, but they should
   not be treated as product direction unless reselected by live AMS state.

## Minimal Recommendations

1. Keep `docs/ams_v2_current_operating_state.md` as the first-read orientation
   source for broad AMS v2 work.

2. Keep `AGENTS.md` and `docs/README.md` pointing to that current-state source.
   This is already done.

3. Add lightweight status labels in `docs/README.md` over time, starting with
   high-traffic groups:
   `Current orientation`, `Design source of truth`, `Current strategy evidence`,
   `Historical proof`, and `Archive / cleanup evidence`.

4. Do not rename or move historical `v2_next_*`, `v2_*_proof_*`, or
   `*_cleanup_bucket_plan_*` files yet. Moving them would create churn and
   break references before there is a real retrieval/index need.

5. When a file contains "next milestone" or "next implementation" in its title,
   agents should verify live AMS state before acting on it.

6. Update `docs/ams_v2_current_operating_state.md` after this audit is accepted
   so its current-next-work section points to the real cross-project selection
   task rather than already-completed orientation work.

7. If confusion persists, create a small docs index grouping patch. Do not
   create a full docs taxonomy project unless agents continue selecting stale
   work after the current-state source is linked.

## Non-Recommendations

- Do not delete historical milestone artifacts.
- Do not move all old docs into an archive directory in this pass.
- Do not create frontmatter requirements for every existing doc.
- Do not create a new documentation ontology.
- Do not treat `docs/README.md` as the live project state source.
- Do not let any `v2_next_*` file override live AMS `next-work` output.

## Acceptance Check

The current orientation path is good enough if a new agent can:

1. read `AGENTS.md`;
2. open `docs/ams_v2_current_operating_state.md`;
3. run `next-work`, `goal-triage`, and `goal-continuity-audit`;
4. distinguish design source-of-truth docs from historical proof docs;
5. avoid acting on stale "next milestone" text unless live AMS state confirms
   it.

The current repo now satisfies the first three conditions. Conditions four and
five are improved by this audit, and can be strengthened later with a small
`docs/README.md` grouping patch if needed.
