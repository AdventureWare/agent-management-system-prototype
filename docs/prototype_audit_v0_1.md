# Prototype Audit v0.1

Date: 2026-07-02
Status: Assessment draft
Scope: Read-only audit of the current Agent Management System prototype. This document does not authorize v2 implementation or destructive migration.

## Summary

The prototype is useful evidence, not a failed system. It has a real control-plane vocabulary, broad UI/API coverage, working managed Codex thread support, durable run evidence, review/approval surfaces, and a meaningful body of operational data. It also carries prototype-shaped debt: generic JSON-in-SQLite storage, two adjacent execution stores, many page-specific helpers, under-modeled artifacts/context/tools, and several concepts that exist as prose, paths, or string arrays rather than durable records.

The strongest preserved learning is that AMS should be centered on durable work state, not chat memory: `Project`, `Goal`, `Task`, `Run`, `Review`, `Approval`, `Decision`, `Workflow`, `TaskTemplate`, `Role`, `Provider`, and `ExecutionSurface` are mostly defensible as concepts. The weakest foundation for a larger owned AI/agent system is the storage and boundary layer: the current implementation can keep evolving for v1 operations, but it should not be the unexamined core for v2.

## Sources Inspected

- Repo structure, `README.md`, `AGENTS.md`, `package.json`, `scripts/`, `plugins/`, `src/routes`, `src/lib/server`, `src/lib/types`, `.agents/skills`, and `agents/skills`.
- Domain docs: `docs/ontology-v1.md`, `docs/domain-model.md`, `docs/domain-glossary.md`, `docs/domain-model-governance-protocol-v0.1.md`, `docs/model-diagram.md`, `docs/model-evals/golden-scenarios.md`, and `docs/domain-model-rationalization-audit-2026-07-01.md`.
- Current goal-loop docs: `docs/autonomous-goal-directed-work-loop-v0.md`, `docs/agent-facing-ams-interface-v0.md`, `docs/contextual-procedural-knowledge-v0.md`, `docs/contextual-rigor-profiles-v0.md`, and `docs/runtime-data-policy.md`.
- Runtime model and storage files: `src/lib/types/control-plane.ts`, `src/lib/types/agent-thread.ts`, `src/lib/types/artifacts.ts`, `src/lib/types/self-improvement.ts`, and `src/lib/server/db/migrations/*.sql`.
- Local snapshot counts from `data/control-plane.json`, `data/agent-threads.json`, `data/self-improvement.json`, and `data/agent-use-telemetry.json`.

## Repository Shape

The repo is a SvelteKit app with a local operator server and CLI/MCP affordances.

Key areas:

- `src/routes/app`: human operator UI for tasks, goals, projects, runs, threads, governance, planning, workflows, task templates, roles, providers, skills, artifacts, access, execution surfaces, and agent-use telemetry.
- `src/routes/api`: HTTP APIs for agent capabilities, agent goal-loop tools, work packets, run results, task/governance mutation, threads, artifacts, assistant actions, goals, projects, runs, and execution surfaces.
- `src/lib/types`: TypeScript domain and adjacent record types.
- `src/lib/server`: domain helpers, repositories, storage adapters, route support, prompt/work-packet builders, goal-loop logic, self-improvement, telemetry, and thread orchestration.
- `scripts`: app server, CLI, MCP bridge, database import/export/migrate, thread runner, remote access, launchd, and release/readiness helpers.
- `plugins/ams-control-plane`: repo-local MCP plugin.
- `.agents/skills` and `agents/skills`: project-local and repo-local agent skills.
- `data`: live SQLite, JSON snapshots, thread records, telemetry, backups, and generated runtime state.
- `docs`: active design/governance notes and audit history.

## Current Data Model

The accepted core implementation records are defined in `src/lib/types/control-plane.ts`:

- `Project`
- `Goal`
- `Task`
- `Run`
- `Review`
- `Approval`
- `Decision`
- `PlanningSession`
- `Workflow`
- `WorkflowStep`
- `TaskTemplate`
- `Role`
- `Provider`
- `ExecutionSurface`

Adjacent records:

