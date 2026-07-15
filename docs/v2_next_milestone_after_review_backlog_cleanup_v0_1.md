# V2 Next Milestone After Review Backlog Cleanup v0.1

Date: 2026-07-15
Status: Selection artifact

## Purpose

Select the next AMS v2 milestone after closed historical review noise was removed from cross-project operator attention.

This is milestone selection only. It does not implement v2 features, add schema, add UI, add entities, create scheduler behavior, or introduce routing automation.

## Evidence Reviewed

- `goal-triage --project project_ams_v2_core`
- global `next-work`
- global operator-console readback
- `goal-continuity-audit --project project_ams_v2_core`
- `search-context --project project_ams_v2_core --query "real non-AMS work cross-project dogfood agent execution loop selected first task"`
- `docs/v2_owned_multi_goal_agent_execution_first_real_cycle_v0_1.md`
- `docs/v2_first_real_dogfood_task_selection_v0_1.md`
- `docs/v2_agent_preparation_real_work_dogfood_plan_v0_1.md`
- `docs/v2_cross_project_operator_control_closure_assessment_v0_1.md`
- `docs/v2_closed_submitted_artifact_classification_result_v0_1.md`

## Current State

AMS v2 now has a cleaner control-plane state:

- The long-term AMS v2 goal is the only active AMS v2 Core goal.
- The cross-project operator console is no longer dominated by closed imported v1 artifacts.
- Closed-task submitted artifacts are cleaned up.
- The remaining submitted artifacts are attached to open tasks.
- Global `next-work` exposes real non-AMS work from projects such as 3D Modeling and Game Development Learning, Kwipoo app, 3920 Silver Oak St., and Superstructure Program.
- The continuity audit for AMS v2 Core reports no idle active goals, stale current runs, or closure continuity warnings.

Prior completed milestones already proved smaller slices:

- first real non-AMS dogfood task through AMS v2;
- provider-linked execution-cycle launch for a real AMS v2 task;
- agent preparation packet use in real dispatched work;
- mobile/operator control and cross-project attention visibility;
- review backlog cleanup without deleting history.

## Candidate Directions

### 1. Run real cross-project work through AMS v2

Recommendation: accept as the next milestone.

Reason: this tests the actual long-term thesis: AMS v2 should be an owned local-first work operating layer, not only a database of plans or an AMS implementation tracker. The cleaned global queue now exposes real work. The next proof should use that queue to select, prepare, execute, review, and close real work across more than one non-AMS project.

### 2. Continue imported artifact cleanup

Recommendation: defer.

Reason: only 10 submitted imported path artifacts remain, all attached to open tasks. They should be handled when those tasks are selected, not as another broad cleanup milestone.

### 3. Build local model execution or automatic routing

Recommendation: defer.

Reason: routing and local execution matter later, but the system first needs repeated evidence that the existing Goal/Task/Run/Artifact/Review/Decision loop can drive real work across projects. Routing before that risks optimizing the wrong control surface.

### 4. Add a scheduler, worker pool, or multi-agent fanout

Recommendation: reject for now.

Reason: the desired behavior is continuous goal-directed work, but the next missing proof is operational discipline, not background autonomy. Scheduler machinery would add failure modes before the manual/agent-mediated loop is proven across real work.

### 5. Add more dashboards or governance review screens

Recommendation: defer.

Reason: the operator console and existing task/review affordances are enough for the next proof. More screens should follow observed friction, not precede it.

## Recommended Milestone

Create this next goal under `goal_ams_v2_owned_agent_system_long_term`:

`goal_ams_v2_real_cross_project_work_loop`

Title:

Run real cross-project work through AMS v2

Desired state:

AMS v2 can use the cleaned cross-project attention state to select, prepare, execute, review, and close useful work from multiple non-AMS projects while preserving bounded context, artifact evidence, decisions, and follow-up tasks.

This milestone should prove that AMS v2 is useful as an operating layer for real work, not only for building AMS itself.

## Success Criteria

The milestone is complete when:

- at least two real non-AMS tasks from different projects are selected from `next-work` or operator-console evidence;
- each selected task has a smallest-sufficient work packet or preparation readback before execution;
- each run records provider/tool dependence, inputs, outputs, validation, and closeout;
- each accepted output is attached as an artifact and reviewed through existing review state;
- follow-up work is created only when it is necessary and actionable;
- the result identifies whether AMS v2 reduced lost context, duplicate work, or manual orchestration friction;
- no schema, ontology, scheduler, routing, dashboard, or new entity expansion is introduced unless a later task explicitly justifies it.

## First Executable Task

Create this ready task under the new milestone:

`task_ams_v2_select_first_real_cross_project_work`

Title:

Select first real cross-project work candidate

Task contract:

Inspect the cleaned global operator console, `next-work`, submitted open-task artifacts, and relevant project/task context. Select one real non-AMS task to execute through AMS v2 first, with a short rationale, preparation needs, verification criteria, stop conditions, and closeout plan.

Success criteria:

- one non-AMS task is selected with project, goal, and task identifiers;
- the selected task is real work, not AMS implementation or cleanup meta-work;
- the selection explains why the task is useful, bounded, low-risk enough to run, and suitable for AMS dogfooding;
- preparation/context needs are stated without dumping broad project context;
- verification and stop conditions are explicit;
- no duplicate task, goal, entity, field, dashboard, scheduler, or routing abstraction is created.

Validation plan:

- run global `next-work`;
- run global operator-console;
- inspect the candidate task;
- run `agent-preparation-packet` if supported for the selected task;
- verify the selected task is open and actionable;
- record the selection as an artifact and create or identify the execution task that should run next.

## Deferred Questions

- Which two non-AMS domains should be used for the milestone: Kwipoo plus Silver Oak, Kwipoo plus 3D Modeling, or another pair exposed by the cleaned queue?
- Should the first real task be implementation-oriented, review-oriented, or evidence-capture-oriented?
- How much cross-repo filesystem access should the first run require?

These questions should be answered by the first executable task, not by expanding the domain model now.
