# Owned-AI Hybrid System Source Analysis v0.1

Date: 2026-07-15
Status: Source analysis and AMS setup record

## Purpose

This note records the practical system-building implications of the supplied
source-state text on generic-model reversion, explicit knowledge, hybrid
intelligence, and owned AI.

The important point is not to add ontology terms. The important point is that
Colin is building a capability system where AMS, external AI, future owned AI,
Superstructure, explicit knowledge, tools, and validation have distinct jobs.

## Core Product Interpretation

A general model should not be expected to reconstruct Colin's specialized
project meanings, current goals, procedures, stable knowledge, and local
constraints from conversational hints during every task.

The system being built should instead work like this:

```text
AMS authoritative state
+ project charters and decisions
+ source-aware memory and artifacts
+ retrieval
+ explicit procedures
+ tools/rules/validators
+ replaceable model providers
-> bounded task package
-> agent/model/tool work
-> evidence and validation
-> reviewed state update
```

This makes the owned-AI path broader than "train a model." A model is one
component. The near-term owned capability is the surrounding system that gives
models correct state, context, tools, and validation.

## What The Source Text Requires

### Separate AMS From Owned AI

AMS should remain the coordination and control plane:

- goals;
- projects;
- tasks;
- runs;
- evidence;
- artifacts;
- reviews;
- decisions;
- memory;
- authority and continuation.

The owned AI system should become a capability provider that can reason, plan,
retrieve, use tools, validate, and eventually use local/open/specialized models.

### Treat External AI As Current Delegated Capability

Codex, ChatGPT, and similar systems are useful now, but their failure modes
should be tracked:

- generic-model reversion;
- contextual salience overweighting;
- meaning reconstruction failure;
- instruction persistence failure;
- unsupported confidence;
- context loss;
- premature completion;
- weak validation.

Those observations should drive routing, supervision, and replacement
priorities.

### Build A Hybrid Capability Ladder

The practical ladder from the source text is:

1. Externalize task and project state.
2. Formalize project meanings and current charters.
3. Retrieve relevant context and sources.
4. Add deterministic tools, rules, and validators.
5. Evaluate current external models and harnesses.
6. Route work by demonstrated capability, risk, privacy, and cost.
7. Test local/open models where the surrounding system can support them.
8. Specialize or fine-tune only where real evidence shows it is the right next
   lever.
9. Explore new model architectures only after simpler owned-system improvements
   are exhausted or clearly insufficient.

### Define "Better AI" Operationally

For this system, better AI means better performance on Colin's actual workflow,
not just larger models or generic benchmark scores.

Evaluation criteria should include:

- goal alignment;
- meaning alignment;
- project continuity;
- instruction persistence;
- state accuracy;
- existing-structure reuse;
- validation reliability;
- reduced supervision burden;
- cost;
- privacy and local control;
- adaptability to project-specific procedures.

### Use Model-Independent Task Packages

Task context should be portable across Codex, ChatGPT, local models, tools, and
human agents. A task package should include:

- desired outcome;
- current state;
- statement roles where useful;
- scope and non-goals;
- project rules;
- relevant resources;
- uncertainties;
- acceptance criteria;
- validation commands;
- authority boundaries.

The task package is not the whole project and should not become prompt stuffing.

## Existing AMS Coverage

AMS v2 already partially supports this direction through:

- `goal_ams_v2_owned_agent_system_long_term`
- `goal_ams_v2_hybrid_explicit_knowledge_intelligence_architecture`
- `goal_ams_v2_real_cross_project_work_loop`
- `goal_superstructure_ams_integration`
- agent work packets;
- agent preparation packets;
- local retrieval;
- dependency-reduction reports;
- route/evaluation evidence;
- run, artifact, review, decision, and memory records.

This is enough to continue with evidence-driven work. It is not enough to treat
the owned AI system as implemented.

## Gap Found

The live AMS state did not have a distinct project for the owned AI system. That
was a real representational problem because it made the owned AI direction easy
to collapse into AMS implementation work.

The live AMS state also lacked an active external-AI utilization goal, even
though external AI remains the dominant delegated capability and the source text
requires evidence about its affordances and failures.

## AMS State Created

Created project:

- `project_owned_ai_system`
  - Name: Colin's Owned AI System

Created goal:

- `goal_owned_ai_hybrid_capability_system`
  - Project: `project_owned_ai_system`
  - Title: Build Colin's hybrid owned-AI capability system

Created owned-AI tasks:

- `task_owned_ai_define_capability_ladder_from_source_state`
- `task_owned_ai_define_better_ai_evaluation_criteria`
- `task_owned_ai_inventory_explicit_knowledge_substrates`

Created AMS-side goal:

- `goal_ams_v2_external_ai_utilization_profile`
  - Parent: `goal_ams_v2_owned_agent_system_long_term`
  - Title: Use external AI effectively while replacing dependencies

Created AMS-side tasks:

- `task_ams_v2_create_external_ai_operational_profile_v0`
- `task_ams_v2_define_model_independent_task_package_contract`

## What Was Not Created

No schema changes were made.

No new model runtime was proposed as an immediate implementation task.

No new ontology entities were created for failure modes such as
`GenericModelReversion` or `ContextualSalienceOverweighting`.

No broad scheduler, worker pool, or autonomous multi-agent expansion was added.

## Recommended Work Order

1. Complete `task_owned_ai_define_capability_ladder_from_source_state`.
2. Complete `task_ams_v2_create_external_ai_operational_profile_v0`.
3. Complete `task_owned_ai_define_better_ai_evaluation_criteria`.
4. Use `task_ams_v2_select_first_real_cross_project_work` and
   `task_ams_v2_test_statement_roles_in_real_work_selection` as the first real
   evidence loop.
5. Only then decide whether `task_ams_v2_define_model_independent_task_package_contract`
   should result in implementation changes.

## Practical Guardrail

Do not let the owned-AI project become abstract AI speculation.

Each next task should answer:

- What external-AI affordance is being replaced or improved?
- What current AMS/Superstructure state supports it?
- What evidence would show improvement?
- What does this reduce: cost, privacy exposure, context loss, supervision
  burden, validation weakness, or provider dependence?
