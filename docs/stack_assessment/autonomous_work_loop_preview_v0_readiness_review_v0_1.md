# Autonomous Work Loop Preview v0 Readiness Review v0.1

Date: 2026-07-04
Status: Ready to close preview milestone; not a production autonomous-loop acceptance

## Purpose

Verify whether the v2 preview now satisfies the mid-size Autonomous Work Loop Preview v0 milestone:

> In an isolated v2 preview database, AMS can run one goal-linked task from recommendation to reviewed completion, with durable evidence and readable handoff state.

This review is intentionally narrower than the full production `Autonomous Goal-Directed Work Loop v0` direction in `docs/autonomous-goal-directed-work-loop-v0.md`. It assesses the preview proof and operator loop, not full managed-agent autonomy, production MCP mutation coverage, project-memory application, or external-AI replacement.

## Verdict

The preview milestone is ready to close.

Evidence is strong enough for the preview goal because:

- the CLI can complete the full work loop against an isolated temp preview DB
- `/app/v2-preview` exposes the required selected-task readback and guarded writes for the same basic loop
- all writes remain preview-only and refuse the production runtime database boundary
- focused server, browser, and CLI smoke tests cover the core path
- docs now record the boundary, smoke flow, and governance checkpoints

Do not treat this as approval to migrate v2 into production runtime state. The next work should be a new sub-goal.

## Scope Reviewed

Reviewed artifacts:

- `docs/autonomous-goal-directed-work-loop-v0.md`
- `docs/v2_preview_work_loop_smoke_v0_1.md`
- `docs/v2_persistence_boundary_v0_1.md`
- `docs/stack_assessment/next_implementation_steps_v0_1.md`
- `docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md`
- `docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md`
- `scripts/v2-preview-db.ts`
- `src/lib/server/v2-preview-cli-work-loop-smoke.spec.ts`
- `src/routes/app/v2-preview/+page.server.ts`
- `src/routes/app/v2-preview/+page.svelte`
- `src/routes/app/v2-preview/v2-preview-page.server.spec.ts`
- `src/routes/app/v2-preview/v2-preview-page.svelte.spec.ts`

## Acceptance Criteria Review

| Criterion                                                                       | Status                | Evidence                                                                                                                                                                                                                       | Notes                                                                                                     |
| ------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Preview goal can have tasks                                                     | Met                   | `scripts/v2-preview-db.ts create-task`; `src/lib/server/v2-preview-work-service.ts`; CLI smoke creates `task_preview_work_loop_smoke_automated` under imported goal `goal_26a850e3-5eac-4150-a96f-0574cd483595`.               | Uses existing `Goal` and `Task`; no milestone entity added.                                               |
| AMS can recommend next task                                                     | Met                   | `src/lib/server/v2-preview-next-action.ts`; CLI `next-action`; preview page loader includes `readV2PreviewNextActionRecommendation`; server/browser page tests assert next-action readback.                                    | The selector is preview-specific and conservative.                                                        |
| Task can move through lifecycle states                                          | Met                   | `transitionV2PreviewTaskStatus`; CLI `transition-task`; `/app/v2-preview` `transitionTask`; smoke covers `ready -> in_progress -> review -> done`; UI server test covers `review -> done`.                                     | Uses accepted task statuses only.                                                                         |
| Run/result can be recorded                                                      | Met                   | `recordV2PreviewRunResult`; CLI `record-run`; `/app/v2-preview` `recordRun`; UI server tests cover required result/validation summaries and successful run capture.                                                            | Evidence capture only; does not execute work.                                                             |
| Review and decision can be recorded                                             | Met                   | `recordV2PreviewReview`, `recordV2PreviewDecision`; CLI and UI actions; smoke covers approved review and closeout decision; page tests cover both actions.                                                                     | Review/decision do not automatically complete tasks.                                                      |
| Task can close or create follow-up                                              | Partial/Met for close | Smoke and UI transition support close via `review -> done`; preview does not yet create follow-up tasks through the UI.                                                                                                        | The preview milestone required closure; follow-up creation remains a later production/agent-loop concern. |
| State is inspectable later without relying on chat history                      | Met                   | CLI `inspect`, `work-packet`, `vertical-report`; preview page selected-task detail, work packet, evidence timeline, vertical report, handoff packet; tests assert readback.                                                    | Durable preview DB state is the source of truth.                                                          |
| UI/CLI can show enough context for a human or agent to continue                 | Met                   | `/app/v2-preview` shows health, task, next action, work packet, evidence/governance timeline, search, and handoff packet; CLI exposes `inspect`, `work-packet`, `vertical-report`, `next-action`.                              | The UI is sufficient for the basic operator loop.                                                         |
| Whole loop stays inside v2 preview boundary and separate from `data/app.sqlite` | Met                   | `docs/v2_persistence_boundary_v0_1.md`; `assertV2PreviewDbFileAllowed`; temp DB tests and smoke; docs repeatedly state no production runtime mutation.                                                                         | The smoke uses temp DB; UI uses configured preview DB.                                                    |
| No new duplicate milestone, workflow, task, run, review, or approval system     | Met                   | Implementation reuses `Goal`, `Task`, `Run`, `Review`, `Decision`; governance checkpoints reject broad editors and new statuses/entities.                                                                                      | Preview services are bounded implementation services, not new domain objects.                             |
| No agent/tool/model execution hidden behind UI                                  | Met                   | Run UI captures evidence only; governance checkpoint explicitly forbids launching agents/tools/commands/models; tests only verify DB writes/readback.                                                                          | Model label is metadata, not routing/execution.                                                           |
| Automated regression exists for the full preview loop                           | Met                   | `npm run test:v2-preview-work-loop-smoke`; `src/lib/server/v2-preview-cli-work-loop-smoke.spec.ts` drives the CLI sequence against an isolated temp DB and verifies final `done` readback, counts, latest IDs, and provenance. | Strongest end-to-end evidence for the milestone.                                                          |

