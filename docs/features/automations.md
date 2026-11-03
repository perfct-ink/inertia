# Automations

## What it does
A Space can have rules that act on their own: **when** something happens, **if** some conditions hold, **then** do something. This is the foundation (the rule builder, the rule store and the engine); it starts small on purpose.

- **One trigger**: "A task's status changes", optionally narrowed with a From status and a To status (each defaults to "Any status").
- **Conditions** (optional, all must hold): a task field compared with **is**, **is not** or, for statuses and priorities, **is any of**. The fields are Status, Priority and Assignee. Assignee is compared with is / is not only, and "nobody" is the choice "Unassigned".
- **Two actions** (at least one, run in order): "Change status to" and "Assign to" (a person of the Space, or Unassigned). Both set a task field.
- **Where it runs**: when `PATCH /api/v1/tasks/:id` changes a task's status (the endpoint every web edit of a task uses, such as a board drag, My work, the task lists and the embedded task lines; the task lists refetch afterwards so they show what the automations did), the Space's enabled rules for that trigger are evaluated against the task and the matching rules' actions are applied before the answer is sent. The response is the task as it is after the automations, plus `automations` (the rules that ran, `[{ rule_id, rule_name }]`).
- **Manage them** at `/automations` ("Automations" in the Space menu in the sidebar header): a card per rule with its name, an On/Off badge and When / If / Then lines in the Space's own status names; admins and owners can build a new one, edit, turn on or off, and delete (with a confirmation).
- **The rule builder** (inline form, name then three steps): When (the trigger and its From/To dropdowns), If (add or remove conditions; "is any of" shows the options as checkboxes), Then (add or remove actions, up to five; the last one cannot be removed). Mistakes are reported in the form before anything is sent; the server checks again.

## How rules are kept and evaluated
- `automation_rules` table, model `AutomationRule` (shown to users as "Automation"): `workspace_id`, `created_by_id` (nullable, cleared by the database if the user is deleted), `name`, `enabled` (default true), `trigger_type`, and three JSON columns: `trigger_config` (`{ "from": "todo", "to": "done" }`, keys optional), `conditions` (`[{ "field": "priority", "operator": "in", "value": ["high", "urgent"] }]`) and `actions` (`[{ "type": "assign", "config": { "user_id": 7 } }]`). Index on `(workspace_id, trigger_type)`.
- The shape of those JSON values is defined by one registry, `Automations::Registry` (`backend/app/services/automations/registry.rb`), mirrored by `frontend/src/data/automation.ts`. The two must be changed together. Both hold: the fields (`status`, `priority`, `assignee_id`), the operators, the triggers, the actions and the limits.
- `Automations::Definition` validates a rule against the registry and returns sentences ("Condition 2: pick a valid priority"). `AutomationRule` runs it, requires a name of at most 80 characters (extra spaces collapsed), requires every person named to be in the Space (a membership or a team), and refuses a 51st rule in a Space.
- `Automations::Evaluator` is plain Ruby with no Rails or database. `Evaluator.call(rules, event)` returns `[{ rule_id:, rule_name:, actions: [...] }]` for the rules that fire: enabled, valid, same trigger, trigger settings match, every condition holds. Keys may be strings or symbols.
- `Automations::Runner` (`#task_status_changed(task, from:)`, `#call(event, task)`) loads the Space's enabled rules for the trigger in id order, asks the evaluator, and applies each matching rule's actions to the task in one transaction per rule. It never raises: a rule that cannot run (for example it assigns someone who has since left the Space) is rolled back, logged and returned in `result.errors`, and the other rules and the task edit carry on. Every rule sees the task as it was when the event happened; where two rules set the same field the later rule (higher id) wins.
- **Loop guards**: (1) an action changes the task with a plain save and reports no event, so an action's own change never starts another rule; (2) an event carries a `depth` (0 for a person's change) and the evaluator runs no rules for an event at `Registry::MAX_DEPTH` (1) or deeper; (3) the event lists `fired_rule_ids` so a rule cannot fire twice in one chain; (4) one event runs at most `MAX_RULES_PER_EVENT` (10) rules. Limits per rule: 10 conditions, 5 actions, 20 values in an "is any of"; per Space: 50 rules.

