# Role Shape

Use this reference when you need the exact role fields, nearby source files, or stronger heuristics for writing a good role.

## Source files

- `src/lib/types/control-plane.ts`: canonical `Role` type
- `src/routes/app/roles/+page.server.ts`: form parsing and create/update validation
- `src/routes/app/roles/+page.svelte`: authoring UI and field intent
- `src/lib/server/task-role-context.ts`: role fields merged into prompt-skill selection
- `src/lib/server/task-threads.ts`: role description, instructions, skills, tools, and MCPs injected into queued task prompts
- `data/control-plane.json`: current role catalog

## Actual role shape

Roles currently support these fields:

- `id: string`
- `name: string`
- `area: 'shared' | 'product' | 'growth' | 'ops'`
- `description: string`
- `skillIds?: string[]`
- `toolIds?: string[]`
- `mcpIds?: string[]`
- `systemPrompt?: string`
- `qualityChecklist?: string[]`
- `approvalPolicy?: string`
- `escalationPolicy?: string`

Creation and update currently require only:

- `name`
- `description`

The app also enforces:

- duplicate names are rejected case-insensitively
- list fields are comma-separated in the UI and normalized into string arrays
- optional text fields are trimmed and omitted when empty

## How to think about each field

### `name`

Make it the specialization a task should request.

Good:

- `Technical Writer`
- `Security Reviewer`
- `Research Coordinator`

Weak:

- `GitHub + Docs`
- `Fast Agent`
- `Codex Worker`

### `area`

Use the lane where this role mostly belongs:

- `product`: product and implementation work
- `growth`: research, outreach, acquisition, market work
- `ops`: review, governance, operational support
- `shared`: cross-cutting roles like coordinator or general reviewer

### `description`

Keep it to one sentence that explains owned outcomes.

Good pattern:

- "Owns X, produces Y, and checks Z."

Avoid:

- tool lists
- vague personality language
- repeating the role name without clarifying responsibility

### `skillIds`

Only include real installed skills that materially improve execution for this role.

Use this field when the role should consistently pull a reusable prompt skill into task execution.

Do not:

- invent skill ids
- list broad aspirational skills the repo does not have
- duplicate what belongs in `toolIds` or `mcpIds`

### `toolIds`

Use for execution tools or modes the role should reach for first.

Examples:

- `codex`
- `web`
- `playwright`

Keep this short. If the role can work without a tool, do not list it just because it exists.

### `mcpIds`

Use for named integrations the role should prefer when they are available.

Examples:

- `github`
- `vercel`

This is not a catch-all for every possible dependency.

### `systemPrompt`

This field matters because task launch prompts include it directly.

Good `systemPrompt` content usually does one or more of these:

- narrows the role's decision standard
- clarifies what to optimize for
- adds domain-specific caution or review behavior
- states how to handle uncertainty or conflicting evidence

Avoid prompts that are:

- generic
- motivational
- copies of the description
- long restatements of global coding instructions

### `qualityChecklist`

Use short review checks that make output acceptance easier.

Good examples:

- `accurate`
- `source-backed`
- `actionable`
- `no duplicate leads`
- `handoff-ready`

Prefer 3-6 items. More than that usually becomes noise.

### `approvalPolicy`

Only add this when the role has a real approval boundary, such as:

- externally visible publishing
- high-stakes claims
- risky operational changes
- regulated or sensitive domains

### `escalationPolicy`

Name concrete escalation triggers.

Good:

- "Escalate when requirements conflict, evidence is missing, or the change affects auth or billing."

Weak:

- "Escalate if unsure."

## Current seeded roles

The current baseline catalog includes:

- `Coordinator`
- `App Worker`
- `Market Researcher`
- `Lead Sourcer`
- `Reviewer`

Use those as overlap checks before adding a new role. A new role should be clearly different in responsibility, not just a renamed neighbor.

## Anti-patterns

Do not create a new role when the real problem is:

- missing skill installation
- missing provider or execution-surface support
- task-specific instructions that belong on the task
- a capability label rather than a work contract

Bad role definitions usually have one of these problems:

- they describe a person or worker instead of a role
- they are just a tool bundle
- they are so broad that task authors will not know when to select them
- they are so narrow that they fit only one temporary task
