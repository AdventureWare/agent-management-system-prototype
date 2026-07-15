# AMS v2 Prototype Capability Disposition Matrix

Date: 2026-07-15
Status: Canonical extraction decision input
Baseline: `docs/design/ams_v2_extraction_baseline_manifest.md`

## Rule

`port` means preserve a proven behavior, contract, fixture, or data relation. It
does not mean copy prototype modules. `rebuild` means the user workflow is
required but the existing implementation encodes coupling or bad assumptions.
`archive` preserves evidence without admitting it to the new product. `defer`
requires a later exercised need. `reject` means the current concept or shape
should not enter v2.

Captured data is preserved regardless of disposition. Operational admission is
a separate decision.

## Matrix

| Operator question or workflow | Prototype evidence | Disposition | Clean-v2 acceptance test |
| --- | --- | --- | --- |
| Which database owns this operation? | Separate v2 DB and refusal guard in `v2-core-persistence.ts` | `port` | V2 refuses prototype DB paths, names one writable authority, and never dual-writes. |
| Can current state be backed up and reproduced? | Ordered 16-table snapshot plus the extraction baseline | `port` | Repeated export is byte-identical; fresh restore matches counts, relations, and readbacks. |
| Are read commands side-effect free? | Current CLI reads use the writable schema-applying opener | `rebuild` | Every read path uses a read-only adapter and leaves durable DB content unchanged. |
| Can prototype records migrate without invented meaning? | Existing importer defaults unknown states optimistically | `rebuild` | Unknown values and ambiguous relations fail or quarantine; repeated imports detect content conflicts; artifact targets are checked; historical completion is not treated as current acceptance. |
| Can projects, goals, child goals, tasks, and dependencies represent work? | Existing core records and relations | `port` | Create/read the records through application services; parent/dependency relations remain in one project, reject self/cycles, and preserve graph invariants. |
| Can schema changes be applied and audited safely? | Prototype reapplies `CREATE TABLE IF NOT EXISTS`; `user_version = 0` | `rebuild` | `001_initial` builds a fresh DB; every later migration is ordered, transactional, versioned, and upgrade-tested. |
| Are goal and task lifecycles coherent? | Existing statuses and constrained task transitions | `rebuild` | Explicit transition tables reject illegal moves; routine transitions do not create material Decisions. |
| What should be worked on next? | `readV2CoreNextWork` and dependency-aware fixtures | `port` | Review, ready, blocked, and dependency-gated cases select deterministically. |
| Is an active goal silently stalled? | Goal triage and continuity audit | `port` | Every active incomplete goal has current work, review, blocker, or surfaced continuation need. |
| Can one task survive several runs? | Task/Run separation exists; managed closeout is rigid | `rebuild` | Two runs continue one task while preserving progress, evidence, uncertainty, and next action. |
| Which output came from which work? | Artifact links to project/task/run plus source references | `port` | Accepted output resolves to its producing run, task, project, and provenance. |
| Who or what executed a run? | Run has optional model-provider attribution; human/local-agent identity is missing | `rebuild` | Every delegated run records an explicit human, provider/model, local agent, or tool executor identity without requiring a registry first. |
| What bounded context should an agent receive? | Four overlapping packet/read-model implementations | `rebuild` | One revisioned source-linked work packet supports launch, resume, and closeout from task ID alone. |
| Should ContextBundle, AgentWorkPacket, AgentPreparationPacket, and CloseoutPacket remain separate products? | Overlapping service types and commands | `reject` | One work-packet contract supplies role-specific views without duplicate selection logic. |
| Does every completed task need review plus an acceptance Decision? | 1,427 reviews and 3,016 decisions for 843 tasks | `rebuild` | Low-risk validated work closes directly; configured high-risk/protected work still gates. |
| How does the operator orient and steer multiple workstreams? | Useful data, but a 2,000-line embedded page with overlapping sections | `rebuild` | `/work`, workstream, goal, task, and activity workflows pass desktop and 390px scenarios. |
| Should v1 entity-first navigation define v2 information architecture? | Goals, Tasks, Planning, Governance, Runs, Threads, and v2 shown as peer destinations | `reject` | Navigation centers operator jobs: Work, Workstreams, Tasks, Activity, Knowledge, System. |
| Can the operator use v2 safely from a phone? | Tailscale/remote access and mobile prototype proofs | `rebuild` | Independent runtime supports trusted-device access and bounded mobile steering workflows. |
| Can local project files be inspected? | Prototype file browser and artifact URI handling | `defer` | Admit after the core loop; restrict access to allowed roots and test traversal denial. |
| Can relevant local state be searched? | Deterministic record search and retrieval experiments | `defer` | Scoped retrieval improves real task recall without unrelated-project leakage. |
| Should governed MemoryItem be in the foundation? | 80 trusted records and a promotion lifecycle | `defer` | Admit only when reviewed facts cannot remain source-linked artifacts/decisions or generated context. |
| Is a provider registry/routing policy required now? | Five providers and limited route evidence | `defer` | Admit after comparable evidence exists for at least two routes in one real task class. |
| May the system silently select the first or preferred external provider? | Prototype UI defaults to an available provider and prefers `external_ai` | `reject` | Foundation launch requires explicit executor/provider input; later routing requires inspectable policy and evidence. |
| Are tool and tool-execution registries required now? | Two tools and 121 execution records | `defer` | Admit when run attribution cannot answer a real permission, audit, or execution query. |
| Are evaluation and dependency-reduction registries required now? | Five scenarios and eleven results | `defer` | Admit each only after a repeated decision consumes the result. |
| Does v2 need WorkSession/Thread as a core entity? | Prototype thread/session stores overlap Run and task continuation | `defer` | Admit only if Run plus an external resume reference cannot support continuity. |
| Should agents use a structured CLI/API/MCP surface? | Useful intent and control-plane patterns tied to prototype handlers | `rebuild` | CLI/API/MCP call the same application service and return equivalent changes/readbacks. |
| Should workflows, templates, roles, skills, planning sessions, and capacity models be copied? | Broad v1 ontology and UI | `archive` | Preserve source evidence; create no v2 entity until a repeated workflow proves a distinct lifecycle/query. |
| Should the prototype Svelte shell, navigation, and global styling be copied? | Embedded `/app/v2-core` inherits prototype product structure | `archive` | Independent core, SQLite, and CLI build/test while the prototype path is unavailable; the later web app uses only clean public services. |
| Should the 8,000-line v2 service be the v2 core? | Proven behavior mixed across domain, SQL, packets, execution, and UI reads | `reject` | Focused application services depend on ports; SQL and framework code remain adapters. |
| Should v2 include an autonomous background scheduler now? | Queue-shaped prototype workflows but no proven safe unattended loop | `reject` | Foundation launches one explicit bounded action; scheduler requires separate evidence and authority design. |
| Should existing scenario tests and real-work fixtures survive? | Broad CLI/server/browser proof corpus | `port` | Selected tests run against public v2 contracts, not imported prototype modules. |
| Must authoritative work state remain provider independent? | Provider attribution is optional and scoped to runs | `port` | External and owned AI remain replaceable executors; neither owns project, goal, task, evidence, or continuation truth. |
| Should external-AI optimization and local replacement tracking be first-slice entities? | Early operational profiles and route experiments | `defer` | Add after real runs yield a repeated routing or replacement decision. |

## What This Intentionally Abandons

- the prototype application shell as the v2 runtime;
- page-by-page v1 evolution as the primary migration path;
- universal review and Decision production;
- four packet concepts with overlapping context logic;
- entity inventory as the primary UI organization;
- optimistic import normalization;
- the service monolith as an architectural starting point;
- prompt text or chat history as authoritative project state; and
- speculative registries, schedulers, dashboards, and metrics in the foundation.

## What Must Survive

- all current data in the physical and deterministic snapshots;
- source references and stable identifiers needed for migration traceability;
- project/goal/task/dependency/run/artifact distinctions;
- deterministic next-work and continuity behaviors;
- the Task-versus-Run continuity invariant;
- executor/provider attribution on runs;
- proportional validation and protected-change gates;
- representative real-work scenarios; and
- one explicit runtime authority.

## Foundation Boundary

The independent first schema admits only `Project`, `Goal`, parent-goal
relation, `Task`, `TaskDependency`, `Run`, `Artifact`, proportional `Review`,
material `Decision`, and provenance/source references. Executor/provider labels,
work packets, recommendations, progress, blockers, and workstreams should begin
as fields or computed views where possible.

Preserving deferred records does not authorize adding their tables to
`001_initial`.
