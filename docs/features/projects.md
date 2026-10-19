# Projects

## What it does
A folder is either a plain folder or a project (`folders.kind`). A project is a folder that groups the docs, sheets and collections for one piece of work, including those in its subfolders.
- **Projects page** (`/projects`): one card per active project, sorted by name, with its file count, last update, a link to the folder page, the list of files inside (subfolders included) and a create menu that adds items to that project. "New project" asks for a name and creates a folder with `kind: project`.
- **Sidebar tree**: right-click menu on any folder shows "Make Project", or "Make Folder" on a project (`file-manager/FolderItem.tsx`). Projects show a project icon.
- **All files** shows a project icon next to files that sit inside a project (see `all_files.md`).

## API and models
`folders.kind` integer, default 0: enum `folder: 0`, `project: 1` (`backend/app/models/folder.rb`). `kind` is permitted on `POST` and `PATCH /api/v1/folders`. The document Root cannot be made a project (validation error "cannot make the document root a project"). Pure helpers `projectsOf`, `documentsIn`, `projectLastModified` are in `frontend/src/data/folder.ts`.

## Who can view and change
Scoped to the current Space. I did not check role-based limits on changing `kind`.

## Web entry points
`frontend/src/view/projects/ProjectsScreen.tsx`; sidebar folder menu.

## Tests
`backend/test/models/folder_test.rb` ("a folder can be a project, but the document root cannot"), `frontend/src/data/folder.test.ts`, `frontend/src/view/projects/ProjectsScreen.test.tsx` (lists projects with nested docs; creates a project).

## Known limits
- Only two kinds exist; there are no project types or templates.
- Nested projects are listed flat (each active project appears on its own).
- The "Make Project" menu entry has no test.

## History
- Implemented 2026-10-15 to 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests, migration and the screens were not run (no dependencies installed, no network).
