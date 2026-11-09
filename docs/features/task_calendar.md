# Calendar of tasks and events

## What it does
`/calendar` (sidebar rail "Calendar") is a month calendar of the Space. Tasks appear on their due date (finished ones struck through and dimmed), events on their date, and dates picked in documents (date chips, see [document_dates.md](document_dates.md)) on their day. Tasks, Events and Dates checkboxes hide each kind; the arrows move month to month; today is highlighted. On a phone-width screen the grid is replaced by a dated list of the month. Tasks without a due date are not shown. Tasks and events are read-only: edit them on the Workboard or the Events page.

A date entry is a link that opens its document at the chip (plain text once it was kept after its line was deleted) and has a pencil button that opens "Edit date" to change its day and label or delete it; the chip in the document changes with it.

## API and models
It reads `GET /api/v1/tasks`, `GET /api/v1/events` and `GET /api/v1/document_dates` (and changes dates through `PATCH`/`DELETE /api/v1/document_dates/:id`). `calendarItems` (`frontend/src/data/calendar.ts`) places them by date (tasks first, then events, then dates, each by title); screen `view/calendar/CalendarScreen.tsx`, edit dialog `components/DocumentDateEditDialog.tsx`.

## Who can view and change
Anyone in the Space can view. Only date entries can be changed here (by members who can write); tasks and events change nothing.

## Tests
`frontend/src/data/calendar.test.ts`, `frontend/src/view/calendar/CalendarScreen.test.tsx`, `frontend/src/components/DocumentDateEditDialog.test.tsx`.

## Known limits
- Whole Space only (no folder, assignee or sprint filter), month view only, no week or day view, and no drag-to-reschedule.
- A busy day shows every item in the cell (no "+N more"). Only date entries are links; task and event chips are not.
- Start dates are not shown: a task is a single mark on its due date.
- The Events page keeps its own month and list views; this page does not replace it.

## History
- Implemented 2026-10-19 on branch `backlog/calendar-view-of-tasks`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser (grid and phone list) were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Date entries from documents added 2026-11-09 on branch `backlog/create-dates-and-events-from-the-document` (Dates checkbox, links, edit dialog). Not merged or deployed; not run in a browser.
