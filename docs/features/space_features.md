# Space features

## What it does
A Space chooses which optional pages it uses. A page that is off leaves the sidebar rail, the task pages listed under an open project, quick add and the project overview; **nothing is deleted** and turning it back on shows it again with all its records.
- **The 13 optional pages**, grouped as the rail groups them: Events; Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy; OKRs, Objectives map, Ideas; Resources, Workload. Tasks, Task table, Pivot, Calendar, My work, Projects, the Inbox, files and the account menu are always on (a Space needs tasks and files to be useful, and Alex's list was "Sprints, Milestones, Initiatives, OKRs, Roadmap, Events"; the rest of the rail's planning, goals and delivery pages were added to the same list so one setting covers them all).
- **Choosing**: the Space name at the top of the sidebar opens the Space menu; **Features...** opens a dialog with a checklist grouped as above (Scheduling, Planning, Goals, Delivery). **Save** stores the list and stays off until something changed. Anyone in the Space can open the dialog and see what is on; only admins and owners can change it (the boxes are disabled for members and viewers and there is no Save).
- **New Space...** opens a dialog with a name and the same checklist, every page on; Create makes the Space (the creator is its owner) with the chosen pages. The Getting started checklist still creates a Space from a name alone, with every page on.
- **Sidebar rail** (`file-manager/SidebarRail.tsx`) and the task pages under an open project (`file-manager/ProjectNav.tsx`): sections come from `file-manager/projectSections.ts`, where each optional section names its `feature`; `sectionsFor` drops the ones the Space turned off (and the shared-only ones in a Space only one person can open). A group left with no pages draws no divider.
- **Quick add** (`file-manager/Sidebar.tsx`, Cmd+K or the rail's plus): with Events off there is only a task to make, so the Task/Event tabs are not shown; the Epic picker is hidden when Epics is off. The shortcuts list says "Quick-add a task" then, and Cmd+E (new event) and Cmd+J (new idea) do nothing and are left out of the list when Events or Ideas is off.
- **Project overview** (`view/folder_detail/FolderDetailScreen.tsx`): the Epics and Upcoming Events sections are left out when Epics or Events is off, and so is the Calendar tab (which only shows events).
- **Default**: existing Spaces have no saved list and show everything, and a page added in a later release shows in every Space that never turned anything off. Saving with every page checked stores "no list" for the same reason.
- **Mobile**: the Features and New Space dialogs are the shared modal (at most the viewport wide), the checklist scrolls inside it (at most 55% of the screen height), and every row is 44px tall and tappable across its whole width.

## How a project narrows it
This is the reading of the unmerged per-project setting (`backlog/choose-which-features-a-project-uses`, `folders.features`), written so the two can be merged without either rewriting the other. The Space setting is the default and the ceiling; a project can only narrow it:
- A project with no list of its own (NULL, the default) uses the Space's list.
- A project with a list shows a page only if the Space shows it **and** the project's list includes it: `Space.enabled_features ∩ Project.enabled_features`. Turning a page off in a Space therefore hides it in every project; turning it back on gives each project back exactly what it had chosen, because the Space setting never rewrites a project's list.
- Keys the two lists share are spelled the same: `events roadmap timeline milestones initiatives epics sprints hierarchy okrs objectives_map ideas resources`. A key in only one list is decided by that list alone: the project list has `my_work tasks task_table pivot calendar` (the Space never turns these off) and `releases` (removed from main with Releases, so that key should be dropped when the branch is rebased); the Space list has `workload`, which the project list does not have.
- The project's Features dialog should hide or disable the pages the Space turned off (they cannot be turned on from there), and its sidebar and quick add check `featureOn(space, key) && projectFeatureOn(project, key)`. `featureOn` is in `frontend/src/data/workspaceFeature.ts`; the project branch adds its own helper next to it.
Nothing of the project setting is built here.

## API and models
- `workspaces.features` (JSON, nullable; migration `20261108030001_add_features_to_workspaces`). NULL means every page. Otherwise an array of keys.
- `Workspace::FEATURES` (backend/app/models/workspace.rb) is the list of keys in rail order: `events roadmap timeline milestones initiatives epics sprints hierarchy okrs objectives_map ideas resources workload`. `Workspace#enabled_features` returns the saved list in that order, or all of them when none was saved; `feature_enabled?(key)` asks about one. Validation rejects an unknown key and a value that is not an array. A list with every key is saved as NULL.
- `POST /api/v1/workspaces` with `workspace: { name, features: [...] }` (the features are optional), and `PATCH /api/v1/workspace` with `workspace: { features: [...] }` (an empty array turns every optional page off). Updating needs the admin or owner role, the same check as renaming (`WorkspacesController#update`), so no permission was loosened; a member or viewer gets 403. `WorkspaceBlueprint` returns `features` (the enabled list, never null) in `GET /api/v1/workspaces`, `GET /api/v1/workspace` and the create/update responses.
- Frontend: `frontend/src/data/workspaceFeature.ts` holds the keys, labels and groups (one list drives the rail, both dialogs and the checks) and the pure helpers `featureOn`, `enabledFeatures`, `toggleFeature`, `quickAddTypes` and `featuresChanged`. `WorkspaceSummary.features` is in `types/index.ts`; `useUpdateWorkspaceFeatures` is in `api/workspace.ts` (it refetches the Space and the Spaces list) and `useCreateWorkspace` in `api/workspaces.ts` now takes a name or `{ name, features }`.

## Who can view and change
Everyone in the Space sees the result. Admins and owners change it; members and viewers get a read-only list. A failed save keeps the dialog open and shows the error under the checklist (and the API client shows its usual error notice).

## Web entry points
`frontend/src/components/workspace/WorkspaceSwitcher.tsx` (the Space menu: New Space..., Features...), `WorkspaceFeatures.tsx` (the dialog), `NewWorkspaceDialog.tsx`, `FeatureChecklist.tsx` and `FeatureChecklist.scss` (the shared checklist), `components/file-manager/SidebarRail.tsx`, `ProjectNav.tsx`, `projectSections.ts`, `Sidebar.tsx` (quick add and shortcuts), `view/folder_detail/FolderDetailScreen.tsx`.

## Tests
- `backend/test/models/workspace_features_test.rb`: default is every page; the key list and order; choosing keeps the rail order; an empty list; every page checked is stored as NULL; unknown values and non-lists are rejected; turning a page off deletes nothing.
- `backend/test/controllers/workspace_features_controller_test.rb`: every Space lists all pages by default (list and active Space); a new Space starts with a chosen set; an owner and an admin change it; every page off and back on keeps the Space's records; an unknown key is 422; a member is 403.
- `frontend/src/data/workspaceFeature.test.ts` (pure helpers), `components/workspace/WorkspaceFeatures.test.tsx` (checked boxes, save payload in rail order, Save off until a change, a failed save, read-only for members, the New Space dialog), `components/file-manager/SidebarRail.test.tsx` (pages left out, nothing optional left, Workload needs shared and on), `ProjectNav.test.tsx` (Events left out of the task pages), `view/folder_detail/FolderDetailScreen.test.tsx` (overview sections and the Calendar tab).

## Known limits
- Only navigation is hidden. A direct link or bookmark to a hidden page still opens it, and the API still returns its records.
- Quick add itself (the Sidebar) has no component test; its rule is `quickAddTypes`, which has a data test. The task detail form's Epic, Milestone and Sprint fields, the Tasks screen's sprint filter and the project Gantt/Cards tabs are not switched off by the Epics, Milestones or Sprints settings.
- The project Calendar tab is hidden with Events, but the page-level Calendar (tasks) stays because Calendar is always on.
- Moving or copying content to another Space does not change either Space's list.
- Only the page-level on/off is stored; there is no per-person choice and no presets (for example "software team" or "band").

## History
- Implemented 2026-11-08 on branch `backlog/choose-which-features-a-space-uses` (not merged or deployed). An earlier version of this branch (2026-10-19, 8 keys, a settings button in the old Spaces modal) was rebuilt on the current main with the icon rail, projects and Space menu.
- Not implemented: hiding the task detail fields and the other screens' filters, a route guard that tells you a page is turned off, presets, reconciling with the per-project list (see above).
- Not verified: `rails db:migrate` and `rails test` (no database or bundle here; `schema.rb` was edited by hand), `npm run lint`, `tsc -b` and the real Jest suite (no `node_modules`), and the dialogs and rail in a browser at 375px and desktop in light and dark. The component tests ran only under a stand-in Jest with stubbed react-query and radix dialog.
