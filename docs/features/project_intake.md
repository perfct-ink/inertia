# Project intake

## What it does
**Turned off** (2026-11-03): nothing in the app links here and `/project-requests` redirects to `/space`. The screen, API, models and existing requests are unchanged; to turn it back on, restore the route in `App.tsx` (it rendered `ProjectRequestsScreen`) and add a Project requests link to `SPACE_SECTIONS` in `components/file-manager/SidebarRail.tsx`.

`/project-requests` is an intake form with an approval step for new projects.

- **Submit**: "New request" opens the intake form: project name (required), what it is, why it matters, start date, target date and priority (low, medium, high; default medium). A target date before the start date is rejected in the form and on the server.
- **Review**: the list has Pending, Approved and Declined tabs, each with a count (the tabs only show once a request exists). Each card shows the name, a status badge, who asked and when, the priority, the dates, the description and the reason it matters. Every member of the Space can read every request.
- **Approve**: an admin or owner clicks Approve, optionally adds a note, and the Space gets a project: a folder with `kind: project` under the document root, named after the request. The card then shows who approved it, when, the note, and an "Open project" link to the folder page. The new project also shows on the Projects page and in the sidebar tree (see [projects.md](projects.md)).
- **Decline**: an admin or owner clicks Decline and must give a reason; no project is created. A declined request can be reopened (back to pending) by an admin or owner.
- **Change or remove**: the person who submitted a request can edit or withdraw it while it is pending. Admins and owners can edit any pending request and delete any request. Deleting an approved request does not delete the project it created.

## API and models
- `project_requests` table, model `ProjectRequest` (shown to users as "Project request"): `workspace_id`, `requested_by_id`, `decided_by_id` and `project_id` (the created folder), each nullable and cleared by the database if the user or folder is deleted; `name`, `description`, `justification`, `priority` (0 low, 1 medium, 2 high), `start_date`, `target_date`, `status` (0 pending, 1 approved, 2 declined), `decision_note`, `decided_at`.
- Validations: name required; target date not before start date; status and priority must be listed values; a decision note is required when declined (shown as "Reason").
- `ProjectRequest#approve!`, `#decline!` and `#reopen!` re-read the row under a lock and refuse a request that is not in the right state, so two admins deciding at once cannot create two projects. `approve!` creates the folder and records the decision in one transaction.
- `GET/POST /api/v1/project_requests`, `PATCH/DELETE /api/v1/project_requests/:id`, `POST /api/v1/project_requests/:id/approve` (optional `decision_note`), `/decline` (`decision_note` required) and `/reopen`. Changing a decided request through `PATCH` returns 422. Frontend: `api/projectRequests.ts`; pure rules and form helpers in `data/projectRequest.ts`.

## Who can view and change
- Scoped to the Space named by `X-Workspace-Id`; a non-member gets 404.
- View: any member, including viewers.
- Submit: members, admins and owners (viewers get 403, like every other write).
- Edit or delete while pending: the person who submitted it, or an admin or owner. Delete after a decision: admin or owner only.
- Approve, decline, reopen: admins and owners only.

## Web entry points
`frontend/src/view/project_requests/` (`ProjectRequestsScreen.tsx`, `ProjectRequestForm.tsx`, `ProjectRequestDecisionDialog.tsx`), route `/project-requests` in `App.tsx` (now a redirect to `/space`), no link while turned off. The page reuses the Planning screens' stylesheet for its header, tabs and list. Failed calls show the error notice raised by the shared API client; form mistakes show next to the form.

## Tests
- `backend/test/models/project_request_test.rb` (defaults, validations, approve creates the project under the root, no double approval, decline needs a reason, reopen, project deletion keeps the request)
- `backend/test/controllers/project_requests_controller_test.rb` (submit and read, validation errors, viewer and non-member, Space scoping, who can edit and delete, approve, decline and reopen permissions)
- `frontend/src/data/projectRequest.test.ts` (ran offline, passes), `frontend/src/view/project_requests/ProjectRequestsScreen.test.tsx`

## Known limits
- Approval creates only the project folder. The request's description, reason and dates are not copied into a brief document or onto the folder, so they stay on the request (the card keeps the link). Folders have no owner, status or date fields yet.
- Any member of the Space can read every request, including the reason it matters. There is no private or reviewer-only request.
- No notification, email or comment thread when a request is submitted or decided; people see the result on the page.
- No required approver list, multi-step approval or approval limits: any one admin or owner decides.
- A request can only be edited while pending, so an approved request is a record of what was asked. Renaming the project folder later does not change the request.
- Project requests are not in quick add (Cmd+K) or the keyboard shortcut list.

## History
- 2026-11-03: turned off in the web app (route redirects, links removed); the API still answers.
- Implemented 2026-11-01 (not deployed; on branch `backlog/project-intake-form-with-approval-workflow`).
- Conservative choices for Alex: only admins and owners approve; every member can read all requests; a decline needs a written reason; nothing is copied into the project beyond its name.
- Not implemented: brief document, notifications, multi-step approval, project templates.
- Not verified: the migration (`schema.rb` was edited by hand), Rails tests, lint, type-check, Jest tests and the page in a browser (no database, node_modules or network here). Only `ruby -c` on the Ruby files, the offline parse/compile checks and the pure `data/projectRequest.test.ts` ran.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
