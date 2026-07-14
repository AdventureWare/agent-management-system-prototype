# AMS v2 Agent Preparation Real-Work Dogfood Plan v0.1

## Purpose

Use the existing `agent-preparation-packet` capability in real dispatched work. The goal is not to add new ontology, fields, schedulers, routing policy, or context systems. The goal is to make agent preparation an operational step before execution and a review question after closeout.

## Current Evidence

The current planning task is `task_ams_v2_agent_preparation_real_work_plan` under goal `goal_ams_v2_agent_preparation_real_work_loop`.

The live `agent-preparation-packet` readback already provides the needed first slice:

- task and goal contract
- readiness
- knowledge, workflow, source-context, constraint, and verification requirements
- selected resources with source and inclusion reason
- gap assessment
- execution package
- preparation-review questions
- acceptance checks

The packet does not require new persistent entities for the first dogfood pass.

## Required Pre-Run Step

Before launching a real task selected for this milestone, run:

```bash
npm run v2:core-db -- agent-preparation-packet --task <task_id> --json
```

Use the packet to decide:

- whether the task is ready to run
- what context/resources should be included
- whether any gap is blocking
- whether optional gaps can be deferred
- what verification evidence must be captured

Do not paste the entire packet into a prompt. Use it as structured state. Include only context that can affect decisions, actions, interpretation, or verification.

## Closeout Evidence

Every dogfood task should close with evidence for:

- which preparation packet was read before execution
- whether selected resources were sufficient
- whether any important missing context appeared during execution
- whether the gap classification was correct
- whether irrelevant context caused confusion
- whether reusable learning should become memory, a skill update, or a follow-up task

For the first slice, record this in the run result, validation summary, review summary, decision rationale, or follow-up task text. Do not add new fields yet.

## First Two Dogfood Domains

1. AMS development: use preparation on `task_ams_v2_mobile_operator_control_slice_plan`.
   This tests whether preparation improves another AMS v2 planning/implementation flow.

2. Non-AMS work: use preparation on a real imported project task, preferably Silver Oak or Kwipoo.
   Current ready candidates include:

- `task_v2_silver_oak_select_next_source_backed_modeling_pass`
- `task_ae273e23-869b-4c97-9897-b1cca6f18b40`
- `task_a1e5f732-8944-472c-9422-834f17d6a33a`
- `task_ffde1c0b-3f41-4bf0-9e89-3f7672ffd527`

Silver Oak is the better second domain because it is substantially different from AMS software work and stresses source-backed context selection.

## Anti-Bloat Rules

- Do not create a `Capability`, `Requirement`, `ContextPackage`, `Gap`, or `PreparationReview` entity for the first dogfood pass.
- Do not add preparation-specific fields to tasks, runs, or reviews yet.
- Do not create a dashboard before the loop proves useful in at least two domains.
- Do not convert every missing detail into a blocking gap.
- Do not promote AI output to memory without reviewed evidence.
- Do not duplicate existing skills or memory when a follow-up can extend an existing resource.
- Treat preparation quality as review evidence first, not as a new scoring system.

## Minimal Workflow

1. Select a ready task through `next-work`.
2. Run `agent-preparation-packet` for that task.
3. Classify gaps as blocking, helpful non-blocking, discoverable during execution, or deferred/irrelevant.
4. Launch or execute the task only if no blocking gap remains.
5. Close out the task through the managed-run lifecycle.
6. Include preparation sufficiency in validation/review/acceptance evidence.
7. Create follow-up work only for real gaps that affected execution or are likely to recur.

## Next Executable Task

Create and run a follow-up task under `goal_ams_v2_agent_preparation_real_work_loop`:

`Dogfood agent preparation on mobile operator-control planning`

This task should use `agent-preparation-packet` before working on `task_ams_v2_mobile_operator_control_slice_plan`, record whether the preparation packet changed the work plan, and close with evidence about whether the preparation was sufficient.

## Success Criteria For This Plan

This plan is sufficient when:

- it names the exact pre-run preparation readback
- it names the closeout evidence to capture
- it selects two concrete dogfood domains
- it rejects new schema and entity expansion for the first pass
- it creates a next executable task
