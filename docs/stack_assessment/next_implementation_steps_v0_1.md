# Next Implementation Steps v0.1

Date: 2026-07-02
Status: Proposed next steps; preview task, run, artifact, decision, work-packet, search, tool-log, evaluation-governance, evaluation-result, routing, dependency-reduction, memory, review/approval, vertical-report, read-only UI, route-validation, guarded review-write, UI write-governance checkpoint, guarded decision-write, evidence-timeline, grouped-search, timeline-filter, agent-handoff-packet, preview-health, smoke-doc, concept-graduation-review, tool/evaluation-scenario-hardening, registry-proof, registry-proof-inspection, preview task-transition, preview next-action, preview work-loop smoke, and preview next-action UI slices implemented

## Implemented First Slice

Implemented after this assessment:

- `V2WorkService.createTask` preview service.
- `npm run v2:preview-db -- create-task`.
- preview-only source provenance using `source_system = 'ams-v2-preview'`.
- tests with in-memory/temp SQLite.
- readback through `inspect --task`.

## Implemented Second Slice

- `V2ExecutionService.recordRunResult` preview service.
- `npm run v2:preview-db -- record-run`.
- preview-only run provenance using `source_system = 'ams-v2-preview'`.
- tests with in-memory/temp SQLite.
- run readback through `inspect --task`.

These slices still do not implement v2 runtime migration or mutate v1 `data/app.sqlite`.

## Implemented Third Slice

- `V2ArtifactService.attachArtifact` preview service.
- `npm run v2:preview-db -- attach-artifact`.
- preview-only artifact provenance using `source_system = 'ams-v2-preview'`.
- task-level and optional run-linked artifact references.
- path existence check.
- tests with in-memory/temp SQLite.
- artifact readback through `inspect --task`.

## Implemented Fourth Slice

- `V2GovernanceService.recordDecision` preview service.
- `npm run v2:preview-db -- record-decision`.
- preview-only decision provenance using `source_system = 'ams-v2-preview'`.
- task-level and optional run-linked decision records.
- tests with in-memory/temp SQLite.
- decision readback through `inspect --task`.

## Implemented Fifth Slice

- `V2WorkPacket.readWorkPacket` preview read service.
- `npm run v2:preview-db -- work-packet`.
- compact text and JSON output for task context.
- provenance summary that distinguishes imported v1 records from v2-preview records.
- tests with in-memory/temp SQLite.
- read-only CLI access through the preview DB boundary.

## Implemented Sixth Slice

- `V2PreviewSearch.rebuildSearchIndex` preview service.
- `V2PreviewSearch.search` preview service.
- `npm run v2:preview-db -- index-search`.
- `npm run v2:preview-db -- search --query "..."`.
- local SQLite FTS over task, run, decision, and artifact metadata.
- search result links back to task/work-packet context.
- tests with in-memory/temp SQLite.

## Implemented Seventh Slice

- Model-governance checkpoint for preview tool registry and execution logs.
- `docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md`.
- glossary updates for candidate `Tool` and experimental `ToolExecution`.
- v2 domain model maturity notes for tool concepts.
- explicit boundary: next implementation may log tool affordances and use, but must not launch arbitrary tools.

## Implemented Eighth Slice

- `V2PreviewToolService.registerTool` preview service.
- `V2PreviewToolService.recordToolExecution` preview service.
- `npm run v2:preview-db -- register-tool`.
- `npm run v2:preview-db -- record-tool-execution`.
- preview-only `v2_preview_tools` and `v2_preview_tool_executions` tables.
- tool context included in `work-packet`.
- tool and tool-execution metadata included in local FTS search when present.
- tests with in-memory/temp SQLite.
- explicit boundary: this logs tool affordances and tool use; it does not launch tools.

## Implemented Ninth Slice

- Model-governance checkpoint for preview evaluation scenario/result records.
- `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`.
- glossary updates for candidate `EvaluationScenario` and experimental `EvaluationResult`.
- v2 domain model maturity notes for evaluation concepts.
- explicit boundary: evaluation records are scored evidence, not task runs, reviews, or decisions.

## Implemented Tenth Slice

- `V2PreviewEvaluationService.registerEvaluationScenario` preview service.
- `V2PreviewEvaluationService.recordEvaluationResult` preview service.
- `npm run v2:preview-db -- register-eval-scenario`.
- `npm run v2:preview-db -- record-eval-result`.
- preview-only `v2_preview_evaluation_scenarios` and `v2_preview_evaluation_results` tables.
- evaluation context included in `work-packet`.
- evaluation scenario/result metadata included in local FTS search when present.
- tests with in-memory/temp SQLite.
- explicit boundary: this records evaluation evidence; it does not run benchmarks, route models, or retire dependencies automatically.

## Implemented Eleventh Slice

- Model-governance checkpoint for preview routing decision records.
- `docs/model-change-proposals/0003-preview-routing-decision.md`.
- `V2PreviewRoutingService.recordRoutingDecision` preview service.
- `npm run v2:preview-db -- record-routing-decision`.
- preview-only `v2_preview_routing_decisions` table.
- routing context included in `work-packet`.
- routing-decision metadata included in local FTS search when present.
- tests with in-memory/temp SQLite.
- explicit boundary: this records provider/model routing rationale; it does not call providers, execute models, enforce policy, or replace the accepted `Decision` log.

## Implemented Twelfth Slice

- Model-governance checkpoint for preview dependency-reduction records.
- `docs/model-change-proposals/0004-preview-dependency-reduction-record.md`.
- `V2PreviewDependencyReductionService.recordDependencyReduction` preview service.
- `npm run v2:preview-db -- record-dependency-reduction`.
- preview-only `v2_preview_dependency_reduction_records` table.
- dependency-reduction context included in `work-packet` when task-linked.
- dependency-reduction metadata included in local FTS search when present.
- tests with in-memory/temp SQLite.
- explicit boundary: this records external-AI replacement status and evidence; it does not retire providers, enforce routing policy, or claim production capability readiness.

## Implemented Thirteenth Slice

- Model-governance checkpoint for preview memory item records.
- `docs/model-change-proposals/0005-preview-memory-item.md`.
- `V2PreviewMemoryService.recordMemoryItem` preview service.
- `npm run v2:preview-db -- record-memory-item`.
- preview-only `v2_preview_memory_items` table.
- memory context included in `work-packet` by explicit preview visibility rules.
- memory metadata included in local FTS search when present.
- tests with in-memory/temp SQLite.
- explicit boundary: this records governed reusable local knowledge; it does not publish trusted memory automatically, migrate project memory prose, or define final retrieval policy.

## Implemented Fourteenth Slice

- Model-governance checkpoint for preview review and approval recording.
- `docs/model-change-proposals/0006-preview-review-approval-recording.md`.
- `V2PreviewGovernanceService.recordReview` preview service.
- `V2PreviewGovernanceService.recordApproval` preview service.
- `npm run v2:preview-db -- record-review`.
- `npm run v2:preview-db -- record-approval`.
- preview writes reuse existing `v2_reviews` and `v2_approvals` proof tables.
- review/approval metadata included in local FTS search.
- tests with in-memory/temp SQLite.
- explicit boundary: this records governance evidence; it does not complete tasks, publish memory, apply changes, run tools, or enforce routing policy.

## Implemented Fifteenth Slice

- `V2PreviewReport.readV2PreviewVerticalSliceReport` read service.
- `npm run v2:preview-db -- vertical-report`.
- read-only report over one task's work packet, counts, latest linked records, provenance, and optional search sample.
- missing search index is surfaced as report metadata instead of making the whole report unreadable.
- tests with in-memory/temp SQLite.
- explicit boundary: this composes existing preview contexts; it does not introduce a new domain entity, write records, complete tasks, publish memory, run tools, or enforce routing policy.

## Implemented Sixteenth Slice

- `/app/v2-preview` read-only local inspection route.
- navigation entry under Context.
- server loader opens only the default preview DB in read-only mode.
- page displays overview metrics, task selection, task detail, work-packet readiness, vertical-report counts, provenance, status counts, and optional search samples.
- missing preview DB degrades to an unavailable state instead of creating or mutating storage.
- explicit boundary: this is an inspection surface over existing preview services; it does not add write UI, rebuild indexes, launch agents, migrate runtime data, or create new model concepts.

## Implemented Seventeenth Slice

- Route-level validation for `/app/v2-preview`.
- `AMS_V2_PREVIEW_DB_FILE` server-only override for tests and explicit local preview inspection.
- server-loader tests for missing preview DB, seeded preview DB, selected task/report/search loading, and fallback task selection.
- browser component tests for unavailable-state rendering and seeded preview report/search/provenance rendering.
- explicit boundary: validation uses temp preview DB files and does not touch `data/app.sqlite`.