## Validation Evidence

Recent passing checks:

```sh
npm run test:v2-preview-work-loop-smoke
npx vitest run src/routes/app/v2-preview/v2-preview-page.server.spec.ts
npm run test:unit:browser -- --run src/routes/app/v2-preview/v2-preview-page.svelte.spec.ts
npm run check
```

Coverage represented by these checks:

- isolated temp preview DB creation and seed load
- preview task creation under imported goal
- next-action recommendation
- task lifecycle transitions
- run evidence capture
- review recording
- decision recording
- final `done` readback
- work-packet and vertical-report readback
- preview UI load and selected-task fallback
- preview UI write validation for run, transition, review, and decision
- browser-rendered preview panels and handoff packet

## Boundaries

This milestone does not prove:

- production runtime migration from v1 to v2
- production use of the preview schema
- full autonomous agent launch/recovery
- MCP mutation parity for all preview actions
- project memory governance or retrieval policy
- external AI dependency reduction tracking maturity
- provider/model routing policy maturity
- artifact registry maturity beyond preview evidence
- automatic acceptance of work
- automatic project/goal progress mutation from run evidence
- follow-up task creation from preview UI
- multi-goal/multi-project prioritization at production scale

These are later sub-goals, not defects in the preview milestone.

## Remaining Risks

- The preview console now has several write forms. They are guarded, but further UI write expansion should stop until a new concrete workflow need is proven.
- The CLI smoke is stronger than UI end-to-end validation. Current UI coverage is server-action and browser component coverage, not a full Playwright browser workflow against a live preview DB.
- `Decision` readback does not expose `runId` in the task-detail decision shape, even though storage records it. That was acceptable for this milestone but may matter later for evidence provenance.
- Follow-up task creation is not part of the preview UI loop. It exists elsewhere in AMS run-result tooling, but not in this v2 preview surface.
- Search index rebuild remains an explicit command. The preview page reports missing index health but does not rebuild automatically.

## Closeout Recommendation

Close the Autonomous Work Loop Preview v0 milestone as a successful preview proof.

Do not keep adding features to this milestone by default. The preview has answered the core question: a cleaner v2 slice can represent and operate a task-centered agent work loop with durable state, evidence, governance, readback, and isolated storage.

## Recommended Next Sub-Goal

Start a new sub-goal:

> V2 Preview To Owned-Agent Control Loop Integration v0.

Purpose:

- decide how the preview loop should connect back to real AMS Goal/Task/Run state
- decide whether the v2 preview remains a prototype island, becomes a migration target, or informs production refactors
- define the next owned-agent capability to reduce reliance on external Codex/ChatGPT surfaces

Likely first slice:

1. Compare preview loop capabilities against current production AMS goal-loop/agent-run APIs.
2. Identify which preview pieces should be migrated, discarded, or folded into existing AMS services.
3. Produce a small integration plan before implementing more preview features.

## Do Not Do Next

- Do not add more `/app/v2-preview` write forms by default.
- Do not convert preview tables into production tables yet.
- Do not start broad v2 rewrite implementation.
- Do not create a separate milestone entity.
- Do not hide execution behind run evidence capture.
- Do not mark the full `Autonomous Goal-Directed Work Loop v0` production direction complete based only on this preview.
