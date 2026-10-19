# Releases

## What it does
`/releases` (sidebar rail "Releases") lists the Space's releases by date (undated last). A release is a single, EP, album or music video with a title and release date.
- **Songs**: add any ordinary document (sheets and Collections are excluded) with the "Add a song" picker, or remove it. A document can be in several releases (a single, then the album).
- **Tasks**: "Show tasks" lists every task from every song in the release, with its status and document; a task counts once even if its document is in several of the release's songs. The card shows done/total tasks and a progress bar.
- **Release plan**: "Create release plan" (needs a release date) adds the standard checklist for the kind, with due dates counted back from the date. Singles, EPs and albums get the music checklist (finish writing -120 days, record -100, mix -70, master -50, artwork -45, credits and metadata (ISRC, UPC) -42, upload to the distributor -28, pitch to streaming editorial -21, music video -14, promo and social -7, release day 0, follow-up +7); a music video gets a video checklist (script -45, shoot -30, edit -20, colour and sound -10, upload and schedule -3, premiere 0). Running it again adds nothing. Changing the release date moves every plan task, keeping its distance from the date. The tasks belong to the release (`tasks.release_id`), appear in its task list and counts, and survive if the release is deleted.
- Kind and date are editable on the card; the x deletes the release (its songs and tasks are untouched).

## API and models
`tasks.release_id` (nullable FK, nullified) and `tasks.release_offset_days` mark plan tasks; `POST /api/v1/releases/:id/plan` creates them (`ReleasePlan`, `Release#shift_plan_tasks`); 422 without a date. `releases` (`workspace_id`, `title`, `kind` enum single/ep/album/music_video, `release_date`) and `release_documents` (unique `release_id` + `document_id`; the document must be in the release's Space). `GET/POST /api/v1/releases`, `PATCH/DELETE /api/v1/releases/:id`, `GET /api/v1/releases/:id/tasks`, `POST /api/v1/releases/:id/documents` (`document_id`), `DELETE /api/v1/releases/:id/documents/:document_id`. Frontend: `api/releases.ts`, `data/release.ts`, `view/releases/ReleasesScreen.tsx`.

## Who can view and change
Scoped to the current Space through `WorkspaceScoped`; other Spaces' releases and documents are 404. I did not check role-based limits.

## Tests
`backend/test/models/release_test.rb`, `backend/test/models/release_plan_test.rb`, `backend/test/controllers/releases_controller_test.rb`, `frontend/src/data/release.test.ts`, `frontend/src/view/releases/ReleasesScreen.test.tsx`.

## Known limits
- Release dates do not appear on the Roadmap, Gantt or calendar. The plan's steps are fixed in code (`ReleasePlan`), not editable per release, and the same mechanism for other dated project types (events, launches) is not wired up yet. Moving a plan task's own due date by hand is overwritten the next time the release date changes.
- Songs are plain documents; a release can only hold documents, not folders or tracks with their own metadata (ISRC/UPC).
- No ordering of songs (track order) and no sharing.

## History
- Implemented 2026-10-19 on branch `backlog/releases`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
- Release plan added 2026-10-19 on branch `backlog/release-plan-worked-back-from-the-date`, stacked on `backlog/releases`. Not merged. Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run; `schema.rb` edited by hand.
