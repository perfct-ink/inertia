# Saved views

## What it does
A page keeps its own choices (sort, grouping, filter, zoom) for the visit. A **saved view** keeps a named copy of them, so you can come back to "my overdue bugs" or "Gantt by weeks" in one pick. Views are **private to you** or **shared with the Space**.

A **Saved view** dropdown sits in the toolbar of these pages:

| Page | Entry point | A view stores |
| --- | --- | --- |
| Task table | `/task-table` | sort column and direction, group by, title filter, hidden columns |
| Pivot | `/pivot` | rows field, columns field |
| Calendar | `/calendar` | whether tasks and events are shown (not the month you are looking at) |
| Gantt tab of a folder | `/folders/:id?view=gantt` | zoom, shade weekends, highlight critical path (not the baseline or the folder's dependency mode) |
| Workboard | `/tasks`, in the **Filter** panel | the status, type, folder, assignee, epic and sprint filters and the search text (not the Board/List tab) |

- Pick a view to apply it. **Default view** puts the page back to its starting choices. Applying only sets the page's controls; you can keep changing them, and a **Changed** note appears beside the dropdown while the page no longer matches the picked view.
- **Save view...** names the current choices and offers **Share with the Space**. The new view is picked straight away.
- For a view you may change, **Manage** opens a menu: **Update with current settings** (only while changed), **Rename or share...** and **Delete view...** (asks first; the note says when it is shared).
- The list has **My views** (shared ones are tagged "(shared)") and **Shared with the Space** (each tagged with its owner's name). Someone else's private view never appears.
- A stored view is read back through a per-page parser, so an old or damaged one falls back to defaults instead of breaking the page (the Task table's Title column can't be hidden by a view; a Workboard filter on something since deleted just matches no tasks).
- Phones: the control wraps with the rest of the toolbar; nothing depends on hover.

## API and models
- `saved_views` table (migration `20261108100001_create_saved_views`): `workspace_id`, `user_id` (the owner), `page`, `name` (up to 80), `config` (JSON object, up to 10,000 bytes), `shared` (default false), timestamps; indexed by `workspace_id, page`. Model `SavedView` (`PAGES`: `task_table`, `pivot`, `calendar`, `gantt`, `tasks`; scope `visible_to(user)`; `changeable_by?(user, membership)`). Removing a Space or a user removes their views.
- `GET /api/v1/saved_views?page=` lists the signed-in person's own views plus the Space's shared ones (by name). `POST` creates (`page`, `name`, `shared`, `config`); `PATCH /:id` changes `name`, `shared` and `config` (never `page` or the owner); `DELETE /:id`. Responses are `SavedViewBlueprint` (`id`, `page`, `name`, `config`, `shared`, `user_id`, `owner_name`, timestamps). A bad name, page or config is a 422 with the reasons.
- The meaning of `config` belongs to each page: `parseTaskTableConfig` (`data/taskTable.ts`), `parsePivotConfig` (`data/pivot.ts`), `parseCalendarConfig` (`data/calendar.ts`), `parseGanttConfig` (`data/schedule.ts`), `parseTaskBoardConfig` (`data/task.ts`). The server only checks that it is a small JSON object.
- Frontend: `api/savedViews.ts` (`SavedViewApi` on `ApiResource`; `useSavedViews`, `useCreateSavedView`, `useUpdateSavedView`, `useDeleteSavedView`), `data/savedView.ts` (pages, `canChangeSavedView`, `groupSavedViews`, `savedViewLabel`, `sameConfig`), the control `components/SavedViews.tsx`. Adding a page means adding its name to `SavedView::PAGES` and `SAVED_VIEW_PAGES`, a `parse...Config` next to its data and a `<SavedViews page=... config parse onApply />` in its toolbar.

## Who can view and change
**Permission change, Alex decided 2026-11-09:** viewers may save views. Before this, saving needed the member role like every other write in a Space, and viewers could only apply shared views. Now every member of the Space, viewers included, saves a view as private or shared and edits or deletes their own. Nothing else is loosened: an admin or owner still changes any shared view, nobody sees another person's private view, and a person outside the Space reaches nothing.
- **See:** your own views, and every shared view in the Space, for any role (viewers included, so they can apply shared views). Another person's private view is invisible to everyone, admins and owners too (a request for it is a 404).
- **Change or delete:** the **owner** of a view; and, for a **shared** view only, a Space **admin or owner**. Other members get 403 on a shared view they don't own. An admin can't touch a private view.
- **Save:** any member of the Space, **viewers included** (Alex, 2026-11-09), saves a view, private or shared, and changes or deletes their own. `SavedViewsController` skips `WorkspaceScoped`'s member-role check for writes; the Space still comes from `X-Workspace-Id` and a Space the person doesn't belong to is a 404. The **Save view...** button shows for every role. A viewer who tries to change someone else's shared view gets 403 and the **Manage** menu isn't offered.
- Views belong to the active Space (`X-Workspace-Id`), not to a project, so the same views show whichever project is selected.

## Tests
`backend/test/models/saved_view_test.rb`, `backend/test/controllers/saved_views_controller_test.rb` (visibility, owner/admin/member/viewer rules including viewers saving, changing their own and being refused someone else's, immutable page and owner, bad input, other Spaces); `frontend/src/data/savedView.test.ts`, the parser tests in `data/taskTable.test.ts`, `pivot.test.ts`, `calendar.test.ts`, `schedule.test.ts`, `task.test.ts`; `components/SavedViews.test.tsx`; and one apply test and one save test in each of `view/task_table/TaskTableScreen.test.tsx`, `view/pivot/PivotScreen.test.tsx`, `view/calendar/CalendarScreen.test.tsx`, `view/folder_detail/GanttPane.test.tsx`, `view/tasks/TasksScreen.test.tsx`.

## Known limits
- Five pages only. The Cards tab has no sort or filter to save, and the Task timeline, Workload, My work and the planning screens keep no view choices yet (see `docs/backlog/saved-views-for-more-pages.md`).
- No default view per person, no auto-apply on opening a page, no URL for a view, and no view order or folders.
- Names are not unique; two views can share a name.
- The Workboard stores ids (folder, epic, sprint, assignee). A view that points at something deleted shows no tasks until you change the filter.
- A person's private views stay in the database when they leave a Space (nobody can see them); they come back if the person rejoins.
- Updating a shared view changes it for everyone who uses it, with no history.

## History
- Implemented 2026-11-08 on branch `backlog/saved-views-per-user-and-shared-views-saved-filters` (first attempt 2026-10-19 covered only the Task table; rebuilt on the current app). Not merged or deployed.
- 2026-11-09: Alex decided viewers may save shared (and private) views and change their own; the controller, the Save view button, the tests and this doc follow it.
- Not verified: `rails db:migrate` (schema edited by hand), `rails test`, `npm run lint`, `tsc`, the real Jest run, and a browser look at desktop and 375px, light and dark. Offline: Ruby syntax checks, the static import/syntax/SCSS check and the Jest stand-in for `SavedViews`, Task table, Pivot, Calendar and the data tests. The Gantt and Workboard screen tests could not run in the stand-in (it lacks `QueryClientProvider` and dnd-kit).
