# Superstructure V1 Goal Reconciliation v0.1

Date: 2026-07-14

## Purpose

Reconcile the AMS v1 Superstructure goal hierarchy against the current AMS v2
Superstructure Program without blindly importing stale hierarchy, continuation
tasks, or duplicate active goals.

## Sources Inspected

AMS v1 runtime:

- Source DB: `data/app.sqlite`
- Source table: `control_plane_records`
- V1 project: `project_c3336a7b-1413-498e-ac8b-70aac0a36e11`
  - `Superstructure Ontology / Reality-Modeling Framework`
- Related v1 project: `project_c06e7bbc-bc59-486d-99b4-280b9370eedd`
  - `Reality-Modeling Intelligence Framework`

AMS v2 runtime:

- Target DB: `data/v2-core.sqlite`
- V2 project: `project_superstructure_program`
  - `Superstructure Program`

Local Superstructure artifacts sampled:

- `/Users/colinfreed/superstructure-ontology/docs/project/superstructure_program_topology_assessment_v0_1.md`
- `/Users/colinfreed/superstructure-ontology/docs/project/superstructure_program_charter_v0_1.md`
- `/Users/colinfreed/superstructure-ontology/docs/project/superstructure_project_boundary_decision_v0_1.md`

## V1 Superstructure Goal Set

The v1 Superstructure hierarchy contains one top-level running goal and ten SG
child goals:

| V1 goal | Status | Recommended v2 handling |
| --- | --- | --- |
| `goal_5474b71c-54a8-49b2-bdf9-bca6ae35db84` - Build the Superstructure Ontology into a usable, reviewable, and extensible reality-modeling framework | running | Merge into `goal_superstructure_program`; do not duplicate. |
| `goal_4a98785a-ca18-45e7-b68d-782454db0790` - SG1: Stabilize the local project workspace | done | Historical evidence under v2 ontology/shared tooling context; do not reopen. |
| `goal_29232691-9c01-4ecc-ae43-d85ccffc2e09` - SG2: Consolidate the latest project state | done | Historical evidence under v2 ontology/shared tooling context; do not reopen. |
| `goal_3b953f6c-7d09-41ff-8c0b-4300b1335aa4` - SG3: Implement v0.37 targeted revision | ready | Superseded by v2 ontology/addenda/review-slicing work; do not import as active. |
| `goal_3e7fbf85-e599-4939-8f72-ba34cf050b54` - SG4: Refine the core ontology kernel | ready | Merge into `goal_superstructure_ontology`. |
| `goal_c1615373-a61e-4062-8615-b7c4758c6c1f` - SG5: Build the claim and evidence discipline | ready | Merge into `goal_superstructure_epistemic_evidence`. |
| `goal_5c136036-e055-42ab-b9da-4f2b0bb36191` - SG6: Create practical application protocols | ready | Merge across `goal_superstructure_world_model` and `goal_superstructure_ams_integration`; do not create a separate v2 goal yet. |
| `goal_f130dab2-d722-4f30-9b68-12f4a9b2f3bc` - SG7: Build worked examples | ready | Merge into ontology/application work as future tasks when examples are selected. |
| `goal_92d7d43a-9a81-4c86-9967-e09af9638398` - SG8: Simulate external review until real review is available | ready | Merge into review/evidence discipline; avoid treating simulated review as validation. |
| `goal_075360ac-377a-4ce6-a44d-baf0da8fb981` - SG9: Prepare semi-formal representation | ready | Merge into `goal_superstructure_shared_tooling` and `goal_superstructure_ontology`. |
| `goal_c1ac1db7-6480-4f98-99fe-66cd81e7c42d` - SG10: Build a release candidate | ready | Defer until ontology/application/evidence work has a reviewed release target. |

## Related RMI Goal

V1 also contains a related but distinct Reality-Modeling Intelligence goal:

- `goal_951d6b22-9229-4217-86ad-6cb78749fad5` - `Create RMI Project Kernel v0.1`

This should not be merged into the Superstructure Program by this pass. It is a
separate project/kernel thread with its own artifact root and should be handled
by a later RMI-specific reconciliation if needed.

## Current V2 Superstructure Program

The current v2 Superstructure Program already has a cleaner active structure:

| V2 goal | Status | Role |
| --- | --- | --- |
| `goal_superstructure_program` | active | Program-level parent goal. |
| `goal_superstructure_ontology` | active | Ontology grammar, source/review/canonical separation, controlled terms, addenda, profiles. |
| `goal_superstructure_world_model` | active | Present Earth / World Model application layer. |
| `goal_superstructure_dynamics_simulation` | active | Dynamics and simulation planning. |
| `goal_superstructure_epistemic_evidence` | active | Claim/source/provenance/freshness/uncertainty discipline. |
| `goal_superstructure_ams_integration` | active | AMS and owned-AI operationalization. |
| `goal_superstructure_shared_tooling` | active | Validators, package indexes, generated views, tooling support. |

This v2 structure is better than importing SG1-SG10 as active child goals
because it separates durable workstreams by responsibility rather than by an
older release sequence.

## V1 Task Findings

The v1 Superstructure task set includes:

- completed evidence tasks for SG1/SG2 and several later planning/tooling
  artifacts;
- canceled continuation-control tasks;
- one ready continuation-control task;
- one review task:
  `task_b547e945-2890-4548-8b42-a38515d6ac8a` - `Draft Superstructure program charter and project-boundary decision packet`.

The review task's target artifacts exist:

- `/Users/colinfreed/superstructure-ontology/docs/project/superstructure_program_charter_v0_1.md`
- `/Users/colinfreed/superstructure-ontology/docs/project/superstructure_project_boundary_decision_v0_1.md`

Because AMS v2 already has the program/workstream structure and accepted
Superstructure artifacts, the right v2 action is not to import the old review
task directly. The right action is to create one clean v2 review/selection task
that uses those artifacts as context and decides the next active work item.

## Decision

Do not import the v1 SG1-SG10 hierarchy as active v2 goals.

Do not import canceled or ready continuation-control tasks.

Do not merge RMI into the Superstructure Program in this pass.

Create one v2 continuation task under `goal_superstructure_program` to review
the program charter and boundary decision artifacts, confirm whether they should
be accepted as v2 context, and select the next concrete Superstructure work item.

## V2 Task Created

Created:

- `task_superstructure_review_program_charter_and_select_next_work`

Purpose:

- review the existing charter and project-boundary decision artifacts;
- decide whether they are sufficient v2 context;
- select or create the next bounded Superstructure task;
- avoid reopening the whole SG1-SG10 release sequence.

## Validation

- Read v1 project, goal, and task records from `data/app.sqlite`.
- Read current v2 Superstructure project, goals, tasks, runs, and artifacts from
  `data/v2-core.sqlite`.
- Confirmed the v2 program has 7 active goals and no existing ready work before
  creating the continuation task.
- Confirmed the v1 charter and boundary decision artifact paths exist.
- No v1 data was modified.
- No ontology repository files were modified.
- No v2 schema changes were made.

## Remaining Work

- Execute `task_superstructure_review_program_charter_and_select_next_work`.
- Reconcile RMI separately if the operator wants that project imported or linked
  into v2.
- Keep lower-confidence personal/business/game/challenge goals behind an
  operator decision packet.
