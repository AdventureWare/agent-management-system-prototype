# AMS Capability-System Goal/Project Mapping v0.1

Date: 2026-07-15
Status: Reconstruction and mapping artifact

## Purpose

Map the current AMS v2 project and goal graph against the proposed personal goal-directed capability-system architecture.

This is not an implementation pass and not a broad goal rewrite. The purpose is to identify what already exists, what is missing, what can be derived, and what should not be created blindly.

## Source State Inspected

- AMS v2 database: `data/v2-core.sqlite`
- Goal/task creation guidance: `docs/ams_goal_task_creation_guide.md`
- Superstructure reconciliation: `docs/v2_superstructure_v1_goal_reconciliation_v0_1.md`
- V1 import result: `docs/v2_full_v1_sqlite_import_v0_1.md`
- Current `next-work` readback
- Current `goal-triage --project project_ams_v2_core`
- Direct read-only project/goal topology readback

## Current Topology Summary

Goal status counts:

| Status | Count |
| --- | ---: |
| active | 17 |
| completed | 42 |
| paused | 60 |
| superseded | 2 |

Active projects in v2: 22.

The active goal graph is not empty or stalled. It contains:

- AMS v2 Core long-term work;
- Superstructure Program and workstreams;
- Kwipoo app work;
- Silver Oak property digital twin work;
- 3D Modeling and Game Development work;
- several imported active projects that have goals but little or no current task work.

## Key Current Active Goals

### AMS v2 Core

- `goal_ams_v2_owned_agent_system_long_term` - Build an owned local-first agent operating layer.
- `goal_ams_v2_align_capability_system_strategy` - Align existing AMS with the capability-system strategy.
- `goal_ams_v2_project_state_source_of_truth_alignment` - Make AMS v2 project state self-orienting.
- `goal_ams_v2_real_cross_project_work_loop` - Run real cross-project work through AMS v2.

### Superstructure

- `goal_superstructure_program` - Build and operate the Superstructure world-modeling program.
- `goal_superstructure_ontology` - Develop and stabilize the Superstructure Ontology.
- `goal_superstructure_world_model` - Develop the Present Earth / World Model application layer.
- `goal_superstructure_dynamics_simulation` - Develop dynamics and simulation planning.
- `goal_superstructure_epistemic_evidence` - Maintain epistemic and evidence discipline.
- `goal_superstructure_shared_tooling` - Maintain shared validation and tooling support.
- `goal_superstructure_ams_integration` - Operationalize Superstructure through AMS and owned-AI workflows.

### Real Application Projects

- `goal_9d2f54c4-9a20-4bd4-b023-c8198a6c52a7` - My Grandma and I consistently use Kwipoo.
- `goal_d6d74659-eb0f-4060-8343-ee8d3f577117` - Get a paying Kwipoo customer.
- `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` - Build the Silver Oak Property Digital Twin.
- `goal_0a64ed99-63c9-4620-9411-5a173c9a85b9` - Silver Oak: Measurement Database.
- `goal_d62ed300-28f5-47ee-a28f-9133cbf95cee` - Ship a small beatable Unity game.
- `goal_0011e4ec-7b0f-4e7c-8c7e-5640a1188752` - Package and playtest the Snack Run ship candidate.

## Proposed Architecture Mapping

### Goal 0 - Contribute to Long-Term Thriving

Classification: missing as an explicit AMS goal.

Current matches:

- No exact active goal in AMS v2.
- Some imported project summaries and user-level strategy imply this mission, but it is not represented as a durable top-level goal.

Recommendation:

Do not create this automatically in this pass. Create an operator decision task first. This is a high-level values/mission goal, and its wording matters. If accepted, it should become a stable top-level goal above the capability-system strategy, not an implementation milestone.

### Goal 1 - Expand Colin's Sustainable Goal-Achievement Capacity

Classification: partial match / missing explicit parent.

Current matches:

- `goal_ams_v2_owned_agent_system_long_term` partially expresses this for AMS and owned/local agent operations.
- The existing active project portfolio expresses concrete applications, but there is no single parent goal that says the broader system exists to expand one human's sustainable goal-achievement capacity.

Recommendation:

Create only after Goal 0 / Goal 1 wording is reviewed. It should probably be the parent for AMS, external-AI utilization, owned-AI development, knowledge/tool substrate, and real application projects.