## Implemented Eighteenth Slice

- Guarded preview review write action on `/app/v2-preview`.
- form posts to the existing preview governance service.
- action requires selected task and non-empty review summary.
- action writes only to the configured v2 preview DB and still refuses `data/app.sqlite`.
- refreshed report exposes the increased review count, preview provenance count, and latest review id.
- server tests cover missing summary, successful write, refreshed report, and `ams-v2-preview` provenance.
- browser component tests cover form rendering and action feedback.
- explicit boundary: this records review evidence only; it does not complete tasks, publish memory, rebuild search, run tools, launch agents, or migrate runtime data.

## Implemented Nineteenth Slice

- Model/UI governance checkpoint for the next `/app/v2-preview` write action.
- `docs/stack_assessment/v2_preview_ui_write_governance_checkpoint_v0_1.md`.
- recommendation: add `record-decision` next only if another write action is needed.
- defers `record-memory-item`, `record-dependency-reduction`, approval, tool execution, evaluation, routing, and run writes from the preview UI.
- explicit boundary: no schema/model change and no implementation beyond the checkpoint.

## Implemented Twentieth Slice

- Guarded preview decision write action on `/app/v2-preview`.
- form posts to the existing preview governance service.
- action requires selected task and non-empty decision summary.
- action defaults to `preview_decision` instead of exposing new decision-type UI vocabulary.
- action writes only to the configured v2 preview DB and still refuses `data/app.sqlite`.
- refreshed report exposes the increased decision count, preview provenance count, and latest decision id.
- server tests cover missing summary, successful write, refreshed report, default decision type, and `ams-v2-preview` provenance.
- browser component tests cover form rendering and action feedback.
- explicit boundary: this records decision evidence only; it does not change task state, approve work, publish memory, rebuild search, run tools, launch agents, or migrate runtime data.

## Implemented Twenty-First Slice

- Read-side evidence timeline on `/app/v2-preview`.
- timeline composes existing work-packet records across runs, reviews, approvals, decisions, artifacts, tool executions, evaluation results, routing decisions, dependency-reduction records, and memory items.
- no new storage, schema, route loader, write action, or domain entity.
- browser component tests cover timeline rendering from seeded component data.
- explicit boundary: this is a presentation/read-model composition only.

## Implemented Twenty-Second Slice

- Grouped search results on `/app/v2-preview`.
- search results are grouped first by linked task and then by record type.
- grouping uses the existing vertical-report search payload and does not add storage, schema, route loader, write action, or domain entity.
- browser component tests cover multiple result groups across task, run, and decision records.
- explicit boundary: this is a presentation/read-model composition only.

## Implemented Twenty-Third Slice

- Timeline category filters on `/app/v2-preview`.
- filter options cover all records, evidence, governance, memory, routing/evaluation/tool records, and dependency-reduction records.
- filtering uses the existing work-packet-derived timeline items and does not add storage, schema, route loader, write action, or domain entity.
- browser component tests cover default timeline counts plus governance and evidence filters.
- explicit boundary: this is a presentation/read-model composition only.

## Implemented Twenty-Fourth Slice

- Copyable selected-task agent handoff packet on `/app/v2-preview`.
- packet is derived from the existing work-packet and vertical-report payloads.
- packet includes task state, execution contract, requirements, linked evidence counts, latest records, dependencies, provenance, and preview boundaries.
- browser component tests cover packet rendering from seeded component data.
- explicit boundary: this is a presentation/read-model composition only; it does not create a new prompt store, session record, workflow state, route loader, write action, schema, or domain entity.

## Implemented Twenty-Fifth Slice

- Preview health panel on `/app/v2-preview`.
- route loader reports DB path, source counts, search-index status, indexed-record count, and missing-index warning.
- health data is read from existing preview SQLite metadata and FTS tables without creating or mutating storage.
- server tests cover ready index health and missing-index health.
- browser component tests cover health panel rendering from seeded component data.
- explicit boundary: this is a read-side runtime visibility helper only; it does not create a health domain entity, rebuild the index, change routing, launch tools, or write preview/runtime state.

## Implemented Twenty-Sixth Slice

- End-to-end V2 preview governance console smoke procedure.
- `docs/v2_preview_governance_console_smoke_v0_1.md` covers loading a seed into an explicit temp preview DB, rebuilding search, opening `/app/v2-preview`, inspecting a selected task, recording preview review/decision, and verifying through the CLI.
- docs index links to the smoke procedure.
- explicit boundary: this is documentation only; it does not run the smoke automatically, create a release gate, or change runtime behavior.

## Implemented Twenty-Seventh Slice

- V2 preview concept graduation review.
- `docs/v2_preview_concept_graduation_review_v0_1.md` reviews preview concepts against ontology/model-governance criteria.
- `docs/model-decisions/2026-07-03-v2-preview-concept-graduation-review.md` records the accepted governance decision.
- recommendation at that slice: do not promote all preview concepts; treat `Tool` and `EvaluationScenario` as acceptance candidates; keep `ToolExecution`, `EvaluationResult`, `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` experimental pending follow-up hardening.
- explicit boundary at that slice: this was a governance/design pass only and did not change production schema, runtime storage, or preview service behavior.

## Implemented Twenty-Eighth Slice

- Tool and EvaluationScenario acceptance candidate hardening.
- `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md` accepts the minimal `Tool` concept.
- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md` accepts the minimal `EvaluationScenario` concept.
- source-of-truth docs marked `Tool` and `EvaluationScenario` accepted while keeping `ToolExecution` and `EvaluationResult` experimental at that point.
- no runtime migration, production schema change, tool launcher, benchmark runner, or new UI write action was added.

## Implemented Twenty-Ninth Slice

- EvaluationResult and ToolExecution evidence hardening.
- `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md` accepts the minimal `ToolExecution` evidence concept.
- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md` accepts the minimal `EvaluationResult` evidence concept.
- source-of-truth docs now mark both concepts accepted while keeping preview tables as preview storage.
- no runtime migration, production schema change, tool launcher, telemetry capture, benchmark runner, routing policy, or provider-retirement policy was added.

## Implemented Thirtieth Slice

- Registry Schema Proof In Preview DB.
- `V2PreviewRegistryService.rebuildV2PreviewRegistryProof` preview service.
- preview-only `v2_preview_registry_entries` and `v2_preview_source_labels` tables.
- source-label proof loads task capability/tool requirement labels and run model labels from existing preview/import evidence.
- raw labels, source record fields, source positions, source IDs, normalized labels, mapping status, and mapping rationale are preserved.
- accepted, ambiguous, and unmapped mapping states are demonstrated with focused tests.
- tests use in-memory SQLite only.
- explicit boundary: this proves registry/source-label mechanics; it does not migrate production data, add production foreign keys, route models, launch tools, sync model catalogs, or rewrite task/run records.

## Implemented Thirty-First Slice

- Registry Proof Inspection.
- `npm run v2:preview-db -- registry-proof` rebuilds and prints the preview registry/source-label proof for an explicit preview DB.
- `--json` returns the full registry proof context for agent inspection.
- text output summarizes counts by concept and mapping status plus limited registry/source-label samples.
- smoke validation loaded the seed into `/tmp/ams-v2-registry-proof.sqlite` and ran `registry-proof --limit 3` and `registry-proof --json`.
- explicit boundary: this is an inspection/materialized-proof command over preview storage only; it does not mutate v1 runtime data, create production registry records, resolve mappings automatically, route models, launch tools, or sync catalogs.

## Implemented Thirty-Second Slice

- Preview Task Lifecycle Transition.
- `V2WorkService.transitionV2PreviewTaskStatus` updates `v2_tasks.status` using the accepted task status vocabulary.
- `npm run v2:preview-db -- transition-task` exposes the transition through the preview DB CLI.
- each transition records a linked `v2_decisions` evidence row with `decision_type = 'preview_task_status_transition'` and `ams-v2-preview` provenance.
- transition rules reject invalid statuses, same-status no-ops, run evidence from another task, and reopening terminal `done`/`canceled` tasks.
- focused tests cover allowed transitions, run-linked review transition, invalid status, terminal-state rejection, and cross-task run rejection.
- smoke validation loaded `/tmp/ams-v2-work-loop-preview.sqlite`, created a preview task, moved it `ready -> in_progress`, recorded a run, moved it `in_progress -> review`, and inspected the resulting task state.
- explicit boundary: this enables preview work-loop state movement only; it does not add new statuses, create a transition-log entity, auto-approve work, publish memory, apply artifacts, run tools, route models, or mutate `data/app.sqlite`.

## Implemented Thirty-Third Slice

