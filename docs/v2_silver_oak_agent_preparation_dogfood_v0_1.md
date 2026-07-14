# Silver Oak Agent Preparation Dogfood v0.1

Date: 2026-07-14

## Scope

This artifact closes two linked pieces of work:

- AMS v2 task: `task_ams_v2_dogfood_preparation_on_silver_oak_modeling`
- Silver Oak task: `task_v2_silver_oak_select_next_source_backed_modeling_pass`

The purpose was not to perform the basement measurement update. The purpose was
to use the AMS v2 `agent-preparation-packet` before a real non-AMS modeling
task, then compare the packet against the actual source inspection needed to
choose the next Silver Oak work item.

## Source Files Inspected

The Silver Oak project root resolved to:

`/Users/colinfreed/Projects/3920 Silver Oak St.`

The task contract listed project-relative source files. These were read from
that root:

- `docs/qa/2026-06-30-model-gap-ranking-next-measurements.md`
- `docs/qa/2026-06-30-next-freecad-bim-drawing-phase.md`
- `docs/site_model_bim_parity_map.md`
- `outputs/exports/measurement_source_audit.csv`

The recorded artifact URI in AMS omits the trailing period in the project root
name, but the actual local directory includes it.

## Preparation Packet Readback

Preparation packet run:

`npm run v2:core-db -- agent-preparation-packet --task task_v2_silver_oak_select_next_source_backed_modeling_pass --json --compact`

Useful output:

- Correctly identified the selected Silver Oak task.
- Correctly identified the parent goal: `Build the Silver Oak Property Digital Twin`.
- Correctly classified the task as actionable.
- Correctly stated that property-modeling source material is required.
- Correctly kept broad capability taxonomy, routing policy, scheduler, local model,
  broad UI, and auto-promotion out of scope.

Important gap:

- The packet did not select the four source files named in the validation plan.
  It selected only the task, goal, project, and general workflow skills. The work
  still required manual source-file reading to make the actual decision.

Classification:

- Blocking for fully autonomous execution: yes.
- Blocking for this dogfood/selection task: no, because the source files were
  explicit in the validation plan and could be inspected manually.
- Needed follow-up: improve preparation/context selection so validation-plan file
  references become selected source resources when they exist.

## Evidence Summary

The June 30 model gap ranking recommends **Basement topology and
under-garage/stair anchor reconciliation** as the next modeling phase. It ranks
`B-W08` length/endpoints and `B-W09` stair-opening/top-endpoint/datum as the top
two critical gaps.

The June 30 FreeCAD/BIM planning note recommends **Basement topology,
foundation interface, and review drawing prep**, and explicitly says the next
work should avoid final/polished drawings until those basement/stair anchors are
reconciled.

The BIM parity map confirms the basement/foundation bridge is the most developed
site-model-to-BIM area, but the P0 blockers are still:

- `B-W08` length and endpoint anchors.
- `B-W09` top endpoint and vertical datum.
- stair-opening opposing-face naming.

The measurement source audit confirms there is a large active measurement corpus
with current references, but the relevant basement/stair clarifications remain
the high-impact unresolved gap before authoritative basement/foundation BIM.

## Selected Next Silver Oak Task

Reuse existing task:

`task_ae273e23-869b-4c97-9897-b1cca6f18b40`

Title:

`Capture and encode B-W08/B-W09 basement measurement clarifications`

Goal:

`goal_0a64ed99-63c9-4620-9411-5a173c9a85b9`

Goal title:

`Silver Oak: Measurement Database`

Why this task was selected:

- It already captures the highest-ranked `B-W08` / `B-W09` measurement gap.
- It is narrower than a broad FreeCAD/BIM implementation pass.
- It preserves the rule that unresolved ambiguity must stay explicit instead of
  being hidden as geometry.
- It supports future BIM/foundation work without prematurely reopening unrelated
  paused Silver Oak subgoals.

No duplicate task should be created.

The selected child goal should be unpaused because it now contains the selected
next actionable Silver Oak work.

## Next Task Contract

Executor should work on:

`task_ae273e23-869b-4c97-9897-b1cca6f18b40`

Expected output:

- New or updated authoritative measurement records for `B-W08` and `B-W09` where
  direct evidence exists.
- Explicit `needs_clarification` state where direct evidence is still missing.
- Updated spatial/BIM measurement records only when the IDs or issue states
  genuinely change.

Validation:

- `python3 -m cad_skillkit.audit_measurement_sources measurement_table.csv photo_manifest.csv site_model.json --csv-out outputs/exports/measurement_source_audit.csv --json-out outputs/exports/measurement_source_audit.json`
- `python3 -m cad_skillkit.validate_site_model site_model.json --json-out outputs/exports/site_model_validation.json`
- `python3 -m cad_skillkit.validate_bim_records`
- `python3 scripts/freecad/generate_existing_conditions_bim.py --validate-only`
- `python3 -m pytest -q` if validator, schema, or code behavior changes.

Do not:

- change final basement geometry without measurement evidence;
- promote rotated site alignment;
- start broad exterior opening, roof, deck, garden, or final drawing work;
- treat generated Blender, SketchUp, STL, SVG, or FreeCAD output geometry as
  measurement authority.

## Dogfood Assessment

Preparation sufficiency:

- Sufficient to identify the task category, constraints, and expected work shape.
- Insufficient to autonomously provide the exact file context needed for the
  decision, despite the validation plan naming those files.

Gap classification:

- Blocking gap for future autonomous execution: validation-plan file references
  are not promoted into selected resources.
- Non-blocking gap for this pass: manual source-file inspection filled the gap.
- Optional gap: no trusted Silver Oak project memory was selected. That is
  acceptable for now because the source files are stronger than memory summaries.

Irrelevant context:

- The packet did not flood the run with stale v1 tasks or broad AMS records.
  Precision was acceptable.

Reusable learning:

- The preparation packet needs a file-reference extraction step or resource
  resolver for explicit paths in task validation plans.
- This should be implemented as a bounded improvement to context selection, not
  as a new persistent entity type.

## Result

The Silver Oak selection task should close as complete after selecting the
existing `B-W08/B-W09` measurement clarification task and unpausing the
Measurement Database goal.

The AMS dogfood task should close as complete with one actionable follow-up:
improve `agent-preparation-packet` so explicit task validation-plan file paths
are selected as source resources when present.
