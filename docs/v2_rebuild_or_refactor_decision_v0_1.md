# V2 Rebuild Or Refactor Decision v0.1

Date: 2026-07-02
Status: Recommendation draft
Decision: Build v2 in parallel while preserving the prototype.

## Recommendation

Build v2 in parallel while preserving the prototype as:

- the current working operator tool
- a data/evidence corpus
- a reference implementation for useful flows
- a migration source
- a guardrail against speculative architecture

Do not start a clean v2 by discarding the prototype. Do not refactor the prototype in place as the primary path. Use the prototype to define the v2 domain model, tests, import/export adapters, and vertical slice, then migrate selectively.

## Why Not Just Continue Evolving The Prototype

Continuing in place is viable for narrow v1 improvements, but it is not the best path for the broader owned AI/agent system goal.

Evidence:

- Storage is generic `collection/id/payload` SQLite, which was right for velocity but weak for cross-cutting v2 queries over artifacts, sessions, tools, model routing, evaluations, memory, and dependency reduction.
- Execution history is split between control-plane `Run` and agent-thread `AgentRun`.
- Artifacts and context resources are paths/prose/attachments, not a durable registry.
- Tools and capabilities are mostly string arrays and generated manifest entries, not governed runtime records.
- Several surfaces overlap around work selection and state: task queue, autonomous queue, goal detail, planning, governance, and run detail.
- `Task` absorbs many responsibilities, which makes each new feature tempting to add as another field.

## Why Not Start A Totally Clean V2

A clean-room rebuild would throw away the best evidence in the repo.

Evidence:

- The existing model already found useful boundaries: `Goal`, `Task`, `Run`, `Review`, `Approval`, `Decision`, `Project`, `Workflow`, `TaskTemplate`, `Role`, `Provider`, and `ExecutionSurface`.
- There is real operational data: 397 tasks, 428 control-plane runs, 777 reviews, 1136 decisions, 482 threads, 3448 agent-thread runs, and telemetry.
- The agent-facing manifest/MCP pattern is useful.
- The governance docs prevent exactly the duplicate-concept drift v2 is likely to create.
- Existing tests encode many hard-won behavior expectations.

## Why Parallel V2 Is The Best Fit

Parallel v2 lets the prototype keep working while v2 proves a smaller core. It also avoids using a broad refactor as a design substitute.

Benefits:

- Preserve all current files and data.
- Keep v1 available while v2 is incomplete.
- Use adapters to import only concepts that survive v2 modeling.
- Compare v2 behavior against v1 records and golden scenarios.
- Make storage and domain boundaries cleaner without destabilizing the current operator UI.
- Design for local-first owned agents, retrieval, evaluations, tool logs, and provider reduction from the beginning.

## Decision Criteria

| Criterion                          | Continue prototype | Refactor in place | Parallel v2 | Clean v2 |
| ---------------------------------- | ------------------ | ----------------- | ----------- | -------- |
| Preserve working tool              | Strong             | Medium            | Strong      | Weak     |
| Reduce architectural debt          | Weak               | Medium            | Strong      | Strong   |
| Use prototype evidence             | Strong             | Strong            | Strong      | Weak     |
| Avoid data loss risk               | Strong             | Medium            | Strong      | Medium   |
| Support cleaner storage/model      | Weak               | Medium            | Strong      | Strong   |
| Limit scope creep                  | Medium             | Weak              | Medium      | Weak     |
| Support owned-agent long-term goal | Medium             | Medium            | Strong      | Medium   |

## Chosen Strategy

1. Freeze the prototype as v1 operationally, except for small fixes and export support.
2. Keep using v1 as evidence while designing v2.
3. Build v2 vertical slice in a separate directory, package, branch, or repository only after the v2 docs are reviewed.
4. Create a read-only v1 importer that maps selected records into v2.
5. Run v2 against a small copy/export of v1 data first.
6. Only migrate active operations after v2 handles the minimal slice better than v1.

## What To Preserve From V1

- Domain learning and names where they remain clear.
- Existing docs, especially ontology, glossary, governance protocol, runtime policy, goal-loop docs, and rationalization audit.
- Historical data and JSON exports.
- CLI/MCP capability manifest pattern.
- Managed thread runner and run evidence capture lessons.
- Human governance surfaces as a product requirement.
- Tests and golden scenarios that describe real workflows.

## What To Avoid Carrying Forward Blindly

- Generic JSON payload tables as the main v2 schema.
- Page-first domain helper sprawl.
- Treating tasks as the only place every relationship or governance fact can live.
- Splitting session/process runs and task evidence without a clear `Session`/`Run`/`ToolCall` boundary.
- Prose-only memory and artifact references.
- Tool/capability strings without registry, execution logs, or policy.
- More UI surfaces that separately answer "what should happen next?"

## Decision Record

Recommendation: build v2 in parallel while preserving prototype.

Reason: the prototype is valuable evidence and an active tool, but its architecture is now broad enough that in-place refactoring would be risky and slow. v2 should prove a smaller core around owned work state, sessions, artifacts, decisions, memory, tools, providers, retrieval, and evaluations before any migration.

Next decision needed: where v2 should live physically: same repo under a clearly isolated package/directory, a separate branch, or a new repository with v1 import tools.