- Preview Next-Action Selector.
- `V2PreviewNextAction.readV2PreviewNextActionRecommendation` reads preview task, dependency, review, approval, and run state to recommend one next action.
- `npm run v2:preview-db -- next-action` exposes the selector through the preview DB CLI.
- recommendations include action kind, selected task, reasons, blockers, latest run id, gate/dependency counts, bounded candidate list, and counts by action type.
- action priority is conservative: pending approvals, review tasks, in-progress tasks, ready unblocked tasks, draft refinement, blocker resolution, then planner fallback.
- focused tests cover review priority, pending approval gates, unmet dependencies, and no-candidate fallback.
- smoke validation loaded `/tmp/ams-v2-next-action.sqlite` and ran `next-action` in text and JSON modes.
- explicit boundary: this is a read-only selector; it does not create tasks, transition state, complete reviews, approve work, launch agents, run tools, route models, or mutate `data/app.sqlite`.

## Implemented Thirty-Fourth Slice

- Preview Work-Loop Smoke Procedure.
- `docs/v2_preview_work_loop_smoke_v0_1.md` documents a CLI-only preview work-loop smoke.
- validated chain: `load-seed`, `create-task`, `next-action`, `transition-task --status in_progress`, `record-run`, `transition-task --status review`, `record-review --status approved`, `record-decision`, `transition-task --status done`, `inspect`, `work-packet`, and `vertical-report`.
- smoke validation used `/tmp/ams-v2-work-loop-smoke.sqlite` and reached task status `done`.
- readback showed one run, one review, four main-loop decisions, final transition decision, and `ams-v2-preview` provenance.
- fixed CLI consistency gap: `record-decision --id` now passes the explicit id to the preview governance service.
- explicit boundary: this is a documented and manually validated smoke procedure; it does not add schema, write UI, production runtime migration, tool launching, model routing, or `data/app.sqlite` mutation.

## Implemented Thirty-Fifth Slice

- Preview Console Next-Action Integration.
- `/app/v2-preview` server load now reads `V2PreviewNextAction.readV2PreviewNextActionRecommendation` scoped to the selected task's goal.
- the preview console renders a read-only next-action panel with recommendation, status, priority, score, reasons, blockers, candidate list, and scope.
- the copyable agent handoff packet includes the next-action recommendation and blockers.
- server tests cover loaded next-action data and scope fallback.
- browser tests cover next-action panel rendering and handoff packet inclusion.
- explicit boundary: this is read-only UI integration; it does not create tasks, transition task state, approve work, complete reviews, launch agents, run tools, route models, or mutate `data/app.sqlite`.

## Implemented Thirty-Sixth Slice

- Preview Task-Transition UI Governance Checkpoint and guarded implementation.
- `docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md` records the decision to expose a narrow selected-task transition action.
- `/app/v2-preview` now has a guarded `transitionTask` server action that delegates lifecycle rules to `V2WorkService.transitionV2PreviewTaskStatus`.
- the preview console renders a selected-task status-transition form with accepted next statuses, required summary, and optional latest-run linking.
- successful transitions update the preview task status and record a `preview_task_status_transition` decision with `ams-v2-preview` provenance.
- server tests cover missing summary validation and a successful `review -> done` transition with linked run evidence.
- browser tests cover form rendering, handoff packet boundary copy, and action feedback.
- explicit boundary: this is preview-only selected-task state movement; it does not add statuses, create a broad task editor, approve work, complete reviews automatically, launch tools or agents, create runs, route models, or mutate `data/app.sqlite`.

## Implemented Thirty-Seventh Slice

- Automated Preview Work-Loop Smoke Regression.
- `src/lib/server/v2-preview-cli-work-loop-smoke.spec.ts` drives `scripts/v2-preview-db.ts` through Node against an isolated temp preview DB.
- the smoke runs the CLI sequence: `load-seed`, `create-task`, `next-action`, `transition-task`, `record-run`, `transition-task`, `record-review`, `record-decision`, `transition-task`, `inspect`, `work-packet`, and `vertical-report`.
- the test proves one preview task reaches `done` with one run, one review, four decisions, latest-record readback, and `ams-v2-preview` provenance.
- `npm run test:v2-preview-work-loop-smoke` now exposes the regression as a named command.
- `docs/v2_preview_work_loop_smoke_v0_1.md` now documents the automated regression alongside the manual smoke.
- explicit boundary: this tests the CLI control surface with temp preview storage only; it does not touch the default preview DB, mutate `data/app.sqlite`, launch agents or tools, route models, publish memory, or migrate production data.

## Implemented Thirty-Eighth Slice

- Preview Run-Evidence Capture UI Governance Checkpoint and guarded implementation.
- `docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md` records the decision to expose a narrow selected-task run evidence action.
- `/app/v2-preview` now has a guarded `recordRun` server action that delegates preview run persistence to `V2ExecutionService.recordV2PreviewRunResult`.
- the preview console renders a selected-task run-evidence form with required result and validation summaries plus optional action, provider, execution surface, and model labels.
- successful submissions record completed preview runs with `ams-v2-preview` provenance and refresh latest-run/readback surfaces.
- server tests cover missing result summary, missing validation summary, and successful run evidence capture with provenance and model metadata.
- browser tests cover run form rendering, handoff packet boundary copy, and action feedback.
- explicit boundary: this captures evidence only; it does not launch agents, tools, commands, browsers, or models, create work sessions, change task status, review work, approve work, route models, publish memory, or mutate `data/app.sqlite`.

## Implemented Thirty-Ninth Slice

- Autonomous Work Loop Preview v0 Readiness Review.
- `docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md` compares the preview milestone criteria against current CLI, UI, docs, and tests.
- the review concludes the isolated v2 preview work-loop milestone is ready to close as a preview proof.
- the review explicitly does not mark the full production `Autonomous Goal-Directed Work Loop v0` direction complete.
- `docs/README.md` now links the readiness review.
- explicit boundary: this is a readiness decision and next-sub-goal recommendation; it does not migrate preview storage, add new schema, add more UI writes, launch agents/tools, or mutate `data/app.sqlite`.

## Implemented Fortieth Slice

- V2 Preview To Owned-Agent Control Loop Integration Analysis.
- `docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md` compares the completed v2 preview loop against production AMS Goal/Task/Run control-plane APIs.
- the analysis recommends against migrating the v2 preview as a parallel production subsystem.
- useful preview patterns to fold in: compact per-task loop report, evidence timeline, latest-record/provenance readback, explicit transition guard pattern, and command-sequence smoke style.
- existing production services to keep as canonical: `goal-work-loop.ts`, `agent-work-packets.ts`, `agent-run-results.ts`, task/governance APIs, and manifest/MCP capability registry.
- recommended next implementation is a read-only production `TaskLoopReport` helper over existing production state.
- `docs/README.md` now links the integration analysis.
- explicit boundary: this is integration planning only; it does not migrate preview tables, add schema, add UI, add MCP tools, or mutate `data/app.sqlite`.

## Implemented Forty-First Slice

- Production Task Loop Report v0.
- `src/lib/server/task-loop-report.ts` adds a read-only report helper for one production task.
- the report composes existing project, goal, task, goal-loop classification, latest run, open review, pending approval, dependency, follow-up, artifact, decision, and work-packet pointer state.
- `src/lib/server/task-loop-report.spec.ts` covers ready/actionable, in-progress run evidence, open review, blocked/dependency, done/follow-up, and approval-gated tasks.
- validation: `npx vitest run src/lib/server/task-loop-report.spec.ts` and `npm run check` pass.
- explicit boundary: this is a server read model only; it adds no schema, no runtime data mutation, no preview migration, no UI, no API route, and no MCP command.

## Implemented Forty-Second Slice

- Agent-Facing Task Loop Report Read Path.
- `goal-loop get_task_loop_report` exposes the production `TaskLoopReport` through the existing goal-loop command surface.
- the command is available through `/api/agent-goal-loop/get_task_loop_report`, `node scripts/ams-cli.mjs goal-loop get_task_loop_report --task <taskId>`, and generated MCP tool `ams_goal_loop_get_task_loop_report`.
- the capability manifest, CLI allow-list/help, MCP input schema, CLI reference, agent-facing interface doc, and autonomous work-loop doc now include the new read command.
- focused tests cover the goal-loop command response, manifest discovery, CLI routing, and MCP routing.
- explicit boundary: this remains read-only; it adds no schema, no runtime data mutation, no preview migration, no UI, and no new domain entity.

## Implemented Forty-Third Slice