## Adding to it
This is what the sibling backlog items (`automation-triggers`, `automation-actions`, `automation-recipe-templates`, `automation-run-log-and-per-space-limits`, `button-field`) build on.
- A **trigger** is an entry in `Registry::TRIGGERS` (label, `params` mapping each setting to a field's options, and a `matches` lambda over the event) and in `AUTOMATION_TRIGGERS`, plus a call to `Automations::Runner#call` with an event hash from where the event happens. An event is `{ "type", "task" => the task's fields, "changes", "depth", "fired_rule_ids" }`.
- A **field** a condition can test or an action can set is an entry in `Registry::FIELDS` and `AUTOMATION_FIELDS` (`enum` with listed options, or `user`).
- An **action** is an entry in `Registry::ACTIONS` (label, `params`, and a `handler` symbol) and `AUTOMATION_ACTIONS`, plus a private `apply_<handler>(task, action)` method in the Runner (`apply_set_field` covers actions that set one field). A test fails if an action names a handler the Runner does not have.
- An action that causes events of its own (create item, create subtask) must pass `depth: event depth + 1` and the rules already fired, so the guards above hold.
- The **run log** and per-Space settings belong in their own task; the Runner's `Result` (`applied`, `errors`) is what a log would record.

## API
All under `/api/v1`, scoped to the Space named by `X-Workspace-Id`.
- `GET /automation_rules` (all rules of the Space, by id), `POST /automation_rules`, `PATCH /automation_rules/:id`, `DELETE /automation_rules/:id`. The body is `{ "automation_rule": { name, enabled, trigger_type, trigger_config, conditions, actions } }`. Switching a rule on or off is `PATCH` with `{ "automation_rule": { "enabled": false } }`; there is no separate enable/disable endpoint. An invalid rule answers 422 with `{ "errors": [...] }` sentences. A rule of another Space is 404.
- Rails drops `null` inside a JSON array, so an "is any of" list cannot hold "nobody"; the registry refuses it and the builder offers "is any of" only for statuses and priorities. A `null` value (Unassigned) in `is` / `is not` and in an Assign action is kept.
- `PATCH /tasks/:id` now also returns `automations` (see above).
- Frontend: `frontend/src/api/automationRules.ts` (`AutomationRuleApi` on the `ApiResource` base and its hooks); pure types, option lists, validation, editing helpers and the sentences in `frontend/src/data/automation.ts`.

## Who can view and change
- Read (`GET`): members, admins and owners. Viewers get 403 and the page tells them automations are for the members of the Space. A user outside the Space gets 404.
- Create, change, switch on or off, delete: admins and owners (including an admin through a team) only; members get 403 on the server and see the rules read-only with a note.
- A person's role is the highest of their membership and their teams, as everywhere (see [teams.md](teams.md)).

## Web entry points
- `frontend/src/view/automations/` (`AutomationsScreen.tsx` with the role gate and list, `AutomationCard.tsx`, `AutomationForm.tsx`, `ConditionRow.tsx`, `ActionRow.tsx`, `FieldSelect.tsx`, `AutomationsScreen.scss`), route `/automations` in `App.tsx`. The page reuses the Planning screens' stylesheet for its header, cards and empty state, and uses the shared `Button`, `Input`, `Select`, `FormError` and `ConfirmDialog`. The sidebar shows the Space's projects on this page, like `/space` (`hooks/useOpenProject.ts`).
- The entry point is the **Automations** item in the Space menu (`components/workspace/WorkspaceSwitcher.tsx`, shown to members and above). No sidebar or project-navigation entry was added, because `Sidebar.tsx` and `ProjectNav.tsx` were being changed on `main` at the time.
- Phone: the rows wrap, each dropdown takes a full line when the screen is narrow, the When / If / Then summary stacks, and the buttons are 40px tall. Dark mode follows the app tokens. Failed calls show the shared error notice; form mistakes show in the form.

## Tests
- Backend (written, not run here): `backend/test/models/automation_rule_test.rb`, `backend/test/controllers/automation_rules_controller_test.rb` (roles, validation, scoping, limit), `backend/test/controllers/task_automations_test.rb` (the `PATCH /tasks/:id` path), `backend/test/services/automations/runner_test.rb`.
- Pure Ruby, run here with a minitest shim and passing: `backend/test/services/automations/evaluator_test.rb` (11 tests) and `definition_test.rb` (8 tests).
- Frontend: `frontend/src/data/automation.test.ts` (19 tests, run through the offline shim, passing), `frontend/src/view/automations/AutomationsScreen.test.tsx` (13 tests) and `frontend/src/components/workspace/WorkspaceSwitcher.test.tsx` (2 tests), both run with the Jest stand-in and passing.

## Known limits
- **Synchronous**: rules run inside the request that changed the task, because there is no job queue. A slow or large rule set slows that request; the caps above bound the work (at most 10 rules and 50 actions per event). When a queue exists, move `Runner#call` into a job.
- Only changes made through `PATCH /tasks/:id` start rules. A status change from anywhere else (task creation, an import, a Space transfer, a future server-side path) does not. A rule's own changes never start rules.
- Rules apply to every task in the Space; there is no limit to a project or folder yet.
- The people offered are the Space's direct members; a person who is only on a team can be named through the API but is not in the dropdown (see `docs/backlog/show-team-members-in-space-member-lists.md`).
- A rule that names someone who later leaves the Space keeps its name in the list, shows "Unknown person" in the builder and stops running (the failure is only logged and returned by the Runner); nothing tells the Space admins yet. There is no run log or history of what ran.
- Editing a rule that the registry no longer accepts is refused, which includes turning it off.
- Names are not unique; the same rule can be made twice.
- Statuses use the Space-level names from Configurable statuses; a folder's own renames are not used (a rule is not tied to a folder).

## History
- Implemented 2026-11-03 (not deployed; on branch `backlog/rule-builder-trigger-condition-action`). Migration `20261103110001_create_automation_rules.rb`; `schema.rb` was edited by hand.
- Choices for Alex (conservative): admins and owners manage rules and members read them (viewers cannot); one trigger, three fields and two actions, with no notify or comment action because neither comments nor notifications exist on `main`; rules run in the request; a failing rule never fails the task edit; a rule can only be changed by the Space's admins, and a Space is capped at 50 rules.
- Not implemented: other triggers, other actions (notify, move, create item, set date, create subtask), recipe templates, run log, button field, per-folder rules, a queue.
- Not verified: the migration and `schema.rb` (no database), the Rails tests (`rails test`; the controller, model, runner and task-automation tests have never run), `npm run lint`, `tsc -b`, and the page in a browser at 375px and desktop in light and dark. Ran offline: `ruby -c` on the Ruby files, the pure Evaluator and Definition tests, the SCSS compile, the data test, and the two Jest suites with the stand-in.
