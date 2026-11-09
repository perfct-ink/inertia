---
branch: backlog/attach-uploaded-files-to-tasks
status: incomplete
priority: p1
depends_on: []
---
# Attach uploaded files to tasks

## Objective

Attach uploaded files to tasks

## Requirements / notes

Tasks only (Alex, 2026-11-09 groom). Features are left out: a feature's requirements document (`features-with-requirements-docs.md`) can already hold embedded files.

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* have shipped (`collection-image-and-file-fields.md` is gone).

Today (checked 2026-11-09): any file type can be uploaded as a folder item (`docs/features/uploaded_files.md`) or embedded in a document (`docs/features/embedded_files.md`). Nothing attaches a file to a task.

## Acceptance criteria

- Attach uploaded files to tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built (see `docs/features/uploaded_files.md`, "Attached to tasks"): a `task_files` table and `TaskFile` model, `POST /api/v1/tasks/:task_id/files` and `DELETE /api/v1/tasks/:task_id/files/:file_id`, `file_ids` on the task list, a paperclip with the file count on Tasks board cards and Backlog rows, and a Files dialog (cards with preview and download, Detach, attach from the Space's files, upload and attach). Space transfers cut links whose two ends do not move together. Ported by hand onto current main from the 2026-10-19 branch `backlog/attach-uploaded-files-to-tasks-and-features`, narrowed to tasks as Alex asked on 2026-11-09. Once the checks below pass this file can be removed (the branch is `incomplete` only because they could not run here).

Decision for Alex: files uploaded from a task go into the task's own folder (else its document's folder, else Root).

Ran: `ruby -c` on every changed Ruby file, the repo's static check (babel parse, sass compile), the pure data tests, and the component tests (`TaskFiles`, `TasksScreen`, `AttachmentCard`) in a Jest stand-in. Not run (no network, `node_modules`, database): the migration and `schema.rb` (edited by hand), `rails test`, ESLint, Stylelint, `tsc`, the real Jest run (`frontend/src/api/tasks.test.tsx` needs the real react-query), the browser.

To verify:

```bash
cd backend && rails db:migrate && git diff db/schema.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: Tasks, attach a file from the menu, upload and attach two files, preview and download one, detach it (it stays in All files), delete a file and check it left the task, and try as a viewer (no menu, upload or Detach).