- Production Task Loop Report Operator Readback.
- `loadTaskDetailPageData` now includes `taskLoopReport` from `buildTaskLoopReport(data, task.id)`.
- `TaskLoopReportPanel` renders a compact read-only task-detail surface for classification, next action, gates, latest run evidence, dependency issues, follow-ups, artifacts, decisions, and suggested agent readback commands.
- the panel appears in the existing task detail workflow after readiness and before prompt/workspace panels, so operator and agent readback use the same report shape.
- focused tests cover loader assembly and browser rendering of report state.
- validation: `npx vitest run src/lib/server/task-detail-page-data.spec.ts`, `npm run test:unit:browser -- --run 'src/routes/app/tasks/[taskId]/task-detail-page.svelte.spec.ts'`, and `npm run check` pass.
- explicit boundary: this is read-only UI; it adds no schema, no runtime data mutation, no preview migration, no new page, and no new domain entity.

## Implemented Forty-Fourth Slice

- Production Agent Work-Loop Smoke.
- `src/lib/server/agent-work-loop-smoke.spec.ts` adds an in-memory production smoke for the owned-agent control loop sequence.
- the smoke starts from `goal-loop:get_operator_console`, then exercises `goal-loop:get_next_recommended_action`, `goal-loop:get_task_loop_report`, `work-packet:get_agent_work_packet`, `run-result:record_run_result`, `run-result:request_review_from_run`, and final goal-loop/report readback.
- the smoke verifies that the operator path, recommendation, task-loop report, work packet, run-result preview, run evidence, review request, open review state, artifact readback, and next action stay coherent across existing production helpers.
- `package.json` now exposes `npm run test:agent-work-loop-smoke`.
- validation: `npm run test:agent-work-loop-smoke` passes.
- explicit boundary: this is an in-memory server smoke; it does not launch agents, start an operator server, mutate `data/app.sqlite`, add schema, add UI, add preview writes, or introduce a new domain entity.

## Implemented Forty-Fifth Slice

- First Operator Readback Consolidation.
- `formatEnumLabel` is now exported from `src/lib/types/control-plane.ts` and reused by goal detail and the task-loop report panel for derived goal-loop/task-loop classifications and next-action labels.
- this removes duplicated local underscore-to-title formatting from `src/routes/app/goals/[goalId]/+page.svelte` and `src/lib/components/tasks/TaskLoopReportPanel.svelte` without changing the displayed labels.
- `src/lib/types/control-plane-labels.spec.ts` covers representative actionability, review, approval, and already-readable label cases.
- explicit boundary: this is a presentation/readback consolidation only; it adds no schema, no runtime data mutation, no preview migration, no new page, no new component hierarchy, and no new domain entity.

## Implemented Forty-Sixth Slice

- Goal Loop Count Readback Consolidation.
- `src/lib/goal-loop-readback.ts` defines the canonical operator order and labels for goal-loop classification count rows.
- goal detail now builds `goalLoop.counts` and `goalLoop.countRows` through `buildGoalLoopCountsFromClassificationBuckets` and `buildGoalLoopCountRows` instead of hand-mapping each classification in the route and page.
- the goal detail page renders `goalLoop.countRows`, with a compatibility fallback for older fixture data.
- `src/lib/goal-loop-readback.spec.ts` covers bucket-to-count mapping and display-row order.
- explicit boundary: this is a readback/view-model consolidation only; it adds no schema, no runtime data mutation, no preview migration, no new route, no new domain entity, and no automatic execution behavior.

## Implemented Forty-Seventh Slice

- Autonomous Queue Control-Loop Summary Alignment.
- `buildGoalLoopCountRows` now supports focused subsets while preserving the canonical goal-loop row order.
- `buildAutonomousQueue` now returns `controlLoopRows` for the queue's top summary, mapping existing queue buckets to shared loop vocabulary: actionable now, blocked, needs planning, and unsafe/out of scope.
- `/app/autonomous-queue` renders those shared readback rows instead of hard-coded `Ready`, `Blocked`, `Planning`, and `High Risk` metric cards.
- `src/lib/server/autonomous-queue.spec.ts` verifies the shared row order and counts alongside the existing queue scoring behavior.
- explicit boundary: this keeps the autonomous queue scoring and sections intact; it adds no schema, no runtime data mutation, no new domain entity, no launch behavior, and no automatic state transition.

## Implemented Forty-Eighth Slice

- Governance Inbox Control-Loop Summary Alignment.
- `loadGovernanceInboxData` now returns `controlLoopRows` for governance counts that map cleanly to the shared goal-loop vocabulary: awaiting review, approval required, and blocked.
- `/app/governance` renders those shared readback rows in its top metric area while preserving inbox, escalation, stale-work metrics, queue filtering, and review/approval action forms.
- `src/lib/server/task-governance.spec.ts` verifies the governance read model returns the shared row keys and counts.
- `src/routes/app/governance/governance-page.svelte.spec.ts` uses the same `buildGoalLoopCountRows` helper in fixtures so page tests stay aligned with the server read model.
- explicit boundary: this does not reinterpret escalation or stale-work as goal-loop classifications, and it adds no schema, no runtime data mutation, no new domain entity, no launch behavior, and no automatic review/approval decision.

## Implemented Forty-Ninth Slice

- Work-Packet Readback Hint Alignment.
- `buildAgentWorkPacketResponse` now includes `goal-loop:get_task_loop_report` in `suggestedReadbackCommands` whenever the packet resolves a task.
- this aligns agent work-packet closeout/readback hints with the production task-loop report instead of requiring agents to infer that command from separate docs.
- `src/lib/server/agent-work-packets.spec.ts` verifies the task-loop report command appears in packet readback guidance.
- explicit boundary: this changes structured readback guidance only; it does not alter rendered prompts, task selection, packet safety, schema, runtime data, launch behavior, or state transitions.

## Implemented Fiftieth Slice

- Managed-Run Prompt Readback Guidance Reduction.
- `buildTaskThreadPrompt` now points managed worker prompts at the manifest-backed goal-loop and work-packet read APIs: `goal-loop get_next_recommended_action`, `goal-loop get_task_loop_report`, `goal-loop explain_task_eligibility`, and `work-packet get_agent_work_packet`.
- the same prompt block no longer includes broad project/goal/task discovery and create examples by default, reducing older generic CLI boilerplate in favor of canonical control-loop readback.
- task mutation, attachment, review, approval, child-handoff, decomposition, and thread-contact guidance remain available for bounded state updates after readback.
- `src/lib/server/task-threads.spec.ts` verifies the canonical readback commands are present and the broad discovery examples are absent.
- explicit boundary: this changes managed-run prompt guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-First Slice

- Run-Result Post-Action Readback Alignment.
- task-linked run-result responses now include `goal-loop:get_task_loop_report` in `suggestedNextCommands` after run evidence recording, follow-up recording, review-request transitions, and blocked-task transitions.
- evidence-only run-result records now pass the linked task into the response builder so they can provide task-loop report readback without mutating task state.
- `src/lib/server/agent-run-results.spec.ts` verifies the canonical task-loop report command appears in run-result guidance for blocker evidence, follow-up recommendations, review requests, and blocked-task updates.
- explicit boundary: this changes post-action readback guidance only; it adds no schema, no runtime data mutation beyond existing commands, no new command, no launch behavior, and no automatic review/approval/acceptance transition.

## Implemented Fifty-Second Slice

- Current-Context Task-Loop Readback Alignment.
- `loadAgentCurrentContext` now includes `goal-loop:get_task_loop_report` in task-scoped recommended action readback commands.
- task-scoped approval, review, blocked, draft, ready, in-progress, child-handoff, and done-state recommendations keep their existing action guidance while adding the canonical task-loop report readback.
- no-task recovery recommendations still use generic task/context reads and do not suggest a task-loop report before a task is resolved.
- `src/lib/server/agent-current-context.spec.ts` verifies approval and cross-thread coordination recommendations include the task-loop report command.
- explicit boundary: this changes current-context readback guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-Third Slice

- Capability Manifest Task-Loop Readback Alignment.
- task-scoped run-result commands in the shared capability registry now advertise `goal-loop:get_task_loop_report` in `readAfter` and `nextCommands`.
- this aligns manifest discovery with the already-implemented run-result response guidance, work-packet guidance, current-context guidance, and production smoke path.
- `src/lib/server/agent-capability-manifest.spec.ts` verifies `record_run_result`, `record_validation_result`, `record_blocker`, `record_followup_recommendations`, `create_followup_task`, `request_review_from_run`, and `mark_task_blocked_from_run` keep task-loop report readback guidance.
- explicit boundary: this changes agent discovery/readback guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-Fourth Slice

