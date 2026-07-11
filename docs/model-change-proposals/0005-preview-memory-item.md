# Model Change Proposal: Preview Memory Item

Date: 2026-07-03
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview governed memory item slice

Post-hardening note: `MemoryItem` is now an accepted minimal governed knowledge concept by `docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md`. This proposal remains experimental for preview storage, automatic extraction, automatic publication, retrieval ranking, expiration policy, skill promotion, and production schema/migration.

## Proposed Change

Add a preview-only `MemoryItem` record so v2 can test governed reusable local knowledge before accepting production memory schema or retrieval policy.

This proposal does not turn project prose, chat history, run output, or agent summaries into trusted memory automatically. It authorizes a limited preview implementation under the v2 preview database boundary.

## Type Of Construct

- `MemoryItem`: accepted minimal governed knowledge concept; preview implementation record remains preview-only.
- Memory status values beyond the minimal accepted lifecycle: candidate vocabulary scoped to preview memory governance.
- Source evidence links: candidate metadata scoped to preview records.

## Problem This Solves

AMS needs durable local knowledge that can be reused across tasks without relying on external chat memory. But unreviewed summaries can easily become stale, wrong, or over-broad.

Without governed memory records, local knowledge remains scattered across project prose, decisions, run summaries, docs, and self-improvement items. With ungated memory records, agents could pollute the system with untrusted claims.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- record a memory item as draft, proposed, published, archived, or superseded
- attach memory to a project and optionally a task
- cite source task/run/decision/evaluation/dependency evidence
- expose only task-linked memory and project-scoped proposed/published memory through work packets
- index memory records for local search
- avoid treating draft memory as trusted retrieval context

## Competency Question

What reusable local knowledge does AMS have for this project or task, what is its governance status, and what evidence supports trusting it?

## Existing Related Concepts

- `Project`: accepted durable context container with project memory prose.
- `Decision`: accepted durable choice with rationale and evidence.
- `Run`: accepted task-linked work attempt/evidence record.
- `EvaluationResult`: accepted minimal evidence concept.
- `DependencyReductionRecord`: experimental preview replacement-status evidence.
- self-improvement knowledge items: existing v1 reusable lessons/procedures.
- docs and skills: durable human-curated knowledge artifacts.

## Why Existing Concepts Are Insufficient

Project memory prose is useful but not source-linked, lifecycle-governed, or easy to retrieve selectively.

`Decision` records choices, not reusable background knowledge.

`Run` records work evidence, not durable knowledge publication.

Self-improvement knowledge captures lessons, but v2 needs a broader local memory boundary that can cite tasks, decisions, evaluations, and dependency-reduction evidence.

## Classification

`MemoryItem` is an accepted minimal governed knowledge concept in the Project and artifact bounded context, with links to Feedback and evaluation and Work and execution. The preview table and any production schema/migration remain preview-only until a later implementation decision.

It is a governed knowledge record for preview. It is not a transcript, prompt cache, task note, or automatic retrieval instruction.

## Examples

- "For AMS v2 preview work, never write to `data/app.sqlite`; use preview DBs or temp DBs."
- "SQLite FTS is the first local retrieval layer; embeddings are deferred until metadata search proves insufficient."
- "Dependency-reduction records are evidence summaries, not provider retirement commands."

## Non-Examples

- A whole chat transcript is not a memory item.
- A task result summary is not a memory item until curated as reusable knowledge.
- A draft note should not be treated as trusted memory.
- A decision record should not be duplicated as memory unless the reusable principle is explicitly extracted.

## Relationship To Existing Model

`MemoryItem` may reference:

- a `Project`
- optionally a `Task`
- optionally a source `Task`
- optionally a source `Run`
- optionally a source `Decision`
- optionally a preview `EvaluationResult`
- optionally a preview `DependencyReductionRecord`
- optionally a superseded memory item

Future production schema may split memory into project facts, procedural lessons, policy constraints, retrieval documents, and skill candidates.

Owned bounded context:

- primary: Project and artifact
- secondary: Feedback and evaluation, Work and execution

## Consequences Of Adding It

- Makes reusable local knowledge explicit and source-linked.
- Provides a safer path away from external chat memory.
- Gives future retrieval a governance-aware source.
- Adds lifecycle responsibility around draft/proposed/published/archived status.
- Risks stale or low-quality memory if publication status is not reviewed later.

## Consequences Of Not Adding It

- Local memory remains scattered across prose fields, docs, decisions, and run summaries.
- Work packets cannot distinguish trusted memory from draft notes.
- Agents may continue relying on chat context or rereading broad docs.
- Dependency-reduction progress may stall because local knowledge cannot be reused safely.

## Can Existing Concepts Represent This For Now?

Partially.

Project memory prose, decisions, docs, and self-improvement items can represent parts of the need, but none gives v2 a small governed memory lifecycle with source evidence and preview retrieval rules.

For the preview slice, use preview records and keep retrieval rules narrow.

## Failure Mode If Poorly Modeled

- Draft memory becomes trusted retrieval context.
- Agents write broad claims with weak evidence.
- Memory duplicates decisions, docs, and skills instead of extracting reusable knowledge.
- Published memory never expires or gets superseded.
- Work packets become stuffed with unrelated memory.

## Decision

Accepted concept; experimental preview storage.

The preview implementation may keep using preview-only memory item records in the v2 preview database. These records must not be treated as accepted v2 runtime schema, automatic memory extraction, automatic memory publication, final retrieval ranking, expiration policy, skill promotion, or production migration.

## Rationale

The owned-agent goal requires durable local knowledge, but memory is high-risk if agents can silently write trusted state. A preview record with explicit lifecycle and source evidence is the smallest useful checkpoint.

The minimum useful implementation should record memory items and expose only narrow, governed context. It should not perform automatic extraction, publication, retrieval ranking, or project-memory migration.

## Follow-Up

- Update production schema only after a separate migration decision.
- Define publication policy, retrieval ranking, expiration, trust review, conflict handling, and skill-promotion rules before production persistence.
- Keep implementation preview-only and separate from `data/app.sqlite`.
