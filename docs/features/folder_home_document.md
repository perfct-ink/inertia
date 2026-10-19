# Folder home document

## What it does
A folder can have one of its own documents as its home page. Opening the folder (`/folders/:id`, for example from the sidebar) lands on that document. The folder page has a "Home document" picker (its direct documents, or none) to set or clear it. To see the folder's contents anyway, open it with a view, for example `/folders/:id?view=overview`; the tabs on the folder page always do this, so they never bounce back to the home document. The folder falls back to its normal page when no home document is set.

## API and models
`folders.home_document_id` (nullable FK to documents, nullified on delete), permitted on `PATCH /api/v1/folders/:id` and returned in the folder JSON. `Folder` validates that the document is directly in the folder (422 otherwise); moving a document to another folder clears it from the old folder's home. Frontend: `homeDocumentToOpen` in `data/folder.ts`, the redirect and picker in `view/folder_detail/FolderDetailScreen.tsx`.

## Who can view and change
Anyone who can edit the folder.

## Tests
`backend/test/models/folder_test.rb` (home document rules), `frontend/src/data/folder.test.ts` (`homeDocumentToOpen`). The redirect and the picker have no component test.

## Known limits
- There is no link from the home document back to the folder's contents; add `?view=overview` to any breadcrumb or "folder" link (see [document_breadcrumb.md](document_breadcrumb.md) once merged) or the link would bounce back to the home document.
- Only direct documents can be the home page, and the home document is not marked in the sidebar tree.
- The folder listing for a home document folder (direct children only) is `docs/backlog/folder-listing-direct-children-only.md`.

## History
- Implemented 2026-10-19 on branch `backlog/folder-home-document`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
