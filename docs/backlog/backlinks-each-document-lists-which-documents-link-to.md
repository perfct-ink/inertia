---
priority: p1
depends_on: []
components: [backend]
---
# Backlinks: each document lists which documents link to it

## Objective

Backlinks: each document lists which documents link to it

## Requirements / notes

Needs a `document_links` table refreshed on save.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today (checked 2026-11-09): links between documents exist. The heading link picker (`docs/features/heading_links.md`) inserts ordinary link marks with in-app hrefs `/documents/<id>#<anchor>`, so backlinks can be found by scanning saved content for those hrefs. A `[[` document picker is still `link-to-another-document.md`. Folders have home documents (`docs/features/folder_home_document.md`).

## Acceptance criteria

- Backlinks: each document lists which documents link to it works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
