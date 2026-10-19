# Document breadcrumb

## What it does
Above a document's toolbar a breadcrumb shows where it lives: Space name › folder › sub-folder › document. The Space name links to the Space home (`/space`), each folder to its page (`/folders/:id`), and the document is the current page (`aria-current="page"`). The Root folder is left out, so a document directly in Root shows only the Space and the document. Folder names truncate when long and the trail wraps on narrow screens.

## API and models
No endpoint. The trail is computed in the browser from the Space payload (`useWorkspace`) by `folderTrail` in `frontend/src/data/folder.ts`, from the document's `folder_id`. Component: `frontend/src/components/Breadcrumb.tsx`, used in `view/document/DocumentScreen.tsx`.

## Who can view and change
Anyone who can open the document. It is read-only navigation.

## Tests
`frontend/src/data/folder.test.ts` (`folderTrail`), `frontend/src/components/Breadcrumb.test.tsx`.

## Known limits
- Only on documents; sheets and Collections have their own screens without it.
- The trail depends on the Space payload nesting; if the document's folder is archived (not in the payload) the trail shows only the Space and the document.
- URLs are still flat ids (`docs/backlog/hierarchical-urls.md`).

## History
- Implemented 2026-10-19 on branch `backlog/breadcrumb-path-above-the-document-name`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
