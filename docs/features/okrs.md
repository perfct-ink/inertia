# OKRs

## What it does
`/okrs` (sidebar rail "OKRs") lists the Space's objectives, each with key results.

- **Objective**: title, description, status (planned/active/done), owner, period (start and target date), health, percent and a 0 to 1 score. Percent is the average of its key results' percents (0 with none); score is percent/100 to two decimals. Health uses the shared `PlanningHealth` rule against the period end (see [roadmap.md](roadmap.md)).
- **Key result**: either a number (start value, current value, target value, optional unit) or linked to an initiative. A number key result's percent is progress from start toward target, clamped 0 to 100; a target below the start works (e.g. churn). A linked one takes the initiative's task percent (done tasks over tasks under its epics).
- **Page**: "New objective" adds by title; each card has a title, health badge, score, delete button, start and end date inputs, progress bar, and its key results. A number key result has an inline current-value field saved on blur; a linked one shows "done/total tasks". An add form chooses "A number" (from/to/unit) or an initiative. Key results can be deleted.

## API and models
- `objectives` (`workspace_id`, `owner_id` nullable, `status`, `start_date`, `target_date`, title, description) and `key_results` (`objective_id`, `initiative_id` nullable, nullified when the initiative is deleted, `start_value`, `target_value`, `current_value`, `unit`, `position`).
- Validations: title required; objective target not before start; owner must be a Space member; target value required unless linked and must differ from start; linked initiative must be in the same Space.
- `GET/POST /api/v1/objectives`, `PATCH/DELETE /api/v1/objectives/:id` (key results nested in responses, ordered by position), `POST /api/v1/key_results` (with `objective_id`), `PATCH/DELETE /api/v1/key_results/:id`. Frontend: `api/objectives.ts`.

## Who can view and change
Scoped to the current Space; a key result of another Space's objective is 404. I did not check for role-based limits.

## Web entry points
`/okrs` (`view/okrs/OkrsScreen.tsx`).

## Tests
- `backend/test/models/objective_test.rb` (key result math, linked results, score, health, validations)
- `backend/test/controllers/objectives_controller_test.rb` (create, nested key results, other-Space isolation)
- `frontend/src/data/okr.test.ts`, `frontend/src/view/okrs/OkrsScreen.test.tsx`

## Known limits
- The API accepts `owner_id` and `status`, but the page has no owner or status picker, and objective title and description cannot be edited after creation (see `docs/backlog/okr-owner-status-and-editing.md`).
- A key result's current value is overwritten in place; no history of check-ins (see `docs/backlog/key-result-check-in-history.md`).
- Objectives are not linked to anything but initiatives (via key results). The IO Map does not exist yet, so there is nothing to link to.
- Key results cannot be edited after creation except the current value, and there is no reordering UI although `position` exists.
- The client lists all initiatives in the link picker, including finished ones.

## History
- Implemented 2026-10-17. Committed locally; not pushed or deployed.
- Not implemented: owner picker, check-in history, IO Map link.
- Not verified: no tests, lint, type-check, migration or browser run (no dependencies installed, no network).
