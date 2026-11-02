# Configurable statuses

## What it does
- Every task is still in one of five fixed statuses: Backlog, To Do, In Progress, In Review, Done. A board can **rename** each one (up to 40 characters) and **recolor** it (gray, blue, yellow, green, orange, red, purple). Tasks, rollups, the Gantt, milestone percentages and the AI workers keep working on the underlying status; only how it is shown changes.
- A **board** is a folder, or the whole Space. Settings resolve from the nearest to the furthest: the folder's own, the folders above it (Root excluded), the Space default, then the built-in names and colors. Name and color resolve separately, so a folder that only recolors "Done" still takes its name from the Space.
- **Statuses button** (palette icon) opens the editor, a modal with a name field and a row of color swatches for each of the five statuses. It shows what the board currently shows, saves only what differs from what the board would inherit (so a folder keeps following the Space for anything it leaves alone), and has **Reset** (only when the board has settings of its own) to go back to following the defaults.
  - On the **Tasks page** (`/tasks`) it edits the folder the page is filtered to, or the Space default when no folder is chosen. It is next to Filter in both the Backlog and Workboard tabs.
  - On a **folder page** (`/folders/:id`) it appears in the Board and List views and edits that folder.
- The configured names and colors show on the Tasks workboard columns and "Move to ..." arrows, the Tasks backlog heading and status filter, the folder Board columns and List rows, the dot on a task line inside a document (its tooltip names the status), and the status dots on an event's tasks. A task is shown with the board of the folder it sits in (its own folder, else its document's).
- Viewers see the configured names and colors but get no Statuses button.

## API and models
- `task_status_settings` table: `workspace_id`, `folder_id` (null is the Space default), `status` (the same integers as `Task#status`), `label`, `color` (`gray blue yellow green orange red purple`), timestamps. Unique per status for the Space default and per folder (two partial indexes, since a null `folder_id` never collides in a plain unique index). A row must have a label or a color; labels are trimmed and capped at 40 characters; the folder must be in the same Space.
- `TaskStatusSetting.replace_for!(workspace, folder, entries)` replaces everything one board has set in a transaction. An entry with neither label nor color is left out. An invalid entry, an unknown status or a status named twice raises and changes nothing.
- `/api/v1/task_status_settings`:
  - `GET` lists every setting in the Space (the client works out which apply to a board).
  - `PUT` with `folder_id` (optional) and `statuses: [{ status, label, color }]` replaces that board's settings and returns the whole list; 422 with `errors` when invalid. A `folder_id` that is Root's means the Space default. A folder from another Space is a 404.
  - `DELETE` with `folder_id` (optional) clears that board's settings.
- Folders and Spaces delete their settings with them (`dependent: :delete_all`).
- Frontend: `data/task_status.ts` (statuses, defaults, colors, `boardScope`, `resolveStatuses`, `overridesFromStyles`; the colors and label limit mirror the model), `api/taskStatusSettings.ts`, `hooks/useBoardStatuses.ts` (`useBoardStatuses` for one board, `useStatusesForFolder` for lists that mix folders), `components/workspace/StatusSettings.tsx` (the editor), `components/ui/StatusDot.tsx` (the `ui-status_dot` dot, which replaces the per-screen status dot styles), `data/task.ts` (`taskFolderId`). Wired into `view/tasks/TasksScreen.tsx`, `view/folder_detail/FolderDetailScreen.tsx`, `view/events/EventsScreen.tsx` and `components/editors/WorkspaceTaskItemView.tsx`.

## Who can view and change it
Any member of the Space can read the settings. Changing them needs the member role or above, like other writes (`WorkspaceScoped`); viewers get 403 and no button. Everything is scoped to the current Space (`X-Workspace-Id`). A failed save shows the API error notice and leaves the editor open.

## Tests
- Backend (written, not run): `backend/test/models/task_status_setting_test.rb`, `backend/test/controllers/task_status_settings_controller_test.rb`.
- Frontend (written; the pure data tests were run with a small shim, the React tests were not run): `data/task_status.test.ts`, `data/task.test.ts`, `components/workspace/StatusSettings.test.tsx`, `components/ui/StatusDot.test.tsx`, `view/tasks/TasksScreen.test.tsx`, `view/folder_detail/FolderDetailScreen.test.tsx`.

## Known limits
- The set of statuses is fixed at five: a board cannot add, remove or reorder statuses, or choose which ones count as done. That would change what rollups and the Gantt mean and is a separate piece of work (see `docs/backlog/custom-fields-on-tasks.md` for the related custom-field direction).
- Places that only filter or count by status (the Gantt, the roadmap, rollups) do not show status names. The macOS app and `.inertia-tasks` files keep the built-in names, and the AI worker prompt still says `Status: in_progress`.
- Colors are a fixed set of seven rather than free choice, so every color has a light and dark mode and nothing user-typed reaches a style.
- A folder inherits from the folders above it, so moving a folder under another parent changes which settings it inherits.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/configurable-statuses`). Needs `rails db:migrate` (migration `20261101010001_create_task_status_settings.rb`).
- Decision for Alex: built the conservative version, labels and colors over the five fixed statuses, and kept the settings per Space and per folder (a board is a folder) rather than a new "board" record. Truly custom statuses (add, remove, map to "done") were not built.
- Not implemented: custom statuses, status-based workflow rules, the macOS app.
- Not verified: no frontend or backend test, lint, type-check or migration was run (no network, `node_modules` or database); only the pure data tests, SCSS compilation and Ruby/TS syntax checks ran. Not seen in a browser at 375px or in dark mode.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
