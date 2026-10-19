---
priority: p1
depends_on: []
components: [backend]
---
# Link to a heading

## Objective

**Link to a heading** in another document (or the same one)

## Requirements / notes

Headings need stable ids that survive edits and collaboration. Default: an `id` attribute on Tiptap heading nodes, generated once. The URL uses `#heading-slug`.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Link to a heading works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
