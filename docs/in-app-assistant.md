# In-App Assistant

The in-app assistant is a V1 operator surface for creating structured control-plane records from natural-language input. It is intentionally narrow: it plans a supported create action, shows the user a preview, and only executes after confirmation.

This document covers the current implementation in this prototype, not the broader product brief. Where the current behavior is narrower than the original feature intent, that is called out explicitly so future work has a clear baseline.

## What V1 Does

The assistant is available from anywhere inside `/app/*` through the floating launcher rendered by `src/routes/app/+layout.svelte`.

Current V1 behavior:

- accepts text input, including pasted transcript text
- serializes the current page into a structured context snapshot
- supports create flows for tasks, goals, roles, and agents
- asks for clarification when the request does not map cleanly to one supported create flow
- shows a structured preview before create
- lets the user edit the planned payload as JSON before confirmation
- creates records through the normal control-plane/domain helpers instead of a separate assistant-only path
- writes planning and execution events to `data/assistant-actions.jsonl`

Current non-goals and gaps:

- no direct voice recording or transcription pipeline
- no destructive actions
- no update or query flows
- no selected-object support beyond an empty placeholder in the context shape
- no duplicate-detection pass before create
- no workflow-step creation flow, even when the current page is a workflow page

## Request Lifecycle

The assistant uses a two-step plan-and-confirm flow:

1. `src/lib/components/AssistantLauncher.svelte` opens the panel and builds a client-side context snapshot from the current route and page data.
2. The client sends `POST /api/assistant/plan` with:
   - `input`
   - `context`
3. `src/routes/api/assistant/plan/+server.ts` loads the control-plane data, interprets the request, and returns either:
   - a clarification response, or
   - an `AssistantActionPlan`
4. The UI renders a preview of the plan payload and the context the server used.
5. The user can:
   - cancel
   - edit the payload JSON
   - confirm create
6. The client sends `POST /api/assistant/execute` with the confirmed plan.
7. `src/routes/api/assistant/execute/+server.ts` validates the plan shape, executes the action through the domain layer, and returns the created record metadata.
8. Both planning and execution events are appended to `data/assistant-actions.jsonl`.

The assistant never writes directly from freeform text. Execution always happens through a structured intermediate action plan.

## Architecture

The implementation is split into four layers.

### 1. UI

Primary entry point:

- `src/lib/components/AssistantLauncher.svelte`

Responsibilities:

- panel open/close state
- text input
- request submission
- preview rendering
- clarification option buttons
- payload JSON editing
- confirmation and success display

Notable current behavior:

- the assistant is always available through a fixed floating button
- the preview exposes confidence, payload fields, and context used
- payload editing is raw JSON, which is useful for debugging but still operator-oriented rather than end-user-friendly

### 2. Context Serialization

Primary entry point:

- `src/lib/client/assistant-context.ts`

The client builds a structured `AssistantContextSnapshot` with:

- `route`
- `pageType`
- `currentObject`
- `selectedObjects`
- `breadcrumbs`
- `visibleCapabilities`

Current `pageType` support:

- dashboard
- project list/detail
- goal list/detail
- task list/detail
- role list/detail
- agent list/detail
- workflow list/detail
- unknown

Current context coverage is strongest on detail pages where route data exposes an identifiable current object. `selectedObjects` is part of the type contract but is not populated yet.

### 3. Intent Interpretation

Primary entry points:

- `src/lib/assistant/types.ts`
- `src/lib/server/assistant/intent.ts`

Supported actions:

- `create_task`
- `create_goal`
- `create_role`
- `create_agent`

The interpreter is currently rule-based. It does not use an LLM. It relies on:

- verb detection such as `create`, `make`, `add`, `draft`, `new`, `turn`, `convert`
- object-word detection such as `task`, `goal`, `role`, `agent`
- extraction helpers for names and instruction-like phrases
- page context defaults such as current project, current goal, current task, or current role

The interpreter returns one of two shapes:

- `kind: "plan"` with a structured `AssistantActionPlan`
- `kind: "clarification"` with a question, reason, and optional canned options

### 4. Execution and Logging

Primary entry points:

- `src/lib/server/assistant/actions.ts`
- `src/lib/server/assistant/audit-log.ts`

Execution reuses existing logic:

- tasks are created through `createAgentApiTask`
- goals are created through `createAgentApiGoal`
- roles are created through `createRole` and `updateControlPlaneCollections`
- agents are created through `createExecutionSurface` and `updateControlPlaneCollections`

Important implementation detail:

- assistant-created "agents" are persisted as execution surfaces, because that is the current runtime entity that combines provider routing and supported roles

Audit logging:

- file: `data/assistant-actions.jsonl`
- event types:
  - `assistant_plan`
  - `assistant_execute`
  - `assistant_execute_error`

Each log line is JSON with a `recordedAt` timestamp.

## Context Model

The assistant depends on explicit, inspectable context rather than scraping rendered UI text.

Current context defaults include:

- task creation defaults the project from:
  - current project
  - current object's `projectId`
  - project breadcrumbs
  - a goal's linked project
  - the only project in the system, if there is exactly one
- task creation can infer `parentTaskId` from the current task page for phrases like `child task` or `under this`
- goal creation can infer `parentGoalId` from the current goal page
- agent creation can infer the linked role from the current role page
- visible capabilities are derived from `pageType` and included in the context snapshot for debugging and future planner improvements

