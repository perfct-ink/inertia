# Resource management

## What it does
The **Resources** page (`/resources`, "Resources" in the sidebar rail) plans people's time across projects. Each person in the Space has a **weekly capacity** in hours (default 40, 0 to 168) and can be **allocated** to projects for some hours a week between two dates (no start date means already under way, no end date means ongoing).
- **People tab** (default): one card per Space member, by name. A card shows their capacity, a cell for each of the next eight weeks (Monday to Sunday, named by the Monday) with "allocated / capacity h", a bar and a note ("10 h free", "Full", "Over by 10 h", or "No capacity" when capacity is 0), then their allocations and, for admins and owners, a form to allocate them to a project. When the person has open tasks with an estimate and a due date, each cell also says "Tasks N h": the task hours the [Workload](workload.md) view works out for that week. A week over capacity is marked with a warning icon, bold text, a red border and (for allocations) a red bar, so it does not rely on colour. A week is over capacity when **either** the allocated hours **or** the task hours exceed the capacity ("Over by 10 h" for allocations, "Tasks over by 10 h" for tasks). The two are compared with the capacity separately, never added: the tasks are the work inside the allocations, so a sum would count the same hours twice (a deliberate choice that is easy to change in `planWithTasks`). When anyone is over capacity in the weeks shown, a notice at the top says who and in how many weeks ("Over capacity: Ada (7 weeks)").
- **Projects tab**: one card per project that has an allocation which has not finished before the first week shown, by name: hours per week in total and how many people, for each week, and the people on it with their hours and dates. Read-only; allocations are edited on the People tab.
- **Weeks shown**: eight weeks starting with the current one. "Earlier weeks" and "Later weeks" move the window by four weeks; "This week" appears when it has been moved. Allocations that finished before the first week shown are hidden from the lists (go earlier to see them).
- **Capacity and allocation editing** (admins and owners): the capacity field saves when it loses focus. An allocation's hours, start and end dates save in place; the cross removes it. A rejected value (outside 0 to 168, end before start) puts the field back to the saved value and shows the reason. The allocate form needs a project, hours above 0 and optionally an end date; "Until" empty means ongoing.
- If the Space has no project yet, admins and owners see a hint with a link to the Projects page, and the allocate form is not shown.
- A part week counts in full: an allocation active on any day of a week adds all its hours to that week, so the page errs towards warning.
- Layout: weeks are a wrapping grid (two per row at 375px), so nothing scrolls sideways; the header, forms and allocation rows wrap; every control is at least 40px tall. Number fields have no browser spin buttons (`Input.scss`, applies app-wide).

