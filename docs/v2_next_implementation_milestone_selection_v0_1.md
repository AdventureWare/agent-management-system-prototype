# V2 Next Implementation Milestone Selection v0.1

Date: 2026-07-10
Status: Milestone selection

## Purpose

Select the next AMS v2 implementation milestone after imported prototype backlog
curation was closed.

This is a selection artifact only. It does not implement code, schema, UI,
workflow entities, scheduler behavior, routing automation, or local-model
execution.

Task/run:

- task: `task_v2_core_select_next_implementation_milestone`
- run: `run_v2_core_select_next_implementation_milestone`

## Evidence Reviewed

- `operator-console --project project_ams_v2_core`
- `next-work --project project_ams_v2_core`
- `dependency-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core`
- `search-context --project project_ams_v2_core --query "next capability milestone agent-control provider-run operator next-work owned local workflow local model retrieval"`
- `docs/v2_next_capability_after_managed_provider_loop_v0_1.md`
- `docs/v2_imported_prototype_backlog_curation_closure_assessment_v0_1.md`
- `docs/v2_imported_backlog_curation_goal_closure_v0_1.md`
- `docs/v2_accepted_goal_closure_transitions_v0_1.md`
- `docs/v2_next_capability_after_local_retrieval_v0_1.md`
- `docs/v2_next_capability_after_evaluation_coverage_v0_1.md`

## Current State

AMS v2 core now has accepted evidence for:

- project, goal, task, run, artifact, review, decision, memory, tool, provider,
  source-reference, and evaluation state;
- next-work and bounded agent work packets;
- local retrieval over v2 core records;
- provider/tool dependency reporting;
- route-selection and route-comparison evidence;
- provider-backed run launch and completion;
- imported prototype backlog curation and supported goal status transitions;
- a read-only operator console route.

Live readbacks during this task showed:

- one active AMS v2 goal: milestone selection;
- one in-progress task: this task;
- no ready next-work candidates while this task is in progress;
- no review queue items;
- 50 provider-backed AMS v2 core runs;
- 41 local CLI tool executions;
- three accepted evaluation scenarios/results:
  - `agent-work-packet`
  - `agent-control-surface`
  - `local-retrieval`

The substrate works. The next problem is not missing ontology. The next problem
is that repeated agent work still requires too much manual command choreography.

## Candidate Directions

### 1. Agent-Control Ergonomics

Verdict: recommended.

The existing agent-control surface is useful and evaluated, but the actual loop
still requires many separate operations to complete a normal managed task:
launch provider run, attach artifact, record validation, complete provider run,
move to review, record review, record acceptance decision, mark done, and create
follow-up work when needed.

That friction directly affects the larger goal: AMS should coordinate real
goal-directed agent work, not depend on the chat transcript and a human/agent
remembering a fragile CLI sequence.

### 2. Provider-Run Usability

Verdict: fold into the recommended milestone.

Provider-run launch and completion now exist, but they are only part of the
run lifecycle. The important next step is not more provider-specific mechanics;
it is a small lifecycle helper over existing operations that makes provider
runs and task closeout repeatable.

Defer transcript import, session recovery, abandoned-run handling, and provider
dashboard work until repeated live use exposes a concrete failure.

### 3. Operator Next-Work UI

Verdict: defer.

The read-only operator console already exists and the current bottleneck is
not visual discovery. The bottleneck is execution choreography. A broader UI now
would risk hardening premature information architecture and turning AMS into a
review/approval app instead of a goal-directed work loop.

### 4. Owned/Local Workflow Extraction

Verdict: defer as a separate feature, but use the recommended milestone as the
first concrete extraction target.

The repeated workflow is visible: managed task/run closeout. It should first be
captured as a small command/helper over existing entities, not as a new
Workflow/Skill entity or automation framework.

If the helper proves useful, later work can decide whether it becomes a reusable
skill/workflow artifact.

### 5. Local Model / Retrieval Direction

Verdict: defer.

Local retrieval is already implemented and evaluated. Local model execution
remains premature because AMS still relies on external Codex reasoning for the
work itself, and the system does not yet have enough local execution evidence
to justify runtime integration or routing automation.

Do not start Ollama, llama.cpp, MLX, automatic routing, model catalog migration,
or local-provider orchestration in the next milestone.

## Recommendation

Open the next implementation milestone:

`Make managed v2 task runs repeatable`

Goal statement:

Reduce managed task/run command choreography by adding a minimal lifecycle
helper over existing AMS v2 entities and operations, so agents can reliably
launch, complete, attach evidence, request review, record acceptance, close
tasks, and create follow-up work without inventing new state.

## Why This Is The Right Next Milestone

It advances the larger owned-agent goal because it turns the current working
loop into a more reliable operating surface for real work.

It preserves what is already useful:

- existing `Task`, `Run`, `Artifact`, `Review`, `Decision`, `MemoryItem`,
  `ToolExecution`, and `ModelProvider` records;
- existing review and acceptance gates;
- existing source-linked readbacks;
- existing provider/tool dependency evidence;
- existing local retrieval and operator-console read models.

It avoids the known failure modes:

- no new domain entity;
- no scheduler;
- no autonomous multi-goal dispatcher;
- no dashboard expansion;
- no local-model runtime;
- no automatic routing;
- no bulk curation machinery;
- no speculative workflow registry.

## Minimal First Task

Create one ready implementation-planning task:

`Design minimal managed-run lifecycle helper contract`

Acceptance criteria:

- define the exact helper command/API surface for the common managed-run
  lifecycle;
- map every helper step to existing v2 core operations;
- identify which steps are required, optional, or explicitly out of scope;
- preserve review and acceptance gates;
- define dry-run/readback behavior;
- define focused smoke tests for the later implementation;
- reject any schema, entity, lifecycle-state, scheduler, routing, broad UI, or
  local-model addition;
- produce one short artifact that can be implemented directly in the next task.

## Deferred Options

| Option | Deferred because |
| --- | --- |
| Broader operator UI | Existing UI/read model is enough; execution reliability is the bottleneck. |
| Automatic routing | Route evidence exists, but automation needs more failure handling and policy evidence. |
| Local model execution | No proof yet that local models can perform the reasoning work currently handled by Codex. |
| Workflow/Skill entity | The first reusable workflow can be a helper contract before becoming a domain concept. |
| Provider transcript/session import | Useful later, but not needed to reduce the current closeout friction. |
| Scheduler or multi-goal dispatcher | Would expand autonomy before the single-run lifecycle is ergonomic and auditable. |

## Validation

This selection is valid if:

- the artifact compares the required candidate directions;
- exactly one milestone is recommended;
- exactly one minimal first task is named;
- non-selected options are explicitly deferred;
- no code, schema, UI, workflow entity, scheduler, routing automation, or
  local-model implementation is added;
- v2 state is updated through artifact/review/decision/task records.
