# Agent Management System Prototype Instructions

## Current Milestone

- Current milestone: Autonomous Goal-Directed Work Loop v0.
- Read `docs/autonomous-goal-directed-work-loop-v0.md` plus the relevant readiness, rigor, contextual knowledge, and agent-facing interface docs before broad changes in this area.
- Work should be continuous: agents should select or create the next planning, research, clarification, review, or execution task as needed from durable Goal/Task/Run state. Do not add batch-planning or cycle-closeout ceremonies.
- For agent-facing AMS affordances, read `docs/agent-facing-ams-interface-v0.md` and prefer structured domain/API/MCP operations over prompt stuffing.
- For agents using AMS as a control loop, keep `.agents/skills/ams-agent-interface/SKILL.md` aligned with the structured Goal/task/run/review workflow.
- Keep simple task capture lightweight; add structure progressively when work is delegated, reviewed, closed out, or made repeatable.
- Runtime state policy: `data/app.sqlite` is the normal writable source of truth; `data/control-plane.json` and other JSON files are explicit seed/export/import/recovery snapshots. Read `docs/runtime-data-policy.md` before changing tracked data artifacts.

## Source-of-Truth Discipline

- Treat conflicting requirements, docs, UI paths, and implementation behavior as defects.
- Do not preserve two contradictory directions as parallel "options" unless the product explicitly defines separate use cases.
- When a stale instruction conflicts with the current product direction, update or remove the stale instruction in the same change.
- Inspect existing models, routes, workflows, helpers, skills, and docs before adding new abstractions.
- Before adding or changing a domain entity, field, relationship, enum, status, lifecycle, or core construct, follow `docs/domain-model-governance-protocol-v0.1.md`. Review the ontology, glossary, domain model source map, diagram, decision records, and `src/lib/types/control-plane.ts`; create a model change proposal when the task does not explicitly authorize the exact model change.
- Do not silently expand the domain model to solve a local implementation problem. Prefer using or refining existing constructs, and mark uncertain concepts as candidate, experimental, deferred, merged, renamed, or rejected instead of turning them into accepted schema or workflow state.
- Use the existing `Goal`, task, workflow, skill, run, review, and approval concepts; do not create duplicate systems or a separate milestone abstraction.
- Preserve the invariant that active incomplete goals should not silently stall: if an active goal has no open work and is not blocked, in review, or done, AMS should create or surface a continuation-planning task rather than going inert.
- For managed agent work, review the linked task through task detail or `/app/governance`; runs are evidence records, not the primary human-decision surface.
- Do not add manual paste/import flows for managed run results when AMS can capture the run through its launcher, runner, thread, or execution-surface update path.

## Closeout Expectations

- End implementation tasks with a short result summary: what changed, validation performed, remaining issues, follow-up tasks, and whether project memory/current state should change.
- Update task, run, project, docs, or decision state when results affect project direction; otherwise state why no durable update was needed.
- Stop and ask before continuing when ambiguity, high risk, missing approval, blocked dependencies, or scope creep would invalidate the task contract.