- Task Governance Manifest Task-Loop Readback Alignment.
- direct task review/approval mutations now advertise `goal-loop:get_task_loop_report` in `readAfter` and `nextCommands`.
- the `prepare_task_for_review` and `prepare_task_for_approval` intent playbooks now advertise the same task-loop report readback after their task-scoped mutations.
- generic task list/get and broad task CRUD guidance remains unchanged; this slice is limited to review/approval governance transitions.
- `src/lib/server/agent-capability-manifest.spec.ts` verifies task governance commands and intent playbooks keep task-loop report readback guidance.
- explicit boundary: this changes manifest discovery/readback guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-Fifth Slice

- Completion-Audit Readback Gap Closure.
- the task-scoped intent wrappers `reject_task_approval`, `accept_child_handoff`, and `request_child_handoff_changes` now advertise `goal-loop:get_task_loop_report` in `readAfter` and `nextCommands`.
- `.agents/skills/ams-agent-interface/SKILL.md` now instructs agents to read back `goal-loop get_task_loop_report --task <taskId>` after task-scoped mutations before considering the operation complete.
- `src/lib/server/agent-capability-manifest.spec.ts` extends the intent-playbook regression to cover approval rejection and child-handoff decisions.
- explicit boundary: this changes manifest and skill guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-Sixth Slice

- Work-Loop Completion Audit.
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md` maps the milestone success criteria to current evidence and identifies which requirements are met, partial, or intentionally deferred.
- `docs/README.md` links the completion audit next to the milestone spec.
- the audit recommends the next implementation target: materialize existing goal-loop fallback task drafts into explicit draft tasks through a guarded command, instead of auto-creating work during readback.
- explicit boundary: this is documentation and traceability only; it adds no schema, no runtime data mutation, no new command, no launch behavior, and no automatic state transition.

## Implemented Fifty-Seventh Slice

- Goal-Loop Fallback Draft Materialization.
- `src/lib/server/agent-goal-loop-actions.ts` adds `materialize_suggested_task`, a guarded command that materializes the current goal-loop `suggestedTaskDraft` into a durable `in_draft` task only for `plan_task`, `research_task`, `clarify_task`, or `create_planning_task` recommendations.
- the command supports `validateOnly`, dedupes against open tasks in the same project/goal by normalized title, and returns task-loop and next-action readback guidance.
- `/api/agent-goal-loop/materialize_suggested_task`, `node scripts/ams-cli.mjs goal-loop materialize_suggested_task --json ...`, and generated MCP tool `ams_goal_loop_materialize_suggested_task` expose the same capability through the shared manifest.
- `src/lib/server/agent-goal-loop-actions.spec.ts`, `src/lib/server/agent-capability-manifest.spec.ts`, `src/lib/server/ams-cli.spec.ts`, and `src/lib/server/ams-control-plane-mcp.spec.ts` cover creation, validation-only preview, dedupe, refusal without a materializable draft, manifest discovery, CLI routing, and MCP routing.
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md` now marks criterion 12 as met for the explicit v0 command path and identifies criterion 10 result-conversion coverage as the next highest-value gap.
- explicit boundary: this uses the existing `Task` model and task-create path; it adds no schema, no automatic background task creation, no launch behavior, no automatic review/approval/acceptance, and no new planning system.

## Implemented Fifty-Eighth Slice

