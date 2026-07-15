# AMS Goal And Task Creation Guide

Date: 2026-07-15
Status: Active operating guidance

## Purpose

This guide tells human and computer agents how to create and maintain AMS
projects, goals, tasks, and adjacent work records without losing the real
project direction.

The point of AMS goals is alignment. A goal is not just a label for a batch of
tasks. It is the durable desired future state that keeps humans, AI agents, and
tools oriented across sessions.

Use this guide before creating, closing, superseding, or decomposing goals and
before creating task records that should drive agent work.

## Core Rule

Never let project state imply "we are done" when only a milestone, batch, task,
or proof is done.

Every active project should have a visible current parent goal or long-term
goal. Every completed milestone must either:

- advance an active parent goal with open child work;
- create or select the next active sub-goal or task;
- record an explicit paused or blocked decision with a reason;
- or record an operator-approved decision that the project or goal is actually
  done or intentionally archived.

If none of those is true, the closeout is incomplete.

## Object Meanings

### Project

A project is a bounded work container. It owns goals, tasks, runs, artifacts,
decisions, memory, and retrieval scope.

Create or use a project when work has its own durable context, files, desired
outcomes, or operating state.

Do not create a project just because a task has a theme. Use an existing project
when the work belongs to an existing context.

### Goal

A goal is a desired future state or desired state-region.

A good goal says what should be true later, not merely what activity should
happen. It should have enough success criteria that an agent can tell whether
work advanced it.

Use goals for:

- long-term project direction;
- meaningful sub-goals;
- milestones that need multiple tasks;
- work streams that can be paused, blocked, resumed, completed, or superseded.

Do not use goals for:

- one command;
- one file edit;
- an implementation detail;
- a vague topic;
- a duplicate of an existing goal;
- a status report.

### Task

A task is an executable state-transition attempt.

A good task is bounded enough that a human, AI agent, or tool can start it,
produce evidence, and stop at review, done, blocked, or canceled.

Use tasks for:

- one implementation slice;
- one analysis or audit pass;
- one research question;
- one cleanup batch;
- one reviewable artifact;
- one physical-world capture step.

Do not use tasks for:

- an entire long-term objective;
- a vague reminder;
- speculative future work with no acceptance criteria;
- a duplicate of existing ready or blocked work.

### Run

A run is evidence that an agent, human, model, or tool attempted work on a task.

Runs should record what was attempted, what happened, what validation ran, what
failed, what changed, and what still blocks progress.

### Artifact

An artifact is a durable output or input used by work. It can be a document,
file path, report, patch, source export, screenshot, model, dataset, or other
stable reference.

Do not treat AI output as canonical memory just because it exists. It becomes
trusted project state only after review or promotion.

### Decision

A decision records a meaningful choice among alternatives. Use decisions for
goal status transitions, accepted/rejected outputs, supersession, routing
rationale, archival rationale, and operator choices.

### MemoryItem

A memory item is reviewed project knowledge with provenance. Use memory for
facts, constraints, lessons, or operating rules that should affect future work.

Do not use memory as a dumping ground for chat summaries.

## Creating Goals

Before creating a goal, answer:

1. What desired future state does this goal represent?
2. What project owns it?
3. What existing goal does it advance, refine, replace, or depend on?
4. Why is this not just a task?
5. What would make the goal done, blocked, paused, or superseded?
6. What work should be selected next after this goal is created?

Minimum goal fields:

- title: visible desired state or milestone name;
- summary: what should become true and why it matters;
- success criteria: concrete conditions for completion;
- status: active, paused, blocked, completed, or superseded according to the
  current runtime vocabulary;
- parent goal, when this is a sub-goal.

Good goal title examples:

- `Build an owned local-first agent operating layer`
- `Prevent goal drift and silent long-term goal loss`
- `Equip agents with task-relevant capabilities and context`
- `Operate selected goals with managed agent work`

Weak goal title examples:

- `Fix stuff`
- `Improve UI`
- `Do next batch`
- `Review things`

Those may become tasks only after they are narrowed.

## Creating Tasks

Before creating a task, answer:

1. What goal does this task advance?
2. What state transition is being attempted?
3. What are the boundaries and non-goals?
4. What source context is needed?
5. What artifact or evidence should exist afterward?
6. What validation proves the task worked?
7. What should happen if the task is blocked?

Minimum task fields:

