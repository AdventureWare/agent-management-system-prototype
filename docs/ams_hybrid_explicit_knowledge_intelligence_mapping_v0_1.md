# AMS Hybrid Explicit-Knowledge Intelligence Mapping v0.1

Date: 2026-07-15
Status: Mapping artifact
Task: `task_ams_v2_map_hybrid_ai_source_state_to_existing_model`

## Purpose

Map the supplied source-state note on generic-model reversion, explicit
knowledge, hybrid intelligence, statement roles, and Superstructure-aligned AI
against the existing AMS v2 / Superstructure model.

This is not a schema proposal. It records what should be reused, what should be
tested, and what should remain candidate until there is an exercised operational
gap.

## Core Thesis Accepted

A generally trained model should not be responsible for repeatedly
reconstructing stable project meanings, current task state, validated rules,
procedures, and user-specific ontology from conversational hints.

AMS should reduce that burden by supplying persistent, source-aware, task-scoped
state and evidence. The future owned-AI system should combine:

- learned model capability;
- explicit ontology and terminology;
- current project/task/world state;
- reviewed memory and evidence;
- procedural knowledge;
- executable tools, rules, validators, and simulations;
- model/provider routing evidence;
- review and evaluation loops.

This supports the long-term goal:

- `goal_ams_v2_owned_agent_system_long_term`

New active sub-goal:

- `goal_ams_v2_hybrid_explicit_knowledge_intelligence_architecture`

## Existing Structures To Reuse

| Source-state concept | Existing AMS/Superstructure representation |
| --- | --- |
| Generic-model reversion | Failure mode/evaluation observation; use `Run`, `Review`, `Decision`, `EvaluationResult`, and closeout notes. |
| Contextual salience overweighting | Failure mode/evaluation observation; test through task artifacts and review. |
| Meaning reconstruction failure | Context/readiness failure; use `Task`, `ContextBundle`/`AgentWorkPacket`, `MemoryItem`, `Decision`, and review. |
| Explicit declarative knowledge | Reviewed `MemoryItem`, `Artifact`, `Decision`, source references, and Superstructure claims where applicable. |
| Current state | `Project`, `Goal`, `Task`, `Run`, `Artifact`, status, decisions, and generated current-state docs/readbacks. |
| Procedural knowledge | Skills, workflow/procedure artifacts, validation plans, and task/run closeout rules. Do not add a new persistent entity yet. |
| Formal/executable rules | `Tool`, `ToolExecution`, validators, tests, scripts, and evaluation scenarios/results. |
| Model/provider distinction | Existing `ModelProvider`, `Run`, dependency reports, and routing/evaluation decisions. |
| Task-specific context package | Existing read models: `ContextBundle`, `AgentWorkPacket`, `agent-preparation-packet`, `closeout-packet`. |
| Statement role | Candidate classification inside task artifacts/work packets first; no new field yet. |
| Task context checkpoint | Candidate workflow rule: regenerate source-linked summary after major evidence, compaction risk, requirement change, architecture change, or closeout. |
| Better-AI criteria | Existing dependency-reduction report, route comparison evidence, evaluation scenarios/results, review outcomes, and supervision/friction notes. |
| Superstructure-aligned intelligence | Use Superstructure as relevant ontology/mechanism/evidence substrate, not as prompt vocabulary or universal lens. |

## Existing Evidence

Relevant accepted or completed work already exists:

- AMS / owned-AI / external-AI boundary:
  `docs/ams_owned_ai_external_ai_boundary_v0_1.md`
- Current operating state:
  `docs/ams_v2_current_operating_state.md`
- Agent preparation:
  `goal_ams_v2_agent_preparation_capability`
- Agent preparation packet implementation:
  `task_v2_implement_agent_preparation_packet_read_model`
- Real cross-project work:
  `goal_ams_v2_real_cross_project_work_loop`
- Provider/model route comparison:
  `goal_ams_v2_route_comparison`
- External-AI dependency reduction:
  dependency-reduction report over agent-control, agent-execution-cycle,
  agent-work-packet, closeout-packet, and local-retrieval.

The dependency-reduction report currently shows five core coordination
capabilities as hybrid candidates with providerless local-tool evidence:

- `agent-control-surface`
- `agent-execution-cycle`
- `agent-work-packet`
- `closeout-packet`
- `local-retrieval`

This supports the source-state ladder:

```text
externalize task state
-> formalize project meanings
-> retrieve relevant context
-> add deterministic tools and validators
-> evaluate current models
-> route among models
-> use local/open models later where evidence supports it
```

