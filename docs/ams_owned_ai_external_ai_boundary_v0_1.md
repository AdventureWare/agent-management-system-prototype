# AMS / Owned AI / External AI Boundary v0.1

Date: 2026-07-15
Status: Responsibility boundary note

## Purpose

Define the responsibility boundaries among AMS, owned AI, external AI providers, individual models, Superstructure, and real projects.

This is a conceptual and operating boundary. It does not implement a new architecture, schema, route, workflow, or scheduler.

## Core Separation

| System | Responsibility | Not responsible for |
| --- | --- | --- |
| Colin | Principal agent, value authority, risk acceptor, final goal authority | Being replaced by AMS or an AI model |
| AMS | Persistent coordination/control state for goals, projects, tasks, runs, evidence, reviews, decisions, memory, continuation, and authority | Being the intelligence itself or one fixed planning algorithm |
| External AI providers | Current delegated reasoning, coding, writing, analysis, and action capability | Being authoritative project memory or permanent architecture |
| Owned AI system | Progressively developed local/owned capability provider that can reason, retrieve, validate, use tools, plan, and act using AMS state | Being identical to AMS or necessarily one model |
| Individual AI models | Replaceable inference components inside external or owned AI systems | Owning goals, project state, authority, evidence, or memory |
| Superstructure | Shared representational/world-modeling substrate: ontology, claims, evidence, mechanisms, uncertainty, and meaning alignment | Running tasks, accepting work, or replacing project-specific authority |
| Projects | Concrete desired outcomes, repositories, artifacts, constraints, and execution environments | Serving as universal mission/strategy containers |

## Boundary Rules

1. AMS owns authoritative work state.
2. Models and providers produce proposals, actions, and evidence; they do not own truth.
3. Owned AI may become a better capability provider, but AMS should still preserve goals, state, authority, evidence, and continuation independently of any model.
4. Superstructure can improve meaning, representation, retrieval, and validation, but it should not swallow all projects into ontology work.
5. External AI output is proposal/evidence until reviewed or promoted.
6. A provider run is not a task. A task may survive many runs.
7. A model is not an agent profile, workflow, project, memory item, or decision.
8. A context bundle is not the whole project and should not become prompt stuffing.
9. Replacing external AI should proceed capability by capability, not by pretending a local model already replaces Codex or ChatGPT.

## Current AMS State By Responsibility

### AMS

Current primary structure:

- Project: `project_ams_v2_core`
- Goal: `goal_ams_v2_owned_agent_system_long_term`

Assessment:

Strong active match. AMS v2 already coordinates goals, tasks, runs, artifacts, reviews, decisions, memory, next-work, goal-triage, operator-console, dependency reports, and continuity audits.

Needed correction:

Clarify that this goal is about the coordination/control layer, not the entire owned AI system.

### External AI Providers

Current evidence:

- `provider_codex_external`
- `provider_local_codex`
- `provider_ams_v2_dispatch_vertical_codex`

Dependency report summary for AMS v2 Core showed:

- 224 runs
- 214 provider runs
- 119 tool executions

Assessment:

External AI is still the dominant delegated reasoning/execution capability. AMS records this dependency, but it does not yet have a durable active goal specifically for operational profiling of external AI products and harnesses.

Potential future goal:

Maximize current external-AI capability.

Do not create it until there is a concrete first task, such as producing a dated Codex/ChatGPT operational profile from recent AMS runs.

### Owned AI System

Current evidence:

AMS v2 has providerless/local-tool evidence for several coordination capabilities:

- agent-control-surface
- agent-execution-cycle
- agent-work-packet
- closeout-packet
- local-retrieval

Dependency-reduction report classified five capabilities as hybrid candidates and retirement candidates for external-provider dependence, based on local tool evidence.

Assessment:

This is not yet an owned AI system. It is an early owned control/tool substrate that reduces external-AI dependence for specific operations. The owned AI system still needs a distinct boundary and first capability target.

Potential future goal:

Build Colin's Owned Artificial-Intelligence Capability.

Do not create it as a broad active goal until a concrete first capability target is chosen.

### Individual Models

Current representation:

- `ModelProvider` exists in v2 core state.
- Runs link to providers.
- Route/dependency evidence exists.

Assessment:

Models/providers are represented as execution backends, which is correct. They should not become project state owners.

Needed correction:

Avoid naming the owned-AI project "Colin's AI Model" unless the task is specifically model training or inference. The desired capability is broader than one model.

### Superstructure

Current primary structure:

- Project: `project_superstructure_program`
- Goal: `goal_superstructure_program`
- Workstreams:
  - `goal_superstructure_ontology`
  - `goal_superstructure_world_model`
  - `goal_superstructure_dynamics_simulation`
  - `goal_superstructure_epistemic_evidence`
  - `goal_superstructure_shared_tooling`
  - `goal_superstructure_ams_integration`

Assessment:

Strong active match. Superstructure already has the right responsibility split. It should remain the representational/world-modeling foundation, not the AMS itself and not the owned AI system itself.

### Real Projects

Current examples:

- Kwipoo app
- Silver Oak
- 3D Modeling and Game Development
- Superstructure work

Assessment:

Real application work exists and is visible in `next-work`. The active AMS milestone `goal_ams_v2_real_cross_project_work_loop` is the right current proof that the capability system is not just planning itself.

## Terms Not To Conflate

| Term | Do not conflate with |
| --- | --- |
| AMS | owned AI system, Codex, ChatGPT, Superstructure, task tracker |
| Owned AI system | one model, AMS, local retrieval, Superstructure |
| ModelProvider | AgentProfile, model, product surface, provider company, task executor |
| Run | Task, Agent, Session as durable project state |
| Artifact | MemoryItem by default |
| Evidence | Result text, AI confidence, acceptance |
| Goal | Project, task, milestone entity |
| Project | rigid tree, repository only, mission |
| Superstructure | all knowledge, all projects, AMS itself |

## Future Goal Gaps

### External-AI utilization

Missing active goal:

Use ChatGPT, Codex, and other external AI systems effectively.

First possible task:

Produce a dated Codex/ChatGPT operational profile from recent AMS v2 runs, identifying recurring failure modes, useful affordances, correction persistence, context mechanisms, and task classes that still require close supervision.

### Owned AI capability

Missing active goal:

Build Colin's Owned Artificial-Intelligence Capability.

First possible task:

Select the first owned-AI replacement capability target using existing dependency-reduction evidence. Candidate target: one of agent-control-surface, closeout-packet, local retrieval, agent-work-packet, or execution-cycle support.

### Knowledge/tool substrate

Partially covered by:

- Superstructure Program
- AMS v2 local retrieval/memory/tool evidence
- project repositories and artifacts

Do not create a broad substrate goal yet. Create one only when a concrete cross-project substrate gap blocks real work.

## Recommended Next Concrete Task

Run the real cross-project work proof:

- `task_ams_v2_select_first_real_cross_project_work`

Reason:

The boundary is now clear enough to avoid conflating AMS, owned AI, external AI, and Superstructure. The next best evidence is not more terminology. It is to select one real non-AMS task and run it through AMS v2 with bounded context, execution evidence, review, and closeout.

## Non-Actions

- Did not create an owned-AI system goal.
- Did not create an external-AI utilization goal.
- Did not create a knowledge/tool substrate goal.
- Did not change schema.
- Did not add a model registry.
- Did not change provider routing.
- Did not move or reparent goals.
- Did not claim local tools already replace external AI reasoning.
