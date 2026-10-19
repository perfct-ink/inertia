---
priority: p1
depends_on: []
---
# Hierarchical URLs

## Objective

**Hierarchical URLs** that mirror the folder tree, e.g. `/acme/product/feature-folders/requirements`

## Requirements / notes

Default: slugs on folders and documents, unique within their parent, with the numeric id kept as a fallback so links don't break when something is renamed or moved (old paths redirect).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Hierarchical URLs works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
