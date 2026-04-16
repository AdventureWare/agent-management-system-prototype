---
name: monetization-gating-implementation
description: Use when implementing monetization enforcement in code. Helps place paywalls, feature gates, quota checks, server-side access checks, UI states, upgrade prompts, and tests so free and paid functionality are separated cleanly without fragile client-only logic.
---

# Monetization Gating Implementation

## When to use this skill

- Use this skill when code changes are needed to wall off premium functionality or limits.
- Use this skill when paywalls, upgrade prompts, quota checks, or entitlement guards need to be added or refactored.
- Use this skill when the system already has monetization rules and now needs clean implementation.

## Workflow

1. Read the current access model first.
   Identify:
   - where plan or entitlement state currently lives
   - where access checks already happen
   - whether free versus paid logic is duplicated or inconsistent
2. Map the gating points.
   For each protected capability, decide:
   - where the user first encounters the limit
   - where the actual protected action happens
   - where server-side enforcement must live
   - what should remain visible but locked versus fully hidden
3. Implement layered enforcement.
   Prefer:
   - UI gating for expectation-setting
   - server-side checks for real protection
   - shared helper functions only when they reduce inconsistency
   - explicit failure states and upgrade calls to action
4. Protect state transitions.
   Handle:
   - plan upgrade or downgrade
   - expired trial
   - quota exhaustion
   - admin versus member permission differences
   - stale client entitlement state
5. Add validation.
   Include:
   - happy-path paid access
   - blocked free access
   - edge states like expired or downgraded access
   - tests or QA steps for the guard path itself

## Output shape

- Current access-flow observations
- Gating points and enforcement plan
- Implementation notes by layer
- Edge-case handling
- Validation and regression checklist

## Failure shields

- Do not enforce premium access only in the UI.
- Do not scatter plan-name string checks across unrelated components.
- Do not add upgrade prompts without defining the blocked action and fallback behavior.
- If a shared entitlement helper would hide important behavior, keep checks explicit instead.
