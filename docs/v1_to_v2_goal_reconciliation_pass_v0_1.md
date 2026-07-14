# V1 to V2 Goal Reconciliation Pass v0.1

Date: 2026-07-14

## Purpose

Reconcile prototype goals from `data/app.sqlite` against AMS v2 goals in
`data/v2-core.sqlite` before importing anything else.

This pass does not import, delete, archive, or mutate goal state. It classifies
what exists so the next migration step can be intentional instead of a bulk dump
of old prototype residue into v2.

## Sources Inspected

- Prototype runtime store: `data/app.sqlite`
  - table: `control_plane_records`
  - relevant collection: `goals`
- Prototype snapshot: `data/control-plane.json`
- AMS v2 runtime store: `data/v2-core.sqlite`
  - table: `v2_core_goals`
  - table: `v2_core_projects`
- Existing curation docs:
  - `docs/v1_to_v2_migration_plan_v0_1.md`
  - `docs/v2_imported_prototype_backlog_curation_plan_v0_1.md`
  - `docs/v2_imported_prototype_first_curation_batch_v0_1.md`
  - `docs/v2_imported_prototype_curation_state_application_v0_1.md`
  - `docs/v2_imported_prototype_backlog_curation_closure_assessment_v0_1.md`

## Count Reconciliation

| Source | Goal count |
| --- | ---: |
| Prototype `data/app.sqlite` control-plane goals | 57 |
| AMS v2 imported prototype-project goals | 8 |
| Prototype goals already present in v2 | 8 |
| Prototype goals missing from v2 | 49 |

Conclusion: all prototype goals have not been imported. AMS v2 currently holds a
curated subset of prototype goals, not a full migration.

## Goals Already Present in V2

These 8 prototype goals are already present under the v2 imported prototype
project `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`.

| Goal | V2 status | Reconciliation note |
| --- | --- | --- |
| `goal_26a850e3-5eac-4150-a96f-0574cd483595` - AMS useful prototype milestone | superseded | Historical prototype milestone. Keep as evidence, not current work. |
| `goal_5c952025-6248-46eb-882e-9cca1b5b17c3` - Agent and work management system long-term vision | superseded | Keep as source evidence; v2 now has clearer owned-agent goals. |
| `goal_39bc6bb5-011e-43c3-9abd-a220f59100e0` - Autonomous Goal-Directed Work Loop v0 | completed | Keep as historical proof. |
| `goal_45e5b3d5-9b1d-44fd-a101-5335f9b79365` - Live real-agent autonomous goal completion proof | completed | Keep as historical proof. |
| `goal_d6d74659-eb0f-4060-8343-ee8d3f577117` - Get a paying Kwipoo customer | active | Real non-AMS business goal; needs operator decision before more migration. |
| `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56` - Reduce friction and frustration with repo management | active | Real operations goal; needs operator decision before more migration. |
| `goal_02390bc4-fcae-495f-9f32-456e370b7265` - Stable, comprehensible AMS operator UI | paused | Relevant to AMS v2 UI/admin work; keep paused until v2 UI milestone resumes. |
| `goal_a363fc76-fdc1-4b79-aed2-39d53ac611c7` - Usable mobile AMS workflow | paused | Relevant to remote/mobile access; keep paused unless reopened as v2 work. |

## Missing Goals by Project

### Superstructure Ontology / Reality-Modeling Framework

Source project: `project_c3336a7b-1413-498e-ac8b-70aac0a36e11`

Prototype count: 11 goals.

V2 currently has a separate `project_superstructure_program` with 7 active
Superstructure goals. That means these v1 goals should not be imported blindly.
They should be reconciled against the newer v2 Superstructure program model.

Recommended handling: merge/reconcile into `project_superstructure_program`,
preserving useful artifact paths and completed evidence.

