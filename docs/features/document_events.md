# Events from a document

## What it does
In a document, press "Add an event" in the toolbar (or type `/event ` followed by a space) to add a calendar event without leaving the page. A dialog asks for a title, a date and a type (milestone or deadline); the event is created and appears in the text as a chip with a calendar icon, its current title and a date field. Changing the date in the chip changes the event on the calendar, and renaming or moving the event elsewhere updates the chip, because the chip is a live view of the event. If the event is deleted, the chip reads "Deleted event". The event is created in the document's folder, so folder calendars show it, and it remembers the document it came from.

## API and models
`events.document_id` (nullable FK, nullified if the document is deleted; validated to the same Space), accepted on `POST/PATCH /api/v1/events`, returned in the event JSON, and filterable with `GET /api/v1/events?document_id=`. In the document content the chip is a `documentEvent` node holding only `eventId` (`frontend/src/extensions/DocumentEvent.tsx`, mirrored in `collab-server/src/schema.ts` and its schema test). Components: `DocumentEventView`, `DocumentEventDialog`; helper `documentEventPayload` in `data/documentEvent.ts`.

## Who can view and change
Anyone who can edit the document can add events and change a chip's date; the event follows the normal calendar rules.

## Tests
`backend/test/models/event_document_test.rb`, `backend/test/controllers/events_document_controller_test.rb`, `frontend/src/data/documentEvent.test.ts` (stand-in runner: pass), `components/DocumentEventDialog.test.tsx`. The node view and the `/event` input rule have no tests.

## Known limits
- `@date` is not wired; only the toolbar button and `/event `. Title edits happen on the Events page, not in the chip.
- Deleting the chip from the text leaves the event on the calendar (it is not asked about).
- The collab server must be deployed with the new node before documents containing chips sync.
- The planning summary's "upcoming events" ([document_initiative.md](document_initiative.md) once merged) still matches events by folder; it could use `document_id`.

## History
- Implemented 2026-10-19 on branch `backlog/create-dates-and-events-from-the-document`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, component test, the collab-server schema test and the browser did not run (no database, no frontend node_modules, no vitest); `schema.rb` edited by hand.