## Candidate Terms Not Accepted As Entities

Do not add persistent entities for these now:

- `GenericModelReversion`
- `ContextualSalienceOverweighting`
- `MeaningReconstructionFailure`
- `ExplicitKnowledge`
- `LearnedKnowledge`
- `ProceduralKnowledge`
- `StatementRole`
- `WorldModelAlignment`
- `TaskContextCheckpoint`
- `HybridIntelligenceSystem`
- `PreferencePlasticity`

Reason: these are useful analytic terms, failure modes, artifact sections,
review criteria, or evaluation labels. None currently has a separate lifecycle,
query surface, mutation workflow, or storage responsibility that justifies a new
entity.

Represent them first through:

- task selection artifacts;
- work/preparation packet sections;
- review/evaluation notes;
- memory items only after review;
- decisions when they change direction;
- model-change proposals only after repeated friction proves a schema gap.

## Candidate Relations To Test First

The source-state note proposed relations such as:

- `classifies_statement_as`
- `supplies_context_to`
- `retrieves_definition_for`
- `executes_rule`
- `validates_output_of`
- `is_authoritative_for`

Most can be expressed now through existing records:

- `Task` includes or references statement-role classification in an artifact.
- `ContextBundle` / `AgentWorkPacket` includes source refs.
- `ToolExecution` executes a tool/rule/validator.
- `Review` / `EvaluationResult` validates output.
- `Decision` records accepted authority or direction.
- `MemoryItem` stores reviewed durable knowledge with source refs.

Do not add relation tables until repeated tasks need structured querying that
cannot be answered from existing evidence records.

## Goal Updates Made

Created active sub-goal:

`goal_ams_v2_hybrid_explicit_knowledge_intelligence_architecture`

Desired state:

AMS and the future owned-AI system reduce generic-model reversion and meaning
reconstruction failure by combining learned models with explicit ontology,
project state, current facts, procedures, tools, rules, validation, evidence,
and source-aware memory.

Created task:

`task_ams_v2_map_hybrid_ai_source_state_to_existing_model`

Purpose:

Map the supplied source-state input to existing AMS/Superstructure structures
and prevent premature ontology/schema expansion.

Created task:

`task_ams_v2_test_statement_roles_in_real_work_selection`

Purpose:

Test statement-role classification during a real cross-project task selection
or execution cycle.

Dependency:

`task_ams_v2_test_statement_roles_in_real_work_selection`
depends on:

`task_ams_v2_select_first_real_cross_project_work`

Reason:

The statement-role test should be grounded in the real selection artifact, not
run as detached metawork.

## Smallest Real-Work Test

Use the next real cross-project selection task:

`task_ams_v2_select_first_real_cross_project_work`

The selection artifact should classify relevant statements as:

- requirement
- constraint
- preference
- candidate
- example
- observation
- question
- non-goal

It should also record:

- project engineering mode;
- project charter/context sufficiency;
- explicit verification and stop conditions;
- ambiguity resolved through authoritative state inspection;
- whether statement-role classification prevented salience fixation or scope
  distortion.

This is enough to test the thesis without adding a `StatementRole` entity or
new task-package schema.

## Deferred Questions

- Does statement-role classification need structured storage, or is artifact
  text enough?
- Which failure observations should become evaluation rubrics?
- Which external-AI affordance should be replaced next after real-work
  dogfooding?
- Which Superstructure concepts are operationally useful in ordinary software
  tasks, and which would be prompt bloat?
- Which local/open model path should be tested only after the control loop is
  proven on more real work?

## Non-Goals

- Do not add a new `StatementRole` entity.
- Do not add a `HybridIntelligenceSystem` entity.
- Do not add a scheduler, worker pool, routing automation, or local model
  runtime from this source-state note.
- Do not hardcode the whole operating model into prompt text.
- Do not treat Superstructure vocabulary imitation as progress.
- Do not promote the source-state note to canonical memory without review.

## Recommendation

Keep the new hybrid explicit-knowledge architecture goal active, but do not let
it displace the real cross-project work proof.

Immediate next implementation/action path:

1. Complete `task_ams_v2_select_first_real_cross_project_work`.
2. Use that selection artifact as the testbed for
   `task_ams_v2_test_statement_roles_in_real_work_selection`.
3. Only after observed friction, decide whether statement roles, checkpoints, or
   failure modes need stronger structured support.
