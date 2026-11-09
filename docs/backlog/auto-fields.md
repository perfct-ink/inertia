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

## Cut off (2026-11-09)
The agent working this task was stopped by the daily API cost limit before it finished, and its last uncommitted edits were committed here as they were. Treat the branch as unfinished: the code may not build or pass tests, no checks were run on the last edits, and the Unverified section (what was run, what to run) is not written yet. Resume by reading `git log` and the diff against `origin/main`, finish the requirements above, then write the Unverified section.
