# Output Artifact Organization Options

Date: 2026-04-15
Project: Agent Management System Prototype
Scope: current-state review and near-term information-organization options for task, thread, run, and output artifacts

## What exists now

Observed in this repo and its current persisted data:

- `data/agent-threads/` is already the runtime store for thread/run execution state.
  - Current sample size: `246` thread directories and `1222` run directories on disk.
  - A run directory contains machine/runtime records such as `config.json`, `state.json`, `codex.log`, and `last-message.txt`.
- `data/agent-threads/<threadId>/attachments/` exists for thread-level attachments.
  - Current sample size: `23` thread directories with attachments and `32` stored files.
- `agent_output/` is currently acting as a mixed bucket.
  - `14` top-level markdown files that read like durable recommendations or role definitions.
  - `operator-server/` and `remote-access/` for operational logs and status.
  - `playwright/` for UI screenshots.
  - `task-attachments/` for task-uploaded files.
- The current repo `.gitignore` ignores both `data/` and `agent_output/`.
- The current commit hook blocks `agent_output/` as generated scratch content.
- The current product model and docs describe artifacts as durable outputs, but the default project/task/run path is usually one generic root.
  - In `data/control-plane.json`, `96` AMS tasks with an `artifactPath` point to `/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/agent_output`.
  - `112` AMS run records point to that same path in `artifactPaths`.

## Main organizational issues

1. One path is carrying too many meanings.
   `agent_output/` currently means durable recommendations, task attachment storage, local screenshots, and operational logs.

2. The physical layout does not match the domain model.
   Threads and runs already have dedicated state directories under `data/agent-threads/`, but durable task outputs still collapse into one shared project bucket.

3. The default artifact root is too coarse.
   Most AMS tasks and runs record the same bare project-level `agent_output` path, so path alone does not answer which task produced which durable output.

4. Durable and non-durable material are mixed.
   The repo treats `agent_output/` as ignorable local scratch, but many files inside it are authored decision docs that look closer to `docs/` than to runtime output.

5. Task and thread attachments follow different storage rules.
   Task attachments are stored under the task artifact root, while thread attachments are stored under thread state. That split is reasonable, but it is not surfaced as an explicit policy.

6. Provenance is still root-level more than file-level.
   Run records usually store a root directory in `artifactPaths`, not the concrete output files produced by that run.

## Options

### Option 1: Keep `agent_output/`, but make it a structured single root

Use the existing default artifact root, but reserve fixed subfolders with clear semantics:

- `agent_output/deliverables/tasks/<taskId>/`
- `agent_output/attachments/tasks/<taskId>/`
- `agent_output/debug/playwright/`
- `agent_output/runtime/operator-server/`
- `agent_output/runtime/remote-access/`

Keep thread/run state in `data/agent-threads/`.

Tradeoffs:

- Clarity: better than today, because each major artifact kind gets a home.
- Consistency: good if the app generates the task path automatically instead of asking agents to invent it.
- Maintainability: good for a small prototype; still one project-local root to manage.
- Reliability for agents: high, because the system can hand each task a concrete folder.
- Limitation: durable deliverables still live under a directory that the repo currently treats as ignorable scratch.

### Option 2: Split durable outputs from local runtime/debug output

Treat repo-owned durable outputs and local operational output as different systems:

- durable repo knowledge in `docs/`
- task-owned durable artifacts in a committed or intentionally versioned path such as `artifacts/tasks/<taskId>/`
- runtime logs/status in `agent_output/runtime/`
- local debug captures in `agent_output/debug/` or `output/`
- thread/run state remains in `data/agent-threads/`

Tradeoffs:

- Clarity: strongest semantic split between durable knowledge and disposable local output.
- Consistency: strong once the policy is explicit.
- Maintainability: good long-term because retention, backup, and commit behavior can differ by class.
- Reliability for agents: medium-high if the app emits the exact target path; lower if agents must decide between `docs/` and `artifacts/` without guidance.
- Limitation: needs a product decision about which task outputs are repo knowledge versus local deliverables.

### Option 3: Make the task workspace the primary durable artifact container

Set each task to a dedicated workspace path such as:

- `artifacts/tasks/<taskId>/`

Then keep task-local subfolders inside it:

- `deliverable/`
- `attachments/`
- `evidence/`
- `handoff/`

Runs would point to the task workspace, and thread/run state would remain under `data/agent-threads/`.

Tradeoffs:

- Clarity: very good for task provenance and later retrieval.
- Consistency: very good if task creation always assigns a concrete path.
- Maintainability: good once implemented, because each task becomes self-contained.
- Reliability for agents: high if the system generates the path; lower if current attachment logic is not updated.
- Limitation: this is the most invasive option because current task attachment storage assumes `task-attachments/<taskId>` under the artifact root, so the path rules would need a small implementation pass.

## Recommendation

Recommend **Option 2, implemented in an incremental way that starts with Option 1 mechanics**.

That means:

1. Keep `data/agent-threads/` as the canonical home for thread/run state and thread attachments.
2. Stop treating bare project-level `agent_output/` as the durable home for task deliverables.
3. Split local operational/debug output from durable task outputs.
4. Have the app assign task-specific artifact paths automatically instead of defaulting most tasks to the same root.

Why this direction is the best fit for the current system:

- It matches the ontology and product spec better.
  Threads/runs are execution records; artifacts are durable outputs. The storage model should reflect that difference.
- It avoids keeping authored recommendation docs in a path the repo explicitly ignores and blocks from commits.
- It preserves the current useful split where thread/run state is already separate.
- It gives a path to stronger provenance later without requiring a large migration first.

Recommended near-term target policy:

- `data/agent-threads/`
  Canonical thread/run state, logs, per-thread attachments, and other execution records.
- `agent_output/runtime/`
  Local operator/runtime status and logs only.
- `agent_output/debug/`
  Local screenshots, Playwright captures, and other disposable inspection outputs.
- `artifacts/tasks/<taskId>/` or another explicit task-owned durable root
  Durable task deliverables, evidence, and handoff files.
- `docs/`
  Repo-level design notes, architecture decisions, and durable knowledge intended to live with the codebase.

## Open questions that affect the final choice

1. Should task deliverables for software projects be committed in-repo, or should they remain local but structured?
   This determines whether `artifacts/` belongs in version control or should stay ignored.

2. Does the product want one field for all output paths, or separate fields for:
   - task workspace root
   - durable deliverable root
   - local runtime/debug root

3. Should `artifactPaths` on runs stay root-level, or should runs eventually record concrete produced files as first-class artifact records?

4. Are external roots such as Obsidian vaults or `Inbox` intentional durable destinations, or temporary convenience defaults?
   If intentional, the system needs a clearer policy for when off-repo knowledge stores are valid artifact homes.

5. Should task attachments remain task-owned files, or should they become first-class artifact records with explicit kind and provenance?

## Smallest practical next implementation pass

- Add an explicit policy note in the product docs that separates:
  - thread/run state
  - task deliverables
  - task attachments
  - runtime/debug output
- Introduce a generated task-specific artifact path instead of reusing the bare project root.
- Move repo-owned durable analysis notes like this one into `docs/`, not `agent_output/`.
- Restrict `agent_output/` usage to local runtime/debug output unless and until a separate durable task artifact area is implemented.
