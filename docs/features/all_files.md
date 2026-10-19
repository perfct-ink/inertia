# All files

## What it does
The Documents page (titled "All files") lists every document, spreadsheet and collection in the current Space in one table, wherever it is nested. Columns are Name, Location (the folder path without Root, with a project icon when the file sits inside a project) and Last Modified. Each column header sorts. A search box filters by title or any folder name in the path. A create menu on the page adds a new item. Clicking a name opens the file; clicking the location opens its folder.

## API and models
No endpoint of its own. The page reads the Space payload (`useWorkspace`, the folder tree with documents) and flattens it in the browser with `spaceFiles` and `searchSpaceFiles` (`frontend/src/data/folder.ts`).

## Who can view and change
Anyone who can open the Space sees the list. The page changes nothing itself.

## Web entry points
`frontend/src/view/documents_index/DocumentsIndexScreen.tsx`, reached from the Documents link in the sidebar.

## Tests
`frontend/src/data/folder.test.ts` covers `spaceFiles`, `searchSpaceFiles` and `sortFileRows`. The screen has no test of its own.

## Known limits
- Only documents, spreadsheets and collections are listed; uploaded files of other types do not exist yet.
- Archived folders are not filtered by `spaceFiles`; I did not check whether the Space payload already omits them.

## History
- Implemented 2026-10-15 to 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests and the screen were not run (no dependencies installed, no network).
