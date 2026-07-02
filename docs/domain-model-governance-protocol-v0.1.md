# Agent Management System Domain Model Governance Protocol v0.1

Date: 2026-07-01
Status: Draft, active for review-gated model changes

## Purpose

This protocol keeps the Agent Management System domain model intentional as AI-assisted work adds features. It exists to prevent schema, entity, ontology, enum, status, and field drift; reduce duplicate or vague constructs; preserve internal consistency; and make model changes explainable, reviewable, and testable.

The rule is lightweight:

No new entity, field, relationship, enum, status, type, or core construct should be added to AMS unless it has passed a small conceptual review.

AI agents may generate candidate concepts freely. Accepted model concepts must pass through this gate before they become core domain model, schema, API, CLI, MCP, or workflow vocabulary.

## Source Of Truth

Use these locations before proposing or implementing a model change:

| Concern                                                  | Source                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Conceptual ontology                                      | `docs/ontology-v1.md`                                                                                       |
| Accepted glossary and maturity status                    | `docs/domain-glossary.md`                                                                                   |
| Domain model source map and bounded contexts             | `docs/domain-model.md`                                                                                      |
| Text diagram of accepted or candidate relationships      | `docs/model-diagram.md`                                                                                     |
| Significant model decisions                              | `docs/model-decisions/`                                                                                     |
| Model change proposals                                   | `docs/model-change-proposals/`                                                                              |
| Representative model scenarios/evals                     | `docs/model-evals/golden-scenarios.md`                                                                      |
| Runtime storage policy                                   | `docs/runtime-data-policy.md`                                                                               |
| SQLite foundation                                        | `src/lib/server/db/migrations/001-app-foundation.sql`                                                       |
| Current typed control-plane records, enums, and statuses | `src/lib/types/control-plane.ts`                                                                            |
| API/domain helpers                                       | `src/lib/server/control-plane.ts`, `src/lib/server/control-plane-repository.ts`, and focused helper modules |

If these sources conflict, treat the conflict as a defect. Do not preserve contradictory model meanings as parallel options unless separate bounded contexts are explicitly documented.

## Model Change Categories

This protocol applies before changing or adding:

- new entity or record type
- new field
- new relationship
- new enum, status, type, lifecycle, or classification
- renamed concept
- merged concept
- split concept
- deprecated concept
- removed concept
- changed meaning of an existing concept
- new model-facing API, CLI, MCP, UI, or workflow term that could become domain vocabulary

Small UI copy changes do not require a proposal unless the wording introduces a new model concept or changes the meaning of an existing one.

## Bounded Contexts

Terms are only canonical inside their context. Do not collapse overloaded words into global concepts.

Initial AMS bounded contexts:

- Goal, state, and planning: goals, desired future state, success criteria, planning sessions, progress, uncertainty, decisions.
- Work and execution: tasks, dependencies, blockers, readiness, autonomy, runs, work attempts, reviews, approvals.
- Agent, tool, and capability: roles, providers, execution surfaces, skills, tools, capability requirements, routing affordances.
- Feedback and evaluation: run evidence, validation, review outcomes, follow-up tasks, lessons, golden scenarios.
- Project and artifact: project memory, constraints, non-goals, artifacts, context resources, output organization.
- System implementation: SQLite records, TypeScript types, API routes, CLI commands, MCP tools, UI state.

Example: `Goal.status`, `Task.status`, `Run.status`, and application UI state are not one universal `State` concept. A status belongs to a specific workflow and should affect filtering, sequencing, validation, UI behavior, or allowed transitions.

## Proposal Workflow

1. Identify the need for a model change.
2. Review `docs/ontology-v1.md`, `docs/domain-glossary.md`, `docs/domain-model.md`, `docs/model-diagram.md`, existing model decisions, and `src/lib/types/control-plane.ts`.
3. Create a model change proposal using `docs/model-change-proposals/TEMPLATE.md`.
4. Classify the proposed construct as entity, field, relationship, enum/status/type, tag, event, metadata, derived value, UI concern, workflow concept, implementation detail, or uncertain.
5. Check duplicate and overlap risks.
6. Decide: accept, reject, defer, merge, rename, deprecate, remove, change meaning, or mark experimental.
7. If accepted, update the source-of-truth docs, schema/types/helpers, examples, and tests that depend on the construct.
8. Record a model decision when the change is significant.
9. Revisit candidate and experimental concepts during model review.

## Model Change Proposal Template

Use `docs/model-change-proposals/TEMPLATE.md`. Every proposal should answer:

