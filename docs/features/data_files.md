# Data files (filtering, sorting and API enums)

## What it does
Pure filtering, sorting and enum definitions live in `frontend/src/data/`, one file per entity, with unit tests; screens call them. Moved out of screens:
- `data/task.ts`: `TASK_STATUSES`, `STATUS_LABEL` and `NEXT_STATUS` (the status enum, its labels and next-status chain, previously copied in `TasksScreen` and `FolderDetailScreen`), `tasksWithStatus`.
- `data/event.ts` (new): `EVENT_TYPES`, `filterTasksByTitle` (the task picker's search), `unlinkedTasks` (tasks not yet on an event), `splitEvents` (upcoming and past, with an injectable clock).
- `data/folder.ts`: `sortFileRows` (the All files table's sort by name, location or last modified) with the `FileRow` and `FileSortKey` types.
Behaviour of the screens is meant to be unchanged.

## Tests
`frontend/src/data/task.test.ts`, `event.test.ts`, `folder.test.ts`.

## Known limits
- `TasksScreen` still holds the kanban's drag-reordering logic (`onDragOver`/`onDragEnd` use local state); it is not extracted. The `KANBAN_STATUSES` list with its dot colours stays in the screens (presentation).
- Other enums (planning statuses, health, horizons) were already in `data/milestone.ts` and `data/roadmap.ts`; this change did not audit the remaining screens for inline filters.
- `splitEvents` compares `yyyy-MM-dd` strings with today's local date, where the old code compared `Date` objects; the result is the same for the dates the API sends.

## History
- Implemented 2026-10-19 on branch `backlog/data-files-filtering-sorting-and-api-enums`. Not merged or deployed.
- Not verified: lint, type-check, tests and the screens were not run (no node_modules), so "behaviour unchanged" is from reading the code.
