# V2 Next Capability After Agent-Control Surface v0.1

Date: 2026-07-10
Status: Capability recommendation

## Purpose

Choose the next bounded AMS v2 capability after completing the minimal
agent-control surface.

This is a planning artifact. It should keep the next implementation step from
turning into UI work, routing policy, local-model orchestration, broad
retrieval, or additional governance.

## Evidence Inspected

- `npm run v2:core-db -- agent-control --agent-action packet --task task_v2_core_choose_next_capability_after_agent_control --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `docs/v2_core_agent_control_surface_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_minimal_slice_gap_reconciliation_v0_1.md`
- `docs/v2_next_milestone_after_minimal_slice_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`

## Current V2 Core Capability

V2 core can now:

- maintain one active project and goal
- select ready work
- transition tasks through the constrained lifecycle
- record task dependencies
- build bounded context bundles and agent work packets
- record runs, tool executions, artifacts, reviews, decisions, and trusted memory
- enforce review and acceptance before task closeout
- expose operator-console state
- export and import deterministic snapshots
- register evaluation scenarios and results
- compute a dependency-reduction report from provider, tool, task, and
  evaluation evidence
- expose a minimal agent-control CLI surface for agents to operate the loop

The live project state has one active goal, twenty-three completed tasks, one
in-progress planning task, one evaluation scenario/result, and one
dependency-reduction capability row: `agent-work-packet` is `hybrid_candidate`.

## Recommendation

The next capability should be:

**Minimal Local Retrieval Read Model**

The immediate implementation task should add the smallest useful local retrieval
query over existing v2 core records, then expose it through CLI and the
agent-control surface.

## Why This Is Next

The larger AMS goal is to build an owned agent/AI operating layer that reduces
dependence on external AI affordances and chat history.

The current system now has enough durable state and a structured agent-control
surface. The next bottleneck is finding relevant prior state without relying on
the current chat transcript or manually inspecting many commands.

Retrieval is now timely because:

- `agent-control` can operate the loop, but it still needs targeted context
  lookup beyond a single work packet
- `context-bundle` and `agent-work-packet` provide bounded task context, but
  not query-driven discovery
- the requirements call for source-linked local retrieval over projects, goals,
  tasks, runs, artifacts, decisions, and memory
- the architecture recommends starting with simple SQLite/keyword retrieval
  before embeddings
- local retrieval directly supports future agent workflows, evaluations,
  dependency reports, and eventual routing

## What To Implement Next

Create one implementation task:

`task_v2_core_minimal_local_retrieval`

Scope:

- add a v2 core service/read-model query that searches existing v2 core records
  by text query
- search only existing first-slice records first:
  - projects
  - goals
  - tasks
  - runs
  - artifacts
  - decisions
  - reviews
  - memory items
  - evaluation scenarios/results if already present
- return compact source-linked results:
  - record type
  - record id
  - title or label
  - short snippet/summary
  - project/goal/task linkage when available
  - inclusion reason
- add a CLI command, for example `search-context`
- add an `agent-control` action, for example `search`, that calls the same
  service
- include focused tests and one live dogfood query against the v2 core project

Start with simple SQLite `LIKE`/ranked union or SQLite FTS only if it stays
small. Do not index arbitrary repo files yet.

## What Not To Add Yet

Do not add:

- embeddings
- vector database
- knowledge graph
- repo-wide file crawler
- web search
- semantic chunking pipeline
- new retrieval entity
- new memory lifecycle
- dashboard/search UI
- routing policy
- model registry
- local model orchestration
- automatic context injection into every packet
- broad document ingestion

## Why Not Evaluate Agent-Control Next

Agent-control should get evaluation evidence soon, but the live task already
has focused smoke coverage, accepted artifacts, review, decision, trusted
memory, and tool evidence. The larger bottleneck for future agents is finding
relevant prior state. Retrieval will also make future evaluation and dependency
reporting better grounded.

## Why Not Routing Or Local Models Next

Routing and local models need more capability evidence and better local context.
Adding them before retrieval would choose engines while the system still lacks a
basic owned way to find prior project facts.

## Why Not UI Next

The operator UI is useful, but this step is about agent-operable context
discovery. CLI/service behavior should prove the retrieval contract before UI
displays are added.

## Acceptance Criteria For The Next Task

The next implementation task is complete when:

- v2 core can run a local text query over existing core records
- results are source-linked and include inclusion reasons
- results preserve project/goal/task linkage where available
- CLI JSON exposes the retrieval query
- `agent-control` exposes the same retrieval query
- no new domain entity, lifecycle state, dashboard, embedding pipeline, or
  knowledge graph is added
- focused tests cover result inclusion and ranking/bounding behavior
- `npm run check` passes
- one live dogfood query retrieves relevant records for the current v2 project

## Open Risks

- Search can become a dumping ground. Keep results bounded and source-linked.
- Ranking can become fake precision. Use simple deterministic ordering first.
- Retrieval can blur into memory. Search results are not canonical memory; they
  are pointers to existing records.
- Repo-wide indexing can create scope explosion. Start with v2 core records.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core local retrieval read model`
