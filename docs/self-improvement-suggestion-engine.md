# Self-Improvement Suggestion Engine Direction

Date: 2026-04-02
Project: Agent Management System Prototype
Status: Research-backed direction note for the next planning pass

## What this note is for

This note answers a specific product question:

How should the prototype evolve from "it can surface opportunities" into "it can recommend the most useful next improvements, tasks, and knowledge work under real constraints, and get better over time"?

This is not a generic recommender-system proposal. It is scoped to the current product shape:

- a task-and-thread execution control plane
- explicit goals, projects, workers, runs, reviews, and planning context
- governed self-improvement, not silent autonomy

## Current repo truth

The current prototype already has the beginnings of a suggestion engine:

- `src/lib/server/self-improvement.ts`
  - derives opportunities from failed runs, blocked tasks, stale tasks, review feedback, thread reuse gaps, and planning gaps
- `src/lib/server/self-improvement-store.ts`
  - persists opportunity state, saved knowledge items, and manually captured suggestions
- `src/lib/server/self-improvement-knowledge.ts`
  - retrieves relevant lessons for a task using lightweight lexical and project-aware matching
- `src/lib/server/task-thread-suggestions.ts`
  - ranks reusable thread candidates for a task
- `src/lib/server/planning.ts`
  - computes planning scope, capacity rollups, and eligible worker hints

The current system is already strong at candidate generation.

The weak point is policy quality:

- it does not yet rank opportunities by expected impact versus effort
- it does not yet learn systematically from accept/dismiss/create-task outcomes
- it does not yet separate immediate operator feedback from delayed downstream results
- it does not yet log enough recommendation-policy data to evaluate better ranking strategies safely

## Research takeaways that matter here

### 1. This is a multi-objective recommendation problem, not a single-score prediction problem

Real recommendation systems usually cannot optimize one metric in isolation. They must balance multiple competing objectives, including short-term and long-term outcomes, stakeholder tradeoffs, and interface-level behavior.

Implication for this repo:

- the engine should not optimize only for "accepted suggestion rate"
- it should balance:
  - expected operator value
  - goal advancement
  - reduced failure/staleness/blocking
  - worker and planning constraints
  - review and governance risk
  - suggestion diversity so the system does not tunnel on one pattern

For this product, "good" suggestions are the ones that increase useful completed work with low oversight cost, not merely the ones most likely to get clicked.

### 2. Candidate generation and ranking should stay separate

Contextual bandit and recommender research consistently assumes a separation between:

- candidate generation
- policy selection or ranking
- logged feedback and evaluation

Implication for this repo:

- keep current opportunity detection logic as the candidate layer
- add a separate ranking policy layer instead of rewriting the detectors
- treat candidate generation as recall-oriented and policy ranking as precision-oriented

This fits the current codebase cleanly because `self-improvement.ts` already acts like a candidate generator.

### 3. Learning from feedback requires explicit logging of what was shown and why

Bandit and offline-evaluation work is useful here because the engine will eventually need to learn from human decisions without shipping unsafe changes blindly. That requires logging the shown candidate set, chosen ordering, policy version, and enough scoring context to replay and compare alternative policies later.

Implication for this repo:

- every surfaced suggestion should create an impression record
- the system should log:
  - candidate ids shown
  - ordering and scores
  - policy version
  - exploration probability or propensity when stochastic ranking is used
  - scope context such as project, goal, worker availability, and backlog state

Without this, later "learning" will mostly be anecdotal.

### 4. Immediate feedback and delayed outcomes must be modeled separately

Recommendation systems often deal with delayed rewards. A suggestion that looks good immediately may fail to produce long-term value, and a suggestion that is initially ignored may later be revealed as correct when constraints change.

Implication for this repo:

- split signals into:
  - immediate feedback: viewed, accepted, dismissed, task created, knowledge item created, snoozed
  - delayed outcomes: task completed, blocker cleared, run failure rate reduced, stale-work count reduced, review churn reduced, goal regained momentum

Do not collapse these into one label.

### 5. Human-centered control is part of the system quality, not decoration

Human-AI guidance from Microsoft and Google PAIR is directly relevant here:

- explain what the system can and cannot do
- support efficient dismissal
- communicate how feedback will help and when it will matter
- allow user control and reset
- calibrate trust with explanations and confidence, especially when the model is uncertain

