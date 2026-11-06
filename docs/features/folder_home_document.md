# Folder home document

## What it does
A folder can have one of its own documents as its home page. Opening the folder (`/folders/:id`, for example from the sidebar) lands on that document. The folder page has a "Home document" picker (its direct documents, or none) to set or clear it. To see the folder's contents anyway, open it with a view, for example `/folders/:id?view=overview`; the tabs on the folder page always do this, so they never bounce back to the home document. The folder falls back to its normal page when no home document is set.

**What the folder page lists is one level.** Without a home document, the folder page shows the folders and documents directly inside the folder, not everything nested under it:
- Overview has a "Folders" section (only when the folder has subfolders), each a link to `/folders/:id` with the icon for its kind (plain folder, project, feature folder), and the "Documents, Sheets & Collections" section with the folder's own documents. A subfolder with a home document opens that document, like anywhere else.
- Board, List, Cards, Calendar and Gantt keep a row of the same links (small chips) above the view, and no row when the folder is empty.
- Archived subfolders are left out; they stay under Archived in the sidebar.
- If the folder can't be loaded, the page shows "Couldn't load this folder." (plus the error notice every failed call raises, `lib/api.ts`) instead of a spinner that never ends.
- Documents are listed by title, folders by position then name. A folder's contents are reached by opening the subfolder, one level at a time; the sidebar tree still shows everything nested.
- The Board, List, Cards, Calendar and Gantt views, the Overview's task, epic and event summaries, and the feature rollup still cover the folder and every subfolder under it. Only the list of files and folders is one level; the work rollups are deliberately unchanged (they are documented in [gantt_scheduling.md](gantt_scheduling.md) and [feature_hierarchy.md](feature_hierarchy.md)).

## API and models
`folders.home_document_id` (nullable FK to documents, nullified on delete), permitted on `PATCH /api/v1/folders/:id` and returned in the folder JSON. `Folder` validates that the document is directly in the folder (422 otherwise); moving a document to another folder clears it from the old folder's home. Frontend: `homeDocumentToOpen` in `data/folder.ts`, the redirect and picker in `view/folder_detail/FolderDetailScreen.tsx`.

`GET /api/v1/folders/:id/contents` returns `folder`, `folders` (the active folders directly inside it, with `root_folder_id` applied so each says whether it is the Root), `documents` (only the folder's own, by title), and `tasks`, `events` and `epics` over `Folder#self_and_descendant_ids` as before. `documents` used to hold every document in the subtree; nothing else reads it (the Home document picker used to filter it down to the folder's own and no longer needs to). `FolderContents.folders` is in `frontend/src/types/index.ts`; `folderIconOf` (`components/file-manager/folderIcon.ts`) gives a folder's icon to both the sidebar tree and the folder page.

## Who can view and change
Anyone who can edit the folder.

## Tests
`backend/test/models/folder_test.rb` (home document rules), `frontend/src/data/folder.test.ts` (`homeDocumentToOpen`), `backend/test/controllers/folder_contents_test.rb` (direct documents and folders only, ordering, archived left out, tasks and epics still roll up the subtree, another Space's folder is a 404), `frontend/src/view/folder_detail/FolderDetailScreen.test.tsx` (the Overview and the chip row link to the folders and documents inside, no Folders section or row when empty). The redirect and the picker have no component test.

## Known limits
- There is no link from the home document back to the folder's contents; add `?view=overview` to any breadcrumb or "folder" link (see [document_breadcrumb.md](document_breadcrumb.md) once merged) or the link would bounce back to the home document.
- Only direct documents can be the home page, and the home document is not marked in the sidebar tree.
- The listing has no counts, sorting or search; a deep file is found by opening each folder, the sidebar tree, or All files. A project's page lists only its direct files and folders now (it used to list every file in its subfolders; the sidebar's project file list and the Projects page still show them all).
- Folder links on a phone sit in the two-column grid (Overview) or the scrolling chip row (other views); not checked at 375px in a browser.

## History
- Implemented 2026-10-19 on branch `backlog/folder-home-document`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Implemented 2026-11-05 on branch `backlog/folder-listing-direct-children-only` (the one-level listing). Not merged or deployed. Not verified: `rails test` (the new `folder_contents_test.rb` has only had `ruby -c`), `npm run lint`, `tsc -b`, the real Jest suite and the browser (desktop, 375px, light and dark) did not run (no network, node_modules or database). The folder page component suite ran in the Jest stand-in; see the task's Blocked note for the exact commands.
- Not implemented: no per-folder setting to list the whole subtree again; Overview's task, epic and event summaries are still subtree-wide.
