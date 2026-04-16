---
name: information-organization-design
description: Use when designing or auditing information organization for documents, directories, repositories, knowledge bases, business records, or personal systems so the structure stays clear, maintainable, and usable by both humans and software.
---

# Information Organization Design

## When to use this skill

- Use this skill when the user needs to design, review, or refactor an information structure rather than only write or code within an existing one.
- Use this skill when the task involves folder hierarchies, documentation sets, knowledge bases, taxonomies, metadata schemes, naming systems, or source-of-truth boundaries.
- Use this skill when a system must work well for both people and machines, including search, filtering, automation, or AI consumption.
- Use this skill when the hard part is deciding how information should be grouped, named, related, or governed over time.
- Do not use this skill when the task is only about visual UI layout or low-level software architecture with no information-organization question.

## Workflow

1. Frame the organizing problem.
   Identify the users, tasks, decisions, and questions the structure must support.
2. Inventory the artifacts and objects.
   List what is being organized: documents, notes, entities, records, datasets, views, generated output, or working files.
3. Separate source from derivative.
   Define which artifacts are canonical, which are summaries or exports, and where provenance must be preserved.
4. Choose the right organizing layers.
   Use [references/stack-and-decision-guide.md](references/stack-and-decision-guide.md) to decide how much of the solution is structural, descriptive, semantic, provenance, or operational.
5. Design the structure.
   Propose the top-level groups, boundaries, navigation paths, or directory layout around stable concepts and recurring tasks rather than org charts or temporary initiatives.
6. Design the retrieval layer.
   Define naming rules, metadata fields, controlled terms, tags, facets, and aliases so search and filtering reinforce the same structure.
7. Add semantic and governance depth only where needed.
   Introduce identifiers, mappings, schemas, provenance, lifecycle rules, or richer ontology only when they solve a real ambiguity, interoperability, or trust problem.
8. Pressure-test maintainability.
   Check whether the scheme scales, survives growth, avoids duplication, and stays legible when viewed by a human, an indexer, or an AI system.

## Output shapes

- information architecture brief
- content model
- folder or repository organization proposal
- taxonomy and metadata design
- source-of-truth map
- governance and maintenance checklist

## Failure shields

- Do not collapse structure, metadata, and ontology into one vague recommendation.
- Do not mirror team boundaries when the user problem is really task flow or retrieval.
- Do not recommend a full ontology when a taxonomy plus metadata is enough.
- Do not rely on folder placement alone when names, metadata, or provenance carry critical meaning.
- Do not optimize for theoretical completeness over long-term usability.

## Project notes

- Treat information organization as a stack: structure, naming, metadata, semantics, provenance, and maintenance.
- Prefer stable concepts over temporary campaigns, teams, or implementation details.
- If a single hierarchy keeps breaking under exceptions, consider facets instead of forcing everything into one tree.
- If the main confusion is "where does this go?" the problem is structural.
- If the main confusion is "what do we call this?" the problem is vocabulary.
- If different systems or agents disagree about meaning, the problem is semantic or provenance-related.
- When the task moves from design into concrete moves, conventions, templates, or migrations, switch to `$information-organization-implementation`.
