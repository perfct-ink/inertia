---
priority: p2
depends_on: []
branch: backlog/embed-live-task-lists-in-documents
status: incomplete
---
# Embed live task lists / Gantt in documents (Monday Workdocs)

## Objective

Embed live task lists / Gantt in documents (Monday Workdocs)

## Current state

Documents exist; embedding does not

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Embed live task lists / Gantt in documents (Monday Workdocs) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built on current `main` (2026-11-09, squashed from the 2026-11-02 WIP) but not run in a real build, browser or CI: this machine has no network, `node_modules` or database. Feature doc: `docs/features/embedded_task_lists.md` (README row added).

**Done.** A `taskEmbed` document node (block atom: `view` list or Gantt, `scope` Space / this document / one folder / one sprint, `scopeId`, `status`) drawn by `TaskEmbedPanel`: a live list (refetched every 30 s and after any task change) whose rows edit the task itself (checkbox, status dropdown, due date picker), a read-only Gantt with links and the driving path, settings and Remove while editing, loading, empty and error states with a retry, toolbar button "Embed live tasks", and the "Tasks only" fold keeps embeds. The node is mirrored in `collab-server/src/schema.ts`. No backend change and no migration.
- **Privacy:** the node stores only the four settings, never a task, title or count; the list is fetched when drawn with the reader's own sign-in and Space, so nobody receives tasks they cannot see (tests in `data/taskEmbed.test.ts`).
- **Decision for Alex:** "This document" stores no document id (it means the document the embed sits in), so a copy lists the copy's tasks. Folder and sprint scopes keep their ids; the Space-transfer reset is the follow-up `reset-embedded-task-list-scope-on-space-transfer`.
- **Deploy:** the collab server must ship with the frontend (one Coolify stack, one push to `main`); an older collab server cannot save a shared document that contains the node.

**Ran (offline stand-ins):** `JEST_STUB_NET=1 /tmp/runner/all.sh` (static import/syntax/sass check of the changed files; 13 `data/taskEmbed` tests, the `data/schedule` and `data/dependency` tests; 16 `TaskEmbedPanel` component tests with the API hooks mocked).

**Did not run:** `npm run lint`, `npx tsc -b`, the whole `npm test` (`extensions/TaskEmbed.test.ts` needs `@tiptap/*`, `api/base.test.tsx` needs a real axios and `@tanstack/react-query`), collab-server `npm run lint && npm test` (new case in `test/schema.test.ts`), `make test` (nothing in the backend changed), and the editor in a browser.

**To verify and merge:**
1. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then `cd ../collab-server && npm install && npm run lint && npm test`.
2. In a browser at 375px and desktop, light and dark: open a document, press "Embed live tasks"; List and Gantt; each scope (pick a folder and a sprint; "This document"); the status filter; tick a row, change a row's status and due date (the task changes on the Tasks page); edit a task elsewhere (the embed updates within 30 s or on the next task change); Remove; "Tasks only"; a second browser on the same document (settings sync); check the status and date fields do not steal focus or fight the editor's keyboard handling inside the embed.
3. Deploy the collab server with the frontend.
4. Merge hazards: `collab-server/src/schema.ts`, `collab-server/test/schema.test.ts` (sorted node-name list) and `frontend/src/view/document/DocumentScreen.tsx` (imports, extension list, toolbar) are shared with other document-node branches (keep both sides); also `frontend/src/api/base.ts` (two list options), `frontend/src/api/tasks.ts`, `frontend/src/data/schedule.ts`, `frontend/src/data/dependency.ts`, `frontend/src/view/folder_detail/GanttPane.tsx`, `docs/features/README.md` and `docs/ui-components.md`.