- `AgentThread`, `AgentRun`, and `AgentThreadContact` in `src/lib/types/agent-thread.ts`.
- `SelfImprovementOpportunity`, `SelfImprovementKnowledgeItem`, feedback signals, captured suggestions, impressions, and local suggestion decisions in `src/lib/types/self-improvement.ts`.
- `ArtifactBrowserData` and file browser entries in `src/lib/types/artifacts.ts`.

Important model observations:

- Goals support parent goals, linked projects, linked tasks, success signal, priority, target date, confidence, and lifecycle status.
- Tasks carry a large contract: goal/project linkage, dependencies, parent task, workflow/template linkage, delegation packet, success criteria, readiness, autonomy, risk, approval/review, desired role, execution surface assignment, thread/run links, capability/tool/skill names, blockers, closeout, attachments, and artifact path.
- Runs are task-linked evidence records with thread links, provider/surface/model fields, summaries, validation, blockers, artifacts, usage, and cost.
- Review, approval, and decision are separate, which is a useful boundary.
- Planning sessions exist as typed records, but the current snapshot has `0` planning sessions.
- Tools and capabilities are mostly string fields, not first-class records.
- Artifacts are under-modeled: task attachments, run artifact paths, file browser entries, and prose references all exist, but there is no central artifact registry.

## Runtime Data Snapshot

From `data/control-plane.json`:

| Collection        | Count |
| ----------------- | ----: |
| providers         |     3 |
| roles             |    46 |
| projects          |    17 |
| goals             |    21 |
| workflows         |     4 |
| workflowSteps     |    20 |
| taskTemplates     |     3 |
| executionSurfaces |     1 |
| tasks             |   397 |
| runs              |   428 |
| reviews           |   777 |
| planningSessions  |     0 |
| approvals         |     9 |
| decisions         |  1136 |

Task status counts in the snapshot:

| Status  | Count |
| ------- | ----: |
| done    |   371 |
| blocked |     2 |
| review  |    13 |
| ready   |    11 |

Run status counts:

| Status    | Count |
| --------- | ----: |
| completed |   321 |
| failed    |    90 |
| canceled  |    13 |
| running   |     4 |

Adjacent stores:

- `data/agent-threads.json`: 482 threads, 3448 agent-thread runs, 2 contacts.
- `data/self-improvement.json`: 294 records, 37 signals, 0 knowledge items, 0 captured suggestions, 433 impressions, 5 suggestion decisions.
- `data/agent-use-telemetry.json`: 546 events.

These counts show the prototype is not empty scaffolding. It has enough operational history to inform v2.

## Storage Mechanisms

The current runtime policy says `data/app.sqlite` is the live source of truth. JSON files are snapshots for seed/export/import/recovery.

SQLite migrations create generic collection stores:

- `control_plane_records(collection, id, position, payload)`
- `agent_thread_records(collection, id, position, payload)`
- `self_improvement_entries(collection, id, position, payload)`
- `store_revisions(store_name, revision, updated_at)`

Implications:

- Storage is durable enough for local use and rapid model evolution.
- Domain constraints are mostly in TypeScript normalization/helpers/tests, not database schema.
- Cross-record integrity is enforced by application code.
- Querying, migration, reporting, external sync, and evaluation over large history will get harder as v2 goals expand.

## Interfaces

Human UI:

- `/app/tasks`, `/app/tasks/[taskId]`
- `/app/goals`, `/app/goals/[goalId]`
- `/app/projects`, `/app/projects/[projectId]`
- `/app/runs`, `/app/runs/[runId]`
- `/app/threads`, `/app/threads/[threadId]`
- `/app/governance`
- `/app/planning`
- `/app/workflows`
- `/app/task-templates`
- `/app/providers`
- `/app/roles`
- `/app/skills`
- `/app/artifacts`
- `/app/access`
- `/app/execution-surfaces`
- `/app/agent-use`

Agent/API surfaces:

- `/api/agent-capabilities`
- `/api/agent-context/*`
- `/api/agent-goal-loop/[command]`
- `/api/agent-work-packets/[command]`
- `/api/agent-run-results/[command]`
- `/api/agent-reviews/[command]`
- `/api/agent-intents/[intent]`
- `/api/tasks/*`
- `/api/goals/*`
- `/api/projects/*`
- `/api/runs/*`
- `/api/agents/threads/*`
- `/api/execution-surfaces/*`
- `/api/artifacts/*`

CLI/scripts:

