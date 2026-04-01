# Planning Surface Notes

Date: 2026-04-01
Project: Agent Management System Prototype
Status: Updated after horizon-model cleanup

## Why this doc changed

An earlier version of this file proposed `PlanningHorizon` as a first-class entity and treated planning as operating inside explicit horizons.

That no longer matches the prototype.

The live product direction is:

- planning is a process or session
- the plan is the current body of goals, tasks, timing, assignments, and related context
- the planning surface works over a chosen date window and scope, not over a separate horizon object

## Current planning model

Planning in this prototype is now centered on:

- `Goal`: desired outcome or future state
- `Task`: action intended to advance a goal
- `Run`: AI-mediated work attempt against a task
- `Thread`: reusable AI context, not the plan itself
- `Project`: workspace and default context
- `Worker`: available execution surface or operator

The planning page is a review and revision surface over that existing model.

## What the current planning page does

`/app/planning` currently lets the operator:

- choose a start and end date
- filter by project, goal, and worker
- include or exclude undated work
- review goals currently in scope
- review scheduled and unscheduled tasks
- inspect capacity rollups by worker
- update goal planning fields such as target date, planning priority, and confidence

This means the planning surface is already useful without requiring a parallel planning entity.

## Model constraints

To keep the prototype coherent, avoid reintroducing these concepts unless a real workflow requires them:

- freeform goal `horizon`
- structured `PlanningHorizon`
- goal or task `planningHorizonId`
- preset-based planning windows as a primary planning object

Those concepts added noise and competed with the simpler model of "review the current plan inside a selected window."

## Preferred direction

If planning needs more persistence later, the next model should probably be:

- `PlanningSession`: a review event or saved working session
- `Decision`: prioritization, reassignment, rescheduling, acceptance, or deferral
- `Constraint`: dependencies, deadlines, approvals, or resource limits

That fits the ontology work better than bringing back horizon objects.

## Near-term additions that still make sense

The planning surface can still get stronger by adding:

- explicit decisions for reschedule, reprioritize, assign, and defer
- capability or tool requirements on tasks
- better artifact and context linkage for planning inputs and outputs
- improved AI assistance for decomposition, risk finding, and plan suggestions

## Repo truth

As of this update:

- the planning UI no longer uses saved horizon presets
- goal management no longer exposes freeform horizon text
- the control-plane schema no longer models planning horizons as first-class entities

This document should be read as the current planning stance for the prototype, not as a historical proposal for a different architecture.
