# Dates from a document

## What it does
Pick or type a date in a document and it becomes a **date chip** linked to that spot. It is a date, not a calendar event: it has a day and a label, no title, type, times or tasks (those stay on the Events page).

**Adding one** (in a document of type document):
- Type `@2026-12-01 ` (a real day, then a space): the chip is made at once.
- Type `/date ` or `@date ` (at the start of a line or after a space, so `me@date ` is left alone): a dialog "Add a date" opens with a date picker (today) and a label field. The trigger text is removed as you type the space.
- Or press the calendar-plus button in the toolbar ("Add a date (/date or @date)").
- The label is the text of the line the date is on (shortened to 120 characters), or the document's title when the line is empty. It is what the calendar shows; the dialog lets you change it first.

**The chip** shows a calendar icon and the day in the shared date picker (type a day or open the calendar with a click or the Down arrow). Changing it changes the calendar entry. If the entry is deleted the chip reads "Deleted date"; if it can't be loaded it says so with a Retry button. Only the entry's id is in the document, so a change made anywhere shows in the chip too.

**On the calendar** (`/calendar`, see `task_calendar.md`): every date chip is an entry with a "Dates" checkbox to hide them. The entry's text is a link that opens the document and scrolls to the chip, which is highlighted for 2 seconds (the heading-link mechanism, `#date%3D34` in the address). A pencil button on each entry opens "Edit date" (shared modal): change the day and label, or delete the entry. Changing the day there changes the chip in the document, and the other way round.

**Deleting the line:** when a line with a date chip is deleted from the document, a dialog (the shared modal) asks "Delete it from the calendar too?" with **Keep on the calendar** and **Delete from the calendar**. Keep leaves the entry on the calendar, unlinked: it is plain text there (no link) and can still be edited or deleted. Closing the dialog with Escape counts as Keep, the choice that loses nothing. Several chips removed together are asked about in one dialog. The question appears once the person has stopped typing (it runs after the document's 1.5 s save), so cutting a line and pasting it somewhere else does not trigger it; and only for the person who deleted it, not for collaborators who see the line vanish.

On a phone the dialogs fit a 375px screen, the picker is tap-only, the chip's field and the pencil button are taller to tap, and the calendar shows the month as a dated list.

## API and models
- `document_dates` (migration `20261108200001_create_document_dates.rb`): `workspace_id`, `document_id` (nullable FK to `documents`, nulled when the document is deleted), `folder_id` (nullable FK to `folders`, nulled when the folder is deleted), `date`, `label` (up to 255 characters), timestamps. `DocumentDate` validates the document and folder are in the same Space; the folder is the document's folder when not given, and follows the document when it moves to another folder.
- `GET /api/v1/document_dates` (the Space's dates by day, narrowed to the selected project like the events list; `?document_id=` returns that document's dates whatever project is selected), `GET /:id` (whatever project is selected: how a chip loads), `POST`, `PATCH` (`date`, `label`, or `document_id: null` to unlink; a date can't be moved to another document), `DELETE`. JSON: `id, date, label, document_id, document_title, folder_id`.
- In the document the chip is a `documentDate` node holding only `dateId` (`frontend/src/extensions/DocumentDate.tsx`, mirrored in `collab-server/src/schema.ts` and its test). Pieces: `components/editors/DocumentDateView.tsx` (the chip), `components/DocumentDateDialog.tsx` (add), `components/DocumentDateRemovedDialog.tsx` (the question), `components/DocumentDateEditDialog.tsx` (the calendar's edit), `hooks/useDateChips.ts` (adding and the removed-line check, used by `view/document/DocumentScreen.tsx`), `hooks/useDateLinks.ts` (`useScrollToDate`, built on `useScrollToTarget` in `hooks/useHeadingLinks.ts`, which `useScrollToHeading` now also uses), `api/documentDates.ts`, and the pure helpers in `data/documentDate.ts` (trigger, label, anchor, removed ids). The calendar's `calendarItems` (`data/calendar.ts`) places the entries.
- A deleted document leaves its dates on the calendar, unlinked. Moving a document or folder to another Space leaves its dates behind in the old Space, unlinked and out of any project (`SpaceTransfer`, see `space_transfer.md`); the chips left in the moved document read "Deleted date".

## Who can view and change
Anyone who can edit the document can add dates and change a chip; any member of the Space who can write (member role or above) can edit or delete an entry on the calendar. Reading is open to anyone in the Space. A date's label and the document's title are visible to the Space on the calendar.

## Tests
- Backend: `test/models/document_date_test.rb`, `test/controllers/document_dates_controller_test.rb` (create from a document, list and filter, change, unlink, delete, project narrowing, other Space rejected), `test/services/space_transfer_test.rb` (dates of a moved document and folder).
- Frontend: `data/documentDate.test.ts`, `data/calendar.test.ts`, `components/DocumentDateDialog.test.tsx`, `components/DocumentDateRemovedDialog.test.tsx`, `components/DocumentDateEditDialog.test.tsx`, `components/editors/DocumentDateView.test.tsx`, `hooks/useDateChips.test.tsx`, `hooks/useDateLinks.test.tsx`, `view/calendar/CalendarScreen.test.tsx`.
- Collab server: `test/schema.test.ts` (the node set and the chip's attribute).

## Known limits
- Typed dates are `@YYYY-MM-DD` only; there is no natural-language date ("next Friday").
- The calendar entry's label is a snapshot of the line when the date was added; editing the line later does not change it (edit it from the calendar).
- Undoing the deletion of a line after choosing Keep brings the chip back, but its entry stays unlinked (no link from the calendar) until it is added again. After choosing Delete the chip reads "Deleted date".
- A chip typed into the document's title heading is allowed; the title ignores it.
- Copying a document keeps its chips pointing at the same entries (shared within a Space, "Deleted date" in another Space).
- The "Delete it from the calendar too?" question is asked of the person who edited; if two people delete lines at the same moment the dialog can include dates the other person removed.
- The planning summary and project views don't show dates; the Events page doesn't list them (they are not events).
- Closing the dialog with Escape (keeps the entry) is not covered by an automated test: the offline Jest stand-in has no Escape handling for the dialog.

## History
- 2026-10-19 first built on branch `backlog/create-dates-and-events-from-the-document` as calendar *events* (`events.document_id` and a `documentEvent` node). Not merged.
- Reworked 2026-11-09 on the same branch, rebased onto main, to Alex's 2026-11-08 groom: dates, not events (that design, its migration and the two follow-up backlog tasks for it are dropped); calendar entries link back to the chip; changes sync both ways; deleting the line asks whether to delete the entry or keep it unlinked; priority p2. Not merged or deployed.
- Deploy order: the collab server (new `documentDate` node) must be deployed with, or before, the frontend, or documents that contain a chip will not sync.
- Not verified: no migration, Rails test, lint, type-check, real Jest run, collab-server test or browser check ran (no network, node_modules or database). Run offline: the static parse checks and the Jest stand-in for the frontend tests listed above. `schema.rb` was edited by hand.
