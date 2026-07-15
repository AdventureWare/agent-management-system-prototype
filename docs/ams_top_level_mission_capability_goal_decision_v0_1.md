# AMS Top-Level Mission / Capability Goal Decision v0.1

Date: 2026-07-15
Status: Operator decision packet

## Purpose

Decide whether AMS should add explicit top-level goals above the current AMS v2 long-term goal:

- Goal 0: Contribute to Long-Term Thriving
- Goal 1: Expand Colin's Sustainable Goal-Achievement Capacity

This packet does not create those goals. It prepares the decision and recommended wording.

## Evidence Used

- `docs/ams_capability_system_goal_project_mapping_v0_1.md`
- Current AMS v2 active goals
- `docs/ams_goal_task_creation_guide.md`
- Current long-term goal: `goal_ams_v2_owned_agent_system_long_term`
- Current Superstructure parent: `goal_superstructure_program`
- Current real-project proof goal: `goal_ams_v2_real_cross_project_work_loop`

## Decision Needed

Should AMS add an explicit top-level mission and a personal capability-system parent goal?

Recommended answer: yes, but only as deliberate goal-state correction after operator approval.

Reason: the current graph has strong project-level and system-level goals, but it starts too low. It has AMS, Superstructure, Kwipoo, Silver Oak, and other projects, but it does not explicitly encode the higher-level reason they matter or the distinction between mission, capability system, AMS, owned AI, external AI, Superstructure, and real applications.

## Proposed Goal 0

Title:

Contribute to Long-Term Thriving

Desired future state:

Humanity and other living beings possess increasingly viable conditions for long-term survival, agency, learning, exploration, beauty, joy, meaning, peaceful coexistence, and continued development, while catastrophic collapse, coercive domination, needless suffering, and destructive resource use are reduced.

Concise mission expression:

Prevent societal collapse, contribute to long-term human thriving, and have a great time doing it.

Function:

This is the highest-level directional goal. It should not be treated as a normal completable implementation milestone. It supplies direction for project selection, prioritization, tradeoffs, and strategy revision.

Constraints:

- Do not treat one rigid ideology as the completed definition of thriving.
- Continually revise the operative model as knowledge improves.
- Preserve plurality where compatible with shared reality and acceptable cross-boundary effects.
- Distinguish the mission from any current strategy.
- Do not equate any current project with the mission itself.

Recommendation:

Create this as a top-level active goal only if the operator explicitly approves the wording.

## Proposed Goal 1

Title:

Expand Colin's Sustainable Goal-Achievement Capacity

Desired future state:

Colin can reliably pursue many complex, long-running goals despite limited money, time, human collaborators, and personal cognitive bandwidth by combining clear goals, persistent project state, reliable knowledge, appropriate tools, external AI, owned AI, automation, validation, and feedback.

The resulting system materially increases the amount, quality, continuity, and complexity of work one person can accomplish without creating unmanageable administrative or maintenance burden.

Function:

This goal should sit below Goal 0 and above system-building/application goals. It is the parent for the capability-system strategy.

Success conditions:

- Important goals and projects have durable identity and current state.
- Relevant context does not depend primarily on Colin remembering or restating it.
- Work can continue across devices, chats, agents, and sessions.
- Agents can reconstruct what exists, what matters, and what should happen next.
- Delegated work produces reviewable evidence rather than merely plausible output.
- Colin's required supervision per validated unit of work declines.
- The system remains affordable and increasingly independent of external providers.
- Administrative structure grows only when it demonstrably improves work.

Recommendation:

Create this as an active child of Goal 0 if Goal 0 is approved. Reparent current major strategy goals under it only through a separate, explicit reconciliation task.

## Existing Matches

| Proposed goal | Existing match | Assessment |
| --- | --- | --- |
| Goal 0 | none explicit | Missing. Some project motivation implies it, but no durable goal exists. |
| Goal 1 | `goal_ams_v2_owned_agent_system_long_term` partially | Current AMS goal covers one critical subsystem, not the whole personal capability system. |
| Goal 1A AMS | `goal_ams_v2_owned_agent_system_long_term` | Strong match. Preserve. |
| Goal 2 Superstructure | `goal_superstructure_program` | Strong match. Preserve. |
| Goal 3 real projects | `goal_ams_v2_real_cross_project_work_loop` plus active project goals | Partial active proof. Continue. |

## Risks If Added

- The top of the graph could become abstract and non-actionable if no child goals/tasks remain connected to it.
- Agents may try to turn the mission into a task or milestone.
- Poor wording could hardcode values too rigidly.
- Reparenting many projects too quickly could create churn.

Mitigations:

- Add only Goal 0 and Goal 1 first.
- Keep existing project and subsystem goals unchanged initially.
- Add a rule that Goal 0 is directional and not expected to be completed.
- Reparent or link major goals in a later explicit pass.

## Risks If Not Added

- AMS continues to start at implementation/system goals and loses the reason projects matter.
- Agents may over-focus on AMS maintenance.
- Owned AI, external AI, Superstructure, and real projects remain connected only implicitly.
- Prioritization across projects stays weaker than it needs to be.

## Recommended Action

Recommended decision:

Approve adding Goal 0 and Goal 1 as explicit top-level goals, but do not perform mass reparenting in the same action.

Recommended next task after approval:

Create Goal 0 and Goal 1, then create a separate mapping/reparenting proposal for current active top-level goals:

- AMS v2 Core long-term goal
- Superstructure Program
- Kwipoo / real application goals
- owned-AI/external-AI boundary work
- knowledge/tool substrate work

If approval is not given:

Keep `goal_ams_v2_owned_agent_system_long_term` as the current live parent and use `docs/ams_capability_system_goal_project_mapping_v0_1.md` as noncanonical strategy context.

## Decision Status

Pending operator approval.

This task should be considered complete as a decision packet, not as authorization to create Goal 0 or Goal 1.
