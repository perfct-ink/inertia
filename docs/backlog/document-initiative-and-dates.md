---
priority: p0
depends_on: []
components: [frontend]
---
# Set the document's initiative, with start and end date

## Objective

**Set the document's initiative, with start and end date**, from the document itself (a header field or a block at the top)

## Current state

Not present. `initiatives` has `start_date` and `target_date` but no link to documents; initiatives are only made on the Initiatives page.

## Requirements / notes

Default: a document can create or pick one initiative. Its tasks and events roll up to it, and its dates show on the Roadmap and Gantt. Pairs with feature folders (`feature-folder-type.md`, `feature-hierarchy.md`), where a feature document plays the same role.

## Context

Section "Plan from a single document" of the retired shared backlog.

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

## Acceptance criteria

- Set the document's initiative, with start and end date works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