- `scripts/ams-cli.mjs`
- `scripts/agent-thread-cli.mjs`
- `scripts/agent-thread-runner.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `scripts/operator-server.mjs`
- `scripts/app-db.mjs`
- remote access and launchd helpers

MCP/plugin:

- `plugins/ams-control-plane` exposes generated tools from the shared capability registry.

Tests:

- Broad unit coverage across server helpers, route page data, client stores, Svelte components, MCP/manifest drift, goal-loop logic, run results, thread recovery, self-improvement, telemetry, and storage.
- Playwright e2e tests exist under `e2e`.

## Useful Assets Worth Preserving

- The core distinction between `Goal`, `Task`, `Run`, `Review`, `Approval`, and `Decision`.
- The goal-loop classification and recommendation idea in `src/lib/server/goal-work-loop.ts`.
- The agent-facing manifest and MCP generation pattern.
- The task detail and governance surfaces as human decision points.
- The managed thread launcher/recovery/logging experience.
- The runtime data policy separating SQLite from JSON snapshots.
- The model governance protocol and glossary/source-map discipline.
- The accumulated data: tasks, runs, reviews, decisions, threads, telemetry, and failures.
- The readiness/autonomy/rigor model, even if it should be simplified for v2.
- The idea that prompt text is an output of structured state, not the source of truth.

## Friction And Debt

- Generic SQLite payload stores make model evolution easy but make domain constraints, queryability, migration, and analytics weaker.
- `Run`, `AgentRun`, and `AgentThread` are split across stores and can be confusing without boundary docs.
- `Task` carries too many concerns: work contract, routing, governance, artifacts, closeout, execution metadata, and decomposition.
- Artifacts, context resources, tools, capabilities, sessions, memory items, and evaluation benchmarks are either under-modeled or represented as strings/prose/paths.
- UI surfaces overlap around "what next?": tasks, goals, planning, governance, autonomous queue, and run detail each answer part of the question.
- Self-improvement and agent-use telemetry are valuable but not yet integrated into a unified evaluation/memory governance model.
- Some docs are current and valuable, while older README sections still frame the prototype as a first Codex thread/task control plane.
- Several helper modules encode domain behavior in isolated page/API slices rather than a small central application service layer.
- Model-provider routing exists, but only as provider/surface/model metadata and task launch logic, not as a first-class routing policy/evaluation loop.

## Capability Fit Against v2 Needs

| Capability                                | Current support                                                         | Assessment                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Project and goal state                    | `Project`, `Goal`, UI/API/CLI/MCP support                               | Strong conceptually, workable implementation                            |
| Sub-goals and task decomposition          | `Goal.parentGoalId`, `Task.parentTaskId`, dependencies, decompose route | Supported, but relationship semantics need simplification               |
| Artifact registry                         | Task attachments, run artifact paths, artifact browser                  | Partial; no central artifact record                                     |
| Decision log                              | `Decision` records plus project prose `decisionLog`                     | Strong idea, split representation                                       |
| Session log                               | Agent threads/runs, control-plane runs, logs                            | Partial; split between control-plane run and agent-thread process run   |
| Model-provider routing                    | `Provider`, `ExecutionSurface`, model fields, launch planning           | Partial; needs explicit routing policy and evaluation feedback          |
| Local retrieval                           | self-improvement keyword retrieval, prior runs helper                   | Partial; no general retrieval index or citation model                   |
| Tool registry and execution logs          | required tool names, manifest/MCP commands, telemetry                   | Partial; tool names and tool calls are not first-class records          |
| Evaluation benchmarks                     | golden scenarios, tests, release readiness                              | Partial; no benchmark run model tied to agents/models/tasks             |
| Memory governance                         | project memory, decisions, self-improvement, docs                       | Partial; useful pieces but no unified memory lifecycle                  |
| External-AI dependency reduction tracking | provider/run usage/cost and agent-use telemetry                         | Partial; needs explicit dependency metric and capability coverage model |

## Audit Conclusion

The current architecture can continue to support near-term AMS v1 work, especially task-first Codex orchestration and reviewable goal-loop improvements. It is less well suited as the core of a broader owned agent system without significant refactoring.

The prototype should be preserved as an operating tool and evidence corpus. v2 should be designed in parallel with a smaller, clearer domain core and selective migration paths.
