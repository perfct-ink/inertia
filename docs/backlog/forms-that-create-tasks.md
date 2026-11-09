---
priority: p2
depends_on: []
branch: backlog/forms-that-create-tasks
---
# Forms that create tasks (public or internal)

## Objective

Forms that create tasks (public or internal)

## Current state

None

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Forms that create tasks (public or internal) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Built, not merged: nothing could be run against a database or `node_modules` here, and one product call is Alex's.

**Done** (see `docs/features/task_forms.md`): forms with up to 20 questions (short text, long text, date, choice) that each fill in part of a task; builder, fill-in page and responses list for Space members; an optional public link; migration `20261102010001_create_task_forms_and_submissions.rb` with `schema.rb` merged by hand with main's (tables `task_forms`, `task_form_submissions`); Rails and Jest tests; docs and `PUBLIC_FORMS_ENABLED` in `docs/services.md`. Merged `origin/main` into the branch (resolved `schema.rb`, `en.yml`, and the committed conflict markers in `docs/features/README.md`, keeping every row).

**Decision for Alex (privacy and abuse):** public (logged-out) submission is built but off. It needs all three: the server flag `PUBLIC_FORMS_ENABLED=true`, an admin or owner switching the form's public link on, and the unguessable token (rotated each time it is switched on). It has a 30-per-hour cap per form and a honeypot, but no per-IP limit or CAPTCHA (no gem for it is installed) and no contact field. Leave the variable unset to ship forms as internal-only; the public routes then answer 404.

**Checks run:** `ruby -c` on every changed Ruby file; `backend/test/models/task_form_schema_test.rb` run with a stub helper (9 tests pass); `data/taskForm.test.ts` through the offline shim (17 pass); the five component test files (`TaskFormFiller`, `FormsScreen`, `FormBuilderScreen`, `FormFillScreen`, `PublicFormScreen`) through `/tmp/runner/jest.sh` (all pass); `/tmp/runner/all.sh` (TypeScript parse, sass, yml/json parse).

**Checks not run:** `rails db:migrate` and `rails test` (model, controller and public-endpoint tests are unrun; the controller tests assume the usual JWT test setup), `npm run lint`, `tsc -b`, the real `npm test`, and any browser check.

**To verify and merge:**
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited version (the `task_forms` and `task_form_submissions` tables and their foreign keys), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
3. In a browser at 375px and desktop, light and dark: `/forms` (create a form, add each question type, reorder, save, fill it in, see the response and the new task on `/tasks`). With `PUBLIC_FORMS_ENABLED=true` as an admin, turn the public link on, open `#/f/<token>` in a private window and submit, then switch it off and check the link gives "This form isn't available".
4. Decide whether public forms should ship at all, and whether they need a per-IP limit first (see `docs/features/task_forms.md`, Known limits).

**Merge hazards:** edits shared files `backend/config/routes.rb`, `backend/db/schema.rb` (version `2026_11_02_010001`), `backend/config/locales/en.yml`, `backend/app/models/workspace.rb`, `backend/config/initializers/filter_parameter_logging.rb` (adds `:answers`), `frontend/src/App.tsx`, `frontend/src/components/file-manager/Sidebar.tsx`, `docs/features/README.md`, `docs/services.md`.
