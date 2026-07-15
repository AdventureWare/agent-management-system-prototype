# AMS Real Cross-Project Work Requirements From Resume v0.1

Date: 2026-07-15
Status: Task-context note
Source: `codex resume 019f2397-99b9-78e0-ae60-9f0eeb943425`

## Purpose

Capture the relevant requirements and considerations from the resumed Codex
session before selecting the first real non-AMS task for
`goal_ams_v2_real_cross_project_work_loop`.

This note does not create a new goal, entity, schema, UI, or governance process.
It constrains the next selection task.

## Requirements To Carry Forward

### Prove Real-World Use

The next task should advance the larger requirement:

AMS, owned/external AI, and Superstructure should measurably improve progress on
real projects rather than becoming a self-contained planning and ontology
exercise.

Candidate domains from the resumed session include:

- Kwipoo
- property digital twin / 3D property modeling
- simulation and game projects
- software products
- research and writing
- home and infrastructure work
- AI-system replacement
- Superstructure itself

### Preserve Responsibility Boundaries

The selection should preserve this separation:

- Colin: principal goal authority and risk acceptor.
- AMS: persistent coordination, authoritative work state, evidence, and
  continuation.
- External AI providers: current delegated capability.
- Owned AI system: future owned/local capability provider.
- Individual models: replaceable components.
- Superstructure: representation, world knowledge, mechanisms, evidence, and
  meaning.
- Projects: concrete desired outcomes and execution environments.

Do not conflate AMS with owned AI, Codex, ChatGPT, Superstructure, a prompt
library, or a task tracker.

### Use Project Engineering Mode

The resumed session defined a cross-project engineering policy:

- Exploration: high uncertainty; optimize for learning, cheap experiments, and
  reversibility.
- Prototype: test whether a candidate solution produces value; use thin
  end-to-end slices and enough validation to avoid misleading results.
- Stabilization: increase architecture review, state ownership clarity, tests,
  docs, and migration planning.
- Production / high impact: require stronger validation, review, rollback,
  monitoring, access control, and migration safety.

Selection rule:

Engineering rigor should scale with risk, irreversibility, uncertainty,
maturity, and blast radius. Universal maximum ceremony and universal rapid
prototyping are both wrong.

### Check Project Charter Sufficiency

Before selecting a candidate task, inspect whether the project exposes enough
current context for an agent to work without relying on chat memory. The resumed
session proposed that each project should have, or be able to expose, a compact
authoritative charter covering:

- purpose
- desired future state
- authoritative responsibility
- in scope
- out of scope
- primary artifacts
- current phase
- engineering mode
- key terminology
- stable constraints
- existing architecture
- validation expectations
- current uncertainties
- current next_action

This does not require a new schema field or large prompt. If a candidate task is
otherwise good but lacks enough charter/context, the selection artifact should
name that as a preparation gap or choose a lower-risk candidate.

### Treat Goals As Revisable Desired States

Goals are models of desired future states, not immutable task buckets. If the
selection reveals that a project goal is stale, duplicate, superseded, or poorly
scoped, record that as a finding and route it for review. Do not silently rewrite
the goal graph during task selection.

### Avoid System Bloat

The resumed session explicitly warned against:

- starting AMS from zero;
- creating every proposed top-level goal automatically;
- adding a separate `Milestone` entity;
- rewriting the AMS architecture broadly;
- creating a separate database entity for every artifact;
- hardcoding the whole operating model into prompt strings;
- expanding dashboards, scheduler behavior, routing automation, or ontology
  structures before real operational evidence exists.

## Implications For `task_ams_v2_select_first_real_cross_project_work`

The selected task should:

1. come from a real non-AMS project;
2. be useful and bounded enough to execute and review;
3. have an identifiable project, goal, and task;
4. have enough charter/context or an explicit preparation gap;
5. use an engineering mode appropriate to its risk;
6. have explicit verification and stop conditions;
7. produce reviewable evidence or a durable artifact;
8. test whether AMS reduces context loss, duplicate work, or manual
   orchestration friction;
9. avoid schema, entity, scheduler, dashboard, routing, or broad architecture
   expansion;
10. preserve the distinction between selecting a task and executing it.

The best next move remains to select one real task, not to do more internal AMS
alignment unless live AMS state surfaces a blocker.
