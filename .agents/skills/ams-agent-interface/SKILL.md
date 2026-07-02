---
name: ams-agent-interface
description: Use when an agent is working inside the Agent Management System from an active Goal, selecting or updating AMS work, creating follow-up tasks, recording run results, or deciding whether work is actionable, blocked, awaiting review, approval-gated, or ready for structured next action.
---

# AMS Agent Interface

Use AMS state and AMS operations as the source of truth. Prompts, chat history, and skills can guide behavior, but goals, tasks, blockers, approvals, reviews, runs, and follow-ups should be read from and written back through structured AMS tools.

This skill is the high-level goal-loop procedure. Use `$ams-control-plane-operations` when you need exact CLI/API/MCP command discipline or current control-plane mutation playbooks.

## Goal-Loop Workflow

1. Resolve canonical context.
   Start with `context current` when running in a managed thread. If no task is resolved, use `manifest`, `manifest --resource goal-loop`, and `goal-loop list_active_goals` to find the active Goal and project.
2. Inspect existing work before creating anything.
   Use `goal-loop get_goal_context`, `get_goal_progress`, `get_actionable_work`, `get_blocked_work`, and `get_awaiting_review` before creating tasks. Prefer updating or linking existing tasks over creating duplicates.
3. Choose one next action.
   Use `goal-loop get_next_recommended_action` as the default work selector. Use `goal-loop explain_task_eligibility --task <taskId>` before launching, changing status, or marking a task blocked.
4. Get a bounded work packet.
   Use `work-packet get_agent_work_packet` for task-mode context. Treat the rendered prompt as one field in a structured packet, not as the system of record.
5. Do or prepare only allowed work.
   Respect task readiness, autonomy, risk, rigor, review, approval, blockers, dependencies, and sandbox/tool limits. Do not bypass review or approval because chat context seems clear.
6. Record outcomes durably.
   Attach artifacts, request review/approval, update task status, record blockers, and create follow-up tasks through AMS operations. Read back the changed state after mutation.
7. Stop only at a real stopping condition.
   Stop when the Goal is met, work is legitimately blocked, user input or approval is required, missing access prevents progress, risk exceeds permission, or ambiguity would create duplicate architecture or contradictory state.

## Classification Rules

- `actionable`: dependencies are met, no open approval/review gate blocks execution, risk/autonomy permits the action, and the task has enough contract to proceed.
- `blocked`: a dependency, missing access, missing decision, unresolved blocker, or external gate prevents progress. Record the blocker on the task or run.
- `needs_planning`: the task is too broad, lacks scope or acceptance criteria, or needs decomposition before execution.
- `needs_research`: facts, APIs, policies, or current external information must be verified before implementation.
- `needs_clarification`: user intent, priority, acceptance criteria, or architectural direction is ambiguous enough that proceeding would create churn.
- `awaiting_review`: work has been submitted and needs review or child-handoff decision before acceptance.
- `approval_required`: the next action changes sensitive state, exceeds autonomy/risk limits, or the task explicitly requires approval.

Use AMS classifications and eligibility explanations when available. Do not invent a different status system.

## Task Updates

- Keep lightweight capture lightweight: title, project, optional goal, and short summary are enough for early capture.
- Add structure progressively when work is delegated, launched, reviewed, blocked, repeated, or linked to a Goal.
- Before creating a task, search goal/project work for similar open tasks and check blocked/awaiting-review lists.
- When creating follow-up work, include the source task/run/review and the reason it supports the active Goal.
- Link dependencies explicitly instead of burying sequencing in a summary.
- Mark blocked work with the concrete condition that would unblock it.

## Run Results

When closing out work, record:

- what changed
- validation performed and result
- artifacts or files that matter
- blockers or unresolved risks
- follow-up tasks or recommendations
- whether project memory, current state, docs, or decisions should change

Do not rely on the chat transcript as the run record. Use AMS task, run, attachment, review, approval, or project update operations as appropriate.

## Work Packets

Use packet mode deliberately:

- Planning packet: include goal context, candidate tasks, blockers, constraints, and expected task/plan output.
- Research packet: include research question, source requirements, relevant prior runs, and stop conditions for uncertainty.
- Execution packet: include only the selected task contract, dependencies, relevant project constraints, validation commands, and review expectations.
- Review packet: include submitted artifacts, acceptance criteria, validation evidence, and open risks.
- Clarification or approval packet: include the decision needed, why it blocks progress, options if known, and consequences of each option.

Do not dump all project memory, all prior runs, or all task fields into every packet.

## Failure Shields

- Do not create a milestone abstraction separate from `Goal`.
- Do not create duplicate task, workflow, skill, run, planning, review, or approval systems.
- Do not add or rename domain entities, fields, relationships, enums, statuses, lifecycles, or core constructs unless the task explicitly authorizes the exact model change or a model change proposal has been created under `docs/model-change-proposals/`.
- Before proposing or implementing a model change, review `docs/domain-model-governance-protocol-v0.1.md`, `docs/ontology-v1.md`, `docs/domain-glossary.md`, `docs/domain-model.md`, `docs/model-diagram.md`, `docs/model-decisions/`, and `src/lib/types/control-plane.ts`.
- Do not use giant prompt prefixes as the primary integration method.
- Do not treat long chat memory as source of truth.
- Do not self-approve work that requires human or summary review.
- Do not add broad UI or MCP mutation features when the immediate need is a structured domain/API operation.
- Do not proceed past missing approval, missing access, high risk, or architectural ambiguity without recording the gate.
