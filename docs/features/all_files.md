# All files

## What it does
The Documents page (titled "All files") lists every document, spreadsheet and collection in the current Space in one table, wherever it is nested. Columns are Name, Location (the folder path without Root, with a project icon when the file sits inside a project) and Last Modified. Each column header sorts. A search box filters by title or any folder name in the path. Three filters narrow the list: project (all, no project, or one project), type (document, sheet, collection) and owner (a Space member; the owner is the file's creator, `documents.created_by_id`). They combine with the search and sorting (`filterSpaceFiles` in `data/folder.ts`). A create menu on the page adds a new item. Clicking a name opens the file; clicking the location opens its folder.

## API and models
No endpoint of its own; `created_by_id` is now in the document JSON. The page reads the Space payload (`useWorkspace`, the folder tree with documents) and flattens it in the browser with `spaceFiles` and `searchSpaceFiles` (`frontend/src/data/folder.ts`).

## Who can view and change
Anyone who can open the Space sees the list. The page changes nothing itself.

## Web entry points
`frontend/src/view/documents_index/DocumentsIndexScreen.tsx`, reached from the Documents link in the sidebar.

## Tests
`frontend/src/data/folder.test.ts` covers `spaceFiles`, `searchSpaceFiles` and `filterSpaceFiles`; `frontend/src/view/documents_index/DocumentsIndexScreen.test.tsx` covers the filters.

## Known limits
- Sorting still happens inside the screen, not in `data/`.
- Only documents, spreadsheets and collections are listed; uploaded files of other types do not exist yet.
- Archived folders are not filtered by `spaceFiles`; I did not check whether the Space payload already omits them.

## History
- Implemented 2026-10-15 to 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests and the screen were not run (no dependencies installed, no network).
- Filters added 2026-10-19 on branch `backlog/filter-all-files-by-project-type-and-owner`, not merged. "Owner" means creator; there is no separate owner field. Not verified: lint, type-check, tests and the browser did not run (no node_modules).
