---
priority: p2
depends_on: []
branch: backlog/embed-live-task-lists-in-documents
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

## Blocked
Built, but not verified in a real build or browser (no network, `node_modules` or database here), so it stays on this branch. Merged with `origin/main` (the merge wave) on 2026-11-02.

**Done.** A `taskEmbed` document node (block atom: `view` list or Gantt, `scope` Space, this document, one folder or one sprint, `scopeId`, `status`) drawn by `TaskEmbedPanel`: a live list with ticking and a read-only Gantt with dependency links and the driving path, settings and Remove while editing, a 30-second refresh, loading, empty and error states with a retry. Toolbar button "Embed live tasks"; the "Tasks only" fold keeps embeds. The node is mirrored in `collab-server/src/schema.ts`. No backend change and no migration. Feature doc: `docs/features/embedded_task_lists.md` (README row added; the conflict markers the merge wave left in `docs/features/README.md` and `docs/ui-components.md` are resolved, keeping every row and sentence).

**Ran (stand-in runners):** the 11 `data/taskEmbed` tests, the 13 `TaskEmbedPanel` component tests (API hooks mocked), the changed `data/schedule` and `data/dependency` tests, the static import and syntax check, and a sass compile.

**Did not run:** `npm run lint`, the TypeScript check, `npm test` as a whole (including `extensions/TaskEmbed.test.ts` and `api/base.test.tsx`, which need `@tiptap/*` and `@tanstack/react-query`), the collab-server `npm test` and lint, `rails test` (nothing in the backend changed), and the editor in a browser.

**To verify and merge:**
1. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`, then `cd ../collab-server && npm install && npm run lint && npm test`.
2. Open a document, press "Embed live tasks", and check at 375px and desktop, light and dark: List and Gantt, each scope (pick a folder and a sprint), the status filter, ticking a row (the task changes on the Tasks page), editing a task elsewhere (the embed updates within 30 seconds or on the next task change), Remove, "Tasks only", and a second browser on the same document (the settings sync).
3. The collab server must be deployed together with the frontend: an older collab server does not know the `taskEmbed` node and cannot save a shared document that contains one.
4. Merge hazards: `backlog/link-to-another-document` and `backlog/built-in-paragraph-styles` also add nodes in `collab-server/src/schema.ts`, `collab-server/test/schema.test.ts` and `frontend/src/view/document/DocumentScreen.tsx` (imports, the extension list, the toolbar); keep both sides (the node-name list in `schema.test.ts` is sorted). Shared files also touched: `frontend/src/api/base.ts` (two list options), `frontend/src/api/tasks.ts`, `frontend/src/data/schedule.ts`, `frontend/src/data/dependency.ts` and `frontend/src/view/folder_detail/GanttPane.tsx` (now uses `dependenciesAmong` and `ganttLinks`).
5. `docs/features/gantt_scheduling.md`, `sprints.md` and `uploaded_files.md` on main still contain committed conflict markers from the merge wave; this branch does not touch them.