Implication for this repo:

- each suggestion should explain:
  - why it appeared
  - what evidence supports it
  - what tradeoff it is optimizing for
  - whether the system expects immediate or longer-term benefit
- dismissal reasons should be structured enough to teach the system something
- the operator should be able to downrank a source, mute a pattern temporarily, or reset personalization

### 6. Exploration is necessary, but it must be governed

Contextual bandit methods are attractive because they learn which suggestions work in which contexts while still exploring some alternatives. But unmanaged exploration can degrade operator trust or overload the queue with low-value ideas.

Implication for this repo:

- start with deterministic ranking
- later introduce bounded exploration only in low-risk suggestion classes
- never explore by auto-applying behavioral changes
- exploration should affect suggestion ordering, not silent mutations

### 7. Pure popularity or acceptance optimization will create bad loops

Research on recommender objectives and popularity bias is a warning here. If the engine learns only from what gets accepted fastest, it will overproduce safe, familiar, locally legible suggestions and underproduce deeper but valuable system work.

Implication for this repo:

- maintain source/category diversity in the ranked list
- evaluate impact after completion, not just initial acceptance
- distinguish "easy to accept" from "valuable after execution"

## Recommended product model

The right model for this prototype is:

1. Generate candidate suggestions from explicit operational signals.
2. Score them using transparent multi-factor features.
3. Rank them with a policy that can later learn from outcomes.
4. Show explanations and collect structured human feedback.
5. Measure whether accepted suggestions improved the system.

This is closer to a governed recommendation policy than to an autonomous planner.

## Suggested system shape

### Layer 1. Candidate generation

Use the existing candidate sources and add a few more only when needed:

- failed runs
- blocked tasks
- stale tasks
- review feedback
- thread reuse gaps
- planning gaps
- manually captured suggestions
- later: idle capacity gaps, repeated handoff churn, skill debt, repeated attachment/context misses

Design rule:

- broad recall is fine here
- ranking should decide what rises, not the detector

### Layer 2. Context and feature assembly

Build a stable feature snapshot for each candidate at ranking time.

Useful feature families:

- scope:
  - project id
  - goal id
  - goal lane and status
  - project maturity or activity level
- urgency:
  - blocker presence
  - stale-work severity
  - review backlog
  - target-date proximity
- impact proxy:
  - number of affected tasks/runs/sessions
  - affected goal criticality
  - repeated occurrence count
  - recent recurrence velocity
- effort proxy:
  - suggested task size
  - dependency depth
  - required worker scarcity
  - missing context or artifact burden
- confidence:
  - evidence count
  - data freshness
  - known project scope
  - prior operator agreement with similar suggestions
- diversity and coverage:
  - source/category saturation in current queue
  - whether this project or goal has been underserved recently
- outcome history:
  - similar suggestion acceptance rate
  - similar suggestion completion rate
  - downstream outcome lift for similar accepted suggestions

Most of these features already have natural homes in the repo. They should be computed explicitly rather than hidden inside prompt text.

### Layer 3. Ranking policy

Use three stages over time.

#### Stage A. Transparent heuristic scorer

Start with a rule-based weighted score:

- expected impact
- urgency
- confidence
- cost/effort penalty
- diversity adjustment
- capacity and governance constraints

This is the right first production step because the current system lacks the exposure logs needed for robust learning.

#### Stage B. Supervised reranker

Once enough logged decisions exist, train a simple reranker from historical examples:

- positive labels:
  - accepted suggestion
  - created task or knowledge item
  - accepted suggestion that later produced a positive delayed outcome
- negative labels:
  - dismissed
  - ignored repeatedly
  - accepted but later produced no measurable benefit

Keep the model interpretable at first:

- logistic regression
- gradient-boosted trees
- monotonic features where appropriate

The first learned model should rerank the heuristic output, not replace candidate generation.

#### Stage C. Contextual bandit reranking

When the system has reliable impression logging and offline replay data, add bounded contextual exploration:

- use bandit-style reranking for top-N ordering among otherwise plausible candidates
- keep deterministic fallbacks for high-risk categories
- log propensities so policies can be evaluated offline before wider rollout