Current limitations:

- no list selection context yet
- no filter/search/list-state context yet
- workflow context is serialized, but execution still only supports task/goal/role/agent create flows
- role-list context only uses the `?role=` query param when present

## Supported Flows

### Create Task

Expected fields in the plan payload:

- `title`
- `summary`
- `instructions`
- `projectId`
- optional `goalId`
- optional `parentTaskId`

Clarifies when:

- the task title cannot be inferred
- the project cannot be inferred

### Create Goal

Expected fields in the plan payload:

- `name`
- `summary`
- optional `projectId`
- optional `parentGoalId`

Clarifies when:

- the goal name cannot be inferred

### Create Role

Expected fields in the plan payload:

- `name`
- `description`
- `instructions`
- `systemPrompt`

Execution safeguards:

- requires both name and description
- rejects duplicate role names case-insensitively

### Create Agent

Expected fields in the plan payload:

- `name`
- `providerId`
- `supportedRoleIds`
- optional `note`
- optional `tags`

Execution safeguards:

- requires a provider
- requires at least one supported role
- validates the provider exists
- validates all supported role ids exist

The planner currently defaults to the first enabled provider, or the first provider in the system if none are enabled.

## Clarification Behavior

Clarification is intentionally narrow in V1.

The server currently asks follow-up questions when:

- the request does not clearly map to one supported create action
- a required field such as project, role, or name is missing

The current UI supports clarification by:

- rendering the returned question
- optionally rendering canned buttons such as `Task`, `Goal`, `Role`, `Agent`
- resubmitting a rewritten instruction based on the chosen option

Important caveat:

- follow-up state is not stored as a true multi-turn thread; the UI rewrites and resubmits the input instead

## Preview and Confirmation

The preview is the main trust mechanism in V1.

The panel shows:

- action summary
- confidence
- extracted payload fields
- context used by the planner

The user can:

- cancel the draft
- open JSON editing
- apply edited payload JSON
- confirm create

This is intentionally conservative. The assistant does not auto-create records after planning.

## API Surface

### `POST /api/assistant/plan`

Request body:

```json
{
	"input": "Create an agent for this.",
	"context": {
		"route": "/app/roles/role_frontend",
		"pageType": "role_detail",
		"currentObject": {
			"type": "role",
			"id": "role_frontend",
			"name": "Frontend Engineer"
		},
		"selectedObjects": [],
		"breadcrumbs": [],
		"visibleCapabilities": ["create_agent", "create_role", "create_task"]
	}
}
```

Response body:

- clarification response, or
- `AssistantActionPlan`

### `POST /api/assistant/execute`

Request body:

```json
{
	"plan": {
		"id": "assistant_plan_123",
		"action": "create_agent",
		"objectType": "agent",
		"confidence": 0.9,
		"summary": "Create agent for Frontend Engineer",
		"payload": {
			"name": "Frontend Engineer Agent",
			"providerId": "provider_local",
			"supportedRoleIds": ["role_frontend"],
			"note": "Assistant-created agent for the Frontend Engineer role.",
			"tags": ["assistant-created"]
		},
		"contextUsed": {},
		"missingFields": [],
		"needsConfirmation": true
	}
}
```

Returns:

- `201` with the created record metadata on success
- structured API errors when validation fails

## Logging and Debugging

Use these points when debugging a misfire:

1. Reproduce the request in the UI.
2. Inspect `data/assistant-actions.jsonl`.
3. Check:
   - raw input
   - serialized context
   - plan or clarification response
   - confirmed payload
   - execution result or error
4. If the context was wrong, start in `src/lib/client/assistant-context.ts`.
5. If classification or extraction was wrong, start in `src/lib/server/assistant/intent.ts`.
6. If execution failed after a correct plan, start in `src/lib/server/assistant/actions.ts`.

Current automated coverage:

- `src/lib/server/assistant/intent.spec.ts`
- `src/lib/client/assistant-context.spec.ts`

These tests currently cover:

- project-aware task planning
- role-aware agent planning
- project-detail task naming
- clarification fallback
- project-detail context serialization

## Extending the Assistant

When adding a new supported action or object type, update the stack in this order.

1. Extend shared types in `src/lib/assistant/types.ts`.
2. Add or adjust client context serialization in `src/lib/client/assistant-context.ts`.
3. Add planner logic in `src/lib/server/assistant/intent.ts`.
4. Add execution logic in `src/lib/server/assistant/actions.ts`.
5. Add route handlers only if the request or response contract changes.
6. Add tests for both context serialization and planner behavior.
7. Update this document with the new action, required fields, and guardrails.

Recommended extension pattern:

- keep the intermediate action plan explicit
- prefer reusing domain helpers over assistant-specific persistence code
- add clarifications before adding aggressive guessing
- treat context serialization as a product contract, not just a UI convenience

## Known Limitations

Observed implementation limitations in the current prototype:

- the assistant is optimized for operator use, not polished end-user authoring
- payload editing is JSON only
- the parser is heuristic and English-phrase dependent
- clarification is single-step and stateless
- `selectedObjects` is not populated
- the audit log is append-only JSONL with no UI viewer yet
- assistant-created agents appear under execution surfaces because that is the current domain model

These are reasonable V1 tradeoffs, but they should remain visible so future work does not mistake the current behavior for a fully general assistant framework.
