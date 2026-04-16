---
name: saas-financial-modeling
description: Use when building, reviewing, or maintaining driver-based SaaS financial models for revenue, cost-to-serve, payment fees, taxes, margins, burn, runway, and scenario planning. Helps translate pricing, product architecture, growth assumptions, and operating costs into explicit unit economics and forecast models without drifting into bookkeeping or unsourced tax advice.
---

# SaaS Financial Modeling

## When to use this skill

- Use this skill when the user needs a SaaS financial model created, repaired, extended, or pressure-tested.
- Use this skill when the question is about expected costs, gross margin, contribution margin, fees, taxes, CAC payback, LTV, burn, runway, or scale breakpoints.
- Use this skill when pricing, plan mix, or stack choices need to be reflected in an explicit model rather than discussed loosely.
- Do not use this skill for bookkeeping close, GAAP-compliant financial statements, audit work, or jurisdiction-specific tax or legal advice.

## Workflow

1. Define the modeling objective before choosing formulas.
   Capture:
   - the decision the model needs to support
   - time horizon and cadence
   - unit of account: user, customer, seat, workspace, transaction, or usage unit
   - whether the model is cash, accrual-planning, or unit-economics oriented
2. Build the driver tree.
   Make the model explicit about:
   - acquisition and conversion assumptions
   - pricing, plan mix, expansion, contraction, and churn
   - fixed versus variable costs
   - stack-dependent costs such as hosting, model APIs, storage, bandwidth, and support load
   - payment processing, app-store or marketplace fees, refunds, and chargebacks
   - taxes or compliance costs that materially change margins
3. Keep assumptions separate from formulas and outputs.
   - Inputs should be easy to inspect and update.
   - Unstable values such as vendor pricing, processor fees, and tax rates should be sourced and dated.
   - If current rates matter, verify them with current official sources instead of relying on memory.
4. Model scale behavior honestly.
   - Show what changes with volume versus what stays step-fixed.
   - Call out threshold effects such as plan upgrades, headcount steps, committed spend, or infra breakpoints.
   - Avoid pretending every cost is perfectly linear.
5. Produce scenario and sensitivity views.
   Include at minimum:
   - base case
   - downside case
   - upside case
   - 2-4 key sensitivities such as churn, conversion, ARPU, infra cost, payment fees, or support burden
6. End with decision-ready outputs.
   Report only the outputs that matter for the decision:
   - MRR or ARR
   - gross margin and contribution margin
   - CAC payback or LTV to CAC when acquisition inputs exist
   - burn and runway when operating-cost inputs exist
   - the few assumptions that dominate the result

## Reference

- When you need a standard checklist of SaaS model inputs and outputs, read [references/saas-model-components.md](references/saas-model-components.md).
- If the user wants the model implemented in a sheet, use the `spreadsheet` skill if it is available.

## Output shape

- Modeling objective and scope
- Driver map and major assumptions
- Revenue logic
- Cost, fee, and tax logic
- Scenario and sensitivity summary
- Key outputs and decision implications
- Open risks, missing inputs, and what to validate next

## Failure shields

- Do not mix strategy questions with model mechanics; if the real question is pricing-model choice, involve monetization strategy work explicitly.
- Do not hide critical assumptions inside formulas.
- Do not mix fixed costs, variable costs, and financing effects into one vague margin number.
- Do not present jurisdiction-specific tax treatment or accounting treatment as settled if it has not been verified.
- Do not give a single-point forecast without showing the assumptions that dominate it.