## API and models
- `workspace_memberships.weekly_capacity_hours`: decimal(5,2), default 40, not null, validated 0 to 168 (`WorkspaceMembership::MAX_WEEKLY_HOURS`). Returned by `GET /api/v1/workspaces/:id/members` as a number. Set with `PATCH /api/v1/workspaces/:id/members/:member` and `{ weekly_capacity_hours }`, alone or together with `role` (a capacity-only change is not a role change, so an admin may set an owner's capacity). A non-numeric or out-of-range value answers 422.
- `resource_allocations` table (`ResourceAllocation`): `workspace_id`, `user_id`, `folder_id` (the project), `hours_per_week` decimal(5,2) greater than 0 and at most 168, `start_date`, `end_date` (not before the start). Validations: the person must be a member of the Space; the project must belong to the Space and be a folder with kind `project` when chosen (a project later turned back into a folder keeps its allocations, which stay editable); the Space root can never be a project. A person who leaves the Space loses their allocations there (`WorkspaceMembership#after_destroy`); deleting a project (folder) deletes its allocations; deleting the Space deletes them too.
- `/api/v1/resource_allocations` (`index`, `create`, `update`, `destroy`), scoped by `X-Workspace-Id`, body `{ resource_allocation: { user_id, folder_id, hours_per_week, start_date, end_date } }`. Errors come back as `{ errors: [...] }` with 422 ("Person must be a member of the space", "Project must be a project", ...).
- Migrations `20261101110001_add_weekly_capacity_to_workspace_memberships` and `20261101110002_create_resource_allocations`; `schema.rb` was edited by hand.
- Frontend: `api/resourceAllocations.ts`, `useUpdateMemberCapacity` in `api/workspaces.ts` (member mutations also refresh allocations), types `ResourceAllocation` and `WorkspaceMember.weekly_capacity_hours` in `types/index.ts`. Pure logic (weeks, per-person and per-project load, over-allocation, notes, input checks) is in `frontend/src/data/resource.ts`; the combination with task hours (`workload`, `planWithTasks`, `planNotes`) is in `frontend/src/data/workload.ts`, which builds on `personLoads`. The Workload view uses the same capacities.

## Who can view and change
Everyone in the Space, including viewers, can read the plan. **Only admins and owners can change capacities and allocations** (writes need `can_manage?`; members and viewers get 403 and see no editing controls). This is the conservative choice: planning people's time is usually a manager's call, and it is a one-line change in `ResourceAllocationsController` (and the members endpoint already needs admin) if Alex wants members to edit their own capacity or allocate themselves. In a personal Space the only member is its owner, so they can plan their own time.

## Web entry points
`frontend/src/view/resources/ResourcesScreen.tsx` (with `PersonCard`, `AllocationRow`, `AllocateForm`, `ProjectCard` and `ResourcesScreen.scss`), route `/resources` in `App.tsx`, rail button in `components/file-manager/Sidebar.tsx`.

## Tests
- `backend/test/models/resource_allocation_test.rb`: validations, project and member rules, cascade on project delete and on leaving the Space, capacity bounds.
- `backend/test/controllers/resource_allocations_controller_test.rb`: create/list/update/delete, 403 for members and viewers, 422 reasons, Space scoping, 404 for outsiders.
- `backend/test/controllers/workspace_members_controller_test.rb`: capacity in the member list, set alone and with a role, rejected values, admin only.
- `frontend/src/data/resource.test.ts`: weeks, load per person and project, over-allocation, notes, parsing and validating hours.
- `frontend/src/data/workload.test.ts`: task hours against each person's capacity, the allocation and task comparison (either over, not the sum).
- `frontend/src/view/resources/ResourcesScreen.test.tsx`: loads and warnings, task hours beside the allocation, changing capacity, allocating, editing and removing, read-only view for members, Projects tab, moving the weeks.

## Known limits
- Capacity is per Space, one number for every week: no time off, holidays, part-time schedules that change over time, or per-day detail (see `docs/backlog/resource-time-off-and-holidays.md`).
- Allocations are a weekly rate; a part week counts in full, and hours are not split by day.
- Allocations are a plan, not a measure of work: they are not derived from tasks. Task hours (the open tasks' estimates spread over their dates, as in [Workload](workload.md)) are shown beside them and checked against capacity on their own. Tasks with no estimate or due date are not counted, and the People tab does not say how many there are (the Workload view does).
- Only active projects can be chosen; an allocation to a project that was archived shows as "Archived project".
- Allocations to a project cannot be created from the project's page, only from the People tab. There is no "who is free" search, no export, and no history of changes.
- Date fields save as soon as a date is picked; hours save when the field loses focus.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/resource-capacity-management`).
- Not implemented: time off and holidays, task-based workload comparison, allocating from a project page.
- Not verified: Rails tests, migrations and `rails db:migrate` (no database or usable bundle), ESLint, Stylelint, the TypeScript type-check and a browser (no node_modules). `ruby -c` passed on the Ruby files, Sass compiled the SCSS, the data tests ran in a stand-in runner, and the screen's component tests ran under Jest 30 and React Testing Library from a sibling checkout with a stand-in TypeScript stripper and stubs for `lucide-react`, the Radix dialog and `zustand`: all 7 passed there, which is evidence rather than the project's own test run.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Implemented 2026-11-05 (not deployed; on branch `backlog/workload-uses-resource-capacity`): the People tab shows each week's open-task hours beside the allocation and warns when either is over capacity; the Workload view uses these capacities. Not verified: lint, the type-check and a browser (see the task's `Blocked` note).
