# V2 Next Capability After Managed Provider-Run Loop v0.1

Date: 2026-07-10
Status: Next-capability recommendation

## Purpose

Select the next bounded AMS v2 capability now that the managed provider-run
loop is sufficient for the current milestone.

This is not an implementation plan for more provider mechanics. It is a
capability selection based on current v2 evidence and project need.

## Evidence Reviewed

- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`
- `docs/v2_route_comparison_goal_closure_assessment_v0_1.md`
- `docs/v2_managed_provider_run_loop_closure_assessment_v0_1.md`
- `operator-console --project project_ams_v2_core`
- `next-work --project project_ams_v2_core`
- `dependency-report --goal goal_ams_v2_managed_provider_run_loop`
- accepted evaluation evidence for:
  - `agent-work-packet`
  - `agent-control-surface`
  - `local-retrieval`

## Current V2 Position

AMS v2 now has a usable operating substrate:

- it can represent projects, goals, tasks, runs, artifacts, reviews, decisions,
  memory, tools, tool executions, model providers, and evaluation evidence;
- it can select next work and build bounded packets;
- it can search local v2 state;
- it can expose provider/tool dependency evidence;
- it can compare external-AI and local-tool routes conservatively;
- it can launch and complete provider-linked runs without duplicate run records;
- it preserves review and acceptance gates.

The current problem is no longer "can v2 run the loop at all?" The next problem
is whether v2 can help clean up and operate real project state without importing
prototype mess as canonical truth.

## Candidate Capabilities

### 1. More provider-run mechanics

Examples:

- artifact ingestion helper;
- provider transcript import;
- session/thread reference field;
- abandoned-run recovery command.

Verdict: defer.

The current provider-run loop is good enough. More mechanics would be premature
until repeated live use exposes a concrete failure.

### 2. Local model execution

Examples:

- Ollama/llama.cpp/MLX integration;
- local-provider runner;
- automatic provider routing.

Verdict: defer.

V2 has route and dependency evidence, but no proof that a local model can handle
the reasoning tasks currently done by Codex. Building this now would jump ahead
of the evidence.

### 3. Broader UI/dashboard parity

Examples:

- dashboard expansion;
- provider dashboard;
- multi-goal management UI;
- artifact review UI expansion.

Verdict: defer.

The CLI/read-model path is enough for the next capability. A broader UI before
the real-state cleanup pass risks hardening the wrong information architecture.

### 4. Prototype import cleanup and backlog curation

Examples:

- review imported v1 projects/goals/tasks in v2;
- identify garbage, duplicates, stale work, and speculative artifacts;
- decide what should remain active, be paused, be superseded, be archived, or
  become a clean v2 goal/task;
- preserve source lineage back to the prototype;
- use the managed provider-run loop to perform the curation as real work.

Verdict: recommended.

This directly supports the larger goal: v2 should become the owned operating
layer for real AMS work, not just test goals. It also addresses the main risk
you flagged: imported prototype state may contain garbage and should not be
treated as canonical without review.

## Recommendation

Open the next bounded capability goal:

`Curate imported prototype work into clean AMS v2 operating state`

Goal statement:

Review the imported prototype project/goals/tasks/artifacts in v2, separate
useful real work from stale or low-quality prototype residue, and produce a
small clean set of active v2 goals/tasks that can be operated through the v2
loop without dragging forward accidental complexity.

## Why This Is The Right Next Step

It uses the capabilities already proven:

- `local-retrieval` can find relevant imported work;
- `agent-work-packet` can bound curation tasks;
- provider-run launch/completion can coordinate Codex-backed analysis;
- artifacts/reviews/decisions can record curation judgments;
- task/goal statuses can represent active, paused, completed, superseded, or
  canceled work without adding new schema;
- source references preserve import lineage.

It also avoids the wrong next steps:

- no scheduler;
- no automatic multi-goal dispatch;
- no local model integration;
- no route scoring;
- no broad UI;
- no new ontology;
- no bulk deletion;
- no treating AI-generated cleanup suggestions as canonical without review.

## Minimal Milestone

The minimal milestone should answer:

1. Which imported prototype goals are real and still worth pursuing?
2. Which imported goals/tasks are stale, duplicate, accidental, or garbage?
3. Which active v2 goals should close because their closure artifacts already
   recommend closure?
4. What is the smallest clean active goal/task set for continuing AMS v2 work?
5. What prototype evidence should be preserved as archive rather than active
   work?

## First Task

Create one planning/assessment task:

`Plan imported prototype backlog curation`

Acceptance criteria:

- inspect imported prototype project/goals/tasks from v2 state;
- review the v2 closure artifacts for minimal-loop, route-comparison, and
  managed-provider-run goals;
- propose a curation rubric for keep / merge / pause / supersede / cancel /
  archive;
- identify a small first batch of goals/tasks to review;
- do not delete records;
- do not add schema, UI, scheduler, routing, or local-model work;
- produce a reviewable curation plan artifact.

## Implementation Boundary

The next implementation step should be state curation through existing v2
operations, not application code.

Only after one curation batch shows repeated friction should we consider helper
commands or UI affordances for bulk review.
