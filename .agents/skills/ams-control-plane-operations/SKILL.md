---
name: ams-control-plane-operations
description: Use when a thread needs to inspect or update Agent Management System state directly through the AMS CLI, AMS bearer-token API, or the repo-local AMS MCP plugin instead of guessing commands or editing control-plane files by hand.
---

# AMS Control Plane Operations

## When to use this skill

- Use this skill when the work requires reading or mutating AMS tasks, goals, or projects.
- Use this skill when an agent should create a task, update task status, attach artifacts, request review or approval, decompose work, or recover a task session through AMS itself.
- Use this skill when the user asks a thread to use AMS as a tool rather than just describing what should happen.

## Workflow

1. Start with capability discovery.
   Use `node scripts/ams-cli.mjs manifest` or the MCP tool `ams_manifest` before guessing which operation exists.
   The shared capability registry also drives the manifest-backed task, goal, project, and thread MCP tool definitions, so discovery and tool metadata should match.
   If the managed run already has a thread id, task id, or run id, immediately resolve canonical state with `node scripts/ams-cli.mjs context current` or the MCP tool `ams_context_current`.
   If the work matches a common AMS workflow, prefer the first-class intent tool before sequencing the lower-level task commands yourself.
   Use the manifest guidance as the default loop: discover, resolve current context when available, inspect, mutate narrowly, then read back the changed state.
   Check the manifest playbooks first for common AMS intents such as `create_task`, `prepare_task_for_review`, `prepare_task_for_approval`, `accept_child_handoff`, `reject_task_approval`, `request_child_handoff_changes`, and `coordinate_with_another_thread`.
2. Choose the narrowest surface that fits.
   Use the repo-local MCP plugin for `manifest`, `task`, `goal`, `project`, and thread operations, including task and thread attachment reads, governance actions, decomposition, child handoffs, session launch or recovery, thread discovery, thread target listing, thread panel inspection, thread contact, and thread lifecycle management.
   Use the AMS CLI when the work needs the full command reference or when you want direct shell examples.
3. Prefer helper surfaces over raw HTTP.
   Use `node scripts/ams-cli.mjs ...` or the AMS MCP tools instead of composing raw `curl` requests.
4. Read back the changed state.
   After mutating AMS, verify with a follow-up `get` or `list` command so the agent can confirm the system accepted the update.
5. Keep thread coordination separate from ordinary control-plane edits.
   Use `node scripts/ams-cli.mjs thread ...` only when another thread is actually needed.

## High-signal commands

- Discovery: `node scripts/ams-cli.mjs manifest`
- Current context: `node scripts/ams-cli.mjs context current`
- First-class intents: `node scripts/ams-cli.mjs intent prepare_task_for_review`, `prepare_task_for_approval`, `reject_task_approval`, `accept_child_handoff`, `request_child_handoff_changes`
- Task read/write: `node scripts/ams-cli.mjs task list`, `task get`, `task create`, `task update`
- Task workflow: `task attach`, `task request-review`, `task request-approval`, `task decompose`, `task accept-child-handoff`, `task launch-session`, `task recover-session`
- Goal/project read/write: `goal list|get|create|update`, `project list|get|create|update`
- Thread routing and lifecycle: `node scripts/ams-cli.mjs thread best-target`, `thread list --can-contact`, `thread contact ...`

## References

- CLI reference: `docs/ams-cli-reference.md`
- MCP plugin: `plugins/ams-control-plane/README.md`

## Failure shields

- Do not edit `data/control-plane.json` directly when AMS already exposes a supported operation.
- Do not use thread routing for work that is only a task or project mutation.
- Do not guess task or run state from memory when `context current` can resolve it directly.
- Do not manually sequence a common playbook when a matching `intent` command already exists unless you need a custom path the intent does not cover.
- Do not assume a mutation succeeded without reading the resulting task, goal, or project state back.
