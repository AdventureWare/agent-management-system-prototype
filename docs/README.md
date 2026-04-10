# Docs

- [Current Product Surfaces](./current-product-surfaces.md): route-by-route audit of what each top-level entity and page is currently doing in the prototype.
- [Ontology v1](./ontology-v1.md): conceptual ontology for goals, tasks, work attempts, threads, actors, artifacts, context, and planning sessions.
- [Agent Domain Model](./agent-domain-model.md): recommended separation between tasks, workers, threads, and runs.
- [Cloud Storage Access](./cloud-storage-access.md): how project-level extra writable roots work for iCloud Drive and other synced cloud folders, plus the macOS permission caveats.
- [Coordination Capability Matrix](./coordination-capability-matrix-2026-04-06.md): current-state review of which coordination capabilities are present, partial, or missing, plus the smallest recommended next implementation pass.
- [Coordination Design Notes](./coordination-design-notes-2026-04-06.md): research-backed guidance for designing effective AI-to-AI and human-in-the-loop coordination in this prototype.
- [Planning Surface Notes](./planning-system.md): current planning stance for the prototype, centered on date-window review sessions instead of structured planning horizons.
- [SQLite Migration Plan](./sqlite-migration-plan-2026-04-01.md): recommended move from JSON stores and `node:sqlite` to app-owned SQLite with a phased cutover.
- [Remote Access Hardening Roadmap](./remote-access-hardening-roadmap-2026-04-06.md): near-term hardening plan plus medium/longer-term roadmap and a Tailscale vs Cloudflare Access comparison for the current laptop-hosted operator setup.
- [Tailscale Remote Access](./tailscale-remote-access.md): preferred near-term remote access path using a local Node runtime, launchd, and Tailscale Serve, while keeping the app runtime and the access layer decoupled.
- [Product Spec](./product-spec.md): product definition, domain model, state machines, and phased implementation plan for evolving the prototype from a remote Codex control plane into a work orchestration system.
- [Self-Improvement System](./self-improvement-system.md): architecture and phased plan for turning operational signals into learning loops, knowledge capture, and skill refinement.
- [Self-Improvement Suggestion Engine Direction](./self-improvement-suggestion-engine.md): research-backed plan for ranking, feedback capture, evaluation, and gradual learning for the prototype's suggestion systems.
- [Usage and Cost Reporting MVP Slice](./usage-cost-reporting-mvp-2026-04-09.md): smallest recommended runtime capture, rough cost derivation, and first reporting rollups for making routing decisions with AI usage visibility.
