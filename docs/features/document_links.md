# Links to other documents

## What it does
Inside a document, type `[[` (the brackets disappear) or press "Link to a document" in the toolbar to open a search picker over every file in the Space (by title or folder; the current document is left out; Enter picks the first match). The chosen file becomes an inline link that shows the target's **current title**, so renaming the target updates every link. Clicking it opens the file. If the target is deleted the link reads "Deleted document" until you remove it.

## API and models
No endpoint. The link is a `documentLink` node (inline atom) holding only `documentId` in the document content; the view looks the title up in the Space payload (`findDocument`, `data/folder.ts`). The node is registered in the editor (`frontend/src/extensions/DocumentLink.tsx`) and mirrored in `collab-server/src/schema.ts` (with its schema test) so collaborative sessions keep it. Components: `DocumentLinkView`, `DocumentLinkPicker`.

## Who can view and change
Anyone who can edit the document can add links; anyone who can open the document sees them. A link to a file in a Space the reader cannot open would show "Deleted document" because it is not in their Space payload.

## Tests
`frontend/src/data/folder.test.ts` (`findDocument`), `frontend/src/components/DocumentLinkPicker.test.tsx`, `collab-server/test/schema.test.ts` (node set).

## Known limits
- Headings cannot be linked (`docs/backlog/link-to-a-heading.md`), and nothing lists which documents link to a file (backlinks, `docs/backlog/backlinks-each-document-lists-which-documents-link-to.md`).
- Only `[[` triggers the picker; `@` does not (it is reserved for dates and people).
- The node view and the `[[` input rule have no tests of their own. Links inside table cells or task lines work as inline content but were not tried.
- Documents already saved are not migrated; the collab server must be redeployed with the new schema before documents containing links are opened collaboratively.

## History
- Implemented 2026-10-19 on branch `backlog/link-to-another-document`. Not merged or deployed.
- Not verified: lint, type-check, tests, the collab-server schema test and the editor were not run (no frontend node_modules; the collab-server install has no vitest).
