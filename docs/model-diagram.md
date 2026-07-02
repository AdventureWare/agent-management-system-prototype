# AMS Model Diagram

Date: 2026-07-01
Status: Draft, conceptual

This diagram is a lightweight review aid. It should make overlaps and relationship questions visible; it is not a database schema.

```mermaid
erDiagram
    PROJECT ||--o{ GOAL : contains
    PROJECT ||--o{ TASK : scopes
    PROJECT ||--o{ WORKFLOW : defines
    PROJECT ||--o{ DECISION : records

    GOAL ||--o{ GOAL : decomposes_into
    GOAL ||--o{ TASK : advanced_by

    TASK ||--o{ TASK : decomposes_or_depends
    TASK ||--o{ RUN : attempted_by
    TASK ||--o{ REVIEW : submitted_for
    TASK ||--o{ APPROVAL : gated_by
    TASK }o--o{ WORKFLOW : may_follow
    TASK }o--o{ ROLE : desires
    TASK }o--o{ EXECUTION_SURFACE : routed_to

    RUN ||--o{ REVIEW : provides_evidence_for
    RUN ||--o{ DECISION : may_inform
    REVIEW ||--o{ DECISION : may_record
    APPROVAL ||--o{ DECISION : may_record

    EXECUTION_SURFACE }o--|| PROVIDER : backed_by
    ROLE }o--o{ SKILL : may_use
```

Candidate or under-modeled concepts from `docs/domain-glossary.md` should be added only after a model change proposal accepts their representation.

