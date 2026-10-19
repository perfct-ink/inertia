---
branch: backlog/link-to-another-document
status: incomplete
priority: p1
depends_on: []
components: [frontend]
---
# Link to another document

## Objective

**Link to another document** from inside a document, with a search picker (type `[[` or `@`)

## Requirements / notes

Link shows the target's current title, and updates when it's renamed.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Link to another document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built and rebased onto `origin/main` on 2026-11-07 (`docs/features/document_links.md` describes it): the `documentLink` inline node with a live title, a search dialog opened by `[[`, `@` (word start) or a toolbar button, cancel putting the typed characters back, and the node in the collab-server schema.

Ran offline: the static checks (Babel parse, imports, Sass compile) and the pure and component tests under the stand-in runner (see the commit message for the exact list). Did not run (no network, `node_modules` or Docker): `npm run lint`, `tsc -b`, the real Jest suite, the collab-server Vitest suite, and any browser check.

To verify:
- `cd frontend && npm install && npm run lint && npx tsc -b && npm test`
- `cd collab-server && npm install && npm test`
- In a browser, at 375px and desktop, light and dark: type `[[` and `@` in a document (after a space, and inside a word to see it is left alone), pick a file, rename the target and check the link title follows, press Esc in the dialog to see the typed characters come back, click a link, delete the target and check it reads "Document not found", and open the same document in two sessions to check collaboration keeps the node.

Deploy note: `collab-server/src/schema.ts` gains the `documentLink` node, so the collab server must be deployed together with the frontend; a document containing a link cannot be saved by an older collab server.

Decisions for Alex: the picker is a dialog (like the heading picker), not an inline list that filters while you type after `@`. `@` is the key the `@date` idea in `create-dates-and-events-from-the-document.md` would use; if that lands, drop `'@'` from the `triggers` option in `DocumentScreen.tsx` or make `@` one menu for both. Remove this file once the checks above pass and the branch merges.
