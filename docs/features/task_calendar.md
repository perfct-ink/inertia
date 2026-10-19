# Calendar of tasks and events

## What it does
`/calendar` (sidebar rail "Calendar") is a month calendar of the Space. Tasks appear on their due date (finished ones struck through and dimmed), events on their date. Tasks and Events checkboxes hide either kind; the arrows move month to month; today is highlighted. On a phone-width screen the grid is replaced by a dated list of the month. Tasks without a due date are not shown. Items are read-only: edit them on the Workboard or the Events page.

## API and models
None: it reads `GET /api/v1/tasks` and `GET /api/v1/events`. `calendarItems` (`frontend/src/data/calendar.ts`) places them by date (tasks first, then events, each by title); screen `view/calendar/CalendarScreen.tsx`.

## Who can view and change
Anyone in the Space can view; nothing here changes data.

## Tests
`frontend/src/data/calendar.test.ts`, `frontend/src/view/calendar/CalendarScreen.test.tsx`.

## Known limits
- Whole Space only (no folder, assignee or sprint filter), month view only, no week or day view, and no drag-to-reschedule.
- A busy day shows every item in the cell (no "+N more"), and chips are not links.
- Start dates are not shown: a task is a single mark on its due date.
- The Events page keeps its own month and list views; this page does not replace it.

## History
- Implemented 2026-10-19 on branch `backlog/calendar-view-of-tasks`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser (grid and phone list) were not run (no node_modules).
