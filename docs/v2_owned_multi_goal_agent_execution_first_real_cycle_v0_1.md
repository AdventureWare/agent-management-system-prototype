# V2 Owned Multi-Goal Agent Execution First Real Cycle v0.1

Date: 2026-07-14
Status: Proof artifact

## Purpose

Record the first real AMS v2 task launched through the new owned agent
execution-cycle command.

This proof is intentionally small. It verifies that the command can select
ready active-goal work, create a provider-linked run, return bounded packet
context, expose closeout guidance, and leave review/acceptance explicit.

## Task

- Task: `task_v2_owned_multi_goal_agent_execution_first_real_cycle`
- Goal: `goal_ams_v2_owned_multi_goal_agent_execution`
- Run: `run_v2_owned_multi_goal_agent_execution_first_real_cycle`
- Provider: `provider_codex_external`

## Command Used

```sh
npm run v2:core-db -- agent-execution-cycle \
  --project project_ams_v2_core \
  --provider provider_codex_external \
  --run run_v2_owned_multi_goal_agent_execution_first_real_cycle \
  --compact \
  --json
```

## Result

The command returned `status: launched`.

It selected:

`task_v2_owned_multi_goal_agent_execution_first_real_cycle`

It created:

`run_v2_owned_multi_goal_agent_execution_first_real_cycle`

It transitioned the task from `ready` to `in_progress`.

It returned a compact work packet containing:

- task contract;
- active goal;
- provider-linked current run;
- trusted memory references;
- source links;
- stopping conditions;
- closeout command.

The closeout command returned by the cycle was:

```sh
npm run v2:core-db -- managed-run-lifecycle \
  --task task_v2_owned_multi_goal_agent_execution_first_real_cycle \
  --run run_v2_owned_multi_goal_agent_execution_first_real_cycle
```

## Validation Evidence

Before launch, `next-work` selected the dogfood task as the only ready
candidate for `project_ams_v2_core`.

After launch:

- `inspect-task` showed the task as `in_progress`;
- the run status was `planned`;
- the run was linked to `provider_codex_external`;
- dependency-report for the task showed one provider run and no tool
  executions;
- no code changes were needed for this proof artifact.

## What This Proves

AMS v2 can now move from active-goal work selection to a provider-linked run and
bounded execution packet through one command.

This is not full autonomy. It is a repeatable control-loop affordance:

1. choose eligible active-goal work;
2. launch the provider-linked run;
3. provide bounded context;
4. preserve explicit closeout through review and acceptance.

## What This Does Not Prove

This proof does not add or prove:

- background scheduling;
- worker pools;
- local model execution;
- automatic routing;
- automatic review;
- automatic memory promotion;
- mobile write workflows;
- multi-agent fanout.

## Friction Observed

No new implementation follow-up is required from this proof.

The main remaining limitation is expected: execution still depends on external
Codex reasoning and manual closeout. That is already recorded in dependency
evidence and is appropriate for this milestone.

## Recommendation

Close this proof task through `managed-run-lifecycle` with this document as the
accepted artifact.

After acceptance, the milestone should be assessed for completion rather than
automatically extended. The milestone's stated completion criterion was to
complete at least one real AMS v2 task through the execution-cycle path.
