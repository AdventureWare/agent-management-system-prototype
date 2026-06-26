# Contextual Rigor Profiles v0

## Purpose

AMS needs to adjust process intensity based on the context of the work. A research note, a quick technical spike, an internal helper, a beta-facing feature, a production migration, and a high-stakes financial or security action should not receive the same validation, review, documentation, and safety gates.

The goal is not enterprise ceremony. The goal is avoiding one-size-fits-all process so agents can move quickly on reversible low-exposure work while slowing down around real users, real data, public consequences, and irreversible actions.

## Core Principle

Use enough rigor for the work's context, risk, audience, reversibility, and desired quality level.

Rigor profile answers "how polished, validated, reviewed, and cautious should this work be for its intended context?" It should shape readiness, suggested next actions, work packets, and review expectations without making basic task capture harder.

## Profiles

`EXPLORATION`: Learning, discovery, brainstorming, research, and uncertainty reduction. Examples: compare approaches, read a repo area, investigate an API, summarize options.

`SPIKE`: Quick experiments or technical probes. Optimizes for learning quickly. Output may be rough. Examples: test whether an integration is feasible, build a throwaway proof, measure a narrow behavior.

`PROTOTYPE`: Early working functionality or demos. Some validation is required, but speed and iteration matter. Examples: first-pass feature slice, demo flow, local-only UI concept.

`INTERNAL`: Personal or internal tools and workflows. Should be reliable enough for ongoing use without production release process. Examples: AMS operator tooling, project-local scripts, internal dashboards.

`BETA`: Limited external or user exposure. Requires stronger validation, clearer known issues, and more careful review. Examples: private beta feature, shared preview, user-facing copy or workflow with limited rollout.

`PRODUCTION`: Real users, real data, public release, or durable operational systems. Requires strong validation and review. Examples: production data migration, public launch change, operational automation, billing-adjacent behavior.

`HIGH_STAKES`: Money, legal/compliance, security, credentials, production data, public reputation, irreversible actions, or physical-world consequences. Agents may analyze, prepare, and propose, but should stop for explicit human approval before execution.

## Relationship to Risk, Readiness, and Autonomy

Rigor profile is related to risk, but it does not replace risk.

Risk level describes downside if something goes wrong. A prototype can be high-risk if it touches credentials, deletion, money, deployment, security, or external communication. A production task can be low-risk if it only updates internal documentation.

Readiness level describes how well framed a task is for delegation or automation. A task may be ready for prototype execution with a bounded outcome and smoke check, but not ready for production execution until it has regression checks, rollback notes, and review expectations.

Autonomy level describes what an agent may do. Rigor profile influences how much validation and approval should be expected, but it is not permission. `HIGH_STAKES` work should remain analyze/propose/prepare unless explicit human approval permits execution.

## Suggested Validation by Profile

`EXPLORATION`: Record evidence, sources, local files, commands, and uncertainty. Produce findings, assumptions, and next-step recommendations. No production implementation is required.

`SPIKE`: Keep the experiment small and reversible. Run the narrow check that answers the learning question. Record rough edges and hardening follow-up.

`PROTOTYPE`: Build a bounded working slice. Run build, type, unit, or smoke checks that cover the changed slice. Note known rough edges and avoid production gates unless risk demands them.

`INTERNAL`: Run basic reliability checks for the workflow. Consider maintainability and operator usability. Use review for shared behavior or recurring operations.

`BETA`: Define acceptance criteria, run targeted regression checks, review user-facing behavior, and list known issues.

`PRODUCTION`: Run the strongest relevant automated checks. Consider rollback, migration safety, monitoring, operational impact, and documentation. Require human review before completion or release.

`HIGH_STAKES`: Prepare analysis, options, risk review, approval packet, and rollback or mitigation plan. Do not execute irreversible, financial, legal, security, credential, production-data, or public actions autonomously.

## How This Applies Beyond Software

Private notes can use `EXPLORATION` or `INTERNAL`: enough clarity to be useful later, but no public polish.

Public content should often be `BETA` or `PRODUCTION`: fact-checking, tone review, source review, and reputation impact matter more than they do for private drafts.

Business planning may start as `EXPLORATION`, become `PROTOTYPE` for a rough model, and move to `PRODUCTION` when it drives commitments, hiring, customer promises, or budget.

