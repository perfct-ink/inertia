---
priority: p2
depends_on: []
branch: backlog/rule-builder-trigger-condition-action
---
# Rule builder: trigger → condition → action

## Objective

Rule builder: trigger → condition → action

## Requirements / notes

Monday's core differentiator.

## Context

Section "Automations" of the retired shared backlog.

## Acceptance criteria

- Rule builder: trigger → condition → action works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built and pushed on `backlog/rule-builder-trigger-condition-action`, not merged, because the Rails, lint and type checks could not run here (no network, `node_modules` or database). See [automations](../features/automations.md) for what exists and its limits.

- Done: `automation_rules` table (migration `20261103110001`, `schema.rb` edited by hand), the `Automations` registry, definition checks, pure evaluator and runner, admin-only REST endpoints, the task status change hook in `PATCH /tasks/:id`, the `/automations` builder page and the Space menu entry, the data file with tests, and the feature doc.
- Ran: `ruby -c` on the changed Ruby files; the pure evaluator and definition tests through a minitest shim; the data test through the offline shim; the two Jest suites (`AutomationsScreen`, `WorkspaceSwitcher`) with the stand-in; the SCSS compile and the static import checks.
- Did not run: `rails db:migrate` (then diff `db/schema.rb`), `rails test` (the model, controller, runner and task-automation tests are new and have never run), `npm run lint`, `npx tsc -b`, the full `npm test`, and a browser check of `/automations` at 375px and desktop in light and dark.
- To verify and merge: `cd backend && bundle install && rails db:migrate && rails test`, then `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then open `/automations` as an admin (build a rule, turn it off and on, edit, delete) and as a member (read only), and change a task's status on the board to see the rule act.
- Decisions for Alex: viewers cannot read automations; rules run synchronously in the request; no notify or comment action because neither exists on `main`; a Space is capped at 50 rules.
- The task is not removed yet; delete this file when the branch is merged. The siblings that depend on it (`automation-triggers`, `automation-actions`, `automation-recipe-templates`, `automation-run-log-and-per-space-limits`, `button-field`) extend the registries described in the feature doc.
