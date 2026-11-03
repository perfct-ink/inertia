# Projects

## What it does
A folder is either a plain folder or a project (`folders.kind`). A project is a folder that holds the documents, files, collections, tasks and events for one piece of work, including those in its subfolders.
- **Space home** (`/space`, the Projects rail button at the top of the sidebar): the Projects page. `/projects` redirects there. While a new user's getting-started steps are active, `/space` shows those instead.
- **Projects page**: one card per active project, sorted by name, with its file count, last update, a link to the folder page, the list of files inside (subfolders included) and a create menu that adds items to that project. "New project" asks for a name and creates a folder with `kind: project`.
- **Project page** (`/folders/:id`): the folder page, whose Overview lists the project's documents, files and collections and its tasks, epics and upcoming events, subfolders included (`GET /api/v1/folders/:id/contents`).
- **Sidebar tree**: right-click menu on any folder shows "Make Project", or "Make Folder" on a project (`file-manager/FolderItem.tsx`). Projects show a project icon.
- **All files** shows a project icon next to files that sit inside a project (see `all_files.md`).

## API and models
`folders.kind` integer, default 0: enum `folder: 0`, `project: 1` (`backend/app/models/folder.rb`). `kind` is permitted on `POST` and `PATCH /api/v1/folders`. The document Root cannot be made a project (validation error "cannot make the document root a project"). Pure helpers `projectsOf`, `documentsIn`, `projectLastModified` are in `frontend/src/data/folder.ts`.

## Who can view and change
Scoped to the current Space. I did not check role-based limits on changing `kind`.

## Web entry points
`frontend/src/view/workspace/WorkspaceScreen.tsx` (home: projects, or getting started), `frontend/src/view/projects/ProjectsScreen.tsx`; sidebar folder menu.

## Tests
`backend/test/models/folder_test.rb` ("a folder can be a project, but the document root cannot"), `frontend/src/data/folder.test.ts`, `frontend/src/view/projects/ProjectsScreen.test.tsx` (lists projects with nested docs; creates a project), `frontend/src/view/workspace/WorkspaceScreen.test.tsx` (home shows projects, or getting started for a new user).

## Known limits
- Only two kinds exist; there are no project types or templates.
- Tasks and events can still sit outside any project (at the Space root); the Space-wide Tasks and Events pages show them.
- Nested projects are listed flat (each active project appears on its own).
- The "Make Project" menu entry has no test.

## History
- 2026-11-03: Projects became the Space home page; the old welcome screen with Documents/Tasks/Events links was removed.
- Implemented 2026-10-15 to 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests, migration and the screens were not run (no dependencies installed, no network).
