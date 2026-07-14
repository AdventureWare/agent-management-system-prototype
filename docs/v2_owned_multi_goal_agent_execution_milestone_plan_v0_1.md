# V2 Owned Multi-Goal Agent Execution Milestone Plan v0.1

Date: 2026-07-14
Status: Planning artifact

## Purpose

Define the next AMS v2 milestone after continuous goal-work control.

The previous milestone made active goals, paused goals, blocked goals, scoped
goal summaries, task rollups, child-goal rollups, dispatch controls, review
queues, and completion-readiness visible and actionable. This milestone should
use that control surface to run bounded agent execution cycles across active
goals.

The point is not to build a scheduler or broad autonomous system. The point is
to make the current manual Codex-driven loop repeatable, inspectable, and
recorded through AMS state.

## Evidence Inspected

- `goal_ams_v2_continuous_goal_work_control` is completed.
- The project has no active goals after that closeout.
- `goal_ams_v2_managed_provider_run_loop` is completed.
- `goal_ams_v2_owned_agent_control_loop` is completed.
- `goal_ams_v2_remote_mobile_access` is completed except for historical live
  Tailscale validation limitations.
- `next-work` selected the new planning task once this milestone goal was
  created.
- The launched work packet includes trusted memory for next-work, work packets,
  review/acceptance gates, provider/tool usage, operator console, artifact
  queue semantics, and source-linked evaluation results.

## Current Capability Baseline

AMS v2 can already:

- select ready work with `next-work`;
- build bounded source-linked packets with `agent-work-packet`;
- search local v2 state with `search-context`;
- launch a provider-linked run with `launch-provider-run`;
- close a run through artifact, review, decision, and task completion with
  `managed-run-lifecycle`;
- show active goal state through `operator-console`;
- record external provider and tool dependency with `dependency-report`;
- preserve review and acceptance gates;
- expose no active work once a goal is completed.

Those are enough to attempt a repeatable execution cycle. They are not enough
yet to claim AMS is independently running agents.

## Milestone Thesis

AMS v2 should gain one narrow execution-cycle affordance:

Given the current project or goal scope, select eligible active work, create or
reuse a provider-linked run, return the bounded work packet, and provide the
expected closeout path.

This should be a thin composition over existing operations. It should not add a
new ontology.

## Minimal Vertical Slice

Implement one command/readback path tentatively named:

`agent-execution-cycle`

The exact command name can change if existing `agent-control` conventions make a
better fit. The behavior should be:

1. Read active goals for a project.
2. Exclude paused, blocked, completed, superseded, and canceled goals.
3. Select the next eligible task using existing next-work logic.
4. Build the selected task's work packet.
5. Create or return a provider-linked run for the selected task.
6. Return a compact execution packet:
   - selected task;
   - goal/project;
   - provider;
   - run id;
   - packet summary;
   - allowed actions;
   - stopping conditions;
   - closeout command;
   - review requirement.
7. After execution, close through existing `managed-run-lifecycle`.
8. Read back operator-console state so the operator can see whether the goal is
   still running, waiting for review, blocked, complete-ready, or has next work.

## First Implementation Task

Create one ready follow-up task:

`task_v2_owned_multi_goal_agent_execution_cycle_command`

Title:

Add owned agent execution-cycle command

Task summary:

Add a narrow v2 core command/readback that composes existing next-work,
agent-work-packet, launch-provider-run, dependency-report, and managed closeout
guidance into one bounded execution-cycle packet for the next eligible task
under active goals.

Acceptance criteria:

- The command selects work only from active eligible goals.
- Paused, blocked, completed, superseded, and canceled goals do not dispatch.
- The selected task is the same task existing `next-work` would choose.
- The command creates or returns a provider-linked run for the selected task.
- The response includes the bounded work packet or a compact source-linked
  packet summary.
- The response includes the expected closeout path using existing
  `managed-run-lifecycle`.
- The command returns a clear no-work result when no eligible active work exists.
- Tests cover ready work, no active goals, paused/blocked exclusion, and current
  run/review guard behavior.
- No schema, new lifecycle states, scheduler, local-model runtime, automatic
  routing, broad UI, or automatic acceptance is added.

## Non-Goals

Do not add:

- autonomous background scheduling;
- worker pools;
- automatic multi-agent fanout;
- local model runtime;
- model routing policy;
- route scoring;
- new Goal/Task/Run/Agent entities;
- new lifecycle statuses;
- automatic artifact acceptance;
- automatic memory promotion;
- dashboard expansion;
- mobile write scope;
- prototype session/runner code copied wholesale.

## Bloat Risks

The main risk is turning this into a generic orchestration platform before the
first repeatable owned execution cycle is proven.

Specific risks to reject:

- adding `ExecutionCycle` as a new persisted entity before a real query needs it;
- adding scheduler fields to goals or tasks;
- adding priority scoring when next-work already chooses a candidate;
- adding provider routing before the system has multiple useful routes to
  compare;
- adding dashboards instead of command/readback evidence;
- treating provider output as accepted memory without review;
- building remote write flows before local operator trust is established.

## Validation Plan

For the implementation task:

- run focused server tests for next-work/agent-control/CLI behavior;
- run any affected browser tests only if the UI changes, which should not be
  necessary for the first slice;
- run `npm run check`;
- validate `next-work` before and after launch;
- validate the new command with:
  - no active goals;
  - one ready task under an active goal;
  - paused goal exclusion;
  - blocked goal exclusion;
  - current run or review guard;
- close the task through `managed-run-lifecycle`;
- record provider/tool dependency evidence.

## Completion Criteria

This milestone is complete when at least one real AMS v2 task is completed
through the execution-cycle path and the operator can see the resulting
run/artifact/review/decision state from the existing console.

The milestone is not complete merely because a command exists. It must be used
on real work.

## Recommended Next Step

Implement `task_v2_owned_multi_goal_agent_execution_cycle_command` as the first
slice.

Keep it as a composition layer over existing v2 core operations. If the command
feels clumsy, record the friction as evidence before adding new model concepts.
