# Information Organization Stack And Decision Guide

Use this reference when deciding how much structure a task actually needs.

## Core layers

### Structural

Use when the main problem is placement, boundaries, wayfinding, navigation, or folder layout.

Typical outputs:

- top-level sections
- collection boundaries
- folder hierarchy
- repository layout
- cross-link and navigation paths

### Descriptive

Use when the main problem is naming, search, filtering, grouping, or retrieval.

Typical outputs:

- naming conventions
- metadata fields
- document types
- controlled vocabularies
- tags and facets
- aliases and synonym maps

### Semantic

Use when the main problem is ambiguity of meaning, cross-system interoperability, or machine-readable relationships.

Typical outputs:

- identifiers
- entity and relationship definitions
- schemas
- mappings between vocabularies
- ontology or SKOS concept models

### Provenance And Governance

Use when authority, auditability, lifecycle, or trust matters.

Typical outputs:

- source-of-truth boundaries
- ownership rules
- version and retention rules
- provenance and derivation paths
- approval or review policies

### Operational

Use when the design must stay healthy over time.

Typical outputs:

- maintenance cadence
- update workflow
- review checklist
- templates
- migration plan

## Decision heuristics

- Use information architecture when the user cannot predict where something should live.
- Use content modeling when the structure is confused because core objects or states are unclear.
- Use taxonomy when one dominant hierarchy is useful.
- Use facets when multiple independent dimensions matter at once.
- Use controlled vocabulary when naming drift hurts retrieval or consistency.
- Use richer schema or ontology only when meaning must travel across systems or support automation and reasoning.
- Use provenance and governance when derived views, summaries, or AI outputs must stay anchored to authoritative records.

## Practical defaults

- Keep top-level groups few and clearly distinct.
- Prefer shallow-to-moderate depth over deep nesting.
- Separate source, generated, published, and archived material.
- Make file and document names interpretable outside their original folder.
- Prefer one stable preferred term plus aliases over many near-synonymous peers.
- Add complexity only when it reduces real friction or error.

