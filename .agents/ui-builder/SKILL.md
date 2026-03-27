---
name: ui-builder
description: Use for implementing or refactoring meaningful UI in this repository: screen layout, hierarchy, spacing, responsive behavior, action priority, and shared-pattern reuse. Focus on mobile-first structure, design-system consistency, and visual review after coding.
---

# UI Builder

Use this skill for UI work where layout and structure matter, not just code
correctness.

Read `docs/ui-system.md` first, then follow `ui-house-style` for house-style
alignment.

## Workflow

1. Inspect the closest existing screen, shared component, and interaction
   pattern before coding.
2. Before implementation, briefly state:
   - the user goal
   - the main hierarchy
   - the primary action
   - how the layout behaves on mobile, tablet, and desktop
   - what larger screens are allowed to do better, not just how the layout
     compresses downward
3. Build mobile-first, then scale up with the repo's existing breakpoint
   patterns. If no local pattern is relevant, use Tailwind defaults
   consistently.
4. Reuse shared cards, lists, headers, form fields, and semantic `kw-` classes
   before adding one-off structure or styling.
5. Check empty, loading, error, disabled, and success states when the surface
   needs them.
6. Review the rendered result after implementation. Use screenshot or preview
   based review when feasible instead of trusting source alone.

## Responsive Defaults

- Default to a single-column flow on small screens.
- Introduce columns or split layouts only when they improve scan speed.
- Make desktop layouts feel intentionally designed, not like expanded mobile
  layouts with extra empty space.
- Avoid fixed widths when flexible tracks, `max-w-*`, or wrapping layouts work.
- Check intermediate widths, not just phone and large desktop extremes.
- Keep primary actions reachable without hover-only affordances.
- Make touch targets and spacing reasonable for mobile use.
- Use larger screens for meaningful gains such as parallel panels, stronger
  grouping, faster comparison, or clearer action placement when the feature
  benefits from them.

## Avoid

- starting to code before identifying hierarchy and reflow
- arbitrary spacing tweaks that do not match nearby patterns
- hover-only critical controls
- adding a new primitive when an existing one can be extended
- relying on source review alone when a rendered check is practical

## Notes

- If you touch `.svelte` files, also follow the repo's Svelte skills and run
  the Svelte autofixer before finishing.
- If a visual issue is subjective or needs product taste judgment, say so
  directly instead of pretending the code alone settles it.
