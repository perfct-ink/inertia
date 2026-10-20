---
branch: backlog/document-planning-summary
priority: p0
depends_on: [document-initiative-and-dates]
---
# Planning summary at the top of the document: initiative, dates, task progress and upcoming events

## Objective

Planning summary at the top of the document: initiative, dates, task progress and upcoming events

## Current state

Not present

## Requirements / notes

Reuses `HealthBadge` and the progress bar.

## Context

Section "Plan from a single document" of the retired shared backlog.

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

## Acceptance criteria

- Planning summary at the top of the document: initiative, dates, task progress and upcoming events works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch, stacked on `backlog/document-initiative-and-dates` (merge it first). Upcoming events are the document's folder's events, since events cannot yet point at a document. The pure logic tests pass in a stand-in runner. To verify the rest: `cd frontend && npm install && npm run lint && npm test`, then look at a planned document in a browser. Then remove this file and merge.
