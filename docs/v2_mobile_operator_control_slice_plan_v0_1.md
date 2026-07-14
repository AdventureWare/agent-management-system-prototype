# AMS v2 Mobile Operator-Control Slice Plan v0.1

## Purpose

Move trusted mobile AMS v2 access from read-only inspection toward lightweight operator control. This is not a mobile app, public deployment, remote shell, or broad execution surface.

The first control slice should let the operator steer running goals from a trusted phone while keeping risky execution and review decisions explicit.

## Preparation Evidence

This plan was produced after running:

```bash
npm run v2:core-db -- agent-preparation-packet --task task_ams_v2_mobile_operator_control_slice_plan --json
```

The preparation packet was sufficient for planning:

- It identified the mobile-control planning task contract and parent goal.
- It selected trusted v2 core memory around next work, review gates, provider/tool usage, snapshot portability, operator console, artifact queue semantics, and read-only operator console UI.
- It selected relevant evaluation evidence for work packets, local retrieval, agent control, execution cycle, and closeout packets.
- It classified broad UI, scheduler, routing policy, local model work, capability taxonomy, and auto-promotion as deferred or irrelevant.
- It did not require new persistent entities or fields.

Material gap found during execution:

- The packet did not include the prior remote/mobile milestone run evidence directly. That evidence was retrieved separately from the v2 runtime before finalizing this plan.

This is a non-blocking retrieval precision gap, not a schema gap.

## Prior Mobile Evidence

The completed remote/mobile milestone already proved:

- Tailscale Serve plus operator-password access is the preferred trusted-device path.
- `/auth/login` and `/app/v2-core` work in a mobile viewport.
- trusted Tailnet access to `/app/v2-core` was validated.
- `/app/v2-core/tasks/[taskId]?mode=read` allows mobile task inspection without mutation controls.
- task detail action mode remains explicit through the `Enable actions` link.

Existing docs:

- `docs/v2_remote_mobile_access_slice_plan_v0_1.md`
- `docs/tailscale-remote-access.md`
- `docs/remote-access-hardening-roadmap-2026-04-06.md`

## Current UI/API Surfaces

`/app/v2-core` already exposes server actions for:

- `applyGoalAction`: pause, resume, or block a goal.
- `dispatchGoalWork`: launch the selected next-work task for an active goal.
- `createGoalContinuationTask`: create a continuation-planning task for an active idle goal.

`/app/v2-core/tasks/[taskId]` already supports:

- read-only mode via `?mode=read`, with mutation controls hidden.
- explicit action mode, including task status actions, run evidence capture, and managed run closeout.

The first mobile-control slice should use the top-level console actions first. Task-detail mutation should remain out of scope.

## Allowed Mobile Actions For First Slice

Allowed from trusted mobile operator console:

- inspect active goals, paused goals, blocked goals, next work, current runs, review queue, and task detail read mode
- pause an active goal with a reason
- resume a paused or blocked goal with a reason
- block an active or paused goal with a reason
- launch selected next work for an active goal
- create continuation-planning work for an active goal with no open work

These actions are already represented by existing v2 core operations and decisions.

## Explicitly Disallowed For First Slice

Do not include in the first mobile-control slice:

- remote shell or local command execution
- arbitrary task status mutation from mobile task detail
- managed run closeout from mobile
- accept/reject review decisions from mobile
- editing memory, decisions, providers, tools, evaluation scenarios, or artifacts
- schema changes
- new authentication systems
- public internet exposure
- local model routing or provider routing policy

## Trust And Access Assumptions

- The device is trusted and joined to the Tailnet.
- The app still requires operator-password login.
- The server remains local-first on the development machine.
- Tailscale Serve is an access layer, not the AMS authorization model.
- Remote access can be stopped independently from the app server.

## UX Requirements

The mobile control surface should make the distinction between inspection and mutation obvious:

- Read-only task links should continue to use `?mode=read`.
- Goal-control forms should be compact and touch-friendly.
- Buttons should not be adjacent in a way that causes accidental taps.
- Each mutation must require an explicit submit action.
- Reason fields should remain available for pause/resume/block.
- Launching selected next work should show the selected task title before the button.
- The page should not horizontally overflow around 390px wide.

## Minimal Implementation Task

Create a small implementation task:

`Make v2 operator dispatch controls mobile-safe`

Scope:

- refine `/app/v2-core` dispatch board controls for mobile viewport use
- preserve existing server actions
- keep task detail mutation out of mobile scope
- keep links to task detail in read mode
- add or update browser tests for mobile viewport interaction/readability
- validate with `npm run check`, focused server tests, focused browser tests, and `git diff --check`

## Validation Plan

Validate the implementation with:

- existing `/app/v2-core` server-action tests
- mobile viewport browser coverage for `/app/v2-core`
- task detail read-mode coverage still hiding mutation controls
- no horizontal overflow around 390px width
- `npm run check`
- `git diff --check`

Live trusted-device validation is useful but not required for the first code slice if local browser mobile emulation passes and prior Tailscale proof remains valid.

## No Schema Change

This slice can proceed without schema changes. The existing Goal, Task, Run, Artifact, Review, Decision, model provider, and tool-execution records are sufficient.

## Preparation Sufficiency Assessment

The preparation packet changed the plan in one useful way: it kept the work bounded to existing v2 core read models and actions, and it explicitly deferred broad UI, scheduler, routing, local-model, and schema work.

The only gap was missing prior mobile milestone evidence in the selected resources. That should be treated as a retrieval tuning issue for future packets, not a blocker for this slice.
