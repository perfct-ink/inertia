---
priority: p1
depends_on: []
branch: backlog/project-intake-form-with-approval-workflow
---
# Project intake form with approval workflow

## Objective

Project intake form with approval workflow

## Current state

Not present

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Project intake form with approval workflow works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/project-intake-form-with-approval-workflow`; documented in `docs/features/project_intake.md`. This file is left in place and is deleted when the branch is merged.

Done: `project_requests` migration (`20261101100001`) and hand-edited `schema.rb`, `ProjectRequest` model (approve, decline and reopen under a row lock), `/api/v1/project_requests` controller and routes, `/project-requests` page with the intake form, tabs, approve/decline dialog, edit, withdraw and reopen, a sidebar rail button, and tests.

Ran: `ruby -c` on every changed Ruby file; the offline static checks (`/tmp/runner/all.sh`: TS/TSX parse, import resolution, SCSS compile, YAML); the pure `frontend/src/data/projectRequest.test.ts` (passes).

Did not run (no network, node_modules or database): `rails db:migrate` (diff `schema.rb`), `rails test`, `npm run lint`, the TypeScript type-check, Jest (`ProjectRequestsScreen.test.tsx`), and the page in a browser.

To verify and merge:
1. `cd backend && rails db:migrate`, then confirm `git diff db/schema.rb` is empty (it was edited by hand), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`.
3. Run the app, open `/project-requests` as a member, an admin and a viewer, light and dark, at 375px and desktop: submit, edit, withdraw, approve (the project appears under Projects and in the sidebar), decline (reason required) and reopen.

Decisions for Alex (conservative defaults are built): only admins and owners approve; every member can read every request; declining needs a reason; approval creates only the project folder (no brief document, owner or dates on the folder).

Merge hazards: `frontend/src/components/file-manager/Sidebar.tsx` (one rail button and an icon import), `frontend/src/App.tsx` (one route), `backend/config/routes.rb`, `backend/config/locales/en.yml`, `backend/db/schema.rb` (version line, new table and foreign keys) and `docs/features/README.md` (one row) are shared files other branches also edit.
