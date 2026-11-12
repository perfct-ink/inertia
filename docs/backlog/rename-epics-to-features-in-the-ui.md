---
priority: p2
depends_on: [features-with-requirements-docs]
components: [frontend]
---
# Say "feature" instead of "epic" everywhere in the UI

## Objective

Alex's decision (2026-10-23) was to call epics Features in the UI, the way workspaces are Spaces and tables are Collections. `features-with-requirements-docs` did it for the Features page and the sidebar and rail link. Finish it.

## Requirements

- Replace the user-facing word "epic" with "feature" on the epic plan page, Hierarchy, Roadmap, Gantt and timeline groupings, kanban "organize by epic", quick add, the task detail and task table columns, the Ideas "promote to epic" action and its notes, folder pages, and error messages (the same way `spaceWording` in `util/errorMessage.ts` handles "workspace").
- Code, API paths, the database, query keys and routes (`/epics`, `/plan?epic_id=`) keep `epic`.
- Update the feature docs that say "epic" to say "feature" where they describe what a user sees.

## Acceptance criteria

- No screen shows "epic" or "epics" to a user. A test or grep guard fails when a user-facing string reintroduces it.
- Works unchanged at 375px and in dark mode. The feature docs and `docs/rules/product.md` record the naming.
