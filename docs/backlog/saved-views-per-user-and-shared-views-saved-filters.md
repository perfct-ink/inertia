---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/saved-views-per-user-and-shared-views-saved-filters
status: incomplete
---
# Saved views per user and shared views, saved filters

## Objective

Saved views per user and shared views, saved filters

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Saved views per user and shared views, saved filters works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built 2026-11-08 on a fresh branch from `origin/main` (the 2026-10-19 branch was only a Task-table slice, stacked on a since-merged branch). Done: `saved_views` table, `SavedView` model, `SavedViewsController` (own plus shared views; only the owner, or an admin for a shared view, changes or deletes; every member including viewers can save and change their own, see Decisions), the `SavedViews` control, and saved views on the Task table, Pivot, Calendar, folder Gantt and Workboard filters. Documented in `docs/features/saved_views.md`. This file stays because the checks below could not run here.

Ran (offline, again after the 2026-11-09 viewer change): `ruby -c` on every changed Ruby file; the static import/syntax/SCSS check; the pure data tests (`savedView`, `taskTable`, `pivot`, `calendar`, `schedule`, `task`); the Jest stand-in for `SavedViews`, `TaskTableScreen`, `PivotScreen` and `CalendarScreen`.

Not run (no network, node_modules, database): `rails db:migrate` (`backend/db/schema.rb` was edited by hand), `rails test`, `npm run lint`, `tsc`, the real Jest suite (the Gantt and Workboard screen tests could not even run in the stand-in), and a browser check.

To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect no diff beyond a clean dump
cd backend && rails test test/models/saved_view_test.rb test/controllers/saved_views_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: on `/task-table`, `/pivot`, `/calendar`, a folder's Gantt tab and `/tasks` (Filter panel), save a private view, reload and apply it, share one, sign in as another member and check they see it but cannot rename or delete it, sign in as an admin and check they can, and as a viewer check the Save view button is shown, a private and a shared view save, the viewer can rename and delete their own, and cannot manage a view a member shared. Check that a failed save shows the error notice.

Decisions: **Alex decided 2026-11-09: viewers can save shared views.** Every Space member, viewers included, may save a view as private or shared and edit or delete their OWN views (this replaces the earlier conservative build where saving needed the member role). Admins and owners still change or delete any shared view, nobody sees another person's private view, and a viewer cannot change someone else's shared view. Built in `SavedViewsController` (skips `WorkspaceScoped`'s member-role write check), the always-shown Save view button, and the flipped and new tests (viewer saves private and shared, changes and deletes their own, is refused someone else's shared view, an admin can change a viewer's shared view, a stranger gets 404). Also decided by Alex earlier: an admin can change a shared view but never see another person's private one; saved views belong to the Space, not to a project. Follow-up pages are in `saved-views-for-more-pages.md`.

