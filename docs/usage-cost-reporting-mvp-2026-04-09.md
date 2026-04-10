# Minimum Viable Usage and Cost Reporting Slice

Date: 2026-04-09
Project: Agent Management System Prototype

## Problem framing

The prototype can launch, resume, and inspect AI work, but it still makes routing decisions mostly blind.

An operator can see:

- which task ran
- which provider or execution surface was used
- whether the run finished or failed

The operator cannot yet see:

- how large the run was
- roughly what it cost
- whether one provider or model is materially more expensive for the same kind of work
- whether retries and failures are quietly burning spend

The smallest useful slice is not full billing or chargeback. It is a thin reporting layer that makes usage and rough cost visible enough to answer one practical question:

Should the next run stay on this route, or should it be rerouted to a cheaper or better-fitting provider, model, or worker?

## Current system observations

- The core operator loop is already `task -> thread -> run`.
- `Runs` is already the execution ledger and is the natural reporting backbone.
- `Task detail` is where routing and launch decisions already happen.
- `Home` is the fast-scan operator dashboard.
- Managed Codex run logs already contain provider-reported usage payloads in `turn.completed` lines, including `input_tokens`, `cached_input_tokens`, and `output_tokens`.
- The app does not currently parse or persist that usage data into the run model.
- Providers already store `defaultModel` and execution metadata, but not pricing metadata.

This is a good fit for an incremental extension of the existing run and provider records. It does not require a separate analytics subsystem.

## Constraints

- Keep the slice inside the existing task, thread, run, provider model.
- Prefer provider-reported usage over trying to reconstruct token counts from prompts.
- Keep the first pass legible and easy to audit.
- Do not design for exact billing reconciliation yet.
- Do not add a new top-level reporting surface before the main workflow surfaces can use the data.

## Options

### Option A: Manual operator estimates only

Structure:

- record provider and model
- let the operator infer cost from model choice and run count

Tradeoffs:

- lowest implementation cost
- too weak to inform routing decisions
- hides expensive failures and long-context runs

Assessment:

- too thin to be useful

### Option B: Provider-reported usage plus list-price cost derivation

Structure:

- capture raw token usage from managed run logs
- store pricing metadata on providers by model
- derive rough per-run cost from usage x configured rates
- show rollups on the surfaces where routing already happens

Tradeoffs:

- small implementation footprint
- good enough for relative routing decisions
- not exact billing, especially if pricing changes or provider invoices include other adjustments

Assessment:

- best MVP slice

### Option C: Full billing and observability layer

Structure:

- normalized usage events
- invoice reconciliation
- per-turn tracing
- budget alerts
- team or project chargeback

Tradeoffs:

- stronger long-term foundation
- much higher schema, UI, and maintenance cost
- distracts from the current prototype's real operating loop

Assessment:

- later

## Recommendation

Use Option B.

The MVP should capture raw usage on each managed run, derive a rough run cost from provider-side model pricing, and expose the first rollups on `Home`, `Runs`, and `Task detail`.

That is enough to reveal:

- which providers and models are expensive
- which tasks or threads are accumulating spend through retries
- whether failures are consuming disproportionate cost
- whether a route is getting cheaper on follow-up because cache usage is high

It is also small enough to fit the current codebase without creating a second reporting architecture.

## Minimum runtime capture

Capture these fields on every managed run when the provider reports them:

- `modelUsed`
  The actual model used for the run. Default to the thread or provider default when the runner config set it explicitly.
- `usageSource`
  `provider_reported | missing`
- `inputTokens`
- `cachedInputTokens`
- `outputTokens`
- `uncachedInputTokens`
  Derived as `max(inputTokens - cachedInputTokens, 0)`.
- `usageCapturedAt`
  Usually the time the `turn.completed` line is parsed.
- `estimatedCostUsd`
  Derived field, nullable when pricing or usage is missing.
- `costSource`
  `configured_model_pricing | missing_pricing | missing_usage`
- `pricingVersion`
  A small string or timestamp copied from provider pricing metadata so historical runs remain interpretable after price edits.

Do not create a separate usage-events table in the MVP. Add these fields onto the existing `Run` record.

The run already carries enough routing context to make rollups useful:

- `taskId`
- `agentThreadId`
- `providerId`
- `executionSurfaceId`
- `status`
- `startedAt`
- `endedAt`

That means cost can immediately be grouped by task, thread, provider, execution surface, and status.

## How rough cost should be derived

Add a small pricing map to each provider, keyed by model name.

Minimum pricing shape:

- `model`
- `inputUsdPer1M`
- `cachedInputUsdPer1M`
- `outputUsdPer1M`
- `pricingVersion`
- `updatedAt`

Rough run cost formula:

`estimatedCostUsd = (uncachedInputTokens / 1_000_000 * inputUsdPer1M) + (cachedInputTokens / 1_000_000 * cachedInputUsdPer1M) + (outputTokens / 1_000_000 * outputUsdPer1M)`

Why this is the right level of roughness:

- token counts come from the provider output already emitted into the run log
- price lookup is explicit and operator-editable
- cached input is broken out separately, which matters for long thread follow-ups
- the number is directionally good enough for routing, even if it is not invoice-accurate

If usage is missing:

- leave `estimatedCostUsd` null
- show `Cost unavailable`
- do not backfill with prompt-length token guesses in the MVP

If pricing is missing:

- still store usage
- mark the run as `missing_pricing`
- surface that gap on the provider and reporting views

## First rollups

### 1. Home

Job:

- give the operator an immediate sense of current burn and waste

Minimum rollups:

- spend in the last 24 hours
- spend in the last 7 days
- percent of spend tied to failed or canceled runs in the last 7 days
- a short "highest recent cost" list showing run, task, provider or model, status, and cost

Why this surface first:

- it matches the product principle that visibility should be cheap
- it lets the operator notice cost drift without opening a detail page

### 2. Runs

Job:

- act as the source-of-truth audit table for usage and cost

Minimum additions:

- model column
- token summary column
- estimated cost column
- cache ratio indicator
- duration or wall-clock time if available
- filters for provider, model, status, and a cost-present versus cost-missing state

Minimum rollups at the top of the page:

- visible spend
- visible tokens
- completed-run cost
- attention-run cost

Why this surface first:

- the data already centers on runs
- operators need one place to compare routes directly

### 3. Task detail

Job:

- inform the next routing decision where the operator actually launches or reroutes work

Minimum additions:

- task-to-date spend
- last run cost and model
- recent run cost trend across this task's related runs
- a simple routing note when recent failed runs have already consumed meaningful spend

Why `Task detail` instead of `Thread detail` in the first pass:

- routing decisions are made from the task execution panel
- this is where the operator chooses whether to continue, retry, or switch context
- thread-level rollups can come later from the same stored fields

## Smallest product behavior that makes this useful

The MVP is successful if an operator can do all of the following without opening logs:

1. See that a run used a specific model and approximately what it cost.
2. See whether a task has already consumed multiple expensive retries.
3. Compare recent cost and failure patterns across providers or models in the runs ledger.
4. Notice when a provider is producing usage without pricing metadata, or vice versa.

## What should not be in this MVP

- exact invoice reconciliation
- per-user chargeback
- budget enforcement or auto-stop rules
- cross-provider normalization beyond configured model pricing
- prompt-text token estimation fallback
- a separate analytics warehouse or top-level finance page
- deep thread-level or goal-level spend dashboards before run and task views are working

## Implementation plan

### Phase 1: Data model and ingestion

- Extend `Run` with usage and rough cost fields.
- Extend `Provider` with model pricing metadata and a pricing version field.
- Parse the latest `turn.completed.usage` payload from managed run logs or summary generation.
- Persist usage and derived cost onto the related run record.

### Phase 2: Rollups on existing surfaces

- Add top-level spend cards and a short expensive-run list to `Home`.
- Add model, tokens, cache ratio, and cost to `Runs`.
- Add recent task spend context to `Task detail`.

### Phase 3: Routing-oriented polish

- Add a lightweight routing hint when a task's recent route is high-cost and low-success.
- Add provider-level missing-pricing warnings so operators can finish setup.

## Main risks

- Pricing drift makes historical cost comparisons noisy if past runs are silently recalculated against new prices.
- Imported or unmanaged threads may not have usage data, which can create mixed-quality reporting.
- Operators may over-trust rough cost as exact billing.

## Risk handling

- Copy `pricingVersion` onto the run when cost is derived.
- Label values as `Estimated cost`.
- Keep raw token counts visible next to the estimated dollar value.
- Treat unmanaged or missing-usage runs as partial coverage, not silent zeros.

## Bottom line

The minimum viable slice is:

- capture provider-reported token usage on each managed run
- derive rough per-run cost from explicit provider model pricing
- show first rollups on `Home`, `Runs`, and `Task detail`

That is the smallest change set that makes usage and cost visible enough to improve routing decisions without turning the prototype into a billing product.