- What change is being proposed?
- What problem does it solve?
- What workflow, query, decision, or validation does it support?
- What competency question should AMS answer because this exists?
- What existing concepts are similar?
- Why are existing concepts insufficient?
- Is this a core domain concept, implementation detail, UI concern, metadata, derived value, event/log, tag, workflow concept, or temporary experimental concept?
- What are examples and non-examples?
- What are the consequences of adding it?
- What are the consequences of not adding it?
- Can this be represented using an existing concept for now?
- Should this be accepted, rejected, deferred, merged, renamed, deprecated, removed, changed, or treated as experimental?

## Duplicate And Overlap Review

Before accepting a construct, check:

- Does this duplicate an existing field under a different name?
- Is this actually a synonym?
- Is this a narrower version of an existing concept?
- Is this a broader concept that should replace several smaller ones?
- Is this a relationship rather than a field?
- Is this an event/history record rather than current state?
- Is this a computed or derived value rather than stored data?
- Is this a UI label rather than a domain concept?
- Is this a temporary workflow need rather than a stable model concept?
- Is this better represented as a tag, note, metadata object, artifact, context resource, or decision record?
- Does this create a second task, goal, run, review, approval, workflow, skill, planning, or milestone system?
- Does this silently change the meaning of an accepted concept?

## Acceptance Criteria For New Constructs

A construct can be accepted into the core model only when:

- It supports a real workflow, query, decision, or validation need.
- It has a clear definition.
- It has clear boundaries from similar concepts.
- It has examples and non-examples.
- It has a known relationship to the rest of the model.
- It belongs to a documented bounded context.
- It is not merely speculative.
- It is stable enough to include in the core model, or explicitly marked experimental.
- It improves the system more than it increases complexity.
- At least one representative scenario or test is clearer because it exists.

Prefer fewer, stronger core concepts. Do not add a field unless something needs to read it, write it, query it, validate it, sort by it, filter by it, or make a decision from it.

## Concept Maturity

Use these maturity states in the glossary and proposals:

- Candidate: plausible concept under consideration, not accepted.
- Experimental: allowed in limited artifacts or implementation slices, not yet core.
- Accepted: part of the project model and safe for implementation.
- Deprecated: kept for compatibility or historical context; avoid new use.
- Rejected: reviewed and intentionally not adopted.
- Merged: folded into another concept.
- Superseded: replaced by a newer concept or decision.

Candidate or experimental concepts should not silently become database fields, enums, statuses, API parameters, or durable workflow states.

## AI-Agent Instructions

Agents working on AMS must follow these rules:

- Do not add entities, fields, statuses, enums, relationships, or core constructs casually.
- First review the existing domain model, glossary, schema/types, diagram, and decision records.
- Prefer using or refining existing constructs over creating new ones.
- If a new construct seems necessary, create a model change proposal before implementation unless the task explicitly authorizes the exact model change.
- Explicitly compare the proposed construct to existing similar constructs.
- Mark uncertainty instead of pretending the model is final.
- Do not silently change the meaning of existing concepts.
- Do not introduce duplicate terms for the same idea.
- Do not let UI wording automatically become domain model wording.
- Do not add a status unless it changes allowed behavior, filtering, sequencing, validation, or review.
- If unsure, propose the change as experimental or deferred.

If an implementation task appears to require an unauthorized model change, stop and produce a model change proposal instead of expanding the model silently.

## Decision Records

Create a model decision record in `docs/model-decisions/` for significant changes, including:

- major new entities
- splitting or merging concepts
- changing core meanings
- deprecating accepted concepts
- adopting major modeling patterns
- resolving repeated naming or bounded-context conflicts
- making a candidate or experimental concept accepted

Use `docs/model-decisions/TEMPLATE.md`. Each decision record should capture decision, context, alternatives considered, rationale, consequences, date, status, and a superseded-by link if later changed.

## Review Cadence

Review the model:

- before implementing a new entity
- before adding several fields
- before changing relationships
- before adding or changing statuses/enums
- after a major AI-generated implementation pass
- after discovering duplicate concepts
- after a workflow feels awkward or requires repeated explanation
- before migration or release checkpoints
- when golden scenarios become hard to represent

## Minimal Tooling

Keep the v0.1 stack small:

- Markdown glossary: `docs/domain-glossary.md`
- Conceptual model note: `docs/ontology-v1.md`
- Source map and bounded contexts: `docs/domain-model.md`
- Mermaid diagram: `docs/model-diagram.md`
- Model change proposals: `docs/model-change-proposals/`
- Model decision records: `docs/model-decisions/`
- Golden scenarios: `docs/model-evals/golden-scenarios.md`
- TypeScript types and runtime validation where needed
- Migration history and runtime-data policy
- Focused tests/evals for representative workflows

Validation tools enforce structure. They do not decide whether the structure belongs in the model. Use this protocol for conceptual fit, then use schema/types/tests for technical conformance.
