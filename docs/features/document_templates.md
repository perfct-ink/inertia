# Document templates

## What it does
"New Requirements Doc" and "New Song" buttons next to New Document / Sheet / Collection (`CreateItem`) create a document filled from a template and open it.
- **Requirements Doc**: Problem, Goals, User stories, Acceptance criteria, Out of scope, and a Tasks list.
- **Song**: Lyrics, Credits (writers, producers, performers), Key and BPM, Versions and stems, Metadata (ISRC, release date), and a Tasks list (write, record, mix, master, add credits and ISRC).
Task lines in a template follow the normal rules in [document_task_lines.md](document_task_lines.md): lines with text become Space tasks once the document is open. The Requirements Doc starts with one empty task line, so it creates none.

## API and models
No new endpoints: the template is TipTap JSON sent as `content` to `POST /api/v1/folders/:id/documents`, which already permits it. Templates live in `frontend/src/data/documentTemplate.ts`; `useNewDocument` takes an optional template.

## Who can view and change
Anyone who can create a document in the chosen folder.

## Web entry points
`CreateItem` (`frontend/src/components/CreateItem.tsx`).

## Tests
`frontend/src/data/documentTemplate.test.ts`, `frontend/src/components/CreateItem.test.tsx`.

## Known limits
- Templates are built in; users cannot save their own, and there is no template picker beyond the buttons.
- No PRD template (see `docs/backlog/prd-template-that-creates-tasks.md`).
- Song versions/stems are plain bullets; there are no structured fields yet.

## History
- Implemented 2026-10-19 on branch `backlog/requirements-template` (covers the requirements and song templates). Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules, no network).