- title: executable action;
- project;
- goal;
- summary: bounded work contract;
- success criteria: output and acceptance conditions;
- validation plan: checks, readbacks, tests, review, or source comparison;
- status: usually ready unless it is intentionally blocked, in progress, done,
  or canceled.

Good task title examples:

- `Define goal-continuity invariants and audit current projects`
- `Capture B-W08/B-W09 field measurements`
- `Add idle-goal continuation task action`
- `Review pilot mechanism inventory for source and validation needs`

Weak task title examples:

- `Work on AMS`
- `Think about goals`
- `Make it better`
- `Continue`

## Decomposing Work

Use sub-goals when a desired state needs multiple tasks or should be paused,
blocked, resumed, or completed independently.

Use tasks when the next unit of work can be executed and reviewed directly.

Prefer this shape:

```text
Long-term goal
-> current sub-goal or milestone
-> ready task
-> run
-> artifact/review/decision
-> next task or next sub-goal
```

Avoid deep rigid trees. Project, goal, and task relationships may be graph-like
where the system supports it. Do not create a separate milestone abstraction.
Use `Goal` for milestone-like desired states.

## Goal Continuity Invariants

These invariants apply to every project:

1. An active project should not have only completed/superseded goals unless the
   project itself is done or paused with an explicit decision.
2. An active long-term goal should not be superseded unless an active successor
   goal or archival decision is recorded.
3. A completed milestone should leave behind either an active parent goal with
   open work or a clear next milestone/task.
4. A blocked goal or task must say what concrete condition would unblock it.
5. A paused goal must say why it is paused or what decision would resume it.
6. A task that produced useful output must attach or cite durable evidence.
7. A task that changes direction must record the decision that caused the
   change.
8. A task that discovers missing information should create or select the
   follow-up task instead of leaving the gap in prose only.
9. A goal should not be closed because the current chat is ending.
10. Agent closeout must update AMS state before stopping when the result affects
    project direction.

## Closeout Checklist

Before marking a task done:

- Was the result validated against the task success criteria?
- Was the run result recorded?
- Are important artifacts attached or cited?
- Was review or acceptance recorded when required?
- Did the task advance the linked goal?
- Did the work create a blocker, follow-up task, memory update, or decision?
- Is the parent goal still active, completed, blocked, paused, or superseded for
  the right reason?

Before marking a goal completed or superseded:

- Is the desired future state actually achieved or intentionally replaced?
- What evidence proves that?
- What parent goal did it advance?
- What next active goal or task exists?
- If there is no next work, is the project intentionally paused, blocked, done,
  or archived?
- Is there a decision explaining closure or supersession?

## When To Create Other Records

Create a run when work is attempted.

Create an artifact when there is a durable output, evidence file, source path,
or deliverable that future work should cite.

Create a decision when a path is chosen, work is accepted/rejected, a goal is
closed/superseded, or a non-obvious tradeoff matters.

Create a memory item only after reviewed evidence supports a fact, constraint,
lesson, or rule that should guide future work.

Create a dependency when one task cannot proceed until another task completes.

Record tool execution when a command, script, model, or external tool materially
contributed to the result or validation.

## Anti-Bloat Rules

- Do not create duplicate goals for the same desired future state.
- Do not create a new entity or field when an existing goal, task, decision,
  artifact, memory item, dependency, or run is sufficient.
- Do not create dashboards or metrics before the state model can answer the
  underlying decision.
- Do not create tasks with no validation plan.
- Do not promote AI output to memory without review.
- Do not close active project direction merely because a batch of tasks is done.
- Do not leave important decisions buried in chat.
- Do not turn every concern into governance. Use the smallest record that keeps
  future work aligned.

## Agent Procedure

When an agent is asked to continue work:

1. Read current project/goal/task state from AMS.
2. Search for existing related goals/tasks before creating new ones.
3. Select one actionable task or create the smallest needed continuation task.
4. Build or inspect the work packet/context bundle.
5. Do only the bounded work.
6. Record run evidence, artifacts, decisions, blockers, and follow-ups.
7. Read back the changed state.
8. Stop only when the task is done, blocked, awaiting review, awaiting
   operator input, or a next task has been created/selected.

## Related Sources

- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_entity_cards.md`
- `docs/design/ams_v2_traceability_matrix.md`
- `docs/domain-model-governance-protocol-v0.1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/runtime-data-policy.md`
