# Agentic Development Process v0.1

Date: 2026-07-02
Status: Process recommendation

## Purpose

This process is optimized for building AMS with Codex-like agents now and future owned agents later. It prioritizes small reversible changes, durable context, explicit acceptance criteria, and tests that prevent repeated rework.

## Repo Structure

Recommended v2 shape inside this repo until a separate repo is justified:

```text
docs/
  stack_assessment/
  model-change-proposals/
  model-decisions/
src/lib/server/v2-*
scripts/v2-*
src/lib/server/fixtures/
```

For a larger v2 implementation, move toward:

```text
v2/
  src/domain/
  src/services/
  src/storage/
  src/cli/
  src/api/
  src/ui/
  src/import/
  tests/
```

Rule:

- Keep v2 isolated from v1 runtime state until a migration decision is approved.

## Branching And Git Workflow

- Use short-lived branches for implementation slices.
- Keep docs/design changes separate from runtime implementation when possible.
- Commit intentional slices: import proof, schema proof, read model, CLI command, service mutation, UI adapter.
- Do not mix broad refactors with feature work.
- Keep generated/runtime data out of commits.

## Task Specification

Each implementation task should include:

- objective
- scope
- non-goals
- affected entities
- storage impact
- migration impact
- acceptance criteria
- validation commands
- rollback/cleanup note
- whether model governance is required

Tasks should say whether they are:

- design-only
- read-only implementation
- preview-only implementation
- runtime mutation
- migration
- UI adapter

## How Agents Should Inspect Context

Before edits, agents should inspect:

- `AGENTS.md`
- relevant docs under `docs/`
- model governance docs if entities/fields/statuses change
- current types and tests
- storage/runtime policy
- nearby helper modules and route handlers
- existing scripts before creating new ones

Agents should use structured repo tools and `rg` first. They should not infer domain rules from UI text alone.

## Review Generated Changes

Review should ask:

- Did this change add or rename a model concept?
- Is the new behavior covered by tests?
- Does it touch runtime state?
- Are source references and migration paths preserved?
- Did it duplicate an existing helper/service?
- Can the diff be reverted cleanly?
- Does the change advance the stated v2 goal?

## Keep Diffs Small And Reversible

Preferred slice sizes:

- one doc set
- one pure mapper
- one schema proof
- one read model
- one CLI command
- one service operation
- one UI adapter

Avoid:

- schema + UI + importer + workflow mutation in one change
- broad renames
- opportunistic cleanup outside the task
- adding "future-proof" entities without tests

## Tests As Guardrails

Required test types over time:

- domain unit tests for transitions/invariants
- storage tests with in-memory/temp SQLite
- migration/import fixture tests
- read-model tests
- CLI tests/smoke commands
- API adapter tests
- Svelte UI tests only after service behavior exists
- golden scenario tests
- evaluation benchmark tests
- replay tests for agent workflows

Every v2 storage change should have a migration or schema proof test.

## Decision Logging

Use:

- `docs/model-change-proposals/` for proposed model changes.
- `docs/model-decisions/` for accepted significant model decisions.
- `docs/stack_assessment/` for stack/process decisions.
- Task/run/decision records when the system can record them safely.

Decision logs should capture alternatives considered and why the chosen path fits AMS, not generic industry practice.

## Avoid Agent-Created Bloat

Rules:

- Do not add a table/entity because it might be useful later.
- Do not create duplicate names for existing concepts.
- Do not add statuses unless they change filtering, sequencing, validation, or allowed behavior.
- Do not add a UI page before a CLI/service path exists.
- Do not add provider integrations before provider evaluation exists.
- Do not add embeddings before FTS baseline exists.

## Prevent Repeated Rework

- Keep architecture decisions close to implementation docs.
- Preserve source references during imports.
- Use fixtures from real v1 slices.
- Write failing regression tests for discovered ambiguity.
- Convert repeated agent mistakes into skills, docs, or CLI validation.
- Keep a "known open decisions" section in each design doc.

## Documentation Structure

Recommended docs pattern:

- `*_audit_*`: what exists.
- `*_decision_*`: selected path and rationale.
- `*_requirements_*`: what must be true.
- `*_domain_model_*`: entities and relationships.
- `*_architecture_*`: layers and boundaries.
- `*_migration_plan_*`: preservation/import/rollback.
- `*_minimal_vertical_slice_*`: implementation sequence.

Docs should be specific enough for an agent to continue work in a later session without rereading the whole repo.

## Acceptance Criteria For Changes

Good acceptance criteria answer:

- What user/operator question can now be answered?
- What workflow is now possible?
- What state is created, read, updated, or preserved?
- What safety rule is enforced?
- What evidence proves the change works?
- What remains intentionally out of scope?

## Evaluating Whether Work Advances The Goal

A change advances AMS v2 if it improves at least one of:

- durable work state clarity
- local-first autonomy
- source/evidence traceability
- agent-safe execution
- provider replacement optionality
- evaluation quality
- memory governance
- artifact handling
- operator decision quality

If a change only adds UI surface, abstraction, or configuration without improving one of these, it should be challenged.

## Keeping The Prototype Available

- Treat v1 as operational and preserved.
- Do not mutate v1 runtime data for v2 experiments.
- Use snapshots, fixtures, and preview DBs.
- Keep v1 docs and tests as evidence.
- Only migrate active work after v2 vertical slice proves a better workflow.
