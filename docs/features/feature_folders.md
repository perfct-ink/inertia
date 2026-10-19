# Feature folders

## What it does
A folder can be flagged as a feature folder (`folders.kind = feature`), the container for feature requirement docs. In the sidebar, a folder's right-click menu offers "Make Feature Folder" (or "Make Folder" to undo); feature folders get a layers icon. Nesting, sharing and archiving work as for any folder.

## API and models
`folders.kind` is now `folder: 0`, `project: 1`, `feature: 2`; no migration (integer column). `kind` is permitted on `PATCH /api/v1/folders/:id`. The document Root cannot be made a project or a feature folder. Frontend helper: `featureFoldersOf` in `frontend/src/data/folder.ts`.

## Who can view and change
Same as folders; I did not check role limits on changing `kind`.

## Tests
`backend/test/models/folder_test.rb` (feature folder, Root protection), `frontend/src/data/folder.test.ts`.

## Known limits
- Only the flag exists. Features inside the folder, task creation from a feature doc and the rollup are separate backlog tasks (`feature-hierarchy`, `create-tasks-from-a-feature-doc`, `project-folder-rollup`).
- The menu entry has no component test.

## History
- Implemented 2026-10-19 on branch `backlog/feature-folder-type`. Not merged or deployed.
- Not verified: Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules).
