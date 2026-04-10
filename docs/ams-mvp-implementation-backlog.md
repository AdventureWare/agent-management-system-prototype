# AMS MVP Implementation Backlog

Date: 2026-04-10
Project: Agent Management System Prototype
Status: First engineering wave

## Purpose

Turn the completed AMS planning and coordination work into the first concrete engineering backlog for the MVP.

This document is the bridge between:

- the MVP workflow plan
- the helper-role analysis work
- the next actual implementation tasks

## Current capability matrix

### Present

- task, run, review, approval, and decision records exist
- resumable thread execution exists
- task routing already considers roles, dependencies, and review gates
- queue-level governance actions now exist in the task queue preview
- self-improvement opportunity analysis already exists

### Partial

- goals exist, but goal-to-backlog conversion is weak
- prioritization exists in fields and planning views, but not as a strong now/next/later operating loop
- task contracts include useful metadata, but execution expectations are still too free-form
- governance exists, but escalation and approval handling are still too task-local
- workload and capacity metadata exist, but dispatch enforcement is still incomplete

### Missing or not yet first-class

- explicit escalation inbox
- rough usage and cost rollups
- strong human actor modeling for workload views
- parent/child delegated subwork orchestration
- structured handoff checkpoints and typed escalation reasons

## Recommendation

Do not start with parent/child multi-agent orchestration.

Start with the smaller slice that makes the existing system more reliable as an always-on work queue:

1. stronger task contracts
2. clearer prioritization
3. queue-centric escalation and approval handling
4. dispatch guardrails for workload and concurrency
5. rough usage and cost visibility

That sequence improves throughput and trust before introducing heavier orchestration structure.

## First engineering wave

### 1. Strengthen task execution contracts and launch prompts

Why first:

- the system still relies too much on free-text task briefs
- better contracts make routing, review, and recovery work better everywhere else

Scope:

- tighten task fields used at launch
- make success criteria, ready conditions, and expected outcomes operational
- improve launch prompts so agents receive a clearer execution contract

### 2. Build a now / next / later backlog view with explicit priority reasons

Why second:

- the MVP needs a real answer to "what should run next"
- this is core to sustained background execution

Scope:

- rank work in a dedicated operator view
- surface priority rationale
- make deferral visible instead of implicit

### 3. Create a first-class escalation and approval inbox

Why third:

- governance exists, but it is still too fragmented
- queue-level execution needs a place for human intervention without hunting through task detail pages

Scope:

- unified escalation queue
- unified approval queue
- clear next actions for blocked, review, and approval states

### 4. Enforce actor workload guardrails in dispatch and planning

Why fourth:

- the system stores capacity and concurrency metadata but does not yet fully enforce it
- throughput quality will degrade if dispatch ignores workload ceilings

Scope:

- enforce `maxConcurrentRuns` and related capacity signals in dispatch
- improve planning and task-fit views to show overload and idle capacity

### 5. Capture run usage and rough cost rollups

Why fifth:

- the product promise includes better use of AI capacity
- that promise is incomplete without rough cost visibility

Scope:

- capture the minimum viable usage fields at run time
- compute rough cost estimates
- show basic rollups by provider, actor, project, and goal

## Next wave after that

These should wait until the first engineering wave lands.

### Parent/child delegated subwork orchestration

Add explicit delegated subwork and orchestrator-managed child work only after:

- task contracts are stronger
- priority flow is clearer
- dispatch guardrails exist
- escalation handling is more structured

### Human actor modeling beyond ownership

Improve human workload modeling after the system has a stronger queue and dispatch core.

## Seed task order

Recommended execution order:

1. Strengthen task execution contracts and launch prompts
2. Build a now / next / later backlog view with explicit priority reasons
3. Create a first-class escalation and approval inbox
4. Enforce actor workload guardrails in dispatch and planning
5. Capture run usage and rough cost rollups

## Bottom line

The next step is not "make multi-agent orchestration more impressive."

The next step is to make the existing control plane better at:

- deciding what should run
- telling agents exactly what good completion looks like
- surfacing human intervention points cleanly
- keeping workload sane
- showing whether the throughput is worth the spend
