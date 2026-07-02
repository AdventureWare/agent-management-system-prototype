# AMS Control Plane Plugin

Repo-local MCP plugin for the Agent Management System control plane.

The context, intent, task, goal-loop, work-packet, goal, project, and thread MCP tool definitions are generated from the same shared capability registry that powers `ams_manifest`, so that control-plane discovery and MCP tool descriptions stay aligned. Straightforward HTTP request handlers are also derived from that registry; only attachment reads and thread-routing helpers stay custom.

## Capability update path

Treat `src/lib/server/agent-capability-commands.js` as the canonical registry for agent-facing AMS
commands. When a command is added or changed, update the registry first, then the backing API route,
CLI dispatch in `scripts/ams-cli.mjs`, MCP schema/path metadata in
`scripts/ams-control-plane-mcp.mjs`, and the user-facing docs. The registry drift tests fail when
manifest command keys, CLI support, MCP schemas/tool names, or API route paths fall out of sync.

## What it exposes

- `ams_manifest`
- `ams_context_current`, `ams_context_get_relevant_prior_runs`
- `ams_intent_interpret_intent`
- `ams_goal_loop_list_active_goals`, `ams_goal_loop_get_goal_context`, `ams_goal_loop_get_goal_progress`
- `ams_goal_loop_get_goal_success_criteria`, `ams_goal_loop_get_goal_blockers`
- `ams_goal_loop_get_actionable_work`, `ams_goal_loop_get_blocked_work`, `ams_goal_loop_get_awaiting_review`
- `ams_goal_loop_get_next_recommended_action`, `ams_goal_loop_explain_task_eligibility`
- `ams_work_packet_get_agent_work_packet`
- `ams_run_result_record_run_result`, `ams_run_result_record_validation_result`
- `ams_run_result_record_blocker`, `ams_run_result_record_followup_recommendations`
- `ams_run_result_create_followup_task`
- `ams_run_result_request_review_from_run`, `ams_run_result_mark_task_blocked_from_run`
- `ams_run_result_preview_progress_updates`, `ams_run_result_apply_progress_updates`
- `ams_review_get_review_status`
- `ams_task_list`, `ams_task_get`, `ams_task_create`, `ams_task_update`
- `ams_task_attach`, `ams_task_attachment_read`, `ams_task_remove_attachment`
- `ams_task_request_review`, `ams_task_approve_review`, `ams_task_request_review_changes`
- `ams_task_request_approval`, `ams_task_approve_approval`, `ams_task_reject_approval`
- `ams_task_decompose`
- `ams_task_accept_child_handoff`, `ams_task_request_child_handoff_changes`
- `ams_task_launch_session`, `ams_task_recover_session`
- `ams_goal_list`, `ams_goal_get`, `ams_goal_create`, `ams_goal_update`
- `ams_project_list`, `ams_project_get`, `ams_project_create`, `ams_project_update`
- `ams_thread_best_target`, `ams_thread_list`, `ams_thread_resolve`, `ams_thread_contact`, `ams_thread_contacts`, `ams_thread_contact_targets`
- `ams_thread_start`, `ams_thread_get`, `ams_thread_panel`, `ams_thread_set_handle_alias`, `ams_thread_cancel`, `ams_thread_archive`, `ams_thread_status`
- `ams_thread_attachment_read`

## Requirements

- `AMS_AGENT_API_TOKEN`
- optional `AMS_AGENT_API_BASE_URL`

If `AMS_AGENT_API_BASE_URL` is not set, the server defaults to `http://127.0.0.1:$AMS_APP_PORT` or port `3000`.

## Fallback

If the MCP server is unavailable, use:

```bash
node scripts/ams-cli.mjs manifest
node scripts/ams-cli.mjs task list --project <projectId>
```
