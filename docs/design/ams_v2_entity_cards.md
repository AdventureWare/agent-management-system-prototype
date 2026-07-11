# AMS V2 Entity Cards

Date: 2026-07-09
Status: Entity card source-of-truth v0.1

Field lists here are minimal. A field is not accepted merely because it appears
in v1, in a preview table, or in another product.

## Project

- Status: accepted
- Definition: bounded work container with local context, artifacts, goals, and
  policies.
- What it is not: not the goal, not a folder tree, not a company/org model.
- Why it exists: answers what contains the work and where context/artifacts live.
- Supports questions: 1, 3, 9, 16.
- Core relations: contains goals, tasks, artifacts, decisions, memory items.
- Lifecycle: active, paused, archived.
- Minimal fields: `id`, `name`, `summary`, `rootPaths`, `status`.
- Deferred fields: budget, stakeholder lists, portfolio metrics.
- Rejected fields: generic project health score.
- Invariants: every task belongs to one project.
- Bloat risks: turning project into a catch-all settings/document store.

## Goal

- Status: accepted
- Definition: desired future state or desired state-region.
- What it is not: not a task, not a project, not a milestone entity by default.
- Why it exists: coordinates work around outcomes.
- Supports questions: 1, 2, 4, 5, 6, 8, 13.
- Core relations: belongs to project, may have parent goal, advanced by tasks.
- Lifecycle: draft, active, blocked, paused, completed, superseded, canceled.
- Minimal fields: `id`, `projectId`, `parentGoalId`, `title`, `summary`,
  `successCriteria`, `status`, `priority`.
- Deferred fields: target metrics, confidence scoring, elaborate OKR structure.
- Rejected fields: goal_alignment_score, motivational essay.
- Invariants: active goals need success criteria or an explicit clarification
  task.
- Bloat risks: using goals as vague labels instead of desired states.

## Plan

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: proposed path from current state to desired state.
- What it is not: not execution evidence, not a task, not a workflow template.
- Why it exists: captures alternatives before committing to executable work.
- Supports questions: 8, 12, 15.
- Core relations: decomposes goal, proposes tasks, selected by decision.
- Lifecycle: draft, proposed, accepted, rejected, superseded.
- Minimal fields: `id`, `goalId`, `summary`, `status`, `createdAt`.
- Deferred fields: confidence score, full schedule, resource estimates.
- Rejected fields: plan_dashboard_color.
- Invariants: accepted plans must link to a goal.
- Bloat risks: making every task require a heavy plan ceremony.

## Task

- Status: accepted
- Definition: executable state-transition attempt intended to advance a goal.
- What it is not: not a goal, not a run, not a note, not a memory item.
- Why it exists: bounds work so an executor can act and results can be reviewed.
- Supports questions: 4, 5, 6, 7, 8, 9, 13, 19, 20.
- Core relations: belongs to project, advances goal, may depend on tasks, starts runs.
- Lifecycle: draft, ready, in_progress, blocked, review, done, canceled,
  superseded.
- Minimal fields: `id`, `projectId`, `goalId`, `parentTaskId`, `title`,
  `summary`, `scope`, `nonGoals`, `successCriteria`, `validationPlan`,
  `status`, `riskLevel`, `readinessLevel`, `reviewRequirement`.
- Deferred fields: estimate, deadline, capability taxonomy links, routing hints.
- Rejected fields: task_goal_notes, goal_alignment_score, task motivation essay.
- Invariants: active non-exploratory tasks must link to at least one goal.
- Bloat risks: stuffing routing, artifact, memory, evaluation, and governance
  facts into task fields instead of relations.

## AgentProfile

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: capability/role abstraction for an executor.
- What it is not: not a concrete run, not a model provider, not a person record.
- Why it exists: supports assignment and context shaping.
- Supports questions: 3, 8, 9, 17, 20.
- Core relations: assigned to task, may use model providers/tools/skills.
- Lifecycle: active, deprecated.
- Minimal fields: `id`, `name`, `summary`, `executorType`, `allowedRiskLevel`.
- Deferred fields: full skill matrix, performance scores.
- Rejected fields: personality flavor text.
- Invariants: agent profile cannot imply approval authority.
- Bloat risks: creating many persona-like agents instead of capability profiles.

