---
name: monetization-entitlements-architecture
description: Use when designing the technical access model behind software monetization. Helps define plans, entitlements, feature access rules, quota limits, billing-state behavior, source-of-truth boundaries, and how free versus paid access should be enforced across client, server, and data layers.
---

# Monetization Entitlements Architecture

## When to use this skill

- Use this skill when a product needs a durable technical model for free versus paid access.
- Use this skill when billing, plans, quotas, or subscription states need to be translated into entitlement rules.
- Use this skill when the risk is muddled access logic spread across the app.

## Workflow

1. Clarify the commercial truth.
   Capture:
   - plans or tiers
   - what users are paying for
   - what stays free
   - account versus user scope
   - quota or usage rules
   - edge cases around trials, cancellation, failed payment, and refunds
2. Define the entitlement model.
   Specify:
   - entitlement names
   - who owns them
   - what grants them
   - how long they last
   - what state changes revoke or downgrade them
3. Choose the source of truth.
   State which system is authoritative for:
   - billing status
   - plan assignment
   - access checks
   - usage counters
   - downgrade or grace-period logic
4. Map enforcement boundaries.
   Separate:
   - client-side visibility or UX gating
   - server-side authorization
   - database-level scope or row access
   - derived feature flags or cached access summaries
5. Define failure and transition behavior.
   Cover:
   - stale billing state
   - webhook delays
   - trial expiration
   - downgrade after quota exhaustion
   - grandfathered accounts
6. End with an implementation blueprint.
   Include data model notes, key checks, test cases, and migration concerns.

## Output shape

- Commercial input summary
- Entitlement matrix
- Source-of-truth and enforcement architecture
- Lifecycle and edge-case rules
- Implementation blueprint
- Test and migration checklist

## Failure shields

- Do not treat a paywall screen as the access-control system.
- Do not rely on client-only checks for paid functionality.
- Do not mix plan names, entitlements, and feature flags into one unclear layer.
- If downgrade or billing-state behavior is fuzzy, stop and define it before implementation.