Financial decisions are often `HIGH_STAKES`: agents can prepare scenarios, assumptions, and questions, but should stop before transactions or commitments.

Operational processes may be `INTERNAL`, `BETA`, or `PRODUCTION` depending on whether they affect only the operator, a limited group, or durable real-world operations.

Research can be `EXPLORATION` when the output is uncertainty reduction, or `PRODUCTION` when the result will be cited publicly or used for a consequential decision.

Design work may be `PROTOTYPE` for sketches and experiments, `BETA` for user-facing review, and `PRODUCTION` when it affects a released product or brand surface.

## Current AMS Implementation

AMS already had related concepts before this v0:

- `Task` in `src/lib/types/control-plane.ts` stores execution-contract and governance fields: `successCriteria`, `readyCondition`, `expectedOutcome`, `scope`, `nonGoals`, `validationSteps`, `readinessLevel`, `autonomyLevel`, `riskLevel`, `reviewRequirement`, `approvalMode`, dependencies, skills, tools, and blockers.
- `Project` in `src/lib/types/control-plane.ts` stores project memory and default governance: validation commands, approval requirements, default allowed/disallowed actions, default autonomy, risk threshold, review requirement, and validation expectations.
- `TaskTemplate` mirrors task execution-contract and governance fields for reusable task patterns.
- `Run` records execution facts, validation summary, blockers, artifacts, model/usage data, and now the effective rigor profile. Review state remains on review/governance records, with runs used as evidence.
- `src/lib/server/delegation-readiness.ts` computes deterministic readiness modes and suggested next actions.
- `src/lib/workflow-prompts.ts` and `src/lib/server/task-threads.ts` build selective work packets and managed-run prompts.
- `docs/progressive-delegation-readiness-v0.md`, `docs/task-readiness-autonomy-metadata.md`, `docs/contextual-procedural-knowledge-v0.md`, and `docs/autonomous-work-queue-v0.md` describe the surrounding readiness, autonomy, contextual knowledge, and queue-selection concepts.

## Minimal v0 Implementation

This v0 adds a small optional metadata layer instead of a new workflow system:

- Added `RIGOR_PROFILE_OPTIONS` and `RigorProfile` in `src/lib/types/control-plane.ts`.
- Added optional `Project.defaultRigorProfile`, `Task.rigorProfile`, `TaskTemplate.rigorProfile`, and `Run.effectiveRigorProfile`.
- Added `src/lib/rigor-profiles.ts` with `resolveEffectiveRigorProfile`: task override, then project default, then `INTERNAL`.
- Added profile-specific validation and prompt guidance in `src/lib/rigor-profiles.ts`.
- Extended control-plane normalization and factories in `src/lib/server/control-plane.ts`.
- Extended agent API project/task create and update paths in `src/lib/server/agent-control-plane-api.ts` plus `/api/projects` and `/api/tasks` routes so the fields remain optional and can be cleared with `null`.
- Updated `src/lib/server/delegation-readiness.ts` so readiness considers effective rigor profile. `HIGH_STAKES` work is not considered autonomously executable, and beta/production/high-stakes work receives stronger validation/review guidance.
- Updated `src/lib/components/tasks/TaskDelegationReadinessPanel.svelte` to show the effective profile and profile-specific validation expectations.
- Updated `src/lib/workflow-prompts.ts` and `src/lib/server/task-threads.ts` so work packets include concise profile-relevant instructions rather than a full policy dump.
- Updated `src/lib/server/task-launch-planning.ts` so launched runs record `effectiveRigorProfile`.

Simple task creation remains simple: no new required field was added, and the UI quick-create flow does not force profile selection.

## Future Work

- Profile-aware workflow, task-template, and skill selection.
- Profile-aware autonomous queue scoring.
- Profile-specific review gates and approval previews.
- Run feedback that improves profile recommendations over time.
- Mismatch detection, such as prototype workflow used for production-risk work.
- Optional UI controls for project defaults and task overrides after the metadata proves useful.
- Workflow/template metadata declaring appropriate rigor profiles without building a complex router.
- Stronger profile-aware launch blockers for production migrations, external-state changes, and high-stakes approval packets.
