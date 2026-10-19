---
branch: backlog/link-to-another-document
priority: p1
depends_on: []
components: [frontend]
---
# Link to another document

## Objective

**Link to another document** from inside a document, with a search picker (type `[[` or `@`)

## Requirements / notes

Link shows the target's current title, and updates when it's renamed.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Link to another document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch (`[[` and a toolbar button; `@` is not wired). To verify: `cd frontend && npm install && npm run lint && npm test`, `cd collab-server && npm install && npm test`, then in a browser type `[[` in a document, pick a file, rename the target and check the link updates, and open the document in two sessions to check collaboration keeps the node. None of that could run here. Deploy the collab server with the schema change before merging. Then remove this file.
