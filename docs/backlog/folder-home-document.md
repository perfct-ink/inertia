---
branch: backlog/folder-home-document
priority: p1
depends_on: []
components: [frontend]
---
# Folder home document

## Objective

**Folder home document**: a folder can have one document set as its home page, shown when the folder is opened

## Requirements / notes

Default: `folders.home_document_id`.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Folder home document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. When `backlog/breadcrumb-path-above-the-document-name` merges, its folder links must point at `/folders/:id?view=overview` or they will bounce back to the home document. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then set a home document and open the folder in a browser. None of that could run here. Then remove this file and merge.
