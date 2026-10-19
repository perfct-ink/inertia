---
priority: p1
depends_on: []
components: [frontend]
---
# Breadcrumb path above the document name

## Objective

**Breadcrumb path above the document name** (Alex, 2026-10-18): Space › folder › sub-folder › document, each part a link

## Requirements / notes

Today the document screen (`view/document/DocumentScreen.tsx`) opens straight on the toolbar and title with no path. The data is there: documents have `folder_id` and folders chain up through `parent_id` to the Space's Root. Pairs with `hierarchical-urls.md` (URLs that follow the same path).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Breadcrumb path above the document name works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
