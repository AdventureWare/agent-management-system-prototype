# AMS v2 Extraction Baseline Manifest

Date: 2026-07-15
Status: Canonical Phase 0 extraction baseline
Baseline ID: `20260715T224025Z-ca144cebfc2e`

## Purpose

This baseline is the immutable handoff point from the embedded AMS v2 prototype
to the independent v2 repository. It proves what state existed, how it was
captured, and whether it can be restored. It does not declare every captured
table, record, field, or workflow part of the clean v2 foundation.

Use this document with
`docs/design/ams_v2_prototype_capability_disposition_matrix.md`. The baseline
preserves evidence; the disposition matrix controls what the new product ports,
rebuilds, archives, defers, or rejects.

## Generated Evidence

Canonical generated directory:

`agent_output/v2-extraction-baseline/20260715T224025Z-ca144cebfc2e/`

This directory is intentionally ignored by Git and contains read-only generated
artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `v2-core.sqlite` | 9,916,416 | `b1453141931717e3bc729088f62146177b032edd9c738b6fd76a832792d3f3a1` |
| `v2-core-snapshot.json` | 10,116,074 | `04130015ed46a19cb9875a1a4598b3205bce7a19d9570e89baf55a52a7a86af2` |
| `parity-readbacks.json` | 32,209 | `d748b2aa37a0a0fd1efdf51cfa6ac53ea380811813b0e76d40d840bf686b8fd0` |
| `sqlite-schema.json` | 10,294 | `a5ac0188b400fb64d7886b5d9bc5d5feac23869bbadf1e13903e8ce080a04193` |
| `manifest.json` | 8,690 | `757a180e2515931a04b25be2f1fa1c676ecd5373156b4e7cb4ab2ae1a5522b13` |

The physical backup protects all current tables. The deterministic JSON is the
logical migration input. The readbacks are behavioral parity fixtures. The
schema listing is the exact prototype schema fingerprint.

Before the independent repository relies on this ignored local directory, copy
the complete directory into its migration archive or another durable backup and
verify every hash in this document. A Git-ignored local directory is not a
sufficient long-term archive by itself.

## Capture Point

| Property | Value |
| --- | --- |
| Source repository | `agent-management-system-prototype` |
| Source commit | `ca144cebfc2efdc47c26c0742eb74dfb7c844210` |
| Source runtime | `data/v2-core.sqlite` |
| Capture time | `2026-07-15T22:40:34.374Z` |
| Git state | clean |
| Node | `v24.14.1` |
| `better-sqlite3` | `12.11.1` |
| SQLite | `3.53.2` |
| Capture script hash | `22d9ad116574cb800cce994420a3d743f0a0b150ec7679d26a64a856b1239418` |
| Snapshot format | `ams-v2-core-snapshot-v1` |
| `PRAGMA user_version` | `0` |
| Schema hash | `a5ac0188b400fb64d7886b5d9bc5d5feac23869bbadf1e13903e8ce080a04193` |

`user_version = 0` is a prototype defect, not a usable migration version. The
independent repository must introduce an explicit `001_initial` migration and
must not pretend this value is a semantic schema version.

## Record Counts

| Table | Count |
| --- | ---: |
| `v2_core_projects` | 23 |
| `v2_core_goals` | 126 |
| `v2_core_tasks` | 843 |
| `v2_core_task_dependencies` | 143 |
| `v2_core_runs` | 821 |
| `v2_core_artifacts` | 2,176 |
| `v2_core_reviews` | 1,427 |
| `v2_core_decisions` | 3,016 |
| `v2_core_source_references` | 8,967 |
| `v2_core_memory_items` | 80 |
| `v2_core_memory_item_sources` | 80 |
| `v2_core_model_providers` | 5 |
| `v2_core_tools` | 2 |
| `v2_core_tool_executions` | 121 |
| `v2_core_evaluation_scenarios` | 5 |
| `v2_core_evaluation_results` | 11 |

No unexpected tables were found. High review and decision counts are evidence of
prototype ceremony, not justification for copying universal review/decision
workflows into v2.

## Verification Result

The capture passed all required checks:

- source, physical backup, and logical restore each returned
  `integrity_check = ok`;
- all three had zero foreign-key violations;
- the source connection was read-only and `query_only`;
- source `data_version` stayed `2` and `total_changes()` stayed `0`;
- source main-database and nonempty-WAL content did not change;
- physical-backup table counts and parity readbacks matched the source;
- the logical snapshot imported into a new disposable database;
- restored table counts and normalized readbacks matched the backup; and
- re-exporting the restored database reproduced the snapshot exactly.

The restore exercise exposed and fixed one prototype snapshot bug: deterministic
ID ordering can place a child goal or superseding decision before its referenced
row. Imports now defer foreign-key validation until the complete snapshot
transaction commits. Missing references still fail the commit.

## Parity Fixtures

The normalized readbacks cover:

- overview counts and lifecycle distributions;
- next-work ordering for the clean-foundation and representative real-work
  goals;
- triage for `goal_ams_v2_clean_independent_foundation`;
- unreviewed-output selection;
- goal continuity classifications;
- cross-project operator attention; and
- task details for the completed boundary plan, active baseline capture, a
  blocked Silver Oak task, and its ready continuation task.

The canonical snapshot records every value exported from the 16 known tables.
The online backup, unchanged source fingerprints, matching counts, and matching
representative readbacks provide strong source-to-backup confidence. This
capture did not independently compute a complete source-side per-table logical
hash, so it does not claim a second proof of every source value. Behavioral
readbacks omit display prose and timestamps where those do not define behavior.

## Limits

- This captures AMS v2 state only. Prototype/v1 state remains authoritative in
  `data/app.sqlite` and still requires explicit archival handling.
- Artifact URI records are captured; files referenced by those URIs are not
  embedded in the logical snapshot.
- Records for deferred concepts are preserved but are not automatically loaded
  into the first clean v2 operational schema.
- Dependency status labels are preserved literally. Eligibility is currently
  computed from both relation status and predecessor task state.
- The machine manifest's `schemaVersion: 1` value is SQLite's internal schema
  cookie, not a semantic migration version. `user_version = 0` remains the
  operative finding.
- SHM metadata is transient and was intentionally omitted. The machine
  manifest's wording that exact WAL/SHM metadata remained recorded is too broad;
  main-database and WAL fingerprints are the durable checks.
- The readbacks capture unreviewed artifacts but not the task-level
  `next-work -> review_output` branch. The independent foundation must add an
  explicit deterministic review-dispatch fixture before claiming behavior
  parity.
- Task/run closeout records created after this capture are intentionally outside
  this baseline.

## Reproduction

The capture tool refuses to overwrite an existing output directory:

```sh
npm run v2:capture-baseline -- \
  --output agent_output/v2-extraction-baseline/<utc>-<commit>
```

Do not replace this canonical baseline with a later capture silently. A later
capture must receive a new ID and a short reason for superseding this one.
