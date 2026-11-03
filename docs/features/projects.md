# Projects

## What it does
Inside a Space are projects. A project is a folder (`folders.kind: project`) that holds the documents, files, collections, tasks, events and planning records for one piece of work, including those in its subfolders.
- **Space home** (`/space`): the Projects page. `/projects` redirects there. While a new user's getting-started steps are active, `/space` shows those instead.
- **Projects page**: one card per active project, sorted by name, with its icon (click it to change it), file count, last update, a link to the project page, the files inside (subfolders included) and a create menu that adds items to the project. "New project" asks for a name and creates a folder with `kind: project`.
- **Sidebar** (`file-manager/ProjectNav.tsx`): a flat list of the Space's projects, which never expands or collapses, with buttons for All files (which closes the open project, so it lists the whole Space), archived folders and projects (with Unarchive), Project requests and New project. Nothing but projects shows there; files outside any project are reached through All files. Selecting a project replaces the list with that project: a dropdown like the Space switcher (the project's icon and name; it lists the projects to switch to, with New project, Change icon and All projects), then two tabs. **Files** has a toolbar (New document, New sheet, New Collection, New folder) that creates in the project and opens the new item, then lists its documents, sheets, Collections and uploaded files, subfolders included (or "No files yet."). **Pages** lists its pages. The tab that opens first is the one holding the page you're on: a document or subfolder opens Files, the Overview or a page opens Pages. The pages are not indented and are grouped under headings that don't collapse:
  - Overview, All files, My work
  - **Tasks**: Tasks, Task table, Pivot, Calendar, Events
  - **Planning**: Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy
  - **Goals**: OKRs, Objectives map, Ideas
  - **Delivery**: Releases, Resources
- **Every page is per-project.** The open project is remembered (`store/projects.ts`, like the current Space) and sent with every API call as `X-Project-Id` (`lib/api.ts`). The list endpoints return only that project's records, its subfolders included, and new records are filed in it. Opening a folder or document inside a project opens that project. Switching project resets the cached lists except the Space tree. Switching Space or signing out forgets the open project, and a project that is archived, deleted or made a plain folder is closed.
- **Icon**: pick one of 24 emojis, type any emoji, or upload an image (it goes through `POST /api/v1/uploads`). An image wins over an emoji; with neither, the default project icon shows (`components/project/`).
- **Project page** (`/folders/:id`): the folder page, whose Overview lists the project's documents, files and collections and its tasks, epics and upcoming events, subfolders included (`GET /api/v1/folders/:id/contents`).
- **Sidebar tree**: right-click menu on any folder shows "Make Project", or "Make Folder" on a project (`file-manager/FolderItem.tsx`).
- **All files** opens filtered to the open project (see `all_files.md`).

## API and models
- `folders.kind` integer, default 0: enum `folder: 0`, `project: 1`, `feature: 2` (`backend/app/models/folder.rb`). The document Root cannot be made a project.
- `folders.icon` (string, up to 16 characters) and `folders.image_url` (a `http(s)://` or `/` address), permitted on `PATCH /api/v1/folders/:id` and returned by `FolderBlueprint`.
- `X-Project-Id` header, read by the `ProjectScoped` controller concern. A folder in another Space is a 404. It narrows `GET` on tasks (through their folder or their document's folder), events, epics, milestones, initiatives, sprints, ideas, io_nodes, releases, objectives and resource_allocations. On `POST` to those, a record that names no folder is filed in the project. Single-record reads and updates ignore it. A promoted idea passes its project to the epic or initiative it becomes.
- `folder_id` (nullable, the database nullifies it when the folder is deleted) was added to initiatives, sprints, ideas, io_nodes, releases and objectives through the `ProjectItem` model concern, which also rejects a folder from another Space. Epics, events, milestones, tasks and resource allocations already had one. Migration `20261103120001_add_projects_to_planning_items`.
- Pure helpers `projectsOf`, `projectOf`, `folderOfDocument`, `documentsIn`, `projectLastModified` are in `frontend/src/data/folder.ts`, and `projectIconOf` and the emoji list in `frontend/src/data/project.ts`.

## Who can view and change
Scoped to the current Space; writes need the member role, like the rest of the Space. I did not check role-based limits on changing `kind` or the icon.

## Web entry points
`frontend/src/view/workspace/WorkspaceScreen.tsx` (home: projects, or getting started), `frontend/src/view/projects/ProjectsScreen.tsx`, `frontend/src/components/file-manager/ProjectNav.tsx`, `frontend/src/components/project/ProjectIconDialog.tsx`; sidebar folder menu.

## Tests
- `backend/test/controllers/project_scoping_test.rb`: lists hold only the project's records, subfolders included; tasks through a document; new records filed in the project; a promoted idea keeps its project; another Space's folder is a 404; icon and image saved, a `javascript:` address rejected.
- `backend/test/models/folder_test.rb` ("a folder can be a project, but the document root cannot").
- `frontend/src/components/file-manager/ProjectNav.test.tsx`: the list is flat and has no other files; All files and archived items; selecting a project shows Files and Pages tabs, opening on the right one; the Files toolbar creates in the project; the dropdown switches project and All projects returns to the list; opening a document inside a project opens it.
- `frontend/src/lib/api.test.ts` (the header, and sign-out forgets the project), `frontend/src/data/project.test.ts`, `frontend/src/data/folder.test.ts`, `frontend/src/view/projects/ProjectsScreen.test.tsx`, `frontend/src/view/workspace/WorkspaceScreen.test.tsx`.

## Known limits
- Every page shows under every project; choosing which features a project uses is `docs/backlog/choose-which-features-a-project-uses.md`.
- Records made before projects existed, or with no project open, have no folder and show only when no project is open. All files on the projects list closes the open project; nothing else in the sidebar does.
- Project requests are Space-wide by nature (a request is for a new project), so they sit beside the projects list, not under a project.
- Nested projects are listed flat, and a subfolder project's records also show in its parent project.
- My work's capacity and Resources' people are Space-wide; only their allocations are filtered.
- The open project is not in the URL, so a link someone shares opens in the receiver's own open project.
- An uploaded image's URL is stored as given; removing the icon doesn't delete the uploaded file.
- The "Make Project" menu entry has no test.

## History
- 2026-11-03: projects moved into the sidebar. A flat list replaced the icon rail; selecting a project shows its grouped pages and files. Every page became per-project (`X-Project-Id`, new `folder_id` columns), and projects gained an emoji or image icon. Verified in the browser against the local dev server and database; not deployed.
- 2026-11-03: Projects became the Space home page; the old welcome screen with Documents/Tasks/Events links was removed.
- Implemented 2026-10-15 to 2026-10-18.
