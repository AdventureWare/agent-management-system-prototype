---
name: information-organization-implementation
description: Use when implementing or refactoring concrete information structures such as directory layouts, naming conventions, metadata fields, source-of-truth boundaries, documentation collections, and maintenance rules so they stay practical for both humans and software.
---

# Information Organization Implementation

## When to use this skill

- Use this skill when the user wants actual structural changes made, not just design advice.
- Use this skill when work involves creating or refactoring folders, repositories, documentation sets, naming conventions, metadata schemas, templates, or maintenance rules.
- Use this skill when an information system needs cleanup so it becomes easier to navigate, search, automate, or keep current.
- Use this skill after the major structural decisions are already known or can be determined quickly from context.
- If the main uncertainty is strategic or conceptual, use `$information-organization-design` first.

## Workflow

1. Inspect the current state.
   Read the existing layout, naming patterns, document types, metadata, and any conventions already in place before changing anything.
2. Identify canonical boundaries.
   Distinguish source material from summaries, generated output, published output, and archives.
3. Define the minimum viable target structure.
   Prefer the smallest change set that materially improves clarity, retrieval, and maintainability.
4. Apply conventions consistently.
   Use [references/implementation-checklist.md](references/implementation-checklist.md) for naming, folder, metadata, and provenance checks while editing.
5. Implement incrementally.
   Make changes in a way that preserves traceability and avoids breaking references, links, or downstream consumers without a migration path.
6. Update the maintenance surface.
   Add or revise templates, lightweight rules, or documentation so the structure does not decay immediately after the refactor.
7. Validate the result.
   Check that a newcomer can tell what belongs where, what is canonical, and how to recover from ambiguity.

## Output shapes

- updated folder structure
- naming convention
- metadata schema or frontmatter profile
- document-type template set
- source-of-truth and derivation rules
- migration or cleanup plan

## Failure shields

- Do not churn the structure without a concrete retrieval, maintenance, or trust benefit.
- Do not rename or move items so aggressively that existing links, references, or automation break without warning.
- Do not store generated output beside canonical source material unless the distinction stays explicit.
- Do not let metadata become an aspirational schema that nobody will actually maintain.
- Do not preserve every historical quirk when a smaller, sharper convention will do.

## Project notes

- Favor explicitness over cleverness. The structure should explain itself.
- Keep top-level directories few and functionally distinct.
- Use brief, machine-safe names that sort well and age well.
- Avoid relying on path alone to carry meaning. Important files should still be interpretable by name and metadata.
- Prefer stable fields and controlled values for status, type, owner, and lifecycle when those distinctions matter.
- For mixed human and AI use, keep derivations and dependencies visible instead of implicit.
