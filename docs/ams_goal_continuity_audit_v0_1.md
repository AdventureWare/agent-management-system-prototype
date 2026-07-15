# AMS Goal Continuity Audit v0.1

Date: 2026-07-15
Status: Current corrective-action audit

## Purpose

This audit checks whether AMS v2 project and goal state can keep human and
computer agents aligned. It follows the rules in
`docs/ams_goal_task_creation_guide.md`.

This is not a product-roadmap review. It is a continuity review: can each
active project tell an agent what long-term goal exists, what work is active,
what is paused or blocked, and what should happen next?

## Sources

- `data/v2-core.sqlite`
- `npm run v2:core-db -- overview --json`
- `npm run v2:core-db -- goal-triage --project project_ams_v2_core --json`
- `npm run v2:core-db -- next-work --project project_ams_v2_core --limit 10 --json`
- direct SQLite read-only queries over `v2_core_projects`, `v2_core_goals`,
  `v2_core_tasks`, and `v2_core_runs`
- `docs/v2_requirements_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- imported v1 long-term goal evidence:
  `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`

## Corrective Action Already Applied

The v1 long-term AMS goal had been preserved as imported evidence but marked
`superseded`, while all AMS v2 milestone goals were later completed. That left
AMS v2 with no active implementation path.

The following v2 goals now repair that immediate gap:

- `goal_ams_v2_owned_agent_system_long_term`:
  `Build an owned local-first agent operating layer`
- `goal_ams_v2_goal_continuity_corrective_action`:
  `Prevent goal drift and silent long-term goal loss`
- `task_ams_v2_goal_continuity_audit_and_invariant_plan`:
  `Define goal-continuity invariants and audit current projects`

`goal-triage --project project_ams_v2_core` now shows the corrective sub-goal
as active and the long-term parent goal as active with open child work.

## Current Project Continuity Snapshot

| Project | Goals | Active goals | Open goals | Open tasks | Continuity status |
| --- | ---: | ---: | ---: | ---: | --- |
| 3920 Silver Oak St. | 13 | 2 | 13 | 3 | workable; has active goal and blocked/ready work |
| 3D Modeling and Game Development Learning | 9 | 2 | 7 | 1 | workable; has ready task |
| AMS v2 Core | 33 | 2 | 2 | 1 | repaired; active long-term parent and corrective sub-goal exist |
| AdventureWare Website | 0 | 0 | 0 | 0 | empty active container; needs operator decision |
| AdventureWare, LLC. | 0 | 0 | 0 | 0 | empty active container; needs operator decision |
| Agent Management System Prototype | 15 | 1 | 10 | 1 | legacy/imported state; needs cleanup after v2 direction settles |
| Animal Welfare Monitoring System | 2 | 0 | 2 | 0 | idle open goals; needs continuation task or pause decision |
| Content_OS | 1 | 0 | 1 | 0 | idle open goal; needs continuation task or pause decision |
| Emergence Project | 1 | 0 | 1 | 0 | idle open goal; needs clarification or pause decision |
| Imported v1 unassigned work | 0 | 0 | 0 | 0 | empty generated container; likely archive/keep hidden |
| Inocrowd Textile Analysis Challenge Project | 2 | 0 | 2 | 0 | idle open goals; likely archive if challenge is no longer active |
| Kwipoo | 3 | 0 | 2 | 0 | parent project has no active work; child projects carry work |
| Kwipoo Finance | 0 | 0 | 0 | 0 | empty active container; needs operator decision |
| Kwipoo Marketing and Sales | 0 | 0 | 0 | 0 | empty active container; needs operator decision |
| Kwipoo app | 2 | 1 | 2 | 6 | workable; has ready app tasks |
| Kwipoo website | 3 | 0 | 3 | 0 | idle open goals; needs continuation task or pause decision |
| Life Project | 3 | 0 | 3 | 0 | idle open goals; needs operator decision |
| Personal Knowledge | 2 | 0 | 2 | 0 | idle open goals; needs continuation task or pause decision |
| Reality-Modeling Intelligence Framework | 1 | 0 | 1 | 0 | idle open goal; may overlap Superstructure program |
| Sitcom World | 2 | 0 | 2 | 0 | idle open goals; needs continuation task or pause decision |
| Superstructure Ontology / Reality-Modeling Framework | 12 | 0 | 10 | 0 | likely superseded by Superstructure Program; needs reconciliation |
| Superstructure Program | 7 | 7 | 7 | 1 | mostly workable; one ready task, several active idle workstreams |

## Findings

### 1. The AMS v2 long-term goal was not live

Severity: high.

The long-term goal existed in docs and imported v1 state, but not as the active
parent goal that current AMS v2 work advanced. This has now been corrected for
AMS v2 Core.

Required follow-up: implement a continuity check so completing a milestone
cannot leave a project without an active successor path.

### 2. Several active projects are empty containers

Severity: medium.

These projects have no goals and no tasks:

- `AdventureWare Website`
- `AdventureWare, LLC.`
- `Imported v1 unassigned work`
- `Kwipoo Finance`
- `Kwipoo Marketing and Sales`

These may be intentional containers, but AMS should not treat them as active
work without either goals or an explicit "empty by design" decision.

Recommended cleanup: ask the operator whether each should be paused, archived,
or given one long-term/current goal.

### 3. Several projects have open goals but no active goals or open tasks

Severity: medium.

Examples:

- `Animal Welfare Monitoring System`
- `Content_OS`
- `Emergence Project`
- `Inocrowd Textile Analysis Challenge Project`
- `Kwipoo website`
- `Life Project`
- `Personal Knowledge`
- `Reality-Modeling Intelligence Framework`
- `Sitcom World`
- `Superstructure Ontology / Reality-Modeling Framework`

These are not necessarily wrong. They are ambiguous. An agent cannot know
whether to resume, pause, archive, or decompose them without an explicit
decision.

Recommended cleanup: create a project-level triage task for each project the
operator wants active. Pause or archive the rest.

### 4. Superstructure has overlapping project containers

Severity: medium.

There is both:

- `Superstructure Ontology / Reality-Modeling Framework`
- `Superstructure Program`

The program container appears to be the newer operating structure. The older
ontology project still has open goals but no open work.

Recommended cleanup: reconcile the older ontology project into the current
Superstructure Program before agents resume that work.

### 5. Some active goals have no open work

Severity: low to medium.

Within `Superstructure Program`, these active goals have no open tasks and no
active child goals:

- `Develop and stabilize the Superstructure Ontology`
- `Develop dynamics and simulation planning`
- `Maintain epistemic and evidence discipline`
- `Maintain shared validation and tooling support`
- `Operationalize Superstructure through AMS and owned-AI workflows`

This may be acceptable if another ready task is intentionally the current
program focus. It still creates ambiguity for autonomous continuation.

Recommended cleanup: either create a continuation task for each active
workstream or pause workstreams that are not currently intended to run.

### 6. Stale running/planned runs exist

Severity: medium.

Read-only query found runs with `running` or `planned` status linked to done or
canceled tasks, including imported Silver Oak and prototype tasks. This can
mislead agents about what is actually in progress.

Recommended cleanup: create a dedicated stale-run reconciliation task. Do not
bulk-close runs without preserving import/source evidence.

## Minimum System Rules To Prevent Recurrence

1. Active projects need either an active goal path or an explicit paused/archive
   decision.
2. Long-term goals may not be superseded without an active successor or
   operator-approved archival decision.
3. Milestone completion must create/select next work or explain why no next work
   is appropriate.
4. Active goals with no open tasks and no active child goals should appear in
   triage as needing continuation, pause, block, or completion decision.
5. Done/canceled tasks should not have current `running` or `planned` runs
   unless those runs are marked as imported historical residue.
6. Agents must read the current goal/task guide before creating or closing
   goals and tasks.

## Recommended Cleanup Sequence

### Step 1: Implement a continuity readback/check

Add a lightweight read model or CLI command that reports:

- active projects with no goals;
- active projects with no active/open goal path;
- active goals with no open tasks and no active child goals;
- completed/superseded goals with no successor/parent rationale;
- running/planned runs attached to closed tasks.

This is a check/report first. Do not add a heavy approval workflow.

### Step 2: Clean empty project containers

For each empty active project, record one of:

- keep as intentional empty container;
- pause/archive until the operator creates a real goal;
- create a real long-term/current goal.

### Step 3: Reconcile stale runs

Close or classify stale imported `running`/`planned` runs so next-work and
operator surfaces do not imply old work is currently executing.

### Step 4: Project-by-project goal cleanup

For each idle open project, choose:

- create a continuation task;
- decompose into sub-goals;
- pause with reason;
- mark completed with evidence;
- supersede with successor.

### Step 5: Make closeout enforce continuity

Before task or goal closeout, require readback of:

- parent goal status;
- next active task/sub-goal;
- blocker/pause/done rationale if no next work exists.

## Next Action

The next implementation task should be:

`Add v2 goal-continuity audit command`

Success criteria:

- CLI reports empty active projects, idle active goals, stale current runs, and
  completed/superseded goals that need successor or archival rationale.
- The report is read-only.
- Existing `goal-triage` and `next-work` behavior remains unchanged except for
  any explicit bug fix covered by tests.
- The command is covered by focused tests using a small fixture database.

This task advances the corrective goal without turning AMS into a governance
app. It gives agents and humans a reliable warning surface before project state
drifts.

## Implementation Note

Implemented after this audit as:

```text
npm run v2:core-db -- goal-continuity-audit --json
npm run v2:core-db -- goal-continuity-audit --project <project-id> --json
```

The command is read-only and reports the risk categories above from existing
v2 core records. It does not mutate goals, tasks, runs, or projects.

## Cleanup Pass Note

Cleanup pass run: 2026-07-15.

Before cleanup, the read-only command reported:

- empty active projects: 5
- active projects without open goal path: 5
- idle active goals: 5
- stale current runs: 4
- closure continuity warnings: 35

After cleanup, it reported:

- empty active projects: 0
- active projects without open goal path: 0
- idle active goals: 0
- stale current runs: 3
- closure continuity warnings: 35

Changes made:

- Added paused clarification goals for the five empty active containers:
  AdventureWare Website, AdventureWare LLC, Imported v1 unassigned work,
  Kwipoo Finance, and Kwipoo Marketing and Sales.
- Added ready review/continuity tasks for the five active Superstructure
  workstreams that had completed history but no open work.
- Completed the one stale planned AMS provider run that the current service can
  safely transition.
- Classified the three imported `running` stale runs as historical residue with
  decisions on their original tasks/runs, without direct database edits.

Residual issues after this cleanup pass:

- The raw audit still reports the three imported `running` residues because the
  supported completion helper only transitions `planned` runs. A follow-up
  should either add a supported legacy-run reconciliation path or teach the
  audit to recognize explicit stale-run classification decisions.
- The closure warnings remain because many completed or superseded historical
  goals are not linked to an active parent/successor path. That should be a
  separate archival/successor reconciliation pass, not bulk-edited blindly.

## Archival Reconciliation Note

Archival reconciliation pass run: 2026-07-15.

The read-only audit now treats completed/superseded goals with a goal-scoped
`goal_archival_classification` or `goal_successor_classification` decision as
classified closure goals, not unresolved continuity warnings. This uses the
existing `Decision` entity and does not add a schema field, status, lifecycle,
or workflow.

Before archival reconciliation, the audit reported:

- closure continuity warnings: 35
- classified closure goals: 0

After archival reconciliation, it reported:

- closure continuity warnings: 0
- classified closure goals: 35

Changes made:

- Recorded goal-scoped `goal_archival_classification` decisions for 31
  completed AMS v2 milestone/capability goals. These are preserved as
  historical milestone evidence while current AMS v2 direction continues under
  `goal_ams_v2_owned_agent_system_long_term` and
  `goal_ams_v2_goal_continuity_corrective_action`.
- Recorded goal-scoped `goal_archival_classification` decisions for four
  imported prototype legacy goals. These remain historical v1 evidence and
  should not be treated as active v2 project direction unless explicitly
  reopened.

Remaining continuity issue after this pass:

- Three imported `running` run residues remained in the raw stale-run audit.
  They already had classification decisions, but the read-only audit still
  reported raw run status because it did not yet recognize stale-run
  classification decisions.

## Stale-Run Classification Recognition Note

Stale-run classification recognition pass run: 2026-07-15.

The read-only audit now treats planned/running runs attached to closed tasks
with a run-scoped `stale_run_classification` decision as classified stale runs,
not unresolved stale current runs. This uses the existing `Decision` entity and
does not add a schema field, status, lifecycle, or workflow.

Before stale-run classification recognition, the audit reported:

- stale current runs: 3
- classified stale runs: 0

After stale-run classification recognition, it reported:

- stale current runs: 0
- classified stale runs: 3

The classified stale runs remain visible in the audit as historical residue:

- `run_81508150-460f-4ffe-9b52-5f344e98df6d`
- `run_41b79ef1-9cc9-408d-9df8-0c4312ca1219`
- `run_08c12717-2588-4f15-82cc-490bed7dabcb`

Current unresolved continuity warning counts after this pass:

- empty active projects: 0
- active projects without open goal path: 0
- idle active goals: 0
- stale current runs: 0
- closure continuity warnings: 0
