---
name: monetization-implementation-planning
description: Use when an approved monetization or pricing strategy needs to be translated into concrete product, billing, entitlement, experimentation, and rollout plans. Helps define plans, limits, paywalls, trial behavior, upgrade rules, lifecycle states, analytics, migration rules, and launch sequencing without breaking existing users.
---

# Monetization Implementation Planning

## When to use this skill

- Use this skill when a pricing or monetization direction is already chosen and now needs to be implemented.
- Use this skill when the team needs concrete plan matrices, entitlement rules, billing states, paywall flows, or rollout steps.
- Use this skill when the risk is execution ambiguity rather than strategy ambiguity.

## Workflow

1. Restate the monetization decision.
   Capture the approved model, the non-goals, the target user or account type, and any constraints around existing customers.
2. Define the offer architecture.
   Specify:
   - plans or tiers
   - included features and limits
   - upgrade triggers
   - downgrade behavior
   - trial or intro-offer behavior
   - grandfathering or migration rules
3. Define the entitlement model.
   Make clear:
   - what unlocks access
   - what is quota-based
   - what happens on expiration, cancellation, failed payment, or refund
   - which system is the source of truth for access
4. Map the user journey.
   Cover:
   - first paywall exposure
   - checkout or store flow
   - confirmation state
   - renewal or cancellation path
   - reactivation or win-back path
5. Add the measurement layer.
   Define the minimum analytics needed for:
   - activation before payment
   - paywall or checkout conversion
   - trial-to-paid or free-to-paid conversion
   - churn and retention
   - expansion or overage behavior
   - revenue guardrails
6. Build the rollout plan.
   Include:
   - internal QA
   - experiment or staged rollout shape
   - communication needs
   - migration safety for current users

## Output shape

- Monetization decision summary
- Plan and entitlement matrix
- Lifecycle and billing-state notes
- Paywall and conversion-flow requirements
- Instrumentation and experiment plan
- Rollout steps and risk controls

## Failure shields

- Do not ship pricing or paywall changes without an explicit entitlement model.
- Do not recommend billing migrations without stating impact on existing customers.
- Do not define success only in revenue terms; include activation, retention, and support-risk guardrails.
- If implementation depends on current platform billing behavior, verify the official docs first.
