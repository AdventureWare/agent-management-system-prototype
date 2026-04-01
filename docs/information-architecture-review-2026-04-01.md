# Information Architecture Review

Date: 2026-04-01
Project: Agent Management System Prototype

## Problem framing

The app already has a useful domain model, but the presentation layer still makes operators translate that model too often.

Current product reality:

- the daily operating loop is `Tasks -> Threads -> Runs`
- `Home` is an overview surface, not a primary editing surface
- `Projects`, `Goals`, and `Planning` provide context and prioritization
- `Workers`, `Roles`, and `Providers` define routing and execution capacity

The navigation should make that structure obvious at a glance.

## Current observations

### What is working

- The route model is stable and object-based.
- Collection pages generally act like directories rather than overloaded edit screens.
- Detail pages usually provide a clear back-link into the parent collection.
- User-facing copy already leans toward `thread` language even though storage and APIs still use `session`.

### Current IA problems

1. The old top-level buckets were too abstract.
   `Operate` and `Model` force the user to interpret internal framing before choosing a destination.

2. The app mixes runtime terminology.
   The route and API say `session`, while the product and UI increasingly mean `thread`.

3. Daily work and support structure were visually flattened.
   Core loop surfaces and support/configuration surfaces appeared at the same conceptual level.

4. Orientation is inconsistent across pages.
   Some pages use shared headers, some use custom top sections, and the app does not yet have one shared map of section roles.

5. Retrieval is local, not systemic.
   Search and filtering work inside collections, but the product has no cross-object retrieval layer yet.

## Content model

### Core work objects

- `Goal`: why the work exists
- `Task`: the unit of work to route and complete
- `Thread`: the reusable conversation/context container
- `Run`: one execution attempt against a thread
- `Artifact`: durable output or reference produced by work

### Supporting structure

- `Project`: workspace and repository defaults
- `Planning window`: scoped review of work commitments and capacity
- `Worker`: execution surface that can take work
- `Role`: routing contract between work and workers
- `Provider`: backend/runtime used by workers and threads

### Relationship model

- Goals contain or justify tasks.
- Tasks may reuse or attach to threads.
- Threads contain runs over time.
- Runs produce artifacts.
- Projects provide default context for goals, tasks, and threads.
- Workers, roles, and providers determine who can execute a task and how.

## Recommended top-level structure

### Overview

Purpose:
Cross-cutting system state and attention management.

Destinations:

- `Home`

### Work

Purpose:
The day-to-day operating loop.

Destinations:

- `Tasks`
- `Threads`
- `Runs`

### Context

Purpose:
Longer-lived structure that explains why work exists and how it should be planned.

Destinations:

- `Projects`
- `Goals`
- `Planning`

### Capacity

Purpose:
Routing, staffing, and runtime supply.

Destinations:

- `Workers`
- `Roles`
- `Providers`

## Navigation roles

### Global navigation

Use the sidebar only for stable, top-level destinations. It should answer:

- where the operator is in the product
- whether they are looking at work, context, or capacity
- what sibling surfaces exist nearby

### Collection pages

Collection pages should stay directory-first:

- search
- filter
- scan
- open one record

They should not become dense multi-object editing screens.

### Detail pages

Detail pages should be the canonical editing and inspection surface for one object.

Required orientation cues:

- clear back-link to the collection
- object title and status
- small set of summary facts
- action cluster tied to the current object

### Tabs

Tabs should remain local to one page or one object. They should not become a second global navigation system.

### Search and filters

Current collection-level search is appropriate for now. Longer term, add a lightweight global retrieval layer for:

- open task by title or id
- jump to active thread
- find the latest run tied to a task
- locate a worker, goal, or project quickly

## Label recommendations

- Keep the route `/app/sessions` for now, but use the label `Threads` in navigation and page copy.
- Treat `session` as storage/API language and `thread` as product language until a deeper rename is worth the migration cost.
- Keep `Runs` explicitly framed as execution attempts or ledger entries, not conversations.
- Keep `Workers`, `Roles`, and `Providers` distinct; do not collapse them into one generic infrastructure area because they answer different questions.

## Wayfinding and recovery recommendations

1. Keep `Home` positioned as overview, not as the place where users edit records.
2. Standardize section headers over time so collection and detail pages feel like one system.
3. Continue using back-links on detail pages; add breadcrumbs only if the hierarchy becomes truly nested.
4. Use empty states as recovery surfaces:
   direct users to the next useful destination, not just "no results."
5. Add more cross-links between related objects where appropriate:
   task -> thread, run -> task, goal -> project, worker -> provider.

## Recommended implementation plan

### Phase 1

Shipped in this pass:

- add a shared navigation model
- regroup sidebar destinations into `Overview`, `Work`, `Context`, and `Capacity`
- make the shell language reflect the real operating model

### Phase 2

Low-risk follow-up:

- standardize page headers around shared collection and detail patterns
- remove remaining user-facing `session` copy where `thread` is the correct concept
- tighten empty-state copy so every empty view points to the next useful action

### Phase 3

When the product needs more findability:

- add a global jump/search surface
- introduce saved views for task and run collections
- consider a cross-object activity feed only if it reduces switching, not if it duplicates `Home`

## Validation plan

Run quick tree-testing or moderated task checks against these prompts:

1. Find work that is currently blocked and decide where to intervene.
2. Resume prior context for a task without starting a fresh thread.
3. Check whether a failed run came from the wrong worker or provider.
4. Update project defaults for a repo before creating more tasks.
5. Review whether planned work fits within available worker capacity this week.

Signals to watch:

- hesitation before choosing a top-level destination
- wrong turns between tasks, threads, and runs
- confusion over `session` versus `thread`
- repeated returns to `Home` just to navigate elsewhere
