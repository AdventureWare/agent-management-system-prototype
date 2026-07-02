# AMS Domain Model Source Map

Date: 2026-07-01
Status: Draft source map

This file points to the current model sources so agents do not invent a second domain model.

## Canonical Sources

- Conceptual ontology: `docs/ontology-v1.md`
- Governance protocol: `docs/domain-model-governance-protocol-v0.1.md`
- Glossary: `docs/domain-glossary.md`
- Diagram: `docs/model-diagram.md`
- Decisions: `docs/model-decisions/`
- Change proposals: `docs/model-change-proposals/`
- Golden scenarios: `docs/model-evals/golden-scenarios.md`
- TypeScript records and enums: `src/lib/types/control-plane.ts`
- Runtime storage policy: `docs/runtime-data-policy.md`

## Current Accepted Core Implementation Records

The current implementation stores typed JSON control-plane records in SQLite. The active implementation concepts include:

- `Project`
- `Goal`
- `Task`
- `Run`
- `Review`
- `Approval`
- `Decision`
- `Workflow`
- `WorkflowStep`
- `TaskTemplate`
- `Role`
- `Provider`
- `ExecutionSurface`

The conceptual ontology also names concepts that are not fully first-class implementation records yet, such as `WorkAttempt`, `Actor`, `Capability`, `Tool`, `ContextResource`, and richer `Artifact`. Treat those as conceptual or under-modeled unless a proposal and decision accept a concrete implementation change.

## Bounded Contexts

Use the bounded contexts from `docs/domain-model-governance-protocol-v0.1.md` when evaluating overloaded terms:

- Goal, state, and planning
- Work and execution
- Agent, tool, and capability
- Feedback and evaluation
- Project and artifact
- System implementation

## Model Change Rule

Before changing accepted model vocabulary, types, statuses, schema, API fields, CLI/MCP parameters, or relationship semantics, create or reference a model change proposal. Small implementation changes that only use existing accepted constructs do not need a proposal.
