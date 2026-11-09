---
branch: backlog/create-dates-and-events-from-the-document
status: incomplete
priority: p2
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
- **Deleting the line:** ask the user. When a line with a date or event is deleted from the document, a dialog asks whether to delete the calendar entry too or keep it (unlinked). Use the shared modal, not `confirm()`.
- **Priority:** lowered to p2.

## Context

Section "Plan from a single document" of the retired shared backlog.

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

## Acceptance criteria

- Create dates and events from the document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built to the 2026-11-08 groom (dates, not events) on this branch, rebased onto main 2026-11-09; the earlier events design (`events.document_id`, a `documentEvent` node, and its two follow-up tasks) is dropped. Feature doc: `docs/features/document_dates.md`; `task_calendar.md`, `space_transfer.md` and `heading_links.md` updated. Choices made without Alex, all conservative: the table is a new `document_dates` (not `events`), so dates never show on the Events page or in event rollups; the calendar entry's label is the line's text when added (editable from the calendar); the dialog for a deleted line is asked after the document's 1.5 s save and only of the person who edited, and Escape counts as "keep"; a deleted document, folder or Space move leaves entries on the calendar, unlinked; `/event` is not a trigger (`/date`, `@date` and `@YYYY-MM-DD` are).

Ran (offline): the static parse checks (babel, sass, `ruby -c`), the pure data tests (`data/documentDate.test.ts`, `data/calendar.test.ts`), and the Jest stand-in for `DocumentDateDialog`, `DocumentDateRemovedDialog`, `DocumentDateEditDialog`, `DocumentDateView`, `useDateChips`, `useDateLinks` and `CalendarScreen` tests (all pass); the existing `useHeadingLinks.test.tsx` (reworked hook) also passes in the stand-in with the heading extension stubbed. Did not run (no network, node_modules or database): `rails db:migrate`, `rails test`, `npm run lint`, `tsc -b`, the real Jest run, the collab-server tests, the Mac build (not touched), a browser check. `backend/db/schema.rb` was edited by hand (migration `20261108200001`); the Escape-closes-the-dialog behaviour has no automated test.

To verify:

```bash
cd backend && rails db:migrate && git diff db/schema.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
cd collab-server && npm install && npm test
```

Then in a browser, light and dark, desktop and 375px wide: in a document type `@2026-12-01 ` (a chip appears), `/date ` and `@date ` (the dialog opens, pick a day with the keyboard and the mouse), and use the toolbar button; change the chip's day and see it on `/calendar`; on the calendar click the entry (it opens the document and flashes the chip), use the pencil to change the day and label and check the chip follows, and delete one (the chip reads "Deleted date"); delete a line with a chip and answer both "Keep on the calendar" (entry stays, plain text, no link) and "Delete from the calendar"; press Escape on the question (keeps); cut a line with a chip and paste it elsewhere (no question); check a second collaborator sees the chip and gets no question. Deploy the collab server (`collab-server/src/schema.ts` gained the `documentDate` node) with or before the frontend. Merge hazards: `DocumentScreen.tsx` (an icon, a hook call, one extension, two dialogs, one line in `onUpdate` and in the save callback), `hooks/useHeadingLinks.ts` (the scroll logic moved into `useScrollToTarget`), `view/calendar/CalendarScreen.tsx`, `data/calendar.ts`, `collab-server/src/schema.ts`, `backend/db/schema.rb` (version `2026_11_08_200001`), `space_transfer.rb`, `config/routes.rb`.
