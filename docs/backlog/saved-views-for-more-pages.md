---
priority: p3
depends_on: [saved-views-per-user-and-shared-views-saved-filters]
components: [frontend]
branch: backlog/saved-views-for-more-pages
status: incomplete
---
# Saved views for more pages

## Objective

Saved views (see `docs/features/saved_views.md`) cover the Task table, Pivot, Calendar, the folder Gantt and the Workboard filters. Extend them to the remaining pages that keep view choices, one page at a time.

## Requirements

- Cards tab of a folder: it has no sort, grouping or filter yet, so first add them (status, epic, due date, sort), then let a view keep them.
- Task timeline (`/timeline`), Workload, My work, Roadmap and the Hierarchy tree: list which choices each keeps for a visit (zoom, grouping, hidden items) and let a view keep them.
- Each page adds its name to `SavedView::PAGES` (backend) and `SAVED_VIEW_PAGES` (`frontend/src/data/savedView.ts`), a `parse...Config` next to its data file with a test, and `<SavedViews />` in its toolbar. No new endpoint.

## Acceptance criteria

- A signed-in member can save, apply, update and delete a view on each page above; shared views follow the permission rule in `saved_views.md` (only the owner, or an admin for a shared view, can change one).
- Old or malformed stored configs fall back to defaults.
- Tests cover the parsers and each screen; the feature doc lists the new pages; this file is removed.

## Progress

Done on this branch: the Task timeline (grouping) and Workload (weekly capacity) pages, with parsers, screen tests and the backend page list. Left: the Cards tab (first add sort, grouping and filter), My work, Roadmap and the Hierarchy tree (each: list what it keeps, add a parser and `<SavedViews />`). Not run: `rails test` (the model test lists the new pages), a browser check. Keep this file until the remaining pages are done.
