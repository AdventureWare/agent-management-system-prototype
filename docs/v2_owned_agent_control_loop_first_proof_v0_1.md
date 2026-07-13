# V2 Owned-Agent Control Loop First Proof v0.1

Date: 2026-07-13
Status: Proof artifact

## Purpose

Test whether AMS v2 can serve as the agent's control loop for a real bounded
piece of work.

This proof intentionally did not add schema, lifecycle states, scheduling,
local-model runtime, routing policy, dashboard UI, or broad automation. The
point was narrower: use existing v2 state and commands to select work, build
context, run a provider-backed task, produce an artifact, and close the task
through review and acceptance records.

## Scope

Goal:

- `goal_ams_v2_owned_agent_control_loop`
- Title: Use AMS v2 as the owned-agent control loop

Task:

- `task_v2_owned_agent_control_loop_execute_first_proof`
- Title: Execute first owned-agent control-loop proof

Run:

- `run_v2_owned_agent_control_loop_execute_first_proof`
- Provider: `provider_codex_external`

Produced artifact:

- `docs/v2_owned_agent_control_loop_first_proof_v0_1.md`

## Command Sequence

The run used AMS v2 state first, then provider-backed work.

1. Checked repo cleanliness.

   Command:

   ```sh
   git status --short
   ```

   Result: clean before artifact edits.

2. Requested the selected work packet.

   Command:

   ```sh
   npm run v2:core-db -- agent-control --agent-action packet --task task_v2_owned_agent_control_loop_execute_first_proof --json
   ```

   Result: returned a source-linked packet with task contract, readiness,
   context sources, trusted memory, dependency summary, evaluation evidence,
   validation expectations, allowed actions, stopping conditions, and source
   links.

3. Queried local v2 retrieval.

   Command:

   ```sh
   npm run v2:core-db -- agent-control --agent-action search --project project_ams_v2_core --query "owned agent control loop agent-control work packet search lifecycle external AI dependency" --json
   ```

   Result: returned the current proof task, the proof plan task, the owned-agent
   control-loop goal, the accepted proof-plan artifact, the planning run, and
   related evaluation and route-comparison records.

4. Read the proof plan from the repo.

   Command:

   ```sh
   sed -n '1,240p' docs/v2_owned_agent_control_loop_proof_plan_v0_1.md
   ```

   Result: confirmed the planned proof sequence, acceptance criteria,
   non-goals, validation expectations, and follow-up policy.

5. Checked task-level dependency evidence before provider launch.

   Command:

   ```sh
   npm run v2:core-db -- dependency-report --task task_v2_owned_agent_control_loop_execute_first_proof --json
   ```

   Result: task-level dependency report showed no provider or tool usage before
   the run was launched.

6. Launched a provider-backed run through v2 state.

   Command:

   ```sh
   npm run v2:core-db -- launch-provider-run --task task_v2_owned_agent_control_loop_execute_first_proof --run run_v2_owned_agent_control_loop_execute_first_proof --provider provider_codex_external --input "Execute first owned-agent control-loop proof from source-linked packet and local retrieval; produce docs/v2_owned_agent_control_loop_first_proof_v0_1.md and close through managed lifecycle."
   ```

   Result: task moved from `ready` to `in_progress`, run
   `run_v2_owned_agent_control_loop_execute_first_proof` was recorded against
   `provider_codex_external`, and the returned packet reflected the current run
   as evidence.

## Context Sources Used

The run used these durable sources rather than relying only on chat history:

- task contract for `task_v2_owned_agent_control_loop_execute_first_proof`;
- goal contract for `goal_ams_v2_owned_agent_control_loop`;
- proof plan artifact in `docs/v2_owned_agent_control_loop_proof_plan_v0_1.md`;
- local retrieval results from `agent-control --agent-action search`;
- trusted memory records included in the work packet:
  - `memory_v2_core_next_work_context`;
  - `memory_v2_core_lineage_source_refs`;
  - `memory_v2_core_review_acceptance_gates`;
  - `memory_v2_core_provider_tool_usage`;
  - `memory_v2_core_snapshot_export_import`;
  - `memory_v2_core_operator_console`;
  - `memory_v2_core_artifact_queue_semantics`;
  - `memory_v2_core_operator_console_ui_slice`;
