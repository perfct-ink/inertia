# Project features

## What it does
A project turns on the pages it needs, and the sidebar under that project shows only those. The project's files (documents, sheets, Collections, uploaded files), its Overview and All files always show.
- **Choosing**: open the project dropdown at the top of the sidebar and pick **Features...**, or open the project page (`/folders/:id`) and press **Features** in its header. A dialog lists the 18 pages in the sidebar's groups (General, Tasks, Planning, Goals, Delivery) with a checkbox each; Save stores the list. Only members who can write in the Space (member role and above) see the entry; viewers don't.
- **The 18 pages**: My work; Tasks, Task table, Pivot, Calendar, Events; Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy; OKRs, Objectives map, Ideas; Releases, Resources.
- **Sidebar** (`file-manager/ProjectNav.tsx`, Pages tab): shows Overview, All files and the pages that are on. A heading whose pages are all off is dropped. The Files tab is unchanged.
- **Quick add** (`file-manager/Sidebar.tsx`, the Account menu or Cmd+K): with a project open, the Task tab is left out when Tasks is off, the Event tab when Events is off, and the epic picker when Epics is off. With both off, the Quick add menu item is hidden and Cmd+K does nothing. With no project open it offers everything.
- **Project page Overview** (`view/folder_detail/FolderDetailScreen.tsx`): the Tasks, Epics and Upcoming Events sections are hidden when that feature is off; the documents section always shows.
- **Nothing is deleted.** Turning a page off only hides it; its records stay and turn up again when it is switched back on. A direct link (or a bookmark) to a hidden page still opens it, and the sidebar then opens on the Pages tab with no page highlighted.
- **Default**: existing projects have no saved list and show every page. A new project (from the sidebar, the Projects page, a project request or Make Project) also starts with every page on; Alex has not said whether new projects should start smaller, so this is the conservative choice. Saving with every page checked stores "no list", so a page added in a later release shows in projects that never turned anything off.
- **Mobile**: the choices are a dialog (32rem wide, at most the viewport minus 2rem, scrolling inside) with whole-row, 44px-tall checkboxes in one column at phone width.

## API and models
- `folders.features` (JSON, nullable; migration `20261103070001_add_features_to_folders`). NULL means every page. Otherwise an array of page keys. Only a project can be given a list.
- `Folder::PROJECT_FEATURES` (backend/app/models/folder.rb) is the list of keys, in sidebar order: `my_work tasks task_table pivot calendar events roadmap timeline milestones initiatives epics sprints hierarchy okrs objectives_map ideas releases resources`. `Folder#enabled_features` returns the saved list in that order, or all of them when none was saved. Validation rejects an unknown key, a value that is not an array, and a list on a plain folder (a project made a plain folder again keeps its list).
- `PATCH /api/v1/folders/:id` with `folder: { features: [...] }` (permitted as `features: []`; an empty array turns everything off). Writes need the member role, like the rest of `FoldersController`; a viewer gets 403. `FolderBlueprint` returns `features` (the enabled list, never null) on a project and `null` on a plain folder, in the Space tree (`GET /api/v1/workspace`), `GET /api/v1/folders/:id` and the other folder responses.
- Frontend: `frontend/src/data/projectFeature.ts` holds the keys, labels, paths and groups (the same list drives the sidebar and the dialog) and the pure helpers `projectFeatureOn`, `enabledProjectFeatures`, `toggleProjectFeature`, `projectFeatureGroups` and `quickAddTypesOf`. `Folder.features` is in `types/index.ts`; `FolderFields.features` in `api/folders.ts` (saved through `useUpdateFolder`, which refreshes the Space tree).
- Keys that name the same page as the Space-level list on `backlog/choose-which-features-a-space-uses` (`events epics initiatives milestones sprints okrs roadmap hierarchy`) are spelled the same, so the two can be reconciled (see Known limits).

## Who can view and change
Anyone in the Space sees the result; members who can write change it. A failed save keeps the dialog open and shows the error under the checkboxes.

## Web entry points
`frontend/src/components/project/ProjectFeaturesDialog.tsx` (opened from `ProjectNav.tsx` and `FolderDetailScreen.tsx`), `frontend/src/components/file-manager/ProjectNav.tsx`, `frontend/src/components/file-manager/Sidebar.tsx` (quick add), `frontend/src/view/folder_detail/FolderDetailScreen.tsx`.

## Tests
- `backend/test/controllers/project_features_controller_test.rb`: a new project lists every page and a plain folder none; a member sets the list and the Space tree carries it; every page off and back on; records of a hidden page are kept; an unknown key and a list on a plain folder are 422; a viewer is 403.
- `backend/test/models/folder_test.rb`: default is every page and the order is the sidebar's; unknown values rejected; a list on a project turned back into a folder is kept; every page checked is stored as the default.
- `frontend/src/data/projectFeature.test.ts` (pure helpers), `frontend/src/components/project/ProjectFeaturesDialog.test.tsx` (checked boxes, save payload, error, cancel), `frontend/src/components/file-manager/ProjectNav.test.tsx` (every page by default, only the chosen pages with All files kept, a hidden page's link still opens Pages, Features... for members only), `frontend/src/view/folder_detail/FolderDetailScreen.test.tsx` (Features button for members on a project, hidden Overview sections).

## Known limits
- The Projects page cards show only files and the create menu, so there was nothing there to hide.
- Quick add itself (the Sidebar) has no component test; its rule is `quickAddTypesOf`, which has a data test. Cmd+T (new task) and Cmd+E (new event) still go to their pages.
- The folder page's Board, List, Cards, Calendar and Gantt tabs are not switched off by Tasks, Events or Epics; only the Overview sections are.
- A direct link to a hidden page opens it, and the API still returns that project's records for it.
- Moving or copying a project to another Space (`SpaceTransfer`) does not carry its list or icon; the copy shows every page.
- Space-level features (`backlog/choose-which-features-a-space-uses`, a separate unmerged branch) are not built on this branch. When both exist a project should only offer what its Space uses: intersect `project.features` with the Space's list (`featureOn`) for the eight shared keys, leave the other ten keys to the project alone, and in `ProjectFeaturesDialog` hide or disable the pages the Space turned off.
- Only the page-level on/off is stored; there is no per-person choice.

## History
- Implemented 2026-11-03 (not deployed; on branch `backlog/choose-which-features-a-project-uses`).
- Not implemented: new-project dialog with a checklist, a presets list ("software team", "band"), switching the folder page's view tabs off, reconciling with Space-level features.
- Not verified: `rails test` and `rails db:migrate` (no database or bundle here; `schema.rb` was edited by hand), `npm run lint` and `npm test` (no `node_modules`), and the browser at 375px and desktop in light and dark. The component tests ran only under a stand-in Jest with stubbed axios, react-query and radix dialog, not the project's own Jest setup.
