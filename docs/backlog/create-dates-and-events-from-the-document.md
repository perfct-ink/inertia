---
priority: p0
depends_on: []
---
# Create dates and events from the document

## Objective

**Create dates and events from the document**: type or pick a date inline (e.g. `@date` or `/event`), and it becomes a calendar event linked back to that spot

## Current state

Not present. `events` has `folder_id` but no `document_id`, so an event can't point at a document.

## Requirements / notes

Default: add `events.document_id` and an inline event node like the task item. Editing either side updates the other.

### Decisions (Alex, 2026-11-08 groom)

- **Dates, not events.** Picking or typing a date in a document makes a date chip linked to that spot, not a full calendar event. Every date chip still **shows on the calendar** (task calendar, `docs/features/task_calendar.md`), as an entry that links back to its place in the document. Changing the date on the calendar or in the document updates the other.
- **Deleting the line** (groom default, not answered): the calendar entry goes with it if it is only a date chip; a real event created separately is kept, unlinked.
- **Priority** stays p0 (not answered; left as is).

## Context

Section "Plan from a single document" of the retired shared backlog.

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

## Acceptance criteria

- Create dates and events from the document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