### Goal 1A - Build and Operate the Agent Management System

Classification: exact/strong partial match.

Current match:

- `goal_ams_v2_owned_agent_system_long_term`

Current title:

Build an owned local-first agent operating layer.

Assessment:

This is close to the proposed AMS responsibility. It already distinguishes durable work state, routing, evidence, context, and replacement of external-AI affordances. It should not be replaced. It may need a future wording revision to clarify that AMS coordinates work and is not the owned AI system itself.

### Goal 1B - Maximize Current External-AI Capability

Classification: derivable from completed evidence, missing as active goal.

Current matches:

- Completed route-comparison and providerless evidence goals.
- Model/provider dependency reports and provider/run records.
- Current dependence on `provider_codex_external` in run evidence.

Assessment:

The capability exists in fragments, mostly as completed AMS v2 milestones and dependency evidence. There is no active long-running goal for external-AI utilization research, operational profiles, failure modes, correction persistence, or supervision burden.

Recommendation:

Create a small active goal later only if it has a first concrete task, such as "Produce external-AI operational profile for Codex/ChatGPT from recent AMS runs." Do not create a broad metrics program now.

### Goal 1C - Build Colin's Owned Artificial-Intelligence Capability

Classification: partial match / missing distinct active system goal.

Current matches:

- `goal_ams_v2_owned_agent_system_long_term` includes progressively replacing external-AI affordances.
- Completed providerless/local-tool evidence goals prove small replacement slices.

Gap:

Owned AI is currently conflated with AMS v2 in the long-term goal. The proposed distinction is correct:

- AMS preserves authoritative goals, work state, authority, evidence, and continuation.
- Owned AI proposes, reasons, plans, retrieves, validates, and acts.

Recommendation:

Do not rename AMS into the owned AI system. Add a future decision/task to define the owned-AI capability boundary and first replacement target once the current cross-project work proof is underway.

### Goal 1D - Build the Knowledge and Tool Substrate

Classification: partial match across Superstructure, AMS memory/tooling, and project repositories.

Current matches:

- Superstructure Program and workstreams.
- AMS v2 memory, retrieval, tool, evaluation, and dependency evidence.
- Project repositories and imported artifact records.

Gap:

No single active goal owns the cross-project substrate as a general support layer. Some parts live under Superstructure, some under AMS v2, and some remain implicit in project repos.

Recommendation:

Treat this as a derived layer for now. Do not create a separate goal until a concrete substrate gap blocks real work, such as missing source-card conventions, tool contracts, retrieval quality, or project charter structure.

### Goal 2 - Build the Superstructure World-Modeling System

Classification: exact match.

Current match:

- `goal_superstructure_program`

Assessment:

The current Superstructure v2 program is better than the proposed sketch in one respect: it already separates program, ontology, world model, dynamics/simulation, epistemic/evidence, AMS integration, and shared tooling. Do not import or recreate the older v1 SG1-SG10 hierarchy.

### Goal 3 - Apply the Capability System to Real Projects

Classification: partial match / active proof underway.

Current matches:

- `goal_ams_v2_real_cross_project_work_loop`
- Kwipoo app active work.
- Silver Oak active work.
- 3D Modeling and Game Development active work.
- Superstructure ready work.

Assessment:

The proposed Goal 3 is not yet represented as a stable top-level goal, but the active AMS v2 milestone is directly testing it. The immediate proof should use current ready work rather than creating a broad "apply capability system" parent goal now.

## Proposed Goal Classification Table

| Proposed item | Classification | Current structure | Action |
| --- | --- | --- | --- |
| Goal 0: Contribute to Long-Term Thriving | missing | none explicit | operator decision before creation |
| Goal 1: Expand Colin's Sustainable Goal-Achievement Capacity | partial/missing explicit parent | AMS v2 long-term plus project portfolio | operator decision before creation |
| Goal 1A: Build and operate AMS | exact/strong partial | `goal_ams_v2_owned_agent_system_long_term` | preserve; maybe clarify wording later |
| Goal 1B: Maximize external AI | derivable/missing active | provider/run/dependency evidence and completed route goals | create only with concrete first task |
| Goal 1C: Build owned AI system | partial/missing distinct goal | AMS v2 long-term and providerless proofs | define boundary before creation |
| Goal 1D: Knowledge/tool substrate | partial/derived | Superstructure, AMS retrieval/memory/tools, repos | defer until a concrete gap blocks work |
| Goal 2: Superstructure | exact | `goal_superstructure_program` and children | preserve |
| Goal 3: Apply to real projects | partial/active proof | `goal_ams_v2_real_cross_project_work_loop` and real project tasks | continue current proof |

