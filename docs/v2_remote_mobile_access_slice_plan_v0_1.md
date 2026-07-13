# AMS v2 Remote Mobile Access Slice Plan v0.1

## Purpose

Create the next AMS v2 milestone: access the v2 operator surface from another trusted device, especially a phone, without turning AMS into a public web app or broad remote-control surface.

This is a goal-state plan, not an implementation. It defines the smallest safe slice to build next.

## Current Findings

Existing useful plumbing:

- `npm run remote:access:start|status|stop` already exists as a provider-neutral wrapper.
- The current preferred provider is Tailscale Serve through `scripts/remote-access-tailscale.mjs`.
- `docs/tailscale-remote-access.md` already defines the intended boundary: local Node server on `127.0.0.1`, Tailscale Serve as the remote access layer, and no public internet tunnel.
- `AMS_OPERATOR_PASSWORD` enables an app-layer operator login.
- `src/hooks.server.ts` redirects non-public pages to `/auth/login` when operator auth is configured.
- `/auth/login` already has a mobile-sized login form.
- `/app/v2-core` is a read-oriented v2 operator console.

Important risk:

- `/app/v2-core/tasks/[taskId]` is not read-only. It can start/block/resolve/submit/accept/request changes and record run evidence.
- Exposing task detail on a phone is acceptable only if the milestone explicitly decides whether authenticated remote write actions are allowed, or adds a remote/mobile read-only mode first.

## Chosen First Access Mode

Use the existing Tailscale Serve path.

The first implementation slice should not introduce a new tunnel, cloud deployment, mobile app, reverse proxy, or public endpoint.

The chosen runtime shape:

1. AMS app server runs locally through the existing Node adapter server.
2. App server remains bound to `127.0.0.1`.
3. Tailscale Serve exposes HTTPS access inside the trusted tailnet.
4. App-layer login requires `AMS_OPERATOR_PASSWORD`.
5. The first remote/mobile surface is the v2 operator readback console at `/app/v2-core`.

## Trust Boundary

Allowed:

- Trusted devices in the same Tailscale tailnet.
- Operator who knows the configured `AMS_OPERATOR_PASSWORD`.
- Read-oriented inspection of current v2 goal/task/run/review/artifact/memory state.

Not allowed in this slice:

- Public internet exposure.
- unauthenticated remote access.
- making the app bind directly to `0.0.0.0`.
- broad remote command execution.
- remote task mutation as an accidental side effect of visiting task detail.
- relying only on Tailscale identity while app-layer auth is disabled.

## Auth and Access Gate

Minimum requirement for starting remote mobile access:

- `AMS_OPERATOR_PASSWORD` must be configured.
- `AMS_OPERATOR_SESSION_SECRET` should be configured in real use so operator sessions are stable and signed with an explicit secret.
- Remote access start should fail or warn loudly if operator auth is disabled.

The existing Tailscale start script already requires `AMS_OPERATOR_PASSWORD`. The implementation task should verify that behavior and update docs/status output only if gaps are found.

## Read/Write Scope

First slice:

- remote login: allowed
- `/app/v2-core`: allowed
- v2 state inspection: allowed
- task mutation from phone: deferred
- run evidence submission from phone: deferred
- accepting/rejecting work from phone: deferred
- remote shell/tool execution: out of scope

Task detail handling:

- The milestone goal eventually wants task detail inspection from another device.
- Because task detail currently includes write actions, the first implementation should either:
  - keep task detail out of the first remote-read acceptance criteria, or
  - add an explicit read-only task detail mode before counting task detail as mobile-safe.

Recommended sequencing: prove mobile access to `/app/v2-core` first, then add safe task detail inspection as the next task.

## Mobile UI Acceptance Criteria

For the first implementation task:

- `/auth/login` fits a phone viewport without horizontal scrolling.
- `/auth/login` accepts the configured operator password and redirects back to the requested path.
- `/app/v2-core` fits a phone viewport without horizontal scrolling.
- active goals, next work, recent runs, review state, dependency state, and memory/retrieval summaries remain readable on mobile.
- links to task detail may exist, but task detail write scope is not claimed as mobile-safe until separately handled.
- status/help text clearly tells the operator how to start, inspect, and stop remote access.

## Validation Plan

Repository validation:

- `git status --short`
- inspect `scripts/remote-access.mjs`
- inspect `scripts/remote-access-tailscale.mjs`
- inspect `src/hooks.server.ts`
- inspect `/auth/login`
- inspect `/app/v2-core`
- inspect `/app/v2-core/tasks/[taskId]` before deciding task-detail scope

Runtime validation for the first implementation task:

- set `AMS_OPERATOR_PASSWORD` and `AMS_OPERATOR_SESSION_SECRET`
- run `npm run build`
- run `npm run remote:access:start`
- run `npm run remote:access:status`
- open the reported Tailscale URL from a trusted phone or equivalent mobile browser viewport
- verify login
- verify `/app/v2-core` mobile readability
- run `npm run remote:access:stop`
- verify `npm run remote:access:status` no longer reports active serve exposure

Automated or equivalent checks:

- Playwright mobile viewport check for `/auth/login`.
- Playwright mobile viewport check for `/app/v2-core`.
- Optional screenshot/manual evidence for the actual phone path when Tailscale is available in the environment.

## Rollback / Disable Path

Primary rollback:

```sh
npm run remote:access:stop
```

If needed:

```sh
npm run app:server:stop
```

The app should remain usable locally after remote access is stopped.

## Explicit Non-Goals

- Do not build a native mobile app.
- Do not deploy AMS to a cloud host.
- Do not add named-user auth.
- Do not add role-based permissions.
- Do not add public sharing.
- Do not add push notifications.
- Do not add a new task approval system.
- Do not make phone-based task mutation part of the first slice.
- Do not change the v2 domain model for this milestone.

## Proposed Implementation Tasks

### 1. Prove Trusted Mobile Read Access To The V2 Console

Use the existing Tailscale path and operator login to make `/app/v2-core` usable from another trusted device.

Expected output:

- verified remote access start/status/stop behavior
- mobile viewport validation for login and v2 console
- doc updates only where current instructions are incomplete or misleading
- no new remote write surface

### 2. Make Task Detail Safe For Remote Mobile Inspection

Decide and implement the smallest safe way to inspect task detail from a phone.

Recommended default:

- remote/mobile task detail should be read-only until there is a separate explicit decision to allow remote task mutation.

Expected output:

- task detail can be inspected on mobile without accidental state changes
- write controls are either hidden/disabled in the chosen remote-read mode or explicitly accepted as in-scope with rationale
- mobile validation covers at least one real v2 task detail page

## Recommended Milestone Definition

Goal: `Access AMS v2 from another device`

Milestone completion should require:

- trusted-device remote access works through Tailscale
- operator login is required
- `/app/v2-core` is readable on mobile
- task detail inspection has an explicit safety boundary
- rollback is documented and tested
- no public access or broad remote execution is introduced
