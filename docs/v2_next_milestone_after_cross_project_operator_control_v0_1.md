# V2 Next Milestone After Cross-Project Operator Control v0.1

Date: 2026-07-15
Status: Milestone selection

## Purpose

Select the next AMS v2 milestone after completing cross-project operator control.

This is a selection artifact only. It does not implement code, change schemas, add UI, create a scheduler, add routing automation, or introduce new domain entities.

## Current State

AMS v2 now has accepted evidence for:

- minimal project/goal/task/run/artifact/review/decision/memory loop;
- bounded context bundles and agent work packets;
- local source-linked retrieval over v2 core records;
- provider-backed managed runs;
- managed-run lifecycle helper behavior;
- local-tool and providerless evaluation evidence for several core affordances;
- mobile-safe/operator control work;
- running-goal dispatch support;
- global cross-project attention summary in the operator console.

The long-term AMS v2 goal remains:

`goal_ams_v2_owned_agent_system_long_term`

`Build an owned local-first agent operating layer`

## Evidence Reviewed

- `operator-console --project project_ams_v2_core --limit 12 --json`
- `goal-triage --project project_ams_v2_core --json`
- `search-context --project project_ams_v2_core --query "next milestone local model retrieval context provisioning external AI reduction multi agent dispatch"`
- `search-context --project project_ams_v2_core --query "cross-project real non-AMS work operator console dispatch close review external project dogfood"`
- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`
- `docs/v2_next_implementation_milestone_selection_v0_1.md`
- `docs/v2_owned_multi_goal_agent_execution_first_real_cycle_v0_1.md`
- `docs/v2_cross_project_operator_control_gap_audit_v0_1.md`
- `docs/v2_cross_project_operator_control_closure_assessment_v0_1.md`

## Observed Problem

The new cross-project attention summary is working. It surfaces what currently dominates operator attention:

- many submitted artifacts awaiting review across imported projects;
- top actions are frequently `review_output`;
- several projects show review counts that appear to come from imported or historical v1 outputs rather than fresh, intentionally dispatched v2 work.

This matters because AMS v2 is supposed to coordinate real work. If the operator console is dominated by old unclassified imported outputs, agents will keep selecting noisy review work or repeatedly asking what to do next.

The issue is not lack of a new workflow entity. The issue is that imported/historical review state needs to be made actionable, archived, or explicitly deferred using existing artifact, review, task, decision, and goal records.

## Candidate Directions

### 1. Cross-Project Review Backlog Actionability

Verdict: recommended.

This directly follows from the completed operator-control milestone. The operator can now see cross-project attention, and the first real finding is review backlog noise. Cleaning or classifying that backlog makes the existing control surface trustworthy.

This advances the larger goal because agents need reliable project state before continuous cross-project work can be safely delegated.

### 2. Richer Operator UI Actions

Verdict: defer.

The current issue is not that the UI lacks another button. The issue is that existing attention signals point at a noisy backlog. Adding more UI before classifying the backlog risks turning AMS into a review dashboard over stale data.

### 3. Multi-Agent Dispatch Automation

Verdict: defer.

Dispatch automation should not run against noisy imported review queues. The system needs cleaner work state first.

### 4. Local Model Execution

Verdict: defer.

Local-model execution remains important, but the current control-plane evidence shows that state quality is the more immediate blocker. Running a local model over stale or unclassified backlog would not make the system more owned in a useful sense.

### 5. External-AI Dependency Reduction Tracking

Verdict: defer as the immediate milestone.

Dependency tracking already exists at the evidence/reporting level. The next reduction target should be chosen from clean, trusted work patterns. Review-backlog cleanup improves that input.

### 6. Agent Context Provisioning Expansion

Verdict: defer.

Agent-preparation and work-packet capabilities already exist. Their usefulness depends on the quality of selected tasks and reviewed artifacts. Context provisioning should not be expanded before historical outputs are classified enough to avoid polluting retrieval and review queues.

## Recommendation

Open the next milestone:

`Make cross-project review backlog actionable`

Goal statement:

Use existing AMS v2 records to classify, clean up, or explicitly defer imported and historical submitted artifacts so the cross-project operator console points to real actionable work instead of stale review noise.

This should not become a governance app. It is state hygiene for the work loop.

## Why This Milestone Fits Now

It is evidence-led:

- the latest milestone made cross-project attention visible;
- the visible bottleneck is review backlog noise;
- current state has hundreds of artifacts and many open review candidates across imported projects;
- if left alone, next-work and attention signals will keep over-prioritizing stale review work.

It preserves existing useful structures:

- `Project`
- `Goal`
- `Task`
- `Run`
- `Artifact`
- `Review`
- `Decision`
- `MemoryItem`
- operator console read models
- local retrieval/source references

It avoids speculative expansion:

- no new `ReviewBacklog` entity;
- no new artifact lifecycle;
- no bulk auto-acceptance;
- no review dashboard;
- no scheduler;
- no local model runtime;
- no automatic routing;
- no new governance layer.

## Minimal First Task

Create one ready task:

`Audit cross-project review backlog noise`

Acceptance criteria:

- identify the top projects and artifact groups currently dominating cross-project `review_output` attention;
- distinguish fresh v2 work from imported/historical v1 outputs where possible;
- propose cleanup/classification rules using existing artifact, review, task, decision, and goal records;
- define the smallest safe cleanup sequence;
- identify what should remain human-reviewed versus what can be batch-classified as historical/deferred;
- create no schema, UI, entity, status, or workflow expansion.

## First Implementation Boundary

The first task is an audit and cleanup plan only. It should not bulk-update artifact statuses yet.

The follow-up implementation task, if justified by the audit, should be a narrow controlled cleanup pass with before/after readbacks from:

- global `operator-console`;
- `unreviewed-outputs`;
- `goal-continuity-audit`;
- sampled project/task inspection.

## Non-Goals

- Do not review every imported artifact manually.
- Do not create a separate review application.
- Do not add a new status vocabulary.
- Do not invent a stale-artifact ontology.
- Do not auto-promote imported outputs to trusted memory.
- Do not hide real current review work merely to reduce counts.
- Do not solve all imported project curation in one pass.

## Decision

Select `Make cross-project review backlog actionable` as the next AMS v2 milestone.

The first task is `Audit cross-project review backlog noise`.
