---
priority: p1
depends_on: []
branch: backlog/move-or-copy-content-between-spaces
---
# Move or copy content between Spaces

## Objective

Move or copy content between Spaces

## Requirements / notes

A document stays in its Space today.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Move or copy content between Spaces works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Implemented on branch `backlog/move-or-copy-content-between-spaces` but not verified: this machine had no network, `node_modules`, database or Rails. The feature is described in `docs/features/space_transfer.md`; this file stays until the branch is merged (then delete it).

**Done:** documents, sheets, Collections and folders (projects) can be moved or copied into a folder of another Space from the sidebar menus (`POST /api/v1/documents/:id/copy|move`, `POST /api/v1/folders/:id/copy|move`, `GET /api/v1/workspaces/:id/folders`), with a dialog (`TransferDialog`), the `SpaceTransfer` service, backend and frontend tests, docs. No migration and no `schema.rb` change.

**Checks run:** `ruby -c` on every changed `.rb`; the pure `SpaceTransfer.remap_task_ids` function exercised with `ruby`; `/tmp/runner/all.sh` (static import/identifier checks of changed TypeScript, SCSS compile, YAML/JSON parse); the frontend data tests (`data/folder`, `data/workspace`, `data/transfer`) with the offline jest shim.

**Checks not run:** `rails test` (the new `backend/test/services/space_transfer_test.rb` and `backend/test/controllers/space_transfer_controller_test.rb` were written blind against the models, never executed), `npm run lint`, `tsc`, `npm test` (including `TransferDialog.test.tsx`), and the screens in a browser.

**To verify and merge:**

```sh
cd backend && rails test test/services/space_transfer_test.rb test/controllers/space_transfer_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
```

Then in the web app with two Spaces: right-click (and tap the ⋮ button at 375px) a document and a folder, choose Move to Space… and Copy to Space…, check the dialog in light and dark mode, that a move closes the open page, and that "Open in <Space>" switches Space. Check a document with checklist lines (tasks follow it) and a pair of linked Collections (moving one alone is refused; moving or copying their folder works).

**Decisions for Alex (the conservative option is built):**
- Viewers cannot copy or move content out of a Space (the same `member` role as editing is required in the source as well as the destination). Letting viewers copy out is a one-line change.
- A move keeps public share links to the document working; a copy has none.
- A move deletes the AI runs of moved tasks and removes their dependencies and event links, and clears epic, sprint and milestone (nothing in the new Space can own them). A folder with tasks, events, epics or milestones attached to it directly is refused rather than silently detaching them (`docs/backlog/move-folder-attached-records-between-spaces.md`).

**Merge hazards:** edits shared files `backend/config/routes.rb`, `documents_controller.rb`, `folders_controller.rb`, `workspaces_controller.rb`, `frontend/src/components/file-manager/FolderItem.tsx` and `Sidebar.tsx` (one import and one element), `frontend/src/store/tabs.ts`, `frontend/src/types/index.ts`, `frontend/src/api/workspaces.ts` (role helpers moved to `data/workspace.ts` and re-exported), `docs/spaces.md` and `docs/features/README.md`. No migration.
