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

## Scenario 5: Evaluation Evidence Supports Dependency Reduction

1. AMS defines a reusable evaluation scenario for a capability such as local retrieval, work-packet construction, or source-linked task summarization.
2. A task run or tool execution produces evidence.
3. AMS records an evaluation result against the scenario, linking the relevant task/run/tool evidence.
4. The result stores status, score or rubric summary, result summary, and failure summary when applicable.
5. A later decision or dependency-reduction record cites the evaluation result instead of relying on anecdotal impressions.

Model check: EvaluationScenario and EvaluationResult should not replace task Run, Review, Approval, or Decision. They provide scored evidence that those records may cite.

## Scenario 6: Routing Rationale Is Inspectable Before Execution

1. A task requires a capability such as coding, retrieval, summarization, or review.
2. AMS records a preview routing decision that names the selected or proposed provider/model route.
3. The record explains the decision basis, selected reason, rejected alternatives, and relevant privacy, cost, or risk constraints.
4. The routing decision appears in the task work packet before or after a run, so an agent can see why a route was chosen.
5. A later run records what actually happened, and evaluation evidence can confirm whether the route was good enough.

Model check: RoutingDecision should not replace `Decision`, `Run`, `Provider`, `Model`, or `EvaluationResult`. It records task-specific routing rationale and remains preview-only until governance accepts, merges, or rejects the concept.

## Scenario 7: External AI Dependency Reduction Is Evidence-Linked

1. AMS identifies an external affordance such as project recap, code review, source search, or task planning.
2. AMS records evaluation results and routing decisions that show whether local or owned workflows are becoming viable.
3. AMS records a dependency-reduction status for the relevant capability or affordance.
4. The record cites evidence and explains the current replacement status.
5. A later decision can use the record to prioritize local capability work or continue using an external provider.

Model check: DependencyReductionRecord should not replace `EvaluationResult`, `RoutingDecision`, `Decision`, `Provider`, or `Capability`. It summarizes replacement progress and remains preview-only until governance accepts, splits, merges, or rejects the concept.

## Scenario 8: Memory Is Governed Before Retrieval

1. A run, decision, evaluation, or dependency-reduction record produces reusable knowledge.
2. AMS records a memory item with draft/proposed/published/archived/superseded status.
3. The memory item cites source evidence instead of relying on chat context.
4. A task work packet may include task-linked memory and project-scoped proposed/published memory.
5. Project-scoped draft memory does not become trusted task context automatically.

Model check: MemoryItem should not replace `Decision`, `Run`, `Skill`, `Artifact`, project memory prose, or transcript storage. It is governed reusable knowledge and remains preview-only until governance accepts, splits, merges, or rejects the concept.

## Scenario 9: Review And Approval Govern Preview Evidence

1. AMS creates preview evidence such as a run, memory item, routing decision, evaluation result, or dependency-reduction record.
2. AMS records a review against the task and optionally the run.
3. AMS records an approval when permission is needed for a risky action or state transition.
4. The records appear in the task work packet with provenance.
5. Recording review or approval does not silently complete the task, publish memory, apply changes, or execute tools.

Model check: Review and Approval are already accepted concepts. The preview slice should prove write behavior without creating a parallel governance model.

## Scenario 10: A Task Is Inspectable As One Vertical Slice

1. AMS has a task with linked run, artifact, decision, review, approval, tool execution, evaluation result, routing decision, dependency-reduction record, and memory item.
2. AMS can read one report for the task that summarizes record counts, latest linked records, provenance, and optional search results.
3. The report is generated from existing read models and does not write state.
4. Missing search index state is reported without making the task context unreadable.
5. The report helps a human or agent decide what to inspect next before adding UI or automation.

Model check: The report is a read model, not a new domain entity. It should reveal whether existing entities compose cleanly instead of hiding gaps behind another abstraction.

## Scenario 11: A Human Can Inspect V2 Preview State Without Mutation

