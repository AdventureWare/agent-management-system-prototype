# Model Decision: Adopt Lightweight Domain Model Governance

Date: 2026-07-01
Status: Accepted
Superseded by:

## Decision

Use `docs/domain-model-governance-protocol-v0.1.md` as the lightweight review gate for future AMS domain model changes.

## Context

AMS uses abstract, overlapping concepts such as goals, tasks, runs, reviews, approvals, workflows, skills, execution surfaces, project memory, context, artifacts, decisions, capabilities, and uncertainty. AI-assisted implementation can easily introduce plausible but duplicate or vague entities, fields, statuses, and relationships.

The project needs a way for agents to propose candidate concepts without silently expanding the accepted model.

## Alternatives Considered

- Rely on ad hoc human judgment during each implementation task.
- Freeze the current model and reject new constructs by default.
- Adopt a heavy metadata, ontology, or governance platform.
- Use a lightweight markdown-based protocol, glossary, proposal template, decision records, diagram, and golden scenarios.

## Rationale

The lightweight protocol gives AMS enough discipline to prevent drift while preserving fast iteration. It aligns with the existing conceptual ontology and runtime-data policy, and it keeps accepted model changes tied to workflows, competency questions, examples, non-examples, and reviewable decisions.

## Consequences

Agents must check the model sources before adding constructs. Unauthorized model changes should become model change proposals instead of hidden schema/type/API expansion. Significant accepted changes should update the glossary, diagram, source map, tests or scenarios, and model decisions.

## Source Updates

- `docs/domain-model-governance-protocol-v0.1.md`
- `docs/domain-model.md`
- `docs/domain-glossary.md`
- `docs/model-diagram.md`
- `docs/model-change-proposals/`
- `docs/model-decisions/`
- `docs/model-evals/golden-scenarios.md`
- `AGENTS.md`
- `.agents/skills/ams-agent-interface/SKILL.md`
