---
name: source-triangulation
description: Use when the main research challenge is finding reputable sources, ranking evidence quality, checking recency, and validating whether important claims are supported by more than one credible source.
---

# Source Triangulation

## When to use this skill

- Use this skill when the user wants high-signal information instead of content-farm summary.
- Use this skill when claims need to be verified across multiple reputable sources.
- Use this skill when source quality, recency, or legitimacy is more important than broad coverage.
- Use this skill when a topic mixes data, expert opinion, and marketing claims and needs sorting.

## Workflow

1. Define the claim or question precisely.
   If the question is vague, source quality comparisons will stay fuzzy too.
2. Rank source types before gathering details.
   Prefer, in order when available:
   - primary research or original data
   - official standards, documentation, filings, and institutional reports
   - reputable domain experts with clear methods
   - high-quality secondary synthesis
   - commentary or anecdotal discussion only as supporting context
3. Check recency and context.
   For unstable topics, verify that the source is current enough for the claim being made.
4. Triangulate the key claims.
   Look for agreement, disagreement, and missing support across independent credible sources.
5. Score evidence strength.
   Label each important claim as strong, moderate, weak, disputed, or unsupported.
6. End with a short trust judgment.
   State which sources the user should rely on most, which should be treated carefully, and what gaps remain.

## Output shape

- research question
- source shortlist with rationale
- key claims and support level
- disagreements or caveats
- recommendation on what to trust most

## Failure shields

- Do not treat polished writing as evidence quality.
- Do not use one source to verify itself.
- Do not ignore methodology, incentives, or source-of-truth boundaries.
- If the best available evidence is weak, say that directly instead of manufacturing confidence.
