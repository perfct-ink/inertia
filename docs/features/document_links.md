# Links to other documents

## What it does
- Inside a document, type `[[` or `@` (at the start of a line or after a space, so an email address such as `pat@example.com` is left alone) or press **Link to a document** in the toolbar. A dialog opens with a search over every file in the Space (documents, sheets, Collections and uploaded files; by title or folder). With nothing typed it lists the most recently changed files first; the document being edited is left out; Enter picks the first match.
- The chosen file becomes an inline link: the file's type icon and its **current title**, so renaming the target changes every link to it (the Space data refetches when a file is renamed in the app; another person's rename shows after the next refetch). Clicking the link opens the file without reloading the app (the same click handler as heading links; Cmd/Ctrl/Shift/Alt-click is left to the browser).
- The typed `[[` or `@` is taken out of the text when the dialog opens. Cancelling the dialog (Esc, the overlay) puts the typed characters back, so a literal `@` or `[[` can still be written. Triggers do not fire in code blocks or inline code.
- If the target is deleted or cannot be seen by the reader, the link reads "Document not found" in muted italics; it is not removed (the fuller "broken link" treatment is `docs/backlog/broken-link-handling.md`).
- Works on a phone: the toolbar button opens the same dialog, and `@` or `[[` works on a soft keyboard. The dialog's rows are 40px tall.

## API and models
No endpoint and no migration. The link is a `documentLink` node (inline atom) holding only `documentId` in the document content (JSON `{"type":"documentLink","attrs":{"documentId":12}}`; HTML `<span data-type="documentLink" data-document-id="12">`). The view looks the title up in the Space payload (`useWorkspace`, `findDocument` in `data/folder.ts`).
- `frontend/src/extensions/DocumentLink.ts`: the node, the `insertDocumentLink` and `restoreDocumentLinkTrigger` commands, and a ProseMirror plugin that watches typed text for the triggers (options `triggers` and `onTrigger`). To turn `@` off (for example when another feature claims it) configure `DocumentLink.configure({ triggers: ['[['] })` in `view/document/DocumentScreen.tsx`.
- `frontend/src/data/documentLink.ts`: the pure rules (`documentLinkTrigger`, `documentIdFromAttribute`, `linkableFiles`).
- `frontend/src/components/editors/DocumentLinkView.tsx` (+ `.scss`): the node view. `frontend/src/components/DocumentLinkPicker.tsx` (+ `.scss`): the dialog; a failed Space load shows an inline error.
- `collab-server/src/schema.ts` mirrors the node. Without it a collaborative document containing a link cannot be seeded or saved. **Deploy the collab server together with the frontend.**

## Who can view and change
Anyone who can edit a document can add links; anyone who can open it sees them. The picker lists the files in the active Space's payload, so a member only finds what they can already see, and a link whose target the reader cannot see shows "Document not found".

## Tests
- `frontend/src/data/documentLink.test.ts` and `frontend/src/data/folder.test.ts` (`findDocument`): pure.
- `frontend/src/extensions/DocumentLink.test.ts` (real Tiptap editor: node in JSON and HTML, typing `[[` and `@`, cancel restoring).
- `frontend/src/components/DocumentLinkPicker.test.tsx` and `frontend/src/components/editors/DocumentLinkView.test.tsx`.
- `collab-server/test/schema.test.ts` (node set; a link inside a paragraph keeps its id).

## Known limits
- Documents only: a link cannot point at a heading from this picker (use **Link to a heading**, `heading_links.md`) or at a folder.
- Nothing lists which documents link to a file yet (`docs/backlog/backlinks-each-document-lists-which-documents-link-to.md`).
- `@` is also the key the planned `@date` event chip (`docs/backlog/create-dates-and-events-from-the-document.md`) would use. Both cannot own it: whichever lands second changes the `triggers` option, or `@` becomes one inline menu offering documents and dates. The dialog is a modal, not an inline suggestion list that filters as you keep typing after `@`.
- Copying a document or folder to another Space copies the links as they are, so they read "Document not found" there (they hold ids of the old Space's files).
- Pasting a link into another application gives nothing (the node has no text), and a copied link pasted into another Inertia document keeps working.
- A link inside a task line, a table cell or a heading works as ordinary inline content but was not tried in a browser. A link in the first heading does not change the document title (the title is read from text only).

## History
- Implemented 2026-10-19 (`[[` picker, toolbar button) on branch `backlog/link-to-another-document`; rebased onto main 2026-11-07 with the `@` trigger, cancel-restores-text, type icons, newest-first list, loading and error states and tests added. Not merged or deployed.
- Not verified: lint, the type-check, the real Jest run, the collab-server Vitest run and the editor in a browser (mobile width, dark mode, two people editing) did not run (no `node_modules`). See the task file's Unverified section.
