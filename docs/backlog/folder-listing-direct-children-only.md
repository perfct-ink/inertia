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

Built on `backlog/folder-listing-direct-children-only`, not merged because Rails, lint, the type-check and a browser could not run on the machine that finished it.

Done: `GET /api/v1/folders/:id/contents` returns the folder's own documents and its active subfolders (`folders`, new), not everything nested; the folder page lists them (Overview sections and the chip row above the other views), with the icon for each folder's kind; a folder that can't load shows "Couldn't load this folder." instead of a spinner; the Home document picker reads the direct documents. The task, event and epic rollups still cover the subtree on purpose. Tests and `docs/features/folder_home_document.md` are updated.

Ran: the static checker, and `FolderDetailScreen.test.tsx` and `ProjectNav.test.tsx` in a Jest stand-in (all passed). `folder_contents_test.rb` has only had `ruby -c`.

Not run, to do before merging:

```sh
cd backend && rails test test/controllers/folder_contents_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open a folder with subfolders and documents (and a project) at 375px and desktop, in light and dark: the Folders section, the chip row on Board/List/Gantt, opening a subfolder, and the empty folder. When it merges, delete this file.

Decision for Alex: a project's page now lists only its direct files and folders (the sidebar and the Projects page still show everything under it). Merge note: `backlog/features-with-requirements-docs` makes creating an epic also create a document, so any test that creates an epic in a folder and then counts that folder's documents needs a look once both are merged.
