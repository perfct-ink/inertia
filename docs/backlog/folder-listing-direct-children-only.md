---
priority: p1
depends_on: [folder-home-document]
components: [frontend]
branch: backlog/folder-listing-direct-children-only
---
# Folders without a home document show the files and folders directly inside them (one level, not everything nested)

## Objective

Folders without a home document show the files and folders directly inside them (one level, not everything nested)

## Requirements / notes

Today's folder view also lists nested content for some views (`Folder#self_and_descendant_ids`); the default listing should be direct children only.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Folders without a home document show the files and folders directly inside them (one level, not everything nested) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Incomplete. The agent working on this task was stopped before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/folder-listing-direct-children-only`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, merge the current main in, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
