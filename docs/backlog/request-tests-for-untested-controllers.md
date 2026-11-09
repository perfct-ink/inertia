---
priority: p2
depends_on: []
components: [backend]
---
# Request tests for the controllers that have none

## Objective

Every API controller is covered by a request test, as `docs/rules/backend.md` (API) asks.

## Context

The rules audit (see `docs/features/rules_compliance.md`) matched each controller in `backend/app/controllers/` to the tests in `backend/test/` by file name and by the URLs the tests call. These have no request test at all:

- `Api::V1::EventsController` (`/api/v1/events`) and `EventTasksController` (events and their tasks)
- `Api::V1::SharesController` (`/api/v1/shares` and the public `/api/v1/shared/:token`)
- `Api::V1::QuipImportsController` (`/api/v1/quip_imports`)
- `Api::V1::Auth::RegistrationsController` (sign-up) and `Auth::SessionsController` (sign-in and sign-out)
- `Api::V1::TeamMembersController` (`/api/v1/teams/:id/members`; only touched indirectly by `teams_controller_test.rb`)

Others are covered only under another test's name (for example documents, folders, epics, initiatives and key results), so they are fine for now.

## Requirements / notes

- One `*_controller_test.rb` per controller above in `backend/test/controllers/`, copying the patterns of the neighbouring tests (`tasks_controller_test.rb`, `teams_controller_test.rb`).
- Cover the happy path, a refused request (unauthenticated, or a Space the person is not in) and one validation error for each action. For shares, cover the public token access and that a deleted share stops working.
- No behaviour change: if a test finds a bug, note it in the test's commit or a new backlog file rather than fixing it here.

## Acceptance criteria

- `rails test` passes with a request test for each controller listed.
- `docs/features/rules_compliance.md` (backend.md API row) is updated.
