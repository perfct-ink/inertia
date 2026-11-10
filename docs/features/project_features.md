# Project features

## What it does
A project turns on the pages it needs, and the sidebar under that project shows only those. The project's files (documents, sheets, Collections, uploaded files), its Overview and All files always show.
- **Choosing**: open the project dropdown at the top of the sidebar and pick **Choose pages...**, or open the project page and press **Pages** in its header. A dialog lists the pages in the rail's groups (General, Tasks, Planning, Goals, Delivery) with a checkbox each; Save stores the list. Only members who can write in the Space (member role and above) see the entry; viewers don't.
- **The pages**: My work; Tasks, Task table, Pivot, Calendar, Events; Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy; OKRs, Objectives map, Ideas; Resources, Workload. (My work and Workload show only in a shared Space, as before.)
- **Sidebar**: the icon rail (`file-manager/SidebarRail.tsx`) leaves out the open project's turned-off pages, and the project's Tasks list (`ProjectNav.tsx`) shows only its task pages that are on (the Tasks heading goes when none is). The project's files are unchanged.
- **Quick add** (`file-manager/Sidebar.tsx`, the Account menu, the rail's plus or ⌘K): with a project open, the Task tab is left out when Tasks is off and the Event tab when Events is off. With both off the Quick add menu item is hidden and ⌘K does nothing. With no project open it offers everything.
- **Project page Overview** (`view/folder_detail/FolderDetailScreen.tsx`): the Tasks, Epics and Upcoming Events sections are hidden when that feature is off; folders and documents always show.
- **Nothing is deleted.** Turning a page off only hides it; its records stay and turn up again when it is switched back on. A direct link to a hidden page still opens it.
- **Default**: existing projects have no saved list and show every page, and a new project starts with every page on (the conservative choice; project types, `project-types.md`, are to set a new project's starting pages). Saving with every page checked stores "no list", so a page added later shows in projects that never turned anything off.
- **Mobile**: the choices are a dialog with whole-row checkboxes that scroll inside it.

## API and models
- `folders.features` (JSON, nullable; migration `20261110120001_add_features_to_folders`). NULL means every page; otherwise an array of page keys. Only a project can be given a list.
- `Folder::PROJECT_FEATURES` is the list of keys in the rail's order: `my_work tasks task_table pivot calendar events roadmap timeline milestones initiatives epics sprints hierarchy okrs objectives_map ideas resources workload`. `Folder#enabled_features` returns the saved list in that order, or all of them. Validation rejects an unknown key, a value that is not an array, and a list on a plain folder (a project made a plain folder again keeps its list).
- `PATCH /api/v1/folders/:id` with `folder: { features: [...] }` (an empty array turns everything off). Member role and above; a viewer gets 403. `FolderBlueprint` returns `features` (the enabled list) on a project and `null` on a plain folder.
- Frontend: `frontend/src/data/projectFeature.ts` holds the keys, labels and groups and the helpers `projectFeatureOn`, `enabledProjectFeatures`, `toggleProjectFeature` and `quickAddTypesOf`; each page in `components/file-manager/projectSections.ts` names its `feature` (a test keeps the two lists in step). `Folder.features` is in `types/index.ts`; `FolderFields.features` in `api/folders.ts`.

## Who can view and change
Anyone in the Space sees the result; members who can write change it. A failed save keeps the dialog open and shows the error.

## Tests
- `backend/test/controllers/project_features_controller_test.rb`, `backend/test/models/folder_test.rb`.
- `frontend/src/data/projectFeature.test.ts` (the helpers, and every rail page has its feature in the same order), `frontend/src/components/project/ProjectFeaturesDialog.test.tsx`, `frontend/src/components/file-manager/SidebarRail.test.tsx` (a project's turned-off pages leave the rail).

## Known limits
- The folder page's Board, List, Cards, Calendar and Gantt tabs are not switched off; only the Overview sections are. ⌘T and ⌘E still go to their pages.
- A direct link to a hidden page opens it, and the API still returns that project's records for it.
- Moving or copying a project to another Space does not carry its list.
- Only the page-level on/off is stored; there is no per-person choice.

## History
- First built 2026-11-03 on `backlog/choose-which-features-a-project-uses` against an older sidebar (Files and Pages tabs). Rebuilt on main 2026-11-10 on the icon rail and the project's Tasks list, reusing the branch's backend, dialog and tests. Verified: `rails test`, RuboCop, Brakeman, `tsc -b`, Jest, ESLint, the migration, and in the browser turning Roadmap and Events off for a project took them out of the rail, the Tasks list and the Overview.
