---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/retrospective-board-template
status: incomplete
---
# Retrospective board template

## Objective

Retrospective board template

## Context

Section "Agile" of the retired shared backlog.

## Acceptance criteria

- Retrospective board template works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built, not verified on a real stack (the sandbox has no database, `node_modules` or network), so this branch is `Backlog-Status: incomplete` and the task file stays until the checks below pass.

**Done.** The spec is one line, so "Retrospective board template" was read as a real board: a template (went well / to improve / actions, start / stop / continue, 4 Ls, mad / sad / glad) picks the columns of a board where Space members add cards, vote (anonymous counts, one vote per person per card) and turn action items into backlog tasks in the board's project. Boards are project items (`folder_id`, like sprints) and show in the rail under Planning. Tables `retrospectives`, `retro_cards`, `retro_votes` (migrations `20261108290001` to `20261108290003`, `schema.rb` edited by hand), models, blueprints, four controllers and routes, Minitest tests, the data file, API classes, two views, Jest tests, the feature doc `docs/features/retrospective_boards.md`, its README row, and a note in `projects.md`. Follow-ups (drag, vote limits, reveal mode, grouping) are in `docs/backlog/retrospective-drag-vote-limits-and-reveal.md`.

**Decisions for Alex.** Votes are anonymous and any member may edit or delete any card (no per-author limits, like the rest of the app). The four templates are fixed in code and do not depend on the document templates or on `backlog/project-types`; their shape (`key`, `label`, `description`, `columns`) is close to a project type's so a type could later name one. Deleting a card asks first.

**Ran (offline).** `ruby -c` on every changed Ruby file; the pure data tests; the component suites (`RetrospectiveBoardScreen`, `RetrospectivesScreen`, `SidebarRail`) through the Jest stand-in (its Radix dialog is a stub); a Sass compile; the static import/JSX checks (`/tmp/runner/all.sh`).

**Did not run.** `rails db:migrate` and the Rails tests (including the new model and controller tests), RuboCop, Brakeman, `npm run lint`, the TypeScript type-check, the real `npm test`, and a browser check.

**To verify and merge.**
```bash
cd backend && rails db:migrate   # then diff db/schema.rb against the committed one (three tables, indexes, foreign keys, version)
cd backend && rails test && bin/rubocop && bin/brakeman
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```
Then open `/retrospectives` in a browser with a project open: create a board from each template (with and without a sprint), add cards, vote from two accounts, move a card, delete a card, create a task from an action item (it should appear on the project's Tasks page), delete the board. Check it at 375px and desktop, in light and dark.

**Merge hazards.** `backend/db/schema.rb` (keep the higher `version:` line and all tables), `backend/config/routes.rb`, `docs/features/README.md` (rows are appended at the end; keep both), `frontend/src/components/file-manager/projectSections.ts` and `frontend/src/App.tsx` (one line and one route pair each).
