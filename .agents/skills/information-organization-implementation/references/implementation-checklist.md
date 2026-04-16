# Information Organization Implementation Checklist

Use this checklist while making concrete structural changes.

## Folder And Collection Structure

- Are the top-level groups few and clearly distinct?
- Does each folder or collection have one primary organizing principle?
- Are source, generated, published, and archived artifacts separated clearly enough?
- Is the hierarchy shallow enough that people can predict paths without memorizing them?

## Naming

- Are names brief, specific, and machine-safe?
- Would the file or folder still make sense if copied outside its current path?
- Are dates, versions, and status markers used only where they improve sorting or retrieval?
- Are near-synonyms collapsing into one preferred term instead of drifting apart?

## Metadata And Types

- Are the key fields explicit for high-value artifacts such as type, status, owner, date, and source?
- Are controlled values defined where inconsistent free text would create drift?
- Is the schema small enough that people will actually maintain it?

## Source Of Truth And Provenance

- Can a reader tell which artifact is canonical?
- Can a reader tell which artifacts are summaries, exports, or generated derivatives?
- Is there a visible path back from compressed views to underlying records when needed?
- Are ownership and update responsibilities clear enough to avoid silent drift?

## Maintenance

- Did the refactor leave behind a concise rule set, template, or example?
- Are there known breaking references or links that need migration?
- Is there a review cadence or owner for the highest-value areas?
- Will this structure still make sense after the next obvious growth step?