## ModelProvider

- Status: accepted
- Definition: external or local model backend used by AI executors.
- What it is not: not an agent, not a run, not a capability by itself.
- Why it exists: tracks dependency, cost, privacy, and routing evidence.
- Supports questions: 14, 17.
- Core relations: powers runs through agent profiles or execution surfaces.
- Lifecycle: available, unavailable, deprecated.
- Minimal fields: `id`, `name`, `kind`, `locality`, `status`.
- Deferred fields: pricing tables, latency statistics, benchmark aggregates.
- Rejected fields: generic provider preference score without evaluation evidence.
- Invariants: provider choice must be recorded when external AI is used.
- Bloat risks: overbuilding provider registry before evaluation/routing needs.

## WorkSession

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: reusable execution context/thread that may contain multiple runs.
- What it is not: not a task, not a result, not an agent.
- Why it exists: separates ongoing execution context from task evidence.
- Supports questions: 4, 9, 17.
- Core relations: belongs to project, contains runs, may reference external thread.
- Lifecycle: open, paused, closed, archived.
- Minimal fields: `id`, `projectId`, `agentProfileId`, `modelProviderId`,
  `externalThreadId`, `status`, `summary`.
- Deferred fields: full transcript ingestion, token history.
- Rejected fields: transcript as canonical state.
- Invariants: a run may reference a session, but run evidence must stand alone.
- Bloat risks: importing whole chat history into core state.

## Run

- Status: accepted
- Definition: concrete task-linked work attempt/evidence record.
- What it is not: not an agent, not a task, not a session.
- Why it exists: records what happened during one work attempt.
- Supports questions: 4, 10, 13, 14, 17.
- Core relations: started by task, occurs in session, uses context bundle,
  produces artifacts, includes tool executions.
- Lifecycle: planned, running, completed, failed, canceled.
- Minimal fields: `id`, `taskId`, `workSessionId`, `agentProfileId`,
  `modelProviderId`, `status`, `inputSummary`, `actionSummary`,
  `resultSummary`, `validationSummary`, `startedAt`, `endedAt`.
- Deferred fields: full prompt, full transcript, detailed token/cost breakdown.
- Rejected fields: hidden reasoning trace.
- Invariants: completed runs need result evidence or validation/blocker summary.
- Bloat risks: treating run as a transcript dump.

## ContextBundle

- Status: accepted read model first; defer rich persistence
- Definition: selected relevant context provided to a run.
- What it is not: not the whole project, not a prompt, not memory.
- Why it exists: makes context construction inspectable and repeatable.
- Supports questions: 9, 13, 16.
- Core relations: built for task/run, includes source-linked records/artifacts.
- Lifecycle: built, used, superseded.
- Minimal fields: `id`, `taskId`, `runId`, `summary`, `includedSourceRefs`,
  `createdAt`.
- Deferred fields: rendered prompt, token counts.
- Rejected fields: unbounded raw context blob as source of truth.
- Invariants: every included item needs a source reference and inclusion reason.
- Bloat risks: context stuffing under a new name.

## Artifact

- Status: accepted
- Definition: durable output or input produced/used by work.
- What it is not: not memory by default, not review, not task status.
- Why it exists: tracks deliverables, evidence, and reusable context.
- Supports questions: 10, 11, 13, 16, 19.
- Core relations: produced by run, used by context bundle, reviewed by review,
  may supersede artifact.
- Lifecycle: draft, submitted, accepted, rejected, superseded, deprecated.
- Minimal fields: `id`, `projectId`, `taskId`, `runId`, `uri`, `kind`, `role`,
  `title`, `summary`, `status`.
