# V2 Next Milestone After Lifecycle Helper v0.1

Date: 2026-07-11
Status: Milestone selection

## Purpose

Select the next AMS v2 implementation milestone after completing the repeatable
managed-run lifecycle helper.

Task/run:

- task: `task_v2_core_select_next_milestone_after_lifecycle_helper`
- run: `run_v2_core_select_next_milestone_after_lifecycle_helper`

## Evidence Reviewed

- `operator-console --project project_ams_v2_core`
- `next-work --project project_ams_v2_core`
- `dependency-report --project project_ams_v2_core`
- `dependency-reduction-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core`
- `search-context --project project_ams_v2_core --query "next milestone dogfood real task provider local dependency reduction retrieval context imported operator decision UI ergonomics"`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- `docs/v2_repeatable_managed_run_lifecycle_goal_closure_assessment_v0_1.md`
- `docs/v2_managed_run_lifecycle_complete_helper_implementation_v0_1.md`

## Current State

AMS v2 now has enough control-loop machinery to run real work:

- projects, goals, tasks, runs, artifacts, reviews, decisions, memory, tools,
  evaluation scenarios, and source references exist in v2 state;
- agent work packets, agent-control, local retrieval, and evaluation context all
  have accepted evaluation evidence;
- dependency reporting shows three hybrid candidate capabilities:
  `agent-work-packet`, `agent-control-surface`, and `local-retrieval`;
- the managed-run lifecycle helper can complete the normal successful provider
  run closeout path without bypassing review and acceptance gates;
- the helper was validated with tests, `npm run check`, live dry-run, and dogfood
  closeout.

Current limitation: most v2 work has been AMS-on-AMS implementation, proof,
selection, or cleanup work. That was useful, but it does not yet prove the
system can manage one ordinary operator-relevant task outside building AMS
itself.

## Candidate Directions

### 1. Real-task dogfooding

Recommendation: select.

This is the strongest next milestone because v2 now has enough loop mechanics to
try real work without adding new architecture. A real non-AMS task will reveal
whether context bundles, retrieval, provider runs, artifacts, review, and
closeout are actually sufficient when the task is not about AMS internals.

This also answers the user's recurring project question: whether the new version
has done real goal work or only test/proof work.

### 2. Provider/local dependency reduction

Recommendation: defer.

The dependency reports are useful and show hybrid candidates, but they should
not become a standalone optimization goal yet. More route/provider work before
real-task use risks optimizing abstractions around limited evidence. Use the
first real task to collect provider, local-tool, and context-dependency evidence.

### 3. Local retrieval/context quality

Recommendation: defer.

Local retrieval has passed the first evaluation scenario and returns
source-linked results. It may still be weak, but the next improvement should be
driven by observed context failures during a real task, not by speculative
search tuning.

### 4. Imported-goal/operator-decision cleanup

Recommendation: use as input, but do not make it the milestone.

Imported prototype goals still include active operator-decision items such as
Kwipoo customer acquisition and repo-management friction. These are useful
candidate sources for real work, but broad cleanup would turn the next milestone
back into meta-work. Select one real task from this context if it is low risk and
operator-relevant.

### 5. UI/operator ergonomics

Recommendation: defer.

The UI may need work, but the system should first expose actual ergonomic pain
from a real task. Building more UI before the next real workflow risks recreating
the prototype's bloat pattern.

## Recommendation

Create the next milestone:

`goal_ams_v2_first_real_dogfood_task`

Title:

Run first real non-AMS task through AMS v2

Success condition:

One low-risk, operator-relevant task outside AMS implementation is selected,
prepared, executed, reviewed, accepted or rejected, and closed through existing
AMS v2 operations. The result records what worked, what friction appeared, and
which next improvement is justified by evidence.

## Minimal First Task

Create exactly one first task:

`task_v2_core_select_first_real_dogfood_task`

Title:

Select first real non-AMS dogfood task

Purpose:

Choose one low-risk, operator-relevant task to run through AMS v2. The output
should be a short work packet that names the selected task, why it matters, what
goal/project it advances, required context, expected artifact, acceptance
criteria, and stop conditions.

Non-goals:

- do not execute the real task yet;
- do not add schema, UI, scheduler, routing, local-model, or workflow-registry
  work;
- do not clean the whole imported backlog;
- do not convert this into a governance/review-app exercise.

## Deferred Options

Defer these until after the first real dogfood task produces evidence:

- provider routing automation;
- local model execution;
- retrieval ranking or embedding changes;
- broad imported-goal cleanup;
- UI/dashboard redesign;
- workflow/skill registry expansion;
- scheduler or multi-agent orchestration.

## Validation Result

The selected next milestone is supported by current state:

- no other actionable AMS v2 core task is ready after lifecycle-helper closure;
- accepted evaluations show the core control-loop affordances are good enough
  for another task;
- dependency reports show continued external AI use, but not enough evidence to
  optimize routing before real use;
- imported active goals provide possible real-work sources without requiring
  destructive migration or cleanup;
- the lifecycle helper removes enough closeout friction to make another
  dogfood run cheap.

The next move should be selection of the first real non-AMS dogfood task.
