# Silver Oak V1 to V2 Import Preview v0.1

Date: 2026-07-14

## Purpose

Preview a narrow migration of the Silver Oak project from the prototype runtime
store into AMS v2 without writing any database state.

This follows `docs/v1_to_v2_goal_reconciliation_pass_v0_1.md`: Silver Oak is the
best first non-AMS domain migration candidate because it has a coherent project,
top-level goal, subgoal decomposition, task evidence, artifact paths, and a clear
source-of-truth problem that tests whether v2 can manage work outside its own
implementation.

## Command

```sh
node --experimental-strip-types scripts/v1-silver-oak-import-preview.ts --json
```

The command is read-only unless `--write` is supplied. It opens
`data/app.sqlite` with `readonly: true` and never writes v1 state.

Write command:

```sh
node --experimental-strip-types scripts/v1-silver-oak-import-preview.ts --write --json
```

## Source

- Source system: AMS v1 runtime SQLite
- Source DB: `data/app.sqlite`
- Source table: `control_plane_records`
- Project: `project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c`
- Project name: `3920 Silver Oak St.`

## Preview Result

| Item | Count |
| --- | ---: |
| Project records selected | 1 |
| Goal records selected | 12 |
| Task records in project scope | 55 |
| Unscoped project tasks with no `goalId` | 5 |
| Canceled continuation tasks | 26 |

Goal statuses in v1:

| Status | Count |
| --- | ---: |
| running | 2 |
| ready | 10 |

Task statuses in v1 project scope:

| Status | Count |
| --- | ---: |
| done | 23 |
| ready | 2 |
| review | 1 |
| canceled | 29 |

## Proposed V2 Goal Mapping

| Goal | V1 status | Proposed handling | Parent | Tasks |
| --- | --- | --- | --- | ---: |
| `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` - Build the Silver Oak Property Digital Twin | running | active after operator approval | none | 8 |
| `goal_f7801088-d145-4079-b522-cb452d8e3ef3` - Silver Oak: Project Organization and Source of Truth | running | active after operator approval | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 0 |
| `goal_96d2a7ec-9672-47b9-8610-ed41238993bb` - Silver Oak: Coordinate System and Spatial Reference | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 0 |
| `goal_51d6c26c-23e8-4c90-bbf9-97b52ee4f447` - Silver Oak: Evidence Intake and Photo/Measurement Index | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 4 |
| `goal_53b3e2e5-0dba-4595-9063-39aabf2912a5` - Silver Oak: Object Registry and Scene Graph | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 4 |
| `goal_0a64ed99-63c9-4620-9411-5a173c9a85b9` - Silver Oak: Measurement Database | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 6 |
| `goal_af9f3293-f131-4ace-ab49-0092c7c1b97f` - Silver Oak: Architectural-Style Drawings | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 6 |
| `goal_53d8baf3-4ef7-4653-a674-753d8356093b` - Silver Oak: FreeCAD / BIM Measured Model | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 5 |
| `goal_f847d36e-f9ee-4bfa-85b4-5936a5a7f500` - Silver Oak: Blender Visualization Model | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 5 |
| `goal_33a3ff36-ed7a-4a13-8a31-797646b87f0f` - Silver Oak: Validation and Quality Control | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 7 |
| `goal_9f13b94f-8948-4136-a346-433d98ceaf71` - Silver Oak: Use-Case Outputs | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 4 |
| `goal_9137ebdd-40af-43da-88e1-2618750324b9` - Silver Oak: Reusable Property Modeling Workflow | ready | paused/deferred | `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` | 1 |

## Warnings

- The preview found exactly 12 Silver Oak goals.
- Five project tasks have no `goalId`; they need manual mapping before any task
  import.
- Twenty-six canceled continuation tasks look like control-loop residue and
  should not be imported as active work.
- V1 `ready` and `running` do not automatically mean v2 `active`.
- Project and goal artifact paths should be treated as provenance first; import
  as v2 artifacts should wait for task/run scope.

## First Executable Work After Approval

Recommended first v2 executable work:

- Goal: `goal_f7801088-d145-4079-b522-cb452d8e3ef3` - Silver Oak: Project Organization and Source of Truth
- New task: `Verify Silver Oak source artifacts and current desired state`
- Success criteria: confirm the project root, `project_goal_audit.md`,
  source-of-truth rules, current authoritative artifacts, and the next runnable
  Silver Oak task without activating unrelated subgoals.
- Validation: read the imported project/goal state, inspect referenced artifact
  paths, and produce an agent-preparation packet for the selected first task.

## Recommendation

Proceed to a write path only after explicit approval.

The write path should import:

1. the Silver Oak project;
2. all 12 Silver Oak goals with v1 provenance preserved;
3. parent-goal relations;
4. the top-level Silver Oak goal and source-of-truth subgoal as active only if
   the operator approves;
5. all other subgoals as paused/deferred;
6. one new v2 verification task under the source-of-truth subgoal.

Do not import the 55 tasks in the same batch. Task import needs a separate
cleanup pass because the task set contains unscoped tasks and canceled
continuation residue.

## Applied Import Result

Applied on 2026-07-14 after operator approval.

Command:

```sh
node --experimental-strip-types scripts/v1-silver-oak-import-preview.ts --write --json
```

Created in `data/v2-core.sqlite`:

| Type | Count |
| --- | ---: |
| Project | 1 |
| Goals | 12 |
| Task | 1 |

Created records:

- `project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c` - 3920 Silver Oak St.
- `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` - Build the Silver Oak Property Digital Twin
- `goal_f7801088-d145-4079-b522-cb452d8e3ef3` - Silver Oak: Project Organization and Source of Truth
- 10 paused Silver Oak child goals from the preview mapping
- `task_v2_silver_oak_verify_source_state` - Verify Silver Oak source artifacts and current desired state

Readbacks:

- `npm run v2:core-db -- overview --json` shows Silver Oak as an active v2
  project with 12 goals and 1 task.
- `npm run v2:core-db -- operator-console --project project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c --json`
  shows the source-of-truth subgoal as ready to dispatch with
  `task_v2_silver_oak_verify_source_state`.
- `npm run v2:core-db -- agent-preparation-packet --task task_v2_silver_oak_verify_source_state --json`
  produced an actionable preparation packet for the first task.

Remaining migration boundary:

- The 55 v1 Silver Oak tasks were not imported.
- Historical task import still needs a separate cleanup pass because the source
  task set includes 5 unscoped project tasks and 26 canceled continuation tasks.
