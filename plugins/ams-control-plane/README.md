# AMS Control Plane Plugin

Repo-local MCP plugin for the Agent Management System control plane.

## What it exposes

- `ams_manifest`
- `ams_task_list`, `ams_task_get`, `ams_task_create`, `ams_task_update`
- `ams_task_attach`, `ams_task_remove_attachment`
- `ams_task_request_review`, `ams_task_approve_review`, `ams_task_request_review_changes`
- `ams_task_request_approval`, `ams_task_approve_approval`, `ams_task_reject_approval`
- `ams_task_decompose`
- `ams_task_accept_child_handoff`, `ams_task_request_child_handoff_changes`
- `ams_task_launch_session`, `ams_task_recover_session`
- `ams_goal_list`, `ams_goal_get`, `ams_goal_create`, `ams_goal_update`
- `ams_project_list`, `ams_project_get`, `ams_project_create`, `ams_project_update`
- `ams_thread_best_target`, `ams_thread_list`, `ams_thread_resolve`, `ams_thread_contact`, `ams_thread_contacts`
- `ams_thread_start`, `ams_thread_get`, `ams_thread_set_handle_alias`, `ams_thread_cancel`, `ams_thread_archive`, `ams_thread_status`

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