| Goal | V1 status | Parent | Task count | Classification |
| --- | --- | --- | ---: | --- |
| `goal_5474b71c-54a8-49b2-bdf9-bca6ae35db84` - Build the Superstructure Ontology into a usable, reviewable, and extensible reality-modeling framework | running | none | 11 | merge into existing v2 Superstructure program |
| `goal_4a98785a-ca18-45e7-b68d-782454db0790` - SG1: Stabilize the local project workspace | done | Superstructure ontology | 1 | archive as completed evidence |
| `goal_29232691-9c01-4ecc-ae43-d85ccffc2e09` - SG2: Consolidate the latest project state | done | Superstructure ontology | 4 | archive as completed evidence |
| `goal_3b953f6c-7d09-41ff-8c0b-4300b1335aa4` - SG3: Implement v0.37 targeted revision | ready | Superstructure ontology | 0 | operator decision / compare to current roadmap |
| `goal_3e7fbf85-e599-4939-8f72-ba34cf050b54` - SG4: Refine the core ontology kernel | ready | Superstructure ontology | 0 | likely merge into ontology workstream |
| `goal_c1615373-a61e-4062-8615-b7c4758c6c1f` - SG5: Build the claim and evidence discipline | ready | Superstructure ontology | 0 | likely merge into epistemic/evidence workstream |
| `goal_5c136036-e055-42ab-b9da-4f2b0bb36191` - SG6: Create practical application protocols | ready | Superstructure ontology | 0 | defer until Superstructure roadmap review |
| `goal_f130dab2-d722-4f30-9b68-12f4a9b2f3bc` - SG7: Build worked examples | ready | Superstructure ontology | 0 | likely import as task/subgoal if still wanted |
| `goal_92d7d43a-9a81-4c86-9967-e09af9638398` - SG8: Simulate external review until real review is available | ready | Superstructure ontology | 0 | defer; may be evaluation workflow rather than goal |
| `goal_075360ac-377a-4ce6-a44d-baf0da8fb981` - SG9: Prepare semi-formal representation | ready | Superstructure ontology | 0 | defer until ontology formalization need is current |
| `goal_c1ac1db7-6480-4f98-99fe-66cd81e7c42d` - SG10: Build a release candidate | ready | Superstructure ontology | 0 | defer until release milestone is current |

### 3D Modeling and Game Development Learning

Source project: `project_28a226d9-d291-4cb8-8676-8b2b1cb7fcbe`

Prototype count: 8 goals.

Recommended handling: preserve as a separate project candidate, but do not
activate all goals at once. Import only if the operator wants AMS v2 to manage
this domain now.

| Goal | V1 status | Parent | Task count | Classification |
| --- | --- | --- | ---: | --- |
| `goal_120f1e27-f3fc-4fcd-996f-412163609cc7` - Build practical 3D modeling and Unity fundamentals | running | none | 0 | operator decision |
| `goal_d62ed300-28f5-47ee-a28f-9133cbf95cee` - Ship a small beatable Unity game | running | none | 17 | import candidate if game work should resume |
| `goal_ac7f9f43-7594-401e-8103-7b49a9be1a94` - Stabilize the current Snack Run playable slice | running | Unity game | 0 | import with parent if game work resumes |
| `goal_0011e4ec-7b0f-4e7c-8c7e-5640a1188752` - Package and playtest the Snack Run ship candidate | running | Unity game | 2 | import with parent if game work resumes |
| `goal_e75fd6a0-9409-4476-a5b7-eb2b0cb4fee9` - Complete Snack Run game rules and result states | done | Unity game | 0 | archive as completed evidence |
| `goal_5b0bdf0e-082b-40e0-ab1a-5b5fca2df746` - Add a minimal Snack Run content pass | done | Unity game | 0 | archive as completed evidence |
| `goal_eebee003-c11a-4920-b1aa-682ade1cc8fc` - Tune Snack Run movement camera and course feel | ready | Unity game | 0 | defer |
| `goal_5832ae35-9ac3-43e6-a343-a0fb34ef4193` - Improve Snack Run readability and feedback | ready | Unity game | 0 | defer |

### 3920 Silver Oak St.

Source project: `project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c`

Prototype count: 12 goals.

This is the strongest candidate for a clean import because it is a distinct
non-AMS domain and directly tests whether v2 can support agent preparation
outside AMS software development.

Recommended handling: import as a paused project with one active planning task,
or import the top-level goal plus immediate source-of-truth/organization subgoal
first. Avoid activating all 12 goals at once.

