# Projects

## What it does
Inside a Space are projects. A project is a folder (`folders.kind: project`) that holds the documents, files, collections, tasks, events and planning records for one piece of work, including those in its subfolders.
- **Space home** (`/space`): the Projects page. `/projects` redirects there. While a new user's getting-started steps are active, `/space` shows those instead.
- **Projects page**: one card per active project, sorted by name, with its icon (click it to change it), file count, last update, a link to the project page, the files inside (subfolders included) and a create menu that adds items to the project. "New project" asks for a name and creates a folder with `kind: project`.
- **Sidebar** (`file-manager/ProjectNav.tsx`): a flat list of the Space's projects, which never expands or collapses, with buttons for All files (an icon in the header; it closes the open project, so it lists the whole Space), for archived folders and projects (with Unarchive) and New project. Nothing but projects shows there; files outside any project are reached through All files. Selecting a project replaces the list with that project: a dropdown like the Space switcher (the project's icon and name; it lists the projects to switch to, with Overview, New project, Change icon and All projects), then the task pages (Tasks, Task table, Pivot, Calendar, Events) as labelled links under a Tasks heading (they also stay on the icon rail), then just its files under an "All files" heading (a link to the All files page, filtered to the open project) whose buttons (New document, New sheet, New Collection, New folder) create in the project and open the new item, then its documents, sheets, Collections and uploaded files, subfolders included (or "No files yet."). Its pages are on the icon rail, in these groups (`file-manager/projectSections.ts`):
  - My work (only when the Space is shared, see below)
  - **Tasks**: Tasks, Task table, Pivot, Calendar, Events
  - **Planning**: Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy
  - **Goals**: OKRs, Objectives map, Ideas
  - **Delivery**: Resources