This is the point where the engine can genuinely improve from ongoing use instead of only from periodic retraining.

### Layer 4. Feedback capture

Capture more than accept/dismiss.

Recommended feedback events:

- impression logged
- opened detail
- created task
- created knowledge item
- accepted without task creation
- dismissed with reason
- snoozed
- asked for more like this
- asked for less like this
- marked wrong scope
- marked duplicate
- marked low value
- marked bad timing

Recommended dismissal reasons:

- duplicate of existing work
- not impactful enough
- wrong project or goal
- blocked by missing prerequisite
- good idea, wrong timing
- already captured elsewhere
- low confidence or weak evidence

These labels are much more useful than a single thumbs-down.

### Layer 5. Outcome measurement

Track outcome windows explicitly.

Examples:

- 24 hours:
  - was a task or knowledge item created?
  - did the operator acknowledge the suggestion?
- 7 days:
  - did linked blocked or stale work improve?
  - did a suggested task move to in progress or done?
- 30 days:
  - did similar failures decline?
  - did review churn decline?
  - did thread reuse improve?
  - did planning gaps close faster?

The system should gradually learn from outcome windows, not just from immediate clicks.

## Proposed data model additions

The current self-improvement store is close, but it needs recommendation-policy records.

Add explicit records such as:

- `SuggestionCandidateSnapshot`
  - candidate id, source, category, feature snapshot, rank-time timestamp
- `SuggestionImpression`
  - impression id, candidate ids shown, ordered rank, policy version, explanation payload, propensity
- `SuggestionDecision`
  - accepted, dismissed, snoozed, ignored, created task, created knowledge item, dismissal reason
- `SuggestionOutcome`
  - outcome window, measured metrics, benefit estimate, completion status
- `SuggestionPolicyVersion`
  - policy name, version, scoring config, enabled exploration mode
- `SuggestionPattern`
  - grouped lineage for "similar suggestions" so the system can learn across repeated cases

This should live alongside self-improvement data, not in free-form transcripts.

## Repo-oriented implementation plan

### Phase 1. Make ranking explicit

Goal:

- replace implicit ordering with an explicit transparent scorer

Concrete repo direction:

- keep `src/lib/server/self-improvement.ts` as the candidate generator
- add a new server module such as `src/lib/server/self-improvement-suggestion-policy.ts`
- introduce a `rankSelfImprovementOpportunities()` step that:
  - computes feature snapshots
  - applies weighted scoring
  - returns explanations alongside scores

Also:

- extend `/app/improvements` to show score rationale and structured dismiss reasons
- persist suggestion impressions and decisions in the self-improvement store

### Phase 2. Unify suggestion inputs across surfaces

Goal:

- make suggestions feel like one system instead of unrelated local heuristics

Concrete repo direction:

- factor shared suggestion primitives so:
  - self-improvement opportunities
  - task knowledge retrieval
  - thread reuse suggestions
  - planning-gap suggestions
    all use a compatible ranking vocabulary

This does not mean one monolithic model. It means shared concepts:

- candidate
- scope
- evidence
- confidence
- impact proxy
- effort proxy
- feedback
- outcome

### Phase 3. Add learning-ready logging

Goal:

- make offline evaluation possible before model learning

Concrete repo direction:

- store the ranked candidate list shown on `/app/improvements`
- log policy version and feature snapshot
- record what the operator did next
- define delayed-outcome jobs or snapshots that annotate prior impressions with later results

Until this exists, do not claim the engine is self-improving in a statistical sense.

### Phase 4. Train the first reranker

Goal:

- learn better prioritization from historical decisions and outcomes

Concrete repo direction:

- export training rows from the self-improvement store
- start with a simple reranker outside the request path
- keep the heuristic policy as fallback and comparator
- compare policies offline first

Recommended first-label strategy:

- train on accepted-plus-beneficial versus dismissed-or-non-beneficial
- treat immediate acceptance as weak signal
- treat delayed positive outcomes as stronger signal

### Phase 5. Add bounded contextual exploration

Goal:

- learn which suggestion patterns work in which contexts

Concrete repo direction:

- use exploration only in low-risk queue ordering
- keep high-risk or governance-heavy categories deterministic
- add a policy flag so exploration can be disabled instantly

Examples of low-risk exploration:

