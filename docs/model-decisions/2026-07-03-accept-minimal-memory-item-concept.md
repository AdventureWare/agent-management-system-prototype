# Model Decision: Accept Minimal MemoryItem Concept

Date: 2026-07-03
Status: Accepted
Superseded by:

## Decision

Accept `MemoryItem` as a core AMS/v2 governed knowledge concept.

A `MemoryItem` is a source-linked reusable local knowledge record scoped to a project and optionally a task, with lifecycle status controlling whether it can be treated as candidate or trusted retrieval context.

Minimal accepted fields:

- `id`
- `projectId`
- `taskId`
- `scope`
- `title`
- `summary`
- `body`
- `status`
- `sourceTaskId`
- `sourceRunId`
- `sourceDecisionId`
- `sourceEvaluationResultId`
- `sourceDependencyReductionId`
- `supersedesId`
- `createdAt`
- `publishedAt`

Minimal accepted statuses:

- `draft`
- `proposed`
- `published`
- `archived`
- `superseded`

The accepted concept does not require production schema, migration, automatic memory extraction, automatic publication, retrieval ranking, expiration policy, or skill promotion in this decision. Existing preview records remain preview records until a later schema decision.

## Context

AMS needs local reusable knowledge that can progressively replace reliance on external chat memory. Existing project memory prose, docs, decisions, run summaries, and self-improvement knowledge are useful, but they do not provide a small governed record with source evidence, scope, lifecycle status, and retrieval boundaries.

The v2 preview implemented preview-only memory records with project/task scope, lifecycle statuses, source links, supersession links, work-packet inclusion rules, search indexing, and provenance. Preview tests show that task-linked memory and project-scoped proposed/published memory can be surfaced while project-scoped draft memory stays hidden.

## Alternatives Considered

- Keep memory only as project prose and docs.
- Treat memory items as `Decision` records.
- Treat memory items as `Artifact` records.
- Treat memory items as skills or self-improvement knowledge only.
- Wait for final retrieval ranking and publication policy before accepting `MemoryItem`.
- Accept only the minimal governed knowledge concept now.

## Rationale

`MemoryItem` answers real AMS queries:

- What reusable local knowledge exists for this project or task?
- What is the item's governance status?
- What source evidence supports trusting it?
- Which item supersedes older guidance?
- Which memory is eligible for work-packet or retrieval context?

It is not reducible to existing concepts:

- `Decision` records a choice and rationale; memory extracts reusable knowledge.
- `Run` records work evidence; memory records durable reusable knowledge.
- `Artifact` is a durable file or output; memory is curated knowledge with lifecycle.
- `Skill` is reusable procedural instruction; memory may later suggest a skill, but is not itself a skill.
- Project memory prose is broad context, not source-linked governed knowledge.

Accepting `MemoryItem` now gives AMS stable vocabulary for governed local memory without allowing agents to silently publish trusted context.

## Consequences

Easier:

- Work packets can distinguish source-linked memory from broad project prose.
- Future retrieval can filter by scope and lifecycle status.
- Agents can propose memory without automatically publishing trusted state.
- Supersession gives stale guidance a clear replacement path.

Harder:

- Memory publication policy must stay explicit and reviewable.
- Memory items must not duplicate decisions, docs, skills, artifacts, or raw transcripts.
- Retrieval code must respect status/scope boundaries.
- Production storage needs a separate migration and retention decision.

Deferred:

- Production schema and migration remain out of scope.
- Automatic extraction from runs, chats, or docs remains out of scope.
- Automatic publication remains out of scope.
- Retrieval ranking, expiration, trust scoring, and conflict resolution remain out of scope.
- Splitting memory into project facts, procedural lessons, constraints, retrieval documents, and skill candidates remains out of scope.

## Source Updates

- `docs/domain-glossary.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/model-diagram.md`
- `docs/ontology-v1.md`
- `docs/model-change-proposals/0005-preview-memory-item.md`
