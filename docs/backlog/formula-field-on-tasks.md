---
priority: p2
depends_on: [custom-fields-on-tasks, formula-field]
components: [frontend, backend]
---
# Formula field on tasks

## Objective

Let a Space add Formula fields to tasks (for example `DAYS({Due date}, TODAY())` for days left), using the same language as Collection formula fields.

## Requirements / notes

- Needs `custom-fields-on-tasks.md`: tasks only have a fixed field set today, so there is nothing for a formula to read yet.
- Reuse `frontend/src/util/expression.ts` and `frontend/src/data/formula.ts`; do not copy them. The formula can refer to built-in task fields (title, status, due date, assignee) as well as custom ones.

## Acceptance criteria

- A formula field can be added to tasks and shows its result on the task list and the task detail.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; `docs/features/formula_field.md` is updated and this file is removed.