| Goal | V1 status | Parent | Task count | Classification |
| --- | --- | --- | ---: | --- |
| `goal_ac42c3de-eafa-4a63-86c0-1d40665f147f` - Build the Silver Oak Property Digital Twin | running | none | 8 | import candidate |
| `goal_f7801088-d145-4079-b522-cb452d8e3ef3` - Silver Oak: Project Organization and Source of Truth | running | Silver Oak digital twin | 0 | import candidate, likely first active subgoal |
| `goal_96d2a7ec-9672-47b9-8610-ed41238993bb` - Silver Oak: Coordinate System and Spatial Reference | ready | Silver Oak digital twin | 0 | import paused/deferred |
| `goal_51d6c26c-23e8-4c90-bbf9-97b52ee4f447` - Silver Oak: Evidence Intake and Photo/Measurement Index | ready | Silver Oak digital twin | 4 | import paused/deferred |
| `goal_53b3e2e5-0dba-4595-9063-39aabf2912a5` - Silver Oak: Object Registry and Scene Graph | ready | Silver Oak digital twin | 4 | import paused/deferred |
| `goal_0a64ed99-63c9-4620-9411-5a173c9a85b9` - Silver Oak: Measurement Database | ready | Silver Oak digital twin | 6 | import paused/deferred |
| `goal_af9f3293-f131-4ace-ab49-0092c7c1b97f` - Silver Oak: Architectural-Style Drawings | ready | Silver Oak digital twin | 6 | import paused/deferred |
| `goal_53d8baf3-4ef7-4653-a674-753d8356093b` - Silver Oak: FreeCAD / BIM Measured Model | ready | Silver Oak digital twin | 5 | import paused/deferred |
| `goal_f847d36e-f9ee-4bfa-85b4-5936a5a7f500` - Silver Oak: Blender Visualization Model | ready | Silver Oak digital twin | 5 | import paused/deferred |
| `goal_33a3ff36-ed7a-4a13-8a31-797646b87f0f` - Silver Oak: Validation and Quality Control | ready | Silver Oak digital twin | 7 | import paused/deferred |
| `goal_9f13b94f-8948-4136-a346-433d98ceaf71` - Silver Oak: Use-Case Outputs | ready | Silver Oak digital twin | 4 | import paused/deferred |
| `goal_9137ebdd-40af-43da-88e1-2618750324b9` - Silver Oak: Reusable Property Modeling Workflow | ready | Silver Oak digital twin | 1 | import paused/deferred |

### AMS Prototype Child Goals Missing from V2

Source project: `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`

Prototype count: 6 missing goals.

These are child goals of the already-imported and superseded `AMS useful
prototype milestone`. They are prototype-era design intentions. Some concepts
have already been rebuilt differently in v2.

Recommended handling: do not import as active goals. Merge useful intent into
v2 docs or future capability tasks only when there is a current implementation
need.

| Goal | V1 status | Task count | Classification |
| --- | --- | ---: | --- |
| `goal_9cc70f7d-5e8a-4fec-8791-2b22153da6d1` - Explicit intent interpretation in AMS | done | 7 | archive as completed evidence |
| `goal_7c51bd48-de41-421b-82aa-007e04618019` - Structured uncertainty and decision tracking | ready | 0 | merge/defer |
| `goal_1dcb71d4-897c-42ca-b40f-928150c06ef8` - Reviewable task generation from goals and evidence | ready | 0 | merge/defer |
| `goal_0e8cb1a3-41a4-49ed-a755-4f93adc905ba` - Explicit executor and tool routing | ready | 0 | merge/defer |
| `goal_245ecabf-3158-4b2a-b8f9-3332bb91dd09` - Reviewed feedback loop from run evidence | ready | 0 | merge/defer |
| `goal_6584ddb8-d412-4bc8-b261-9d218b8c99f5` - Safe self-improvement proposal loop | ready | 0 | merge/defer |

### Other Individual or Business Goals

Recommended handling: operator decision before import. These are real goals,
but importing them into v2 changes the operating scope of AMS. They should not
be treated as technical migration leftovers.