1. AMS has an isolated preview database.
2. A human opens a local read-only preview surface.
3. The page shows overview metrics, a selected task, work-packet readiness, vertical-report counts, provenance, status counts, and search samples.
4. If the preview database is missing, the page reports the unavailable state without creating storage.
5. The page does not expose write actions, rebuild indexes, launch tools, run agents, or migrate runtime data.

Model check: The UI is a read surface over existing services. It should not define new workflow states, duplicate domain concepts, or become the source of truth.

## Scenario 12: A Human Records Preview Review Evidence From The UI

1. AMS has an isolated preview database and a selected task.
2. A human records a review summary through the local preview surface.
3. AMS writes a preview review with `ams-v2-preview` provenance.
4. The refreshed report shows the increased review count and latest review id.
5. The action does not complete the task, publish memory, rebuild search, launch tools, run agents, or migrate runtime data.

Model check: This is an explicit governance write using the accepted `Review` concept. It should not create a parallel approval/review workflow or turn the preview UI into a general task editor.

## Scenario 13: A Human Records Preview Decision Evidence From The UI

1. AMS has an isolated preview database and a selected task.
2. A human records a decision summary through the local preview surface.
3. AMS writes a preview decision with `ams-v2-preview` provenance and default `preview_decision` type.
4. The refreshed report shows the increased decision count and latest decision id.
5. The action does not change task status, approve work, publish memory, rebuild search, launch tools, run agents, or migrate runtime data.

Model check: This is an explicit governance write using the accepted `Decision` concept. It should complement review without becoming a generic notes system or task editor.

## Scenario 14: A Human Reads A Task Evidence Timeline

1. AMS has a selected task with runs, reviews, approvals, decisions, artifacts, and optional preview context records.
2. The preview surface composes those records into one timeline.
3. Dated records sort chronologically.
4. Undated artifact records remain visible without inventing timestamps.
5. A human can filter the timeline by evidence, governance, memory, routing/evaluation/tool, and dependency-reduction categories.
6. The timeline does not write state or create a persisted `Timeline` entity.

Model check: The timeline is a read-side presentation of existing evidence records. It should make the current model easier to inspect without becoming a new workflow or source of truth.

## Scenario 15: A Human Reads Grouped Preview Search Results

1. AMS has a selected task and a populated preview search index.
2. The preview surface shows search results grouped by linked task.
3. Within each task group, results are grouped by record type such as task, run, decision, artifact, tool execution, evaluation result, routing decision, dependency-reduction record, or memory item.
4. The grouping uses existing search result fields and does not create a persisted search-group entity.
5. Results from other tasks remain visible but clearly separated from the selected task.

Model check: Search grouping is a read-side navigation aid over existing task-linked evidence. It should not redefine task membership, provenance, retrieval ranking, or accepted domain concepts.

## Scenario 16: A Human Copies A Bounded Agent Handoff Packet

1. AMS has an isolated preview database and a selected task with a work packet.
2. The preview surface renders a handoff packet for the selected task.
3. The packet includes task state, execution contract, requirements, linked evidence counts, latest records, dependencies, provenance, and preview boundaries.
4. The packet is copyable for use in an agent session.
5. Rendering or copying the packet does not write state, create a session log, launch an agent, execute a tool, or persist a prompt artifact.

Model check: The handoff packet is a read-side projection over existing task/work-packet/report data. It should improve agent context transfer without becoming a new source of truth or parallel session system.

## Scenario 17: A Human Checks Preview Health Before Inspection

1. AMS has an isolated preview database.
2. The preview surface shows the DB path currently being inspected.
3. The surface shows imported/preview source counts from existing provenance metadata.
4. The surface shows whether the preview search index is ready, missing, or errored.
5. A missing search index is visible as a warning without preventing task inspection.
6. The health panel does not rebuild search, create storage, write state, launch tools, or define a durable health entity.

Model check: Preview health is operational read-side metadata over existing storage. It should make the console safer to use without becoming product state or an automatic repair workflow.
