# Docs

- [In-App Assistant](./in-app-assistant.md): current V1 behavior, architecture, API flow, logging, extension points, and known limitations for the context-aware assistant create flows.
- [Ontology v1](./ontology-v1.md): conceptual ontology for goals, tasks, work attempts, threads, actors, artifacts, context, and planning sessions.
- [Domain Model Governance Protocol v0.1](./domain-model-governance-protocol-v0.1.md): lightweight gate for proposing, reviewing, accepting, deferring, renaming, merging, or rejecting model constructs.
- [Domain Model Source Map](./domain-model.md): current source-of-truth locations, bounded contexts, and implementation records for the AMS model.
- [Domain Glossary](./domain-glossary.md): accepted, candidate, experimental, deprecated, rejected, merged, and superseded concept definitions.
- [Domain Model Rationalization Audit](./domain-model-rationalization-audit-2026-07-01.md): read-only audit of current AMS model layers, overlaps, status semantics, and cleanup backlog.
- [Model Diagram](./model-diagram.md): text-based conceptual relationship diagram.
- [Model Golden Scenarios](./model-evals/golden-scenarios.md): representative scenarios for checking whether model changes support real workflows.
- [Autonomous Goal-Directed Work Loop v0](./autonomous-goal-directed-work-loop-v0.md): active product direction for continuous agent work from Goal/Task/Run state, including planning-task fallback when execution is not available.
- [Agent-Facing AMS Interface v0](./agent-facing-ams-interface-v0.md): structured tool/API/MCP interface direction for agents using AMS as the source of truth.
- [Contextual Procedural Knowledge v0](./contextual-procedural-knowledge-v0.md): placement strategy for reusable workflows, templates, skills, principles, project memory, and run lessons without context stuffing.
- [Contextual Rigor Profiles v0](./contextual-rigor-profiles-v0.md): optional profiles that tune validation, review, safety, and work-packet guidance to the work context.
- [Cloud Storage Access](./cloud-storage-access.md): how project-level extra writable roots work for iCloud Drive and other synced cloud folders, plus the macOS permission caveats.
- [Output Artifact Organization Options](./output-artifact-organization-options-2026-04-15.md): current-state review of how task, thread, run, and output artifacts are organized today, plus near-term options and a recommended direction.
- [Runtime Data Policy](./runtime-data-policy.md): source-of-truth rules for SQLite runtime data, JSON snapshots, ignored generated artifacts, and staged commit hygiene.
- [Remote Access Hardening Roadmap](./remote-access-hardening-roadmap-2026-04-06.md): near-term hardening plan plus medium/longer-term roadmap and a Tailscale vs Cloudflare Access comparison for the current laptop-hosted operator setup.
- [Remote Phone Access](./remote-phone-access.md): older localhost.run-based remote-access workflow for phone access when Tailscale is not the chosen path.
- [Tailscale Remote Access](./tailscale-remote-access.md): preferred near-term remote access path using a local Node runtime, launchd, and Tailscale Serve, while keeping the app runtime and the access layer decoupled.
