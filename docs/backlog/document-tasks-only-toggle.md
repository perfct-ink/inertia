---
priority: p0
depends_on: []
branch: backlog/document-tasks-only-toggle
components: [frontend, backend]
---
# Collapse any document to just its tasks

## Objective

**Collapse any document to just its tasks** (Alex, 2026-10-18): a toggle on every document that hides the prose and shows only the tasks in it, still grouped under their headings, then expands back

## Current state

Not present in the editor. The data exists: tasks keep `document_id`, and `GET /api/v1/tasks?document_id=` lists a document's tasks.

## Requirements / notes

Default: a "Tasks only" toggle in the document toolbar that folds every non-task block in place (not a separate page), so checking, renaming and dates work as normal. Headings stay visible as the epic/feature grouping. Works with `document-planning-summary.md`'s summary and `docs/features/document_task_lines.md` and `task-line-two-way-sync.md`'s two-way sync.

## Context

Section "Plan from a single document" of the retired shared backlog.

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

## Acceptance criteria

- Collapse any document to just its tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Implemented on `backlog/document-tasks-only-toggle` (toolbar toggle, CSS fold of non-heading, non-task top-level blocks, feature doc updated) but not run or tried in a browser here (no `node_modules`, no network), and there is no automated test: the editor is not covered by any existing test and jsdom does not apply the stylesheet. Before merging, run `npm run lint` and try it in a document with prose, headings, a task list and a bulleted list. Known gap: a non-task list that contains a task line is hidden. Then delete this file.