- Deferred fields: checksum, size, MIME type, retention policy.
- Rejected fields: arbitrary folder note as artifact record.
- Invariants: artifacts need source and role.
- Bloat risks: registering every temporary scratch file.

## Decision

- Status: accepted
- Definition: recorded selection among alternatives.
- What it is not: not a memory item, not evaluation, not arbitrary note.
- Why it exists: explains why a path was chosen.
- Supports questions: 8, 12, 13, 17.
- Core relations: affects goal/task/plan/artifact/memory/workflow.
- Lifecycle: active, superseded, reversed.
- Minimal fields: `id`, `projectId`, `goalId`, `taskId`, `decisionType`,
  `summary`, `rationale`, `decidedAt`.
- Deferred fields: full alternatives table, formal policy references.
- Rejected fields: decision mood/confidence without use.
- Invariants: material path changes need a decision or review record.
- Bloat risks: using decisions for every trivial edit.

## Review

- Status: accepted
- Definition: governance check of submitted work evidence.
- What it is not: not evaluation metric, not approval, not automatic acceptance.
- Why it exists: prevents unreviewed output from becoming canonical.
- Supports questions: 13, 16, 19.
- Core relations: reviews artifact/run/task output, may approve or request changes.
- Lifecycle: open, approved, changes_requested, rejected, canceled.
- Minimal fields: `id`, `taskId`, `artifactId`, `runId`, `status`, `summary`.
- Deferred fields: reviewer assignment, rubric details.
- Rejected fields: review score unless it drives a decision.
- Invariants: AI output must be reviewed before memory promotion.
- Bloat risks: decorative review gates with no consequence.

## Evaluation

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: feedback on whether work satisfied criteria or advanced a goal.
- What it is not: not review, not a run, not a provider ranking by itself.
- Why it exists: supports goal advancement and dependency-reduction evidence.
- Supports questions: 13, 14, 17.
- Core relations: evaluates task/run/artifact/model/tool against criteria.
- Lifecycle: planned, recorded, passed, failed, inconclusive.
- Minimal fields: `id`, `targetType`, `targetId`, `criteria`, `result`,
  `summary`, `evidenceRefs`.
- Deferred fields: normalized score, benchmark suite membership.
- Rejected fields: global intelligence score.
- Invariants: evaluations must cite criteria.
- Bloat risks: metrics that do not affect decisions.

## MemoryItem

- Status: accepted
- Definition: source-linked reusable knowledge with trust/status.
- What it is not: not raw AI output, not artifact, not transcript.
- Why it exists: gives local memory governance and retrieval trust.
- Supports questions: 9, 16, 18.
- Core relations: sourced from artifact/decision/evaluation/run, included in
  context bundle by status/scope.
- Lifecycle: proposed, verified, trusted, stale, superseded, deprecated, rejected.
- Minimal fields: `id`, `projectId`, `title`, `body`, `status`, `sourceRefs`,
  `scope`.
- Deferred fields: expiry policy, retrieval ranking weight.
- Rejected fields: unreviewed chat memory.
- Invariants: trusted memory must cite reviewed evidence.
- Bloat risks: agents silently publishing convenient claims.

## Tool

- Status: accepted
- Definition: executable affordance available to humans, agents, or system code.
- What it is not: not skill, not capability, not tool execution.
- Why it exists: tracks what can be used and what risk/permission it carries.
- Supports questions: 14, 15, 17, 20.
- Core relations: used by tool executions, may be required by task/workflow.
- Lifecycle: available, restricted, deprecated, unavailable.
- Minimal fields: `id`, `name`, `description`, `kind`, `riskLevel`,
  `approvalRequirement`.
- Deferred fields: full input/output schema, version registry.
- Rejected fields: tool popularity score.
- Invariants: high-risk tools require explicit approval rules.
- Bloat risks: modeling every script before it is used.

## ToolExecution