- evaluation evidence for:
  - `agent-work-packet`;
  - `agent-control-surface`;
  - `local-retrieval`;
- current and prior run evidence for the owned-agent control-loop milestone.

## Result

The proof succeeded at the intended level.

AMS v2 provided the control-plane state needed to run a bounded piece of work:

- the selected task was represented in v2 state;
- the goal/task relationship was explicit;
- the agent started from a source-linked work packet;
- local retrieval found relevant v2 records;
- provider usage was explicitly tied to a run and task;
- review/acceptance gates are available for closeout through the existing
  managed lifecycle helper;
- no new domain entity, schema table, lifecycle state, scheduler, local-model
  runtime, routing policy, dashboard, or broad UI was needed.

This is not full autonomy. The agent still performed the reasoning and command
choreography. But the task selection, context, provider-run evidence, and
closeout path were anchored in owned AMS v2 records instead of only in the
external AI chat.

## External-AI Affordances Still Used

This run still depended on Codex/external AI for:

- interpreting the task contract and plan;
- deciding which commands to run and in what order;
- synthesizing command output into an artifact;
- identifying friction;
- deciding whether friction justified a follow-up;
- writing the proof artifact;
- preparing task closeout evidence.

AMS v2 owned or locally represented these affordances:

- task and goal state;
- source-linked work packet;
- local retrieval over v2 records;
- provider-run record;
- dependency-report readback;
- artifact/review/decision lifecycle path;
- trusted memory and evaluation evidence surfaced in context.

The near-term gap is not "replace Codex entirely." The near-term gap is to
reduce how much command choreography and context compression depends on Codex.

## Validation

Validation performed:

- `git status --short` before edits: clean.
- `agent-control packet` returned source-linked task context.
- `agent-control search` returned relevant v2 records and inclusion reasons.
- `dependency-report` before provider launch showed no task-level dependency.
- `launch-provider-run` recorded the provider run and moved the task to
  `in_progress`.
- This artifact records the command sequence, context sources, result, and
  provider dependency observations.

No application code changed, so focused tests and `npm run check` were not
required for this proof artifact.

## Observed Friction

The existing `agent-control` surfaces are usable, but their default JSON output
is verbose for live agent conversation. `agent-control packet` is valuable, but
it returns enough detail that the rendered prompt may be truncated. The earlier
`agent-control next` output was also large enough to exceed the usable
conversation window during this run.

This is a real owned-agent affordance gap: the system can build the right
context, but it needs a compact mode for agent selection and continuation so an
agent can avoid wasting context budget before doing the work.

## Recommended Follow-Up

Create one follow-up task:

`task_v2_owned_agent_control_loop_compact_agent_control_readbacks`

Purpose:

Add or expose a compact readback path for `agent-control next` and packet-style
task continuation. The compact output should preserve source links, task
contract, readiness, top context sources, top trusted memory, current run state,
and stopping conditions, while omitting bulky rendered prompt text and long
evidence lists unless explicitly requested.

Non-goals:

- no schema changes;
- no new domain entities;
- no scheduler;
- no routing policy;
- no local model work;
- no dashboard;
- no automatic task execution.

Acceptance criteria:

- a compact next/packet readback is available through an existing CLI/API
  surface;
- full packet output remains available when explicitly requested;
- source links and stopping conditions are preserved;
- at least one test or CLI validation proves the compact output is smaller and
  still sufficient for the current owned-agent control-loop task handoff.

## Conclusion

AMS v2 is far enough along to act as the project control plane for a bounded
provider-backed agent task. It does not yet replace Codex reasoning, but it can
own the task contract, context bundle, run record, dependency evidence, artifact
record, and closeout path.

The next useful improvement is compact agent-control readbacks, not broader
governance or more entities.