## Contradictions And Overlaps

### AMS vs owned AI is still blurry

The current AMS long-term goal includes both coordination-system work and replacement of external-AI affordances. That was acceptable for bootstrapping v2, but the proposed distinction is better for long-term clarity.

Correction:

Clarify in docs and future goals that AMS is the persistent coordination/control system, while owned AI is a capability provider that may use AMS state.

### External-AI utilization is evidence, not yet a durable active goal

AMS v2 records model-provider runs and dependency reports, but it lacks an active goal for learning how to use external providers well while replacing them.

Correction:

Create a narrow external-AI operational-profile task later if recent runs show repeated provider/harness failures.

### Top-level mission is not represented

The active graph starts at AMS v2, Superstructure, and individual projects. It does not contain the ultimate mission layer.

Correction:

Use an operator decision task before adding the mission. Do not let an AI agent silently hardcode values wording.

### Imported projects still vary in charter quality

Some active projects have good summaries and clear goals. Others are active containers with sparse or imported summaries.

Correction:

Use the existing `goal_ams_v2_project_state_source_of_truth_alignment` work to define compact current-state/charter expectations before trying to normalize every project.

### Real work is available, but AMS can still over-focus on itself

Global `next-work` currently exposes real non-AMS tasks from 3D Modeling, Kwipoo, Silver Oak, and Superstructure. AMS v2 also has internal alignment tasks.

Correction:

Keep both tracks visible: one corrective alignment track and one real cross-project execution proof. Do not let alignment work indefinitely displace real project work.

## Smallest Recommended Corrections

1. Complete `task_ams_v2_write_current_operating_state_source` so agents have one first-read current-state document.
2. Execute `task_ams_v2_select_first_real_cross_project_work` so the capability system is tested on real project work, not only alignment documents.
3. Create a future operator-decision task for whether to add Goal 0 and Goal 1 as explicit top-level goals.
4. Create a future boundary-definition task for Owned AI vs AMS vs external-AI provider capabilities.
5. Do not create Goal 1B, Goal 1C, or Goal 1D as broad active goals until each has a concrete first task and a clear owner.
6. Preserve the existing Superstructure Program structure; it already matches the proposed architecture.
7. Keep historical imported goals as evidence unless a live project needs them revised.

## One Real Exercise Task

Use the existing ready task:

- `task_ams_v2_select_first_real_cross_project_work`
- Goal: `goal_ams_v2_real_cross_project_work_loop`

Why this task:

- It directly tests Goal 3: apply the capability system to real projects.
- It uses the cleaned cross-project queue instead of adding more internal process.
- It can select from actual ready work:
  - 3D Modeling: `task_7f8a4d11-6543-4b46-b855-c72aa5cc138c`
  - Kwipoo app: `task_9e7be60e-ea53-4930-9aab-4edf4a6d9159`
  - Silver Oak: `task_silver_oak_capture_bw08_bw09_field_measurements`
  - Superstructure: ready continuation/review tasks

Current next action:

Run the selection task, choose one real non-AMS task, prepare its context, and execute it through AMS v2 with evidence, review, and closeout.

## Non-Actions From This Pass

- Did not create the full proposed hierarchy.
- Did not add a `Milestone` entity.
- Did not change schema.
- Did not merge or supersede existing goals.
- Did not create a new project taxonomy.
- Did not rewrite Superstructure structure.
- Did not promote imported or AI-generated content to canonical memory.

## Recommendation

The proposed architecture is directionally right, especially the distinction:

- Colin: principal agent and goal authority.
- AMS: persistent coordination and control system.
- External AI providers: delegated current capabilities.
- Owned AI system: progressive replacement and extension capability.
- Individual models: replaceable components.
- Superstructure: shared representational/world-model foundation.

The current AMS state already contains useful pieces of this architecture, but the top two layers and the owned-AI/external-AI distinction are not explicit enough. The next step should be a small decision-oriented correction, not a broad import of the proposed hierarchy.
