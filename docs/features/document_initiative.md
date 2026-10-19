# Document initiative and dates

## What it does
A document can name one initiative, from a bar under the editor toolbar: pick an existing initiative, create one by title, or clear it. With an initiative set, the bar edits that initiative's start and end date and shows "done/total tasks". Dates are the initiative's own, so they appear on the Roadmap and Gantt as for any initiative.
- Tasks in the document roll up to the initiative (`Initiative#tasks_count`, done count and percent): tasks under its epics plus tasks whose document names it, each counted once.
- Deleting the initiative clears the link on its documents.

## API and models
`documents.initiative_id` (nullable FK, `on_delete: :nullify`). `PATCH /api/v1/documents/:id` accepts `initiative_id`; `document.initiative_id` is in the document JSON. `Document` validates the initiative is in the document's Space (422 otherwise). Frontend: `components/DocumentInitiativeBar.tsx`, `api/documents.ts`.

## Who can view and change
Anyone who can write to the document; initiative edits use the normal initiative update call.

## Tests
`backend/test/models/document_initiative_test.rb`, `frontend/src/components/DocumentInitiativeBar.test.tsx`.

## Known limits
- Milestone rollups still count only epic-based initiative tasks; they do not include document tasks.
- The bar shows for every document type that uses `DocumentScreen`; sheets and Collections use other screens.
- No controller test for the new param.

## History
- Implemented 2026-10-19 on branch `backlog/document-initiative-and-dates`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser were not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
