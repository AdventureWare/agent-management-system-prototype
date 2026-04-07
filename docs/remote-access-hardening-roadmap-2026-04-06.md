# Remote Access Hardening Roadmap

Status: Planning note for the next pass after the localhost.run-based MVP

Last reviewed: 2026-04-06

## Purpose

This document records the next-pass plan for taking the current remote phone access path from a preview-and-tunnel prototype to a more secure, more stable operator setup.

It covers:

- the near-term hardening pass
- a rough medium-term roadmap
- a rough longer-term roadmap
- a comparison of Tailscale and Cloudflare Access for this project

It does not cover:

- full multi-user product auth design
- a hosted control-plane architecture in implementation detail
- production infrastructure for non-Mac workers

## Current state

The current remote access path works, but it still has prototype characteristics:

- the app is laptop-hosted
- the runtime is assembled by local helper scripts
- the public reachability path is still tunnel-centric
- the execution environment and web UI are tightly coupled to one machine
- operator auth is still simpler than what a durable remote product should use

## Near-term pass

Recommended scope for the next implementation pass:

1. Replace `vite preview` with a real Node runtime using `@sveltejs/adapter-node`.
2. Add a stable production-style start path with explicit env handling.
3. Add `launchd` supervision on the Mac so the service survives reboot and restarts predictably.
4. Replace the anonymous public tunnel as the primary access layer.
5. Keep the current in-app password gate only as a fallback until the network and identity layer is in place.
6. Re-run the full phone workflow after the new runtime and access path are in place.

### Near-term deliverables

- adapter-based Node runtime
- stable start and stop commands
- `launchd` plist and install/uninstall helpers
- one legitimate remote access path
- updated setup documentation
- end-to-end phone verification

### Exit criteria

The near-term pass is complete when:

- the app is no longer depending on `vite preview` for remote use
- the service can be restarted cleanly and survive a reboot
- the remote path no longer depends on an anonymous ad hoc tunnel
- the phone workflow works on the supported routes

## Tailscale vs Cloudflare Access

This comparison is for the current project shape:

- one primary operator
- work still runs on the MacBook
- the operator mainly needs secure phone access
- the current app is not yet a hosted multi-user product

### Option A: Tailscale

Best fit when:

- access is mainly for you and your own devices
- you are fine installing Tailscale on the phone
- you want the smallest jump from the current laptop-hosted architecture

Pros:

- private by default if you use Tailscale Serve instead of Funnel
- no need to expose the app on a public hostname
- strong fit for single-operator remote access
- simpler mental model than a public-access reverse proxy plus app-layer identity
- access policies are built around least privilege and device/user identity
- fast path from prototype to something materially safer

Cons:

- requires the Tailscale client on the phone and laptop
- less "open a URL from any browser anywhere" than Cloudflare Access
- still leaves the control plane laptop-hosted
- app-level identity is still thin unless added separately

Implication for this project:

- best near-term choice if this remains an operator-only tool
- lowest implementation risk for the next pass

### Option B: Cloudflare Tunnel + Access

Best fit when:

- you want browser-only access without requiring a tailnet client
- you want a more product-like external entry point sooner
- you expect more than one operator or identity-provider-based access rules soon

Pros:

- no inbound ports on the laptop
- identity-aware access policies at the edge
- easier to put behind a stable hostname and app-like login surface
- stronger bridge toward a future hosted control plane
- public entry point can still be protected by Access policy before traffic reaches the app

Cons:

- more moving parts than Tailscale for this current one-operator setup
- still leaves the MacBook as the actual origin
- public hostname model is broader than a tailnet-only service, even when identity-gated
- more operational surface area than Tailscale for the immediate use case

Implication for this project:

- better if the goal is "browser access from anywhere with no client install"
- better if the project is likely to move toward multi-user or external collaborator access soon

## Recommendation for this project

Recommendation: choose Tailscale for the next pass unless there is a strong requirement for browser-only access from unmanaged devices.

Reasoning:

- The real constraint is still the MacBook-based worker environment.
- The current use case sounds operator-centric, not multi-tenant.
- The most valuable next improvement is to reduce exposure and operational fragility, not to maximize reach.
- Tailscale achieves that with less system complexity than Cloudflare Access for this stage.

Choose Cloudflare Access instead if one of these becomes a near-term requirement:

- no client install on the phone
- stable browser access for non-tailnet users
- a clear path to multiple named operators and IdP-backed policies in the very next stage

## Medium-term roadmap

After the near-term hardening pass, the next architectural step should be to separate the control plane from the local worker.

Recommended medium-term moves:

1. Host the web control plane separately from the MacBook worker.
2. Run a local worker daemon on the Mac that connects outbound to the control plane.
3. Move app state toward a server-backed database instead of a laptop-centric layout.
4. Replace shared-password fallback with real named-user auth.
5. Add worker registration, heartbeat, capability reporting, and reconnect behavior.
6. Improve remote UX around task freshness, run state, and follow-up handling.

## Longer-term roadmap

Recommended longer-term moves:

1. Add RBAC and full audit logs.
2. Add secret management and rotation.
3. Add backups and recovery for state and artifacts.
4. Add observability, uptime checks, and alerting.
5. Add CI/CD and safer deploy workflows.
6. Add stronger execution isolation for workers.
7. Add stable artifact storage and remove laptop-local assumptions.
8. Support multiple workers and, eventually, multiple machines.

## Current external references

The following sources were checked on 2026-04-06. Pricing and plan details can change and should be re-verified before purchase or rollout.

- Vite preview guidance: https://vite.dev/guide/static-deploy.html
- `@sveltejs/adapter-node`: https://www.npmjs.com/package/@sveltejs/adapter-node
- Tailscale pricing: https://tailscale.com/pricing
- Tailscale access control: https://tailscale.com/kb/1393/access-control
- Tailscale Funnel and Serve guidance: https://tailscale.com/kb/1223/tailscale-funnel/
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Cloudflare Tunnel with `cloudflared`: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/private-net/cloudflared/
- Cloudflare Access policies: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
- Cloudflare Access auth cookie behavior: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/
- Cloudflare Access pricing page: https://www.cloudflare.com/teams/zero-trust-network-access
