# Model Change Proposal: Preview Review And Approval Recording

Date: 2026-07-03
Status: Experimental
Owner: AMS v2 preview
Related task: v2 preview review/approval recording slice

## Proposed Change

Add preview write operations for accepted `Review` and `Approval` concepts in the v2 preview database.

This proposal does not add new review or approval entities. It authorizes preview-only creation of review and approval records using the existing v2 proof tables so v2 can test governance over preview-created evidence.

## Type Of Construct

- `Review`: accepted domain concept; preview write operation.
- `Approval`: accepted domain concept; preview write operation.
- Preview review/approval statuses: implementation vocabulary scoped to preview writes.

## Problem This Solves

The v2 preview can now create tasks, runs, artifacts, decisions, tools, evaluations, routing decisions, dependency-reduction records, and memory items. Those records need governance evidence without relying only on ad hoc status fields.

Without preview review/approval recording, memory publication, replacement status, routing rationale, and evaluation evidence can be stored but not explicitly accepted, rejected, or marked for revision inside the preview DB.

## Supported Workflow, Query, Decision, Or Validation

The preview slice should support:

- record a review against a task and optional run
- record an approval against a task and optional run
- preserve source/provenance for preview-created reviews and approvals
- show preview-created reviews and approvals in existing task detail and work packets
- index review/approval summaries in local search
- avoid silently completing tasks, publishing memory, or changing routing policy

## Competency Question

What governance evidence says this task/run/evidence was reviewed or approved, and did that governance action change state or merely record a preview decision?

## Existing Related Concepts

- `Review`: accepted governance record for evaluating submitted work evidence.
- `Approval`: accepted permission gate required before risky action or state transition.
- `Decision`: accepted durable choice with rationale.
- `Run`: accepted task-linked work attempt/evidence record.
- `MemoryItem`: accepted minimal governed knowledge concept with preview-only storage.
- `DependencyReductionRecord` and `RoutingDecision`: experimental preview evidence that may need governance.
- `EvaluationResult`: accepted minimal evidence concept that may support review context.

## Why Existing Concepts Are Insufficient

The concepts are sufficient. The gap is preview write support, not a new domain entity.

The existing `record-decision` command records general choices but does not represent review outcome or approval permission.

## Classification

This is an implementation/workflow change over accepted domain concepts, scoped to preview storage.

It should not create a second governance model.

## Examples

- A review records that a preview memory item needs revision before it should be considered publishable.
- An approval records that a preview run's generated diff may be applied by a future workflow.
- A review rejects a dependency-reduction status because evidence is too weak.

## Non-Examples

- A review is not a run result.
- An approval is not a review of completed work.
- A decision summary is not enough when the workflow specifically needs review or permission evidence.

## Relationship To Existing Model

Preview review and approval writes use existing `v2_reviews` and `v2_approvals` proof tables.

Records may reference:

- a `Task`
- optionally a `Run`

Future production schema may add more specific evidence-target links, but this slice should not add a generic target graph yet.

Owned bounded context:

- primary: Work and execution
- secondary: Feedback and evaluation

## Consequences Of Adding It

- Lets v2 preview evidence be governed explicitly.
- Reuses accepted concepts instead of adding a duplicate system.
- Keeps task/work-packet surfaces coherent.
- Does not yet support direct foreign keys to memory/evaluation/routing/dependency records.

## Consequences Of Not Adding It

- Preview evidence accumulates without governance records.
- Memory status and dependency status carry too much authority.
- Future UI and automation may assume status fields are sufficient.

## Can Existing Concepts Represent This For Now?

Yes.

Use accepted `Review` and `Approval` concepts. This proposal only adds preview write support.

## Failure Mode If Poorly Modeled

- Reviews and approvals become generic decisions under different names.
- Approval is used as post-hoc quality review.
- Review insertion silently completes tasks or publishes memory.
- Preview governance creates a parallel production-incompatible model.

## Decision

Experimental preview write support.

The next implementation may insert preview-created rows into existing `v2_reviews` and `v2_approvals` tables with `ams-v2-preview` provenance. It must not mutate task state, publish memory, approve external actions automatically, or introduce new production governance schema.

## Rationale

`Review` and `Approval` are already accepted concepts. The safest next step is to prove write behavior and read-model integration before adding richer evidence-target modeling.

## Follow-Up

- Add focused tests for review and approval creation.
- Expose commands in `scripts/v2-preview-db.ts`.
- Include reviews/approvals in preview search.
- Revisit whether richer evidence targets are needed after real preview workflows use these records.
