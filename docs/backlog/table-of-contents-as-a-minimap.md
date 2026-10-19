---
branch: backlog/table-of-contents-as-a-minimap
priority: p1
depends_on: []
components: [frontend, backend]
---
# Table of contents as a minimap

## Objective

**Table of contents as a minimap**: a slim outline of headings at the side of the document that highlights where you are and jumps on click

## Requirements / notes

Built from the heading nodes; collapses to tick marks when narrow, like a code-editor minimap.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Table of contents as a minimap works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd frontend && npm install && npm run lint && npm test`, then open a long document in a browser: the sticky position, overlap with the page at mid widths, and the narrow tick-mark collapse were never seen. Then remove this file and merge.