- Status: accepted
- Definition: one recorded use of a tool.
- What it is not: not a run, not the tool, not telemetry dump.
- Why it exists: captures granular execution evidence.
- Supports questions: 13, 14, 17.
- Core relations: uses tool, occurs during or near run, may produce artifact.
- Lifecycle: requested, completed, failed, skipped, canceled.
- Minimal fields: `id`, `taskId`, `runId`, `toolId`, `status`, `inputSummary`,
  `outputSummary`, `errorSummary`.
- Deferred fields: full arguments, stdout/stderr blobs.
- Rejected fields: hidden command transcript as canonical state.
- Invariants: failed tool executions need error summary.
- Bloat risks: logging noise instead of meaningful tool events.

## Workflow

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: reusable procedural scaffold for repeated work.
- What it is not: not a single task, not a skill, not a scheduler.
- Why it exists: turns repeated task patterns into owned procedure.
- Supports questions: 15, 20.
- Core relations: contains steps, may require skills/tools, produces tasks/runs.
- Lifecycle: draft, active, deprecated.
- Minimal fields: `id`, `name`, `summary`, `steps`, `status`.
- Deferred fields: branching DSL, scheduling policy.
- Rejected fields: workflow dashboard metrics.
- Invariants: workflow steps must map to commands or tasks.
- Bloat risks: premature process architecture.

## Skill

- Status: accepted vocabulary; deferred from first-slice persistence
- Definition: reusable procedural capability scaffold/instruction set.
- What it is not: not tool, not workflow, not model provider.
- Why it exists: packages repeatable know-how for agents/humans.
- Supports questions: 15, 20.
- Core relations: may be used by agent profile, task, workflow, context bundle.
- Lifecycle: draft, active, deprecated.
- Minimal fields: `id`, `name`, `summary`, `usageCriteria`, `sourceRefs`,
  `status`.
- Deferred fields: skill scoring, marketplace metadata.
- Rejected fields: persona prose.
- Invariants: active skills need clear trigger/use criteria.
- Bloat risks: creating skills for one-off instructions.

## EventLog

- Status: accepted vocabulary; defer rich event log persistence
- Definition: chronological trace of meaningful system events.
- What it is not: not audit theater, not full transcript, not dashboard.
- Why it exists: supports audit, debugging, and reconstruction of changes.
- Supports questions: 12, 16, 19.
- Core relations: records changes to entities and key workflow events.
- Lifecycle: append-only.
- Minimal fields: `id`, `occurredAt`, `eventType`, `actorRef`,
  `targetEntityRef`, `summary`.
- Deferred fields: before/after payload snapshots, signatures.
- Rejected fields: every UI click.
- Invariants: significant state changes produce events.
- Bloat risks: indiscriminate logging that drowns useful audit.

## Capability

- Status: candidate
- Definition: named ability required by work or supplied by agents/tools/models.
- Why candidate: useful for routing/evaluation, but taxonomy bloat risk is high.
- Minimal fields if accepted: `id`, `name`, `summary`, `status`.
- Bloat risks: invented capability trees that do not drive assignment.

## RoutingPolicy

- Status: candidate
- Definition: reusable rule for choosing model/provider/tool/executor.
- Why candidate: repeated routing decisions may need policy; current need can be
  served by Decision plus evaluation evidence.
- Bloat risks: policy engine before routing evidence exists.

## ExternalAIDependency

- Status: candidate/deferred
- Definition: evidence-backed external AI affordance still needed or replaced.
- Why deferred: may be a report over evaluations and decisions, not entity.
- Bloat risks: self-congratulatory replacement records without evidence.

## Rejected Entity Cards

### Milestone

- Status: rejected for v2 core
- Reason: `Goal` already represents desired future states and state-regions.
- Reconsider only if a separate lifecycle/workflow is proven.

### GoalAlignmentScore

- Status: rejected
- Reason: weak metric; use explicit task-goal relation and review/evaluation.

### TaskMotivationParagraph

- Status: rejected
- Reason: prose bloat; task summary plus goal relation is enough.

### Timeline

- Status: rejected as entity
- Reason: read model over `EventLog` and evidence records.