- Run-Result Conversion Guidance Strengthening.
- `buildRecordResponse` now maps run-result preview `nextAction` values to guarded conversion commands in `suggestedNextCommands`.
- completed-awaiting-review evidence points to `run-result:request_review_from_run`; completed approval-gated evidence points to `run-result:request_approval_from_run`; blocked evidence points to `run-result:mark_task_blocked_from_run`; partial, revision, failed, and follow-up evidence point to `run-result:create_followup_task`; user-decision evidence points toward run-evidence approval requests and review/approval status commands.
- `src/lib/server/agent-run-results.spec.ts` verifies completed review, partial/revision, failed diagnosis, and blocker evidence all return the expected guarded conversion commands alongside task-loop readback.
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md` records criterion 10 as strengthened but still partial because automatic acceptance and full multi-state conversion remain intentionally out of scope.
- explicit boundary: this changes response guidance and tests only; it adds no schema, no new command, no automatic acceptance, no launch behavior, and no new state transition.

## Implemented Fifty-Ninth Slice

- Result-Conversion Classification Matrix Coverage.
- `src/lib/server/goal-run-result-preview.spec.ts` now includes a compact matrix proving each run-result classification maps to its expected `nextAction`, proposed state-update resources, and preview-only safety boundary.
- This made the next missing guarded transition visible: completed approval-gated run evidence needed a run-evidence-native way to open an approval gate.

## Implemented Sixtieth Slice

- Run-Result Approval Request From Run Evidence.
- `run-result request_approval_from_run` can preview or open a pending approval from completed run evidence without approving, rejecting, or accepting the task.
- The run-result preview now classifies completed approval-gated task evidence as `requires_user_decision` and proposes an approval resource before a pending approval exists.
- CLI/API/MCP discovery advertises the new guarded command through the shared capability registry.
- Tests cover validate-only behavior, actual pending-approval creation, duplicate pending-approval rejection, manifest discovery, MCP routing, and preview classification.
- explicit boundary: this adds no schema, no new domain entity, no automatic acceptance, and no autonomous scheduler/runner.

## Implemented Sixty-First Slice

- Approval-Gated Production Work-Loop Smoke.
- `npm run test:agent-work-loop-smoke` now covers a second path for completed approval-gated run evidence.
- The smoke records completed run evidence, verifies `requires_user_decision`, previews `run-result request_approval_from_run`, opens a pending approval, reads back `goal-loop get_task_loop_report`, reads back `review get_review_status`, and verifies the next recommendation is `resolve_approval`.
- The smoke explicitly verifies the task is not approved, accepted, closed, or moved to done by the approval request.
- `TaskLoopReport` pending-approval readback now suggests `review:get_review_status`, `task:approve-approval`, and `task:reject-approval` instead of review-request commands.
- explicit boundary: this adds production proof and readback correction only; it adds no schema, no automatic acceptance, and no autonomous scheduler/runner.

## Implemented Sixty-Second Slice

- Goal Closeout and Success-Criteria Readback Smoke.
- `npm run test:agent-work-loop-smoke` now covers accepted/completed task evidence against `goal-loop get_goal_progress`, `goal-loop get_goal_success_criteria`, `goal-loop get_task_loop_report`, and `goal-loop get_next_recommended_action`.
- The smoke verifies a one-task accepted goal recommends `goal_complete`.
- The smoke verifies an accepted task plus a remaining ready task recommends `execute_task` for the remaining work.
- The smoke verifies task-loop report readback preserves accepted closeout state, completed run evidence, approved review decision evidence, artifacts, and a `no_action` task-level next action for the accepted task.
- explicit boundary: this adds readback proof only; it adds no automatic acceptance, no closeout mutation, no schema, and no autonomous scheduler/runner.

## Implemented Sixty-Third Slice

- Workflow and Thread Association Readback.
- `TaskLoopReport` now includes a read-only `associations` section.
- The association summary reports the linked workflow id/name/status/step count and task/run thread IDs from existing `Task` and `Run` fields.
- `npm run test:agent-work-loop-smoke` now proves task-loop report readback for workflow, workflow steps, task agent thread, run thread, run agent thread, and provider thread run id.
- The smoke also verifies work-packet readback still includes the linked run and selected task for that workflow/thread-associated task.
- explicit boundary: this adds readback only; it adds no workflow-step task mapping, no new thread model, no schema, and no scheduler behavior.

## Implemented Sixty-Fourth Slice

- Shared Goal-Loop Row Subsets.
- `src/lib/goal-loop-readback.ts` now defines canonical focused row-key sets for operator intervention rows and autonomous-queue rows.
- Governance inbox and autonomous queue now use those shared row sets instead of local literal arrays.
- Existing goal detail, governance, autonomous queue, and task detail readback remain visually unchanged.
- explicit boundary: this is a small read-model consolidation only; it adds no new UI component, no schema, no mutation path, and no new workflow state.

## Implemented Sixty-Fifth Slice

- Work-Packet Command Guidance Consolidation.
- `GoalLoopWorkPacket` now exposes structured `commandGuidance` with read-before-work, record-result, and read-after-mutation command lists.
- `buildAgentWorkPacketResponse` surfaces the same guidance in `structuredSections.commandGuidance`, and `suggestedReadbackCommands` now follows the post-mutation readback commands from that guidance.
- the goal-loop wrapper prompt no longer duplicates the packet-level stopping-condition and expected-result-shape sections; it gives a compact AMS operations summary and leaves guardrails/result shape in structured fields.
- focused packet and production smoke tests verify the command guide, the reduced wrapper prompt, and the task-loop report readback path.
- explicit boundary: this changes packet/readback guidance only; it adds no schema, no runtime data mutation, no new command, no launch behavior, no prompt store, and no automatic state transition.

## Implemented Sixty-Sixth Slice

- Task-Scoped Base Prompt Context Reduction.
- planner prompts continue to include full project memory because planning needs broad context.
- executor, research, and reviewer prompts now use a bounded task-scoped project context with project identity, paths, current state, constraints, non-goals, validation commands, and default governance.
- task-scoped prompts no longer embed project brief, important links, or decision-log prose by default; richer context remains available through structured work-packet fields and goal/task/run readbacks.
- `src/lib/workflow-prompts.spec.ts` verifies the context boundary, and packet/smoke specs verify work-packet wrapping still works.
- explicit boundary: this changes rendered prompt content only; it adds no schema, no runtime data mutation, no new command, no packet-shape change, no launch behavior, and no automatic state transition.

## Implemented Sixty-Seventh Slice

- Launch Run Context Readback Summary.
- launched control-plane runs now populate `contextSummary` with a compact durable pointer to structured AMS readbacks instead of leaving the field empty.
- the summary records the launch prompt digest and the exact AMS commands for `work-packet get_agent_work_packet --task`, `goal-loop get_task_loop_report --task`, and `context current --run`.
- the task-launch helper path and the existing task page create-and-run / launch-task branches use the same `buildTaskLaunchRunContextSummary` helper.
- `src/lib/server/task-threads.spec.ts` verifies the summary points to structured readbacks and treats the rendered launch prompt as delivery context, not durable state.
- explicit boundary: this uses the existing `Run.contextSummary` field; it adds no schema, no runtime data migration, no new command, no prompt store, no launch behavior change, and no automatic state transition.

## Implemented Sixty-Eighth Slice

- Run Detail Context Readback Visibility.
- `/app/runs/[runId]` now displays existing `Run.contextSummary` in the captured execution inputs section alongside the prompt digest and run summary.
- this makes the launch prompt digest and structured work-packet/task-loop/current-context commands visible from the canonical run inspection surface.
- task detail remains a run list that links to run detail instead of duplicating the full context readback in every run card.
- `src/routes/app/runs/[runId]/run-detail-page.svelte.spec.ts` verifies the context readback section and commands render.
- explicit boundary: this is a read-side display change only; it adds no schema, no runtime data migration, no new command, no prompt store, no launch behavior change, and no automatic state transition.

## Implemented Sixty-Ninth Slice

- Task-Loop Latest-Run Launch Context Readback.
- `TaskLoopReport.latestRun` now includes existing `Run.promptDigest` and `Run.contextSummary` so agent-facing CLI/API/MCP readback can reconstruct launch context without opening the run detail UI.
- `src/lib/server/task-loop-report.spec.ts` verifies prompt digest and context summary survive latest-run summarization.
- `npm run test:agent-work-loop-smoke` coverage now verifies `goal-loop get_task_loop_report` returns the latest run's launch context summary in the production work-loop path.
- explicit boundary: this is a read-model extension over existing run fields only; it adds no schema, no runtime data migration, no new command, no prompt store, no UI layout change, no launch behavior change, and no automatic state transition.

## Implemented Seventieth Slice

- Run-Result Closeout Command Ordering.
- run-result evidence responses now lead `suggestedNextCommands` with the guarded conversion command implied by the preview next action.
- completed review-gated evidence points first to `run-result:request_review_from_run`; approval-gated evidence points first to `run-result:request_approval_from_run`; partial, revision, and failed evidence point first to `run-result:create_followup_task`; blocker evidence points first to `run-result:mark_task_blocked_from_run`.
- `run-result:record_run_result` remains available later in the list for additional evidence, but it no longer masks the next closeout action.
- `src/lib/server/agent-run-results.spec.ts` verifies the first suggested command for review, approval, follow-up/revision, failure diagnosis, and blocker closeout cases.
- explicit boundary: this changes response guidance order only; it adds no schema, no runtime data mutation beyond existing commands, no new command, no launch behavior, no acceptance transition, and no automatic scheduler.

## Implemented Seventy-First Slice

- Manifest Closeout Discovery Alignment.
- `record_run_result` manifest discovery now advertises run-result-native closeout conversions before generic readback: `request_review_from_run`, `request_approval_from_run`, `create_followup_task`, and `mark_task_blocked_from_run`.
- `record_validation_result`, `record_blocker`, and `record_followup_recommendations` now point toward the relevant run-result conversion command instead of only task-level fallbacks.
- the manifest guidance now includes a `close_out_run_result` playbook: discover manifest, resolve current context, record run evidence, apply the response-indicated run-result conversion, then read back `goal-loop get_task_loop_report`.
- `src/lib/server/agent-capability-manifest.spec.ts` verifies both closeout-first command ordering and the closeout playbook sequence.
- explicit boundary: this changes manifest/playbook discovery only; it adds no schema, no runtime data mutation, no new command, no launch behavior, no acceptance transition, and no automatic scheduler.

## Next Best Step

Do not build the whole v2 app by default. Continue using the production AMS loop as the proving ground for owned-agent control-plane behavior. The current strongest milestone remains Autonomous Goal-Directed Work Loop v0.

Good next candidates:

- Inspect the remaining criteria table for one concrete gap with weak evidence.
- Use the result-conversion matrix to identify the next single missing guarded transition only if readback evidence exposes a concrete gap.
- Run a compact completion audit against the Autonomous Goal-Directed Work Loop v0 criteria before adding more surfaces.
- Review UI component extraction only where repeated markup is causing drift; do not extract a broad control-loop component preemptively.
- Keep preview registry/search/mapping improvements deferred until production loop readback is clearer.

Recommended next step:

> Resolve review `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2` for the
> materialized planning task `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`. If
> approved, use the revised `docs/autonomous-work-loop-v0-5-next-task-plan.md`
> and `docs/autonomous-work-loop-v0-5-plan-review-recommendation.md` to create
> or materialize the highest-priority follow-up. If changes are requested,
> revise the plan before creating more work. Validate-only previews already show
> the consequences: approval closes the task as `done`; changes requested blocks
> it for revision.

Implementation update:

- `src/lib/server/operator-goal-loop-console.ts` now provides the shared read-only operator Goal-loop projection.
- Goal detail, task detail, and governance now surface the projected operator path.
- CLI/API/MCP agents can read the same projection through `goal-loop get_operator_console`.
- Focused helper and governance tests pass, and `npm run check` plus the production work-loop smoke test pass.
- Cross-surface hardening now verifies task detail loader and governance queue-item paths against the same shared projection.
- The production work-loop smoke now starts from `goal-loop get_operator_console` and verifies the first structured continuation hop into task-loop report and work-packet readback.
- Live read-side probing against `data/app.sqlite` found and fixed a continuation defect: a running AMS Goal with only closed linked work now returns continuation planning instead of `goal_complete`.
- Token-authenticated CLI/API probing then succeeded against a local operator API: `manifest --resource goal-loop` and `goal-loop get_operator_console --goal goal_5c952025-6248-46eb-882e-9cca1b5b17c3` both returned through the real bearer-token CLI path.
- Managed-run context probing then succeeded with only `AMS_AGENT_RUN_ID` set. The CLI resolved current context, called `goal-loop get_operator_console` with the resolved scope, and the operator console returned the Goal-level continuation planning path even though the selected current task was terminal.
- The operator path now carries `continuationPolicy.mode=explicit_validate_first` for materializable suggested tasks: preview with `validateOnly=true`, create only through the explicit materialization command, and do not auto-launch.
- Validate-only materialization probing then succeeded with only `AMS_AGENT_RUN_ID` set. The CLI resolved managed context, previewed the suggested planning task, and returned `validationOnly=true`, `wouldCreateTask=true`, `createdTask=false`, and `taskStateChanged=false`.
- Explicit materialization then succeeded through the same managed-run CLI/API path. The created runtime task is `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`, linked to the AMS long-term Goal and classified as `needs_planning`.
- Direct task-scoped operator-console readback now resolves the selected task's own project and Goal before building the recommendation, and returns `continuationPolicy.mode=read_only` for this existing planning task.
- Direct task-scoped work-packet readback now uses the same task-first scope resolution. `work-packet get_agent_work_packet --task task_ea2e9503-3683-4d9b-986f-c18255fd0e76` returns the AMS project/Goal/task packet with `mode=planner`, `recommendationKind=plan_task`, and the selected task as the only included task.
- The planning task produced `docs/autonomous-work-loop-v0-5-next-task-plan.md`, attached it through `intent prepare_task_for_review`, and opened review `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`.
- Post-mutation readback classifies the planning task as `awaiting_review`, and the operator console routes to governance.
- The plan was revised to clarify no-run artifact review versus run-result closeout, and `docs/autonomous-work-loop-v0-5-plan-review-recommendation.md` was attached as reviewer guidance. A duplicate `prepare_task_for_review` attempt correctly failed with `task_review_already_open`.
- Validate-only review resolution previews succeeded: `task approve-review ... --validate-only true` would close the task as `done`; `task request-review-changes ... --validate-only true` would block it with reason `Changes requested during review`.

The preview work-loop proof is now informing the real AMS control layer through a production read model, agent-facing command, operator readback panel, launch-context readback, run-result closeout guidance, manifest discovery, a smoke-tested production read sequence that begins at the operator console, direct read-side runtime probing, token-authenticated CLI/API probing, managed-run context probing, explicit continuation policy, validate-only materialization probing, explicit materialization, post-create task-scoped operator-console readback, post-create task-scoped work-packet readback, artifact attachment, review-gated planning-task closeout, review recommendation attachment, and review-resolution previews. The checkpoint confirms that broad consolidation is complete enough for v0.5; the next safe move is review resolution, not more surface area.

Model-governance constraint:

> Do not add more preview write UI by default. Do not add production mutation helpers until duplicated read logic is reduced and the remaining mutation gap is concrete.

## Minimal Vertical Slice

### Slice Goal

In a separate v2 preview database, support:

1. project/goal/task state
2. one task creation
3. source/provenance
4. read-model inspection
5. tests and CLI validation

### Proposed Commands

```sh
npm run v2:preview-db -- load-seed --reset
npm run v2:preview-db -- next-action
npm run v2:preview-db -- create-task --goal <goal-id> --title "..." --summary "..."
npm run v2:preview-db -- transition-task --task <task-id> --status in_progress --summary "..."
npm run v2:preview-db -- record-run --task <task-id> --result "..." --validation "..."
npm run v2:preview-db -- transition-task --task <task-id> --run <run-id> --status review --summary "..."
npm run v2:preview-db -- attach-artifact --task <task-id> --path <path> --role evidence
npm run v2:preview-db -- record-decision --task <task-id> --summary "..."
npm run v2:preview-db -- work-packet --task <task-id>
npm run v2:preview-db -- index-search
npm run v2:preview-db -- search --query "..."
npm run v2:preview-db -- register-tool --name "..."
npm run v2:preview-db -- record-tool-execution --task <task-id> --tool <tool-id> --summary "..."
npm run v2:preview-db -- register-eval-scenario --title "..."
npm run v2:preview-db -- record-eval-result --task <task-id> --summary "..."
npm run v2:preview-db -- record-routing-decision --task <task-id> --provider <provider-id> --model <model-id> --summary "..."
npm run v2:preview-db -- record-dependency-reduction --capability <name> --external-affordance "..." --evidence "..."
npm run v2:preview-db -- record-memory-item --task <task-id> --title "..." --body "..." --status proposed
npm run v2:preview-db -- record-review --task <task-id> --summary "..."
npm run v2:preview-db -- record-approval --task <task-id> --mode before_apply --summary "..."
npm run v2:preview-db -- registry-proof
npm run v2:preview-db -- vertical-report --task <task-id> --query "..."
npm run v2:preview-db -- inspect --task <task-id>
```

### Scope

Already implemented:

- `V2WorkService.createTask`
- storage insert for `v2_tasks`
- source reference for created records
- simple validation for required fields
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- `V2ExecutionService.recordRunResult`
- storage insert for `v2_runs`
- preview source reference for created run
- optional provider/model metadata
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- `V2ArtifactService.attachArtifact`
- storage insert for `v2_artifacts`
- source reference and artifact source references for created artifact
- path existence check
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- preview SQLite FTS table or view over useful task context
- explicit rebuild/index command
- read-only search query command
- result shape that links back to task/work-packet context
- tests with temp SQLite DB

Also implemented:

- provider/model routing model-governance checkpoint
- preview routing decision tables or proof structure
- source/provenance for preview-created routing records
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- dependency-reduction model-governance checkpoint
- preview dependency-reduction records or proof structure
- source/provenance for preview-created dependency-reduction records
- work-packet/search exposure if task-linked
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- memory-item model-governance checkpoint
- preview memory item records or proof structure
- source/provenance for preview-created memory records
- work-packet/search exposure for task-linked or project-scoped memory
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- preview review/approval write checkpoint
- source/provenance for preview-created review and approval records
- optional linkage to run
- work-packet/search exposure
- CLI adapter
- tests with temp SQLite DB

Also implemented:

- read-only preview scenario/report checkpoint
- report command over one task/work-packet
- summary of linked preview records and provenance counts
- focused test over a temp DB that creates one full vertical slice and verifies the report
- no new domain entities

Also implemented:

- grouped search/read-side improvement for existing preview evidence
- timeline category filters for existing work-packet evidence
- route/component tests with temp preview DB or seeded component data where needed
- no agent launching
- no runtime migration

Do not implement:

- agent run launching
- automatic model routing
- UI
- memory publication
- actual tool launching
- migration into `data/app.sqlite`

## Follow-Up Steps

1. Add minimal read-only UI/local inspection route over the proven services.
2. Add route-level validation for the read-only preview UI.
3. Add one guarded preview UI write action, if approved.
4. Run a model/UI governance checkpoint before expanding write UI.
5. Add guarded `record-decision` UI action if continuing write UI.
6. Improve read-side inspection/retrieval.
7. Add agent-run launching only after approval/safety boundaries are explicit.
8. Decide whether any preview concepts should graduate into accepted v2 schema.

## Acceptance Criteria For Next Slice

- v1 runtime DB is untouched.
- preview DB refuses `data/app.sqlite`.
- read improvement uses existing preview services or read models.
- no new write action is added.
- no new domain entity is added.
- tests use temp preview DB if route/server behavior changes.
- no new broad domain entities are added.

## Resolved Questions From First Slice

1. Preview-created records use `source_system = 'ams-v2-preview'`.
2. Generated preview task IDs reuse the current `task_<uuid>` style.
3. No extra confirmation flag is required yet because `create-task` is explicit and preview DB isolation remains enforced.
4. The first write slice stays in current `src/lib/server/v2-*` files.

## Resolved Questions From Second Slice

1. Preview-created run IDs use the current `run_<uuid>` style.
2. `record-run` requires both result and validation summaries.
3. Runs may be recorded without a work session in preview.

## Resolved Questions From Third Slice

1. Preview-created artifact IDs use `artifact_<uuid>`.
2. `attach-artifact` requires the path to exist for this evidence slice.
3. Artifacts may attach to a task without a run, with optional run linkage.

## Resolved Questions From Fourth Slice

1. Preview-created decision IDs use `decision_<uuid>`.
2. The first governance slice records decisions only; reviews and approvals are deferred.
3. `record-decision` requires a summary and defaults `decision_type` to `preview_decision`.
4. Decisions may attach to a task without a run, with optional run linkage.

## Resolved Questions From Fifth Slice

1. `work-packet` supports both text output and `--json`.
2. `work-packet` includes full readiness fields by default but does not inline artifact contents.
3. `work-packet` is read-only and uses the existing preview DB read boundary.

## Resolved Questions From Sixth Slice

1. The first retrieval slice indexes structured metadata only, not artifact file contents.
2. Search uses SQLite FTS5 without embeddings or external search APIs.
3. Search ranking uses SQLite `bm25` with deterministic tie-breaking by record type and record id.

## Resolved Questions From Seventh Slice

1. The first tool registry can proceed as preview-only experimental implementation.
2. `Tool` is now an accepted minimal concept, but not accepted production schema.
3. `ToolExecution` is now an accepted minimal evidence concept, not a replacement for `Run` and not accepted production schema.
4. Real tool launching is explicitly out of scope for the next implementation slice.

## Resolved Questions From Eighth Slice

1. The preview tool registry uses preview-only proof tables, not accepted production schema.
2. The first tool fields are name, description, risk level, approval mode, status, and provenance.
3. The first tool execution log supports completed/failed/requested/skipped-style status strings without accepting a final enum.
4. Tool execution logging does not launch tools.

## Resolved Questions From Ninth Slice

1. `EvaluationScenario` is now an accepted minimal concept, but not accepted production schema.
2. `EvaluationResult` is now an accepted minimal evidence concept, not a replacement for `Run`, `Review`, or `Decision`.
3. Current docs and preview implementation should use `EvaluationResult`, not `EvaluationRun`.
4. Automatic benchmark execution, model routing, and dependency-retirement decisions are out of scope for the next implementation slice.

## Resolved Questions From Tenth Slice

1. The preview evaluation slice creates reusable named scenarios and separate result records.
2. The first evaluation result fields include status, numeric score, rubric summary, result summary, and failure summary.
3. Evaluation results may link to task, run, and preview tool execution records.
4. Evaluation result logging does not run benchmarks or update routing policy automatically.

## Resolved Questions From Eleventh Slice

1. The preview routing slice uses the name `RoutingDecision`.
2. Routing decisions may be rationale-only at first and do not require evaluation evidence.
3. Routing decisions record one selected/proposed provider/model route plus rejected alternatives as text.
4. Routing decision logging does not call providers, execute models, enforce routing policy, or replace the accepted `Decision` log.

## Resolved Questions From Twelfth Slice

1. The preview dependency-reduction slice uses the name `DependencyReductionRecord`.
2. Dependency-reduction records can be capability-level or optionally task-linked.
3. Replacement status uses the draft statuses `external_only`, `hybrid`, `local_assisted`, `locally_reliable`, and `external_retired`.
4. Dependency-reduction records may cite one preview evaluation result and one preview routing decision at first.
5. Dependency-reduction logging does not retire providers, enforce routing policy, or claim production capability readiness.

## Resolved Questions From Thirteenth Slice

1. The preview memory slice uses the name `MemoryItem`.
2. Memory items can be project-scoped or optionally task-linked.
3. Memory status uses `draft`, `proposed`, `published`, `archived`, and `superseded`.
4. `published` uses a status field only in preview; later governance should decide whether accepted review/decision evidence is required.
5. Work packets include task-linked memory plus project-scoped proposed/published memory; project-scoped drafts stay hidden.

## Resolved Questions From Fourteenth Slice

1. Preview review/approval write commands reuse `v2_reviews` and `v2_approvals`.
2. Reviews and approvals support task and optional run linkage at first.
3. Review and approval statuses remain free text in preview.
4. Recording review or approval does not complete tasks, publish memory, apply changes, run tools, or enforce routing policy.

## Resolved Questions From Fifteenth Slice

1. The report command is named `vertical-report`.
2. The report supports compact text output and `--json`.
3. The report includes optional local search samples when `--query` is provided.
4. Missing search index is reported in the report instead of blocking task context inspection.
5. The report is a read-only composition view, not a new domain entity.

## Resolved Questions From Sixteenth Slice

1. The first read-only UI lives inside the existing Svelte app route tree at `/app/v2-preview`.
2. The route reads the default preview DB only.
3. The first inspection surface defaults to the first available preview task and can switch tasks through the query string.
4. The route does not create the preview DB when it is missing.

## Resolved Questions From Seventeenth Slice

1. UI validation uses a server-only `AMS_V2_PREVIEW_DB_FILE` override so tests can use temp preview DBs.
2. Missing preview DB behavior is covered at the server-loader and component-rendering levels.
3. Seeded preview DB behavior is covered at the server-loader and component-rendering levels.
4. Browser component tests require localhost binding and may need elevated execution in sandboxed environments.

## Resolved Questions From Eighteenth Slice

1. The first UI write action is `record-review`.
2. The action uses existing `Review` proof tables and the existing preview governance service.
3. The action requires explicit form submission and non-empty summary.
4. The action does not rebuild search automatically.
5. The refreshed report shows the review through existing read models.

## Resolved Questions From Nineteenth Slice

1. The next UI write action, if any, should be `record-decision`.
2. `record-decision` does not require a model change proposal because `Decision` is accepted and the preview service already exists.
3. UI writes for `MemoryItem`, `DependencyReductionRecord`, approval, routing, evaluation, tool execution, and run evidence are deferred.
4. `/app/v2-preview` should remain an inspection/governance surface, not a broad task editor.

## Resolved Questions From Twentieth Slice

1. The second UI write action is `record-decision`.
2. The action uses existing `Decision` proof tables and the existing preview governance service.
3. The action requires explicit form submission and non-empty summary.
4. The action defaults decision type to `preview_decision`.
5. The action does not change task status, approve work, rebuild search, run tools, launch agents, publish memory, or migrate runtime data.

## Resolved Questions From Twenty-First Slice

1. The first read-side improvement after guarded writes is a task evidence timeline.
2. The timeline is built from the existing work packet, not a new persisted entity.
3. Undated artifacts can appear in the timeline with `No timestamp`.
4. The timeline does not require server/query changes.

## Resolved Questions From Twenty-Second Slice

1. The next retrieval improvement is grouped search results.
2. Search grouping is a page-level presentation of the existing vertical-report search payload.
3. Results are grouped by task and record type without changing retrieval ranking, schema, or the route loader.

## Resolved Questions From Twenty-Third Slice

1. The next timeline improvement is category filtering.
2. Timeline filters are local UI state over existing work-packet-derived rows.
3. The filters do not persist timeline categories or introduce a `Timeline` entity.

## Resolved Questions From Twenty-Fourth Slice

1. The next read-side improvement is a copyable agent handoff packet.
2. The packet is derived from the existing work-packet and vertical-report payloads in the page.
3. The packet does not create a persisted prompt, session, handoff, or workflow entity.

## Resolved Questions From Twenty-Fifth Slice

1. The next runtime visibility improvement is a preview health panel.
2. Health data is route-loader read-only metadata, not a domain entity.
3. Missing search index is visible without blocking task inspection.
4. The health panel does not rebuild search automatically.

## Resolved Questions From Twenty-Sixth Slice

1. The smoke doc lives in the main `docs/` directory because it is an operator-facing console procedure.
2. The smoke procedure uses an explicit temp preview DB path and `AMS_V2_PREVIEW_DB_FILE`.
3. The smoke procedure verifies review and decision through UI actions and CLI readback.

## Resolved Questions From Twenty-Seventh Slice

1. The concept graduation review does not accept all preview concepts into core schema.
2. `Tool` and `EvaluationScenario` are the first acceptance candidates.
3. `ToolExecution`, `EvaluationResult`, `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` required later hardening before any acceptance decision.
4. Read-side surfaces such as vertical report, timeline, grouped search, handoff packet, and preview health remain non-domain projections.

## Resolved Questions From Twenty-Eighth Slice

1. `Tool` and `EvaluationScenario` are accepted minimal concepts.
2. Existing preview tables remain preview storage and do not become production schema.
3. `ToolExecution` and `EvaluationResult` stayed experimental at that point, pending evidence hardening.
4. Tool launching, benchmark execution, numeric score semantics, and provider/model registry links remain deferred.

## Resolved Questions From Twenty-Ninth Slice

1. `ToolExecution` and `EvaluationResult` are accepted minimal evidence concepts.
2. Existing preview tables remain preview storage and do not become production schema.
3. Tool launching, automatic telemetry capture, benchmark execution, global score normalization, automatic routing, and provider-retirement policy remain deferred.
4. `RoutingDecision`, `DependencyReductionRecord`, and `MemoryItem` remained experimental at that point, pending follow-up hardening.

## Resolved Questions From Thirtieth Slice

1. `MemoryItem` is an accepted minimal governed knowledge concept.
2. Existing preview memory tables remain preview storage and do not become production schema.
3. Automatic extraction, automatic publication, retrieval ranking, expiration, conflict handling, and skill promotion remain deferred.
4. `RoutingDecision` and `DependencyReductionRecord` remain experimental.

## Resolved Questions From Thirty-First Slice

1. `RoutingDecision` should not be accepted as a standalone production entity.
2. Production route choices should likely be accepted `Decision` records with routing-specific metadata.
3. `RoutingPolicy` remains deferred until reusable policy rules are concrete.
4. `DependencyReductionRecord` remains experimental.
5. Production dependency-reduction modeling should likely split capability/external-affordance replacement state from source-linked evidence.
6. Automatic routing, provider retirement, and proof of local reliability remain deferred.

## Resolved Questions From Thirty-Second Slice

1. `Capability` is an accepted minimal concept.
2. `Model` is an accepted minimal concept.
3. `Provider` remains an accepted existing implementation record.
4. Capability strings and model strings remain source/candidate labels until registry schema, alias/version policy, and migrations are accepted.
5. Production capability taxonomy, model registry, pricing refresh, benchmark execution, automatic routing, and provider-retirement policy remain deferred.

## Resolved Questions From Thirty-Third Slice

1. Future production registry work should preserve raw source labels before normalization.
2. `Capability`, `Tool`, and `Model` registries should be separate from a source-label mapping layer.
3. Source-label mappings need status values such as `unmapped`, `candidate`, `accepted`, `ambiguous`, `rejected`, and `superseded`.
4. Registry rows should not carry automatic routing, tool-launching, benchmark execution, or provider-retirement policy.
5. The next implementation should be a preview-only registry schema proof, not a production migration.

## Questions Before Next Implementation

1. Which source collections should the first registry proof index: imported v1 task/provider/run labels only, or v2 preview labels too?
2. Should the first proof use one generic source-label mapping table or separate mapping tables per concept?
3. Which ambiguous labels should be included in fixtures to prove non-destructive mapping?
