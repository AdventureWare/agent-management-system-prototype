# Stack Evaluation Criteria v0.1

Date: 2026-07-02
Status: Assessment draft

## Purpose

This document defines how stack choices should be judged for AMS v2. The criteria prioritize affordance fit over popularity, enterprise convention, or hype.

## Priority Scale

- `High`: strongly affects whether AMS can become an owned local agent operating layer.
- `Medium`: important but can be improved later without redoing the core.
- `Low`: useful only after the minimal v2 slice proves itself.

## Criteria

| Criterion                               | Priority | What Good Looks Like                                                                                                     |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Affordance fit for AMS goals            | High     | The stack makes projects, goals, tasks, sessions, tools, artifacts, decisions, memory, routing, and evaluation explicit. |
| Local-first suitability                 | High     | Runs on one machine, works offline for core operations, uses local files/SQLite, avoids mandatory cloud services.        |
| Simplicity and low operational overhead | High     | Few moving parts, easy setup, no background infrastructure unless clearly justified.                                     |
| Agentic-coding friendliness             | High     | AI agents can inspect code, run targeted tests, make small diffs, and understand boundaries.                             |
| Inspectability by AI agents             | High     | Text files, explicit schemas, predictable module layout, small services, good docs.                                      |
| Testability                             | High     | Domain, service, migration, read-model, CLI, and golden-scenario tests are easy to write.                                |
| Type safety and schema clarity          | High     | Domain types and database schema constrain important relationships.                                                      |
| Migration/versioning support            | High     | Can import v1 data with source references and evolve schema safely.                                                      |
| File/artifact handling                  | High     | Supports local file paths, registries, provenance, and generated artifacts without treating them as opaque blobs.        |
| Search/retrieval support                | Medium   | Starts with keyword/FTS and can add embeddings later.                                                                    |
| Model-provider integration              | Medium   | Supports provider abstraction without requiring provider lock-in.                                                        |
| CLI suitability                         | High     | Core workflows can be operated without UI and exposed to agents.                                                         |
| Optional UI/web-app path                | Medium   | Can grow into a local operator UI without driving core design.                                                           |
| Observability/logging                   | High     | Runs, sessions, tool calls, approvals, decisions, and errors are durable and queryable.                                  |
| Security/safety/approval gates          | High     | Permission checks and risky actions are modeled and enforceable.                                                         |
| Privacy and local control               | High     | Sensitive project data can stay local.                                                                                   |
| Cost                                    | Medium   | Avoids cloud infrastructure and high token use by default.                                                               |
| Long-term maintainability               | High     | Small core, explicit boundaries, tested migrations, low conceptual duplication.                                          |
| Ability to start small and scale later  | High     | Minimal slice can be built quickly without blocking later retrieval/local-model work.                                    |
| Risk of unnecessary complexity          | High     | Avoids graph/vector/distributed infrastructure before evidence.                                                          |
| Risk of locking into bad abstractions   | High     | Supports migration and staged decisions rather than hard-coding premature concepts.                                      |
| Fit with actual workflow                | High     | Works with Codex/local agents, reviewable diffs, CLI, docs, and local repo inspection.                                   |

## Weighting Summary

Highest-weight factors:

1. Local-first simplicity.
2. Explicit domain/schema fit.
3. Agentic coding and inspectability.
4. Testability and migration safety.
5. Ability to defer heavy retrieval/model infrastructure.

Lower-weight factors for now:

- Enterprise scalability.
- Multi-user deployment.
- Cloud-native services.
- Real-time collaboration.
- Provider-specific convenience SDKs.

## Decision Rule

Choose the smallest stack that can prove the core ontology and workflows. Add tools only when they clarify or enforce a needed concept, not because they are common in larger systems.