| Project | Goal | V1 status | Task count | Classification |
| --- | --- | --- | ---: | --- |
| Sitcom World | `goal_0c18ae7b-ec51-470f-94a6-914fc6c6d649` - Agent World v0: Primary real-time emergent simulation viewer | running | 5 | operator decision |
| Life Project | `goal_e9ce718d-42a3-4950-8a41-b6d38881b230` - Make education actually cool and fun, in a not cringe way | running | 0 | operator decision |
| Life Project | `goal_387b2b51-acbd-46ca-9ca4-800d72c2e6bd` - Make $20,000 by the end of 2026 | ready | 0 | operator decision |
| Personal Knowledge | `goal_5bb4709f-df0a-4542-8fdf-ef89b636b634` - Become the most intelligent person ever | ready | 2 | operator decision |
| Kwipoo app | `goal_9d2f54c4-9a20-4bd4-b023-c8198a6c52a7` - My Grandma and I consistently use Kwipoo | ready | 12 | operator decision |
| Kwipoo website | `goal_2ee0dc56-c9f2-4559-9dd0-2a5e67e50e5c` - Improve marketing funnel of Kwipoo | ready | 1 | operator decision |
| Kwipoo website | `goal_455c5195-7730-4675-a147-c7c8a071e028` - Have less obviously AI written website content | ready | 1 | operator decision |
| Animal Welfare Monitoring System | `goal_7cdcba64-bb48-455b-8fe1-b3c7b1b55c27` - Win the Inocrowd Animal Welfare Monitoring System contest and the prize | ready | 1 | operator decision |
| Kwipoo | `goal_kwipoo_release_sync` - Kwipoo app + website release sync | done | 0 | archive as completed evidence |
| Kwipoo | `goal_kwipoo_market_research` - Kwipoo B2C market research | running | 0 | operator decision |
| Inocrowd Textile Analysis Challenge Project | `goal_textile_inocrowd_challenge` - Win the Inocrowd textile analysis challenge | running | 4 | operator decision |
| Reality-Modeling Intelligence Framework | `goal_951d6b22-9229-4217-86ad-6cb78749fad5` - Create RMI Project Kernel v0.1 | running | 8 | operator decision / possible Superstructure merge |

## Recommended Next Migration Batch

Do not import all 49 missing goals.

Recommended next batch:

1. Import or reconcile the Silver Oak project as the first clean non-AMS domain
   migration.
2. Start with:
   - `Build the Silver Oak Property Digital Twin`
   - `Silver Oak: Project Organization and Source of Truth`
3. Preserve the remaining Silver Oak subgoals as paused/deferred goals or
   documented candidate work, depending on the v2 import surface available.
4. Create one executable task after import:
   - verify source artifacts and current desired state for Silver Oak
   - decide which subgoal should run first
   - produce an agent-preparation packet for that task

Why Silver Oak first:

- It is a meaningful non-AMS project.
- It has a coherent top-level goal and decomposition.
- It tests goal/subgoal/task/context/artifact behavior outside software work.
- It has artifact paths and task counts, giving v2 something real to inspect.
- It avoids mixing business, personal, AMS, and Superstructure roadmaps in one
  migration batch.

## Import Guardrails

- Preserve original v1 IDs as `source_id` or equivalent provenance.
- Preserve source project IDs and artifact paths as provenance, not necessarily
  as canonical v2 fields.
- Do not mark imported goals active by default unless the operator explicitly
  wants AMS v2 to work them now.
- Do not import prototype-era AMS child goals as live v2 goals unless a current
  capability gap requires them.
- Do not flatten parent/child goal structure into unrelated tasks.
- Do not create new entity types for migration classification.
- Do not treat `ready` from v1 as equivalent to active v2 work.
- Completed v1 goals should become historical evidence unless the operator
  explicitly reopens them.

## Open Questions

1. Should AMS v2 become the active control plane for Silver Oak now?
2. Should Superstructure v1 goals be mapped into existing
   `project_superstructure_program` goals, or archived as superseded by the new
   Superstructure program structure?
3. Should business/personal goals be imported into v2 now, or should v2 first
   prove multi-project operation with Silver Oak plus AMS v2 core?
4. Should imported goals preserve v1 statuses literally, or should all imported
   non-current goals start as paused/deferred until explicitly resumed?
5. Should v2 create project records for all 19 v1 projects, or only for projects
   with imported current goals?

## Recommended Next Implementation Task

Create a narrow, reviewable Silver Oak import preview:

- read v1 project `project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c`
- read its 12 linked goals
- read linked task IDs/counts without importing every task body yet
- generate a dry-run mapping to v2 `Project`, `Goal`, and parent-goal relations
- preserve v1 IDs/provenance
- report validation warnings before any write

Acceptance criteria:

- preview reports exactly 1 project and 12 goals
- preview preserves parent-child goal relations
- preview distinguishes active/imported-now from paused/deferred
- preview writes no database state
- preview identifies the one smallest Silver Oak goal/task that should become
  executable in v2 after approval
