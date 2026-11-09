---
priority: p1
depends_on: []
branch: backlog/auto-fields
status: incomplete
---
# Auto fields: item ID, creation log, last updated, created by

## Objective

Auto fields: item ID, creation log, last updated, created by

## Requirements / notes

- Applies to **tasks** (Collections get created/updated time and auto-number in `collection-field-types.md`).
- **Detail panel only** (Alex, 2026-11-09 groom): item ID, created by, created at and last updated show in the task's detail panel. The task table doesn't get new columns for them. Note: branch `backlog/auto-fields` (2026-11-07, before this decision) also adds ID, Created by, Created and Updated columns to the task table; remove those before merging.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Auto fields: item ID, creation log, last updated, created by works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built on branch `backlog/auto-fields` (2026-11-09), following Alex's 2026-11-09 groom: item ID, created by, created at and last updated show in the task detail dialog only; the task table, its filters and sorting have nothing for them (the table columns of the earlier version of the branch are gone). Done: `tasks.created_by_id` migration `20261108140001` with `schema.rb` hand-edited, `Task belongs_to :created_by`, set from the signed-in user on create and never from params, `created_by_name` in `TaskBlueprint` with `created_by` preloaded in the task, folder and event payloads, `autoFields` in `data/task.ts`, `components/tasks/TaskAutoFields.tsx` shown in `TaskDetail`, the Minitest file and Jest tests, `docs/features/task_auto_fields.md` and its README row.

Ran (offline): `/tmp/runner/all.sh` static checks (babel parse, sass compile, `ruby -c` on the changed Ruby files), the pure `data/task.test.ts` tests (19 passed), and the stand-in Jest for `TaskAutoFields.test.tsx` and `TaskDetail.test.tsx` (passed). The stand-in cannot run one older dynamic-import test in `data/task.test.ts` (it fails the same way on main).

Not run (no network, node_modules, database or browser): `rails db:migrate` and `rails test`, ESLint, Stylelint, `tsc -b`, the real Jest run, a browser look.

To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect no diff
rails test test/controllers/tasks_auto_fields_controller_test.rb && rails test
cd ../frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open the Tasks board, click the pencil on a card, and check the muted block at 375px and desktop width in light and dark: Item ID, Created by, Created, Last updated (exact time on hover). Check the task table has no new columns. When all of that passes, delete this file as part of the merge.
