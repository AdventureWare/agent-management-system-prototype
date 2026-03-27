---
name: ui-house-style
description: Repo-local UI guidance for building Kwipoo screens that feel intentional, consistent, and not AI-generic. Use when creating, editing, or reviewing UI in this project.
---

# UI House Style

Use this skill for any Kwipoo UI task.

Read `docs/ui-system.md` first. That document is the durable source of truth.

Your job is to keep UI work aligned with the app's actual house style instead of
producing generic component-library output.

## Core Rules

- prefer clarity over novelty
- prefer system primitives over raw utility styling
- prefer a small number of reusable patterns over one-off layouts
- avoid visual drift across routes
- do not introduce "AI slop" styling

## What Counts As AI Slop Here

- random gradients, glows, or glass effects
- arbitrary mixes of radius, shadows, and spacing
- generic dashboard cards with no product meaning
- raw Tailwind palette colors in feature code when a semantic token should exist
- decorative typography outside intentional brand moments
- layouts that look copied from a template instead of fitting the inventory app

## Required Workflow

1. Identify the user goal for the screen.
2. Pick the closest existing page shape from `docs/ui-system.md`.
3. Reuse shared components and semantic classes first.
4. If a needed style concept is missing, add or extend a semantic primitive.
5. Keep copy short, specific, and product-grounded.

## Design Defaults

- use shared `kw-` semantic classes for type, panels, status, and loading states
- use theme roles instead of raw color classes
- reserve display typography for explicit brand moments
- keep hierarchy visible with one main headline and one primary action
- prefer object-first layouts that map cleanly to things, places, sets, and events

## Review Questions

- Is the layout immediately understandable?
- Does it reuse existing patterns?
- Does it still look like Kwipoo without icons or illustrations?
- Would another developer know what primitive to reuse next?

## Implementation Notes

- If you touch `.svelte` files, also follow the repo's Svelte skills and run the
  Svelte autofixer before finishing.
- If a screen needs a stronger visual treatment, make it more intentional, not
  more decorated.
- When in doubt, simplify the structure before adjusting the styling.