- **Icon rail** (`file-manager/SidebarRail.tsx`, `SidebarRail.scss`): a narrow column of icon buttons to the right of the sidebar panel, inside the same drawer on a phone. It has a link for Projects (`/space`) and every page in the groups above, with dividers between the groups, then Quick add and Keyboard shortcuts at the bottom (the account menu in the panel's footer has the same two). The page you're on is highlighted and has `aria-current="page"`. The links open the page for the open project, or the whole Space when none is open. The middle of the rail scrolls when the window is too short for every button. With a tinted colour theme the rail takes the panel's colour.
- **My work only when shared.** `GET /api/v1/workspace` returns `shared`: true when more than one person can open the Space, through a membership or a team (`Workspace#shared?`). The rail shows My work only then (`sharedOnly` in `projectSections.ts`); `/my-work` itself still opens. Projects can't be shared apart from their Space yet, so a project counts as shared exactly when its Space is.
- **Every page is per-project.** The open project is remembered (`store/projects.ts`, like the current Space) and sent with every API call as `X-Project-Id` (`lib/api.ts`). The list endpoints return only that project's records, its subfolders included, and new records are filed in it. Opening a folder or document inside a project opens that project. Switching project resets the cached lists except the Space tree. Switching Space or signing out forgets the open project, and a project that is archived, deleted or made a plain folder is closed.
- **Icon**: pick one of 24 emojis, type any emoji, or upload an image (it goes through `POST /api/v1/uploads`). An image wins over an emoji; with neither, the default project icon shows (`components/project/`).
- **Project page** (`/folders/:id`): the folder page, whose Overview lists the folders and the documents, files and collections directly inside the project (one level; open a subfolder to see its own) and its tasks, epics and upcoming events, subfolders included (`GET /api/v1/folders/:id/contents`; see `folder_home_document.md`).
- **Sidebar tree**: right-click menu on any folder shows "Make Project", or "Make Folder" on a project (`file-manager/FolderItem.tsx`).
- **Personal Project.** A new document, sheet or Collection made with no folder chosen (no project open, from Cmd+N or the sidebar's create buttons) goes in a project named "Personal Project". It's created the first time and reused after, and it becomes the open project (`hooks/useNewDocument.ts`). The new document opens with the cursor in its title. Create Item's folder picker still files into the Root when you choose it.
- **Unchanged new documents aren't kept.** A document made with "new document" is deleted when its tab is closed (tab button or Cmd+W) if nobody typed in it or renamed it (`store/untouchedDocuments.ts`, `lib/closeTab.ts`). Only documents, not sheets or Collections, and only until the page is reloaded; after a reload it's kept like any other. Content that arrives from the collaboration server doesn't count as a change. Leaving the page without closing the tab keeps it.
- **All files** opens filtered to the open project (see `all_files.md`).
A folder is either a plain folder or a project (`folders.kind`). A project is a folder that groups the docs, sheets and collections for one piece of work, including those in its subfolders.
- **Projects page** (`/projects`): one card per active project, sorted by name, with its file count, last update, a link to the folder page, the list of files inside (subfolders included) and a create menu that adds items to that project. "New project" asks for a name and creates a folder with `kind: project`.
- **Details**: each card has an owner (Space member), status (planned, active, on hold, done), start and end dates and a description, each saved as you change it (`components/ProjectDetails.tsx`). These feed the portfolio view, which is not built (`docs/backlog/portfolio-view.md`).
- **Sidebar tree**: right-click menu on any folder shows "Make Project", or "Make Folder" on a project (`file-manager/FolderItem.tsx`). Projects show a project icon.
- **All files** shows a project icon next to files that sit inside a project (see `all_files.md`).

## API and models
- `folders.kind` integer, default 0: enum `folder: 0`, `project: 1`, `feature: 2` (`backend/app/models/folder.rb`). The document Root cannot be made a project.
- `folders.icon` (string, up to 16 characters) and `folders.image_url` (a `http(s)://` or `/` address), permitted on `PATCH /api/v1/folders/:id` and returned by `FolderBlueprint`.
- `X-Project-Id` header, read by the `ProjectScoped` controller concern. A folder in another Space is a 404. It narrows `GET` on tasks (through their folder or their document's folder), events, epics, milestones, initiatives, sprints, ideas, io_nodes, objectives and resource_allocations. On `POST` to those, a record that names no folder is filed in the project. Single-record reads and updates ignore it. `GET /api/v1/tasks?all_projects=true` ignores it too and lists the whole Space (used by the dependency editor to find a task in another project). A promoted idea passes its project to the epic or initiative it becomes.
- `folder_id` (nullable, the database nullifies it when the folder is deleted) was added to initiatives, sprints, ideas, io_nodes and objectives through the `ProjectItem` model concern, which also rejects a folder from another Space. Epics, events, milestones, tasks and resource allocations already had one. Migration `20261103120001_add_projects_to_planning_items`.
- Pure helpers `projectsOf`, `projectOf`, `folderOfDocument`, `documentsIn`, `projectLastModified` are in `frontend/src/data/folder.ts`, and `projectIconOf` and the emoji list in `frontend/src/data/project.ts` (also `isActivePath`, which the rail uses to find the current page).

`folders.owner_id` (nullable FK to users, nullified), `project_status` (enum planned/active/on_hold/done, default planned), `start_date`, `target_date`, `description`; permitted on `PATCH /api/v1/folders/:id`. Validations: owner must be a Space member, end date not before start.

## Who can view and change
Scoped to the current Space; writes need the member role, like the rest of the Space. I did not check role-based limits on changing `kind` or the icon.

## Web entry points
`frontend/src/view/workspace/WorkspaceScreen.tsx` (home: projects, or getting started), `frontend/src/view/projects/ProjectsScreen.tsx`, `frontend/src/components/file-manager/ProjectNav.tsx`, `frontend/src/components/project/ProjectIconDialog.tsx`; sidebar folder menu.

## Tests
- `backend/test/controllers/project_scoping_test.rb`: lists hold only the project's records, subfolders included; tasks through a document; new records filed in the project; a promoted idea keeps its project; another Space's folder is a 404; icon and image saved, a `javascript:` address rejected.
- `backend/test/models/folder_test.rb` ("a folder can be a project, but the document root cannot").
- `frontend/src/components/file-manager/ProjectNav.test.tsx`: the list is flat and has no other files; All files and archived items; selecting a project shows just its files, and its dropdown opens the Overview; the Files toolbar creates in the project; no Project requests button; the dropdown switches project and All projects returns to the list; opening a document inside a project opens it.
- `frontend/src/components/file-manager/SidebarRail.test.tsx`: the links and their order, My work only in a shared Space, the current page (also when the link carries a query), no current page away from every section, the quick-action handlers.
- `backend/test/controllers/workspaces_controller_test.rb`: a Space is shared once a second person can open it, through a membership or a team.
- `frontend/src/lib/api.test.ts` (the header, and sign-out forgets the project), `frontend/src/data/project.test.ts`, `frontend/src/data/folder.test.ts`, `frontend/src/view/projects/ProjectsScreen.test.tsx`, `frontend/src/view/workspace/WorkspaceScreen.test.tsx`.
`frontend/src/components/ProjectDetails.test.tsx`, `frontend/src/data/project.test.ts`, `backend/test/models/folder_test.rb` (project details and "a folder can be a project, but the document root cannot"), `frontend/src/data/folder.test.ts`, `frontend/src/view/projects/ProjectsScreen.test.tsx` (lists projects with nested docs; creates a project).

## Known limits
- Every page shows under every project; choosing which features a project uses is `docs/backlog/choose-which-features-a-project-uses.md`.
- Records made before projects existed, or with no project open, have no folder and show only when no project is open. The All files icon on the projects list closes the open project; nothing else in the sidebar does.
- Project requests is turned off (see `project_intake.md`).
- Nested projects are listed flat, and a subfolder project's records also show in its parent project.
- My work's capacity and Resources' people are Space-wide; only their allocations are filtered.
- The open project is not in the URL, so a link someone shares opens in the receiver's own open project.
- An uploaded image's URL is stored as given; removing the icon doesn't delete the uploaded file.
- The "Make Project" menu entry has no test.

## History
- 2026-11-04: the task pages are listed with their names inside an open project (not on the projects list); even gaps between the project dropdown, the task pages and the files; less space between the Space switcher and the Projects heading. Ran `tsc -b`, lint (warnings only) and Jest. Not run: the browser.
- 2026-11-04: closing the tab of an unchanged new document deletes it (`closeTab.test.ts`). Not run: the browser, so the typing-versus-collaboration-sync check in `DocumentScreen.tsx` is untested in practice.
- 2026-11-04: All files moved off the icon rail. The icon stays in the projects list header, and with a project open an "All files" heading replaces Files under the project name (the project stays open). Ran `tsc -b`, lint (warnings only) and Jest (679). Not run: the browser.
- 2026-11-04: new documents with no project context go to a "Personal Project". Ran `tsc -b`, `npm run lint` (warnings only) and Jest (675, including `useNewDocument.test.tsx`). Not run: Rails tests, the browser. The project is found by name in the browser, so a Space where someone renamed it gets another one.
- 2026-11-03: My work shows only in shared Spaces; the Files heading came back with the create buttons on it.
- 2026-11-03: the Files and Pages tabs were removed; an open project shows just its files, its pages are on the icon rail, and Overview moved into the project dropdown. Project requests was turned off.
- 2026-11-03: the icon rail came back, to the right of the sidebar panel (it had been removed when projects moved into the sidebar). Ran: the data tests and the rail, ProjectNav, WorkspaceLayout and GettingStarted component tests in a Jest stand-in, plus a static parse of the changed files. Not run: `npm run lint`, `tsc -b`, the real Jest suite, or the sidebar in a browser (desktop, phone width, light and dark, tinted theme, Electron).
- 2026-11-03: projects moved into the sidebar. A flat list replaced the icon rail; selecting a project shows its grouped pages and files. Every page became per-project (`X-Project-Id`, new `folder_id` columns), and projects gained an emoji or image icon. Verified in the browser against the local dev server and database; not deployed.
- 2026-11-03: Projects became the Space home page; the old welcome screen with Documents/Tasks/Events links was removed.
- Implemented 2026-10-15 to 2026-10-18.
- Implemented 2026-10-15 to 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests, migration and the screens were not run (no dependencies installed, no network).
- Project details added 2026-10-19 on branch `backlog/project-details-owner-status-dates-and-a-description`, not merged. Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand.

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