- ordering among medium-severity suggestions
- whether to emphasize knowledge capture versus task creation for repeated patterns

Examples of high-risk areas that should stay governed:

- auto-creating tasks without review
- auto-updating skills or routing rules
- auto-dismissing operator-visible issues

## What to measure

Primary metrics:

- accepted suggestions that lead to completed useful work
- reduction in stale-task volume
- reduction in blocked-task recurrence
- reduction in repeated run failures
- faster restoration of goal momentum after planning gaps
- operator time saved per accepted suggestion

Guardrail metrics:

- suggestion spam rate
- duplicate suggestion rate
- operator dismissal rate by reason
- low-confidence suggestion exposure rate
- time-to-dismiss for bad suggestions
- source/category diversity in top-ranked results

Do not ship a learned policy judged only by click-through or acceptance rate.

## Recommended first scoring formula

Before any learning, use a score shaped roughly like:

`score = impact + urgency + confidence + strategic_alignment - effort - governance_risk + diversity_adjustment`

Where:

- `impact` is based on affected work, recurrence, and goal criticality
- `urgency` is based on blockers, staleness, deadlines, and queue health
- `confidence` reflects evidence quality and known scope
- `strategic_alignment` reflects goal priority, planning priority, and operator focus
- `effort` penalizes expensive or dependency-heavy suggestions
- `governance_risk` penalizes high-risk recommendations without strong evidence
- `diversity_adjustment` prevents the list from collapsing into one source or project

This is intentionally inspectable. The system needs trust before cleverness.

## Why this direction fits the prototype

This prototype is not trying to recommend movies or ads. It is trying to recommend useful system work inside an explicit operational model.

That means the best near-term direction is:

- explicit signals over hidden embeddings
- inspectable ranking over opaque autonomy
- outcome measurement over "AI feeling smart"
- human-guided learning over silent behavioral mutation

The engine should become better at selecting and sequencing worthwhile improvement work, not better at generating more suggestions.

## Recommended next build slice

If this note becomes implementation work, the next slice should be:

1. Add a transparent opportunity-ranking module.
2. Persist suggestion impressions and structured decisions.
3. Add explanation fields and dismissal reasons in `/app/improvements`.
4. Add delayed-outcome annotations for accepted suggestions.
5. Evaluate a heuristic policy against historical replay before training any model.

That is the smallest path that moves the system from "opportunity surfacing" toward an actual learning suggestion engine.

## Sources

External research and design references:

- Microsoft Research, "Guidelines for Human-AI Interaction": https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/
- Microsoft Research Blog, "Guidelines for human-AI interaction design": https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/
- Google PAIR, "People + AI Guidebook": https://pair.withgoogle.com/guidebook-v2/
- Google PAIR, "Explainability + Trust": https://pair.withgoogle.com/chapter/explainability-trust/
- Google PAIR, "Feedback + Control": https://pair.withgoogle.com/chapter/feedback-controls/
- Li, Chu, Langford, Schapire, "A Contextual-Bandit Approach to Personalized News Article Recommendation" (Microsoft Research, WWW 2010): https://www.microsoft.com/en-us/research/publication/a-contextual-bandit-approach-to-personalized-news-article-recommendation-3/
- Li, Chu, Langford, Wang, "Unbiased Offline Evaluation of Contextual-bandit-based News Article Recommendation Algorithms" (Microsoft Research, WSDM 2011): https://www.microsoft.com/en-us/research/?p=687597
- Saito et al., "Open Bandit Dataset and Pipeline" / OBP project: https://github.com/st-tech/zr-obp
- Jannach and Abdollahpouri, "A survey on multi-objective recommender systems": https://pmc.ncbi.nlm.nih.gov/articles/PMC10073543/
- Google Research, "Handling many conversions per click in modeling delayed feedback": https://research.google/pubs/handling-many-conversions-per-click-in-modeling-delayed-feedback/

Local repo references:

- `docs/self-improvement-system.md`
- `docs/planning-system.md`
- `docs/current-product-surfaces.md`
- `src/lib/server/self-improvement.ts`
- `src/lib/server/self-improvement-store.ts`
- `src/lib/server/self-improvement-knowledge.ts`
- `src/lib/server/task-thread-suggestions.ts`
- `src/lib/server/planning.ts`
