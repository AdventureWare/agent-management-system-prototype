# AMS Model Golden Scenarios

Date: 2026-07-01
Status: Draft seed

Use these scenarios to test whether the domain model supports real AMS workflows without adding speculative constructs.

## Scenario 1: Vague Goal Becomes Actionable Work

1. User captures a vague goal for AMS.
2. AMS records it as a `Goal` with incomplete success criteria.
3. AMS creates or recommends clarification/planning `Task` records instead of inventing a new planning system.
4. A run produces evidence and proposed updates.
5. Review accepts the useful updates.
6. The goal, task, run, review, and decision state explain what changed and why.

Model check: No new entity should be needed merely to represent uncertainty; use existing task, blocker, run evidence, review, and decision constructs unless a proposal shows a concrete gap.

## Scenario 2: Agent Encounters A Possible New Field

1. An implementation agent thinks `confidenceScore` would help rank tasks.
2. The agent checks the glossary, ontology, current task fields, readiness, rigor, priority, blockers, and run-result preview helpers.
3. The agent creates a model change proposal instead of adding a field directly.
4. The proposal asks which workflow/query/decision the score supports and whether existing constructs are sufficient.
5. Review decides to reject, defer, mark experimental, or accept.

Model check: Candidate concepts can be explored without becoming durable schema.

## Scenario 3: Completed Work Produces An Artifact

1. A task is executed through a managed agent run.
2. The run records result summary, validation, blockers, and follow-up recommendations.
3. Output files are attached to the task or referenced as artifacts.
4. Review uses the task detail or governance surface, not the run as the final decision surface.
5. Accepted evidence informs a decision record or project memory update when direction changes.

Model check: Run evidence, review, approval, task state, and decisions stay separate.

## Scenario 4: Duplicate Concept Detected

1. A task proposes a new `Milestone` entity.
2. The reviewer checks `Goal`, project memory, task hierarchy, and current milestone guidance.
3. The proposal is rejected or merged into `Goal` because AMS already uses `Goal` for desired future states and milestone-like outcomes.
4. Docs and instructions are updated if the duplicate keeps recurring.

Model check: The protocol prevents duplicate systems for goals, tasks, workflows, reviews, approvals, skills, planning, and milestones.

