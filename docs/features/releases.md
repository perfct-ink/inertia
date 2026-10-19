# Releases

## What it does
`/releases` (sidebar rail "Releases") lists the Space's releases by date (undated last). A release is a single, EP, album or music video with a title and release date.
- **Songs**: add any ordinary document (sheets and Collections are excluded) with the "Add a song" picker, or remove it. A document can be in several releases (a single, then the album).
- **Tasks**: "Show tasks" lists every task from every song in the release, with its status and document; a task counts once even if its document is in several of the release's songs. The card shows done/total tasks and a progress bar.
- Kind and date are editable on the card; the x deletes the release (its songs and tasks are untouched).

## API and models
`releases` (`workspace_id`, `title`, `kind` enum single/ep/album/music_video, `release_date`) and `release_documents` (unique `release_id` + `document_id`; the document must be in the release's Space). `GET/POST /api/v1/releases`, `PATCH/DELETE /api/v1/releases/:id`, `GET /api/v1/releases/:id/tasks`, `POST /api/v1/releases/:id/documents` (`document_id`), `DELETE /api/v1/releases/:id/documents/:document_id`. Frontend: `api/releases.ts`, `data/release.ts`, `view/releases/ReleasesScreen.tsx`.

## Who can view and change
Scoped to the current Space through `WorkspaceScoped`; other Spaces' releases and documents are 404. I did not check role-based limits.

## Tests
`backend/test/models/release_test.rb`, `backend/test/controllers/releases_controller_test.rb`, `frontend/src/data/release.test.ts`, `frontend/src/view/releases/ReleasesScreen.test.tsx`.

## Known limits
- Release dates do not appear on the Roadmap, Gantt or calendar, and there is no release plan worked back from the date (`docs/backlog/release-plan-worked-back-from-the-date.md`).
- Songs are plain documents; a release can only hold documents, not folders or tracks with their own metadata (ISRC/UPC).
- No ordering of songs (track order) and no sharing.

## History
- Implemented 2026-10-19 on branch `backlog/releases`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
