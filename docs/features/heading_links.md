# Links to headings

## What it does
- Every heading in a document can carry a permanent `id`. The editor stores one on each heading that has text, about 1.5 s after the last edit (with the save), and never changes it afterwards, so renaming or moving a heading does not break links to it. The id is the slug of the heading's text at that moment ("Launch plan" becomes `launch-plan`; a repeat becomes `launch-plan-2`), so addresses read `#launch-plan` instead of a random token.
- A heading that has no id yet (a document nobody has edited since this shipped, or text typed a moment ago) is still linkable: its anchor is computed from its text by the same rules, and becomes its stored id on the next save.
- The toolbar has a **Link to a heading** button (# icon). It opens a dialog: search the Space's documents by title or folder (sheets and Collections have no headings and are left out; the document being edited comes first and is labelled "This document"; Enter opens the first match), then pick one of that document's headings, indented by level. The document's first heading is its title and is not listed. The pick becomes a link: if text is selected it is linked, otherwise the heading's text is inserted as a link.
- The link is an ordinary link mark whose href is the in-app path `/documents/<id>#<anchor>`. Clicking a link to a document in the editor opens it inside the app without a reload (Cmd/Ctrl/Shift/Alt clicks and links to anything else are left to the browser). The target opens scrolled to the heading, which is highlighted for 2 s. A collaborative document fills in after it opens, so the page waits for the heading; if it has not appeared after 6 s (it was deleted) a notice says "That heading is no longer in this document."
- The router is a hash router, so the address bar shows `/#/documents/12#launch-plan`.

### Broken links
- A link to a document or heading that no longer exists shows **struck through in the danger colour** (red mixed a little toward the text colour so it reads on both the light and the dark page). Its tooltip says "Broken link. Click to fix it." A link to a deleted document and a link to a deleted heading in a document that is still there are both marked. A document the person can no longer open (it sits in a Space they left) counts as gone.
- Clicking a broken link (a tap on a phone) does not navigate. It opens a small dialog, "This link is broken", that says whether the document or the heading is gone, shows the link's text, and offers **Pick a new target**, **Remove link** and Cancel. Cancel is first, so Enter on open changes nothing.
  - **Pick a new target** opens the heading link picker (titled "Pick a new target"); the pick re-points the link and keeps its text.
  - **Remove link** keeps the text and drops the link.
  - If the document changed under the dialog and the link is no longer there, nothing is touched and a notice says "That link changed, so nothing was done."
- By keyboard: put the caret in the broken link; the toolbar's Link button then reads "Fix broken link" and opens the same dialog. The dialog traps focus and closes on Esc.
- How a link is judged: a link counts as broken only when the app knows. The open document's own headings come from the editor. Every other document the links point at is checked with one request (`GET /api/v1/documents/link_targets?ids=2,3`), not one per link, and again only when the set of linked documents changes (the document is rescanned 300 ms after the last edit). A document not yet checked is never marked, and a collaborative document is checked only after the collaboration server has sent it, so a link to a heading in the document itself is not called broken while the text is still arriving.
- The marking is a view-only decoration: it is not saved, not synced to collaborators (each browser works it out) and not in the undo history.

## API and models
No migration. Document content is already JSON, so the heading node simply gains an `id` attribute (`attrs.id`). One read-only endpoint serves the broken-link check:
- `GET /api/v1/documents/link_targets?ids=12,14` returns `[{ id, doc_type, headings: [{ id, text, level }] }]` for each requested document that exists in a Space the user belongs to (at most 100 ids; anything that is not a positive integer is dropped). A missing id was deleted or is out of reach. `DocumentLinkTargetsController` (route declared before the documents resources so `link_targets` is not read as an id), `DocumentLinkTargets` service (one query), `Document#headings` and `DocumentHeadings` (a plain-Ruby mirror of `headingsOf` in `data/heading.ts`; keep the two in step).
- Frontend: `documentApi.linkTargets` and `useDocumentLinkTargets` in `api/documents.ts` (a failed call shows the usual error notice, "Could not check the links in this document", and the links stay unmarked); deleting a document refreshes the answer.
- `frontend/src/data/brokenLink.ts`: the pure rules (find in-app links in the JSON, which are broken, `linkSpanAt` to find a link's extent, the dialog message).
- `frontend/src/extensions/BrokenLinks.ts`: the decoration, `linkRangeAt`, `relinkTo`, `removeLinkAt`.
- `frontend/src/hooks/useBrokenLinks.ts`: scans the editor, asks the server, marks the links, finds the broken link under a click or the caret.
- `frontend/src/components/BrokenLinkDialog.tsx` (+ `.scss`): the dialog on the shared `Modal`. `HeadingLinkPicker` takes an optional `title`. Styles for the marking are in `view/document/ProseMirror.scss`.
- `frontend/src/extensions/HeadingAnchor.ts`: Heading with the `id` attribute (rendered as `data-heading-id`), `assignHeadingIds`, `findHeadingPos`, `linkToHeading`.
- `collab-server/src/schema.ts` mirrors the attribute. Without it, seeding a room from Rails' JSON would drop the ids. Deploy the collab server together with the frontend.
- `frontend/src/data/heading.ts`: the pure rules (slug, anchors, which ids to store, heading lists from saved JSON, parsing and building document paths).
- `frontend/src/hooks/useHeadingLinks.ts`: `useScrollToHeading` and `useFollowDocumentLinks`, used by `view/document/DocumentScreen.tsx`.
- `frontend/src/components/HeadingLinkPicker.tsx` (+ `.scss`): the dialog. Headings of other documents come from the existing `GET /api/v1/documents/:id`; the open document is read from the editor, since its saved copy can lag. A failed load shows the usual error notice and an inline message.
- `DocumentScreen.scss` styles the landing highlight (`document-heading--target`).

## Who can view and change
Anyone who can edit a document can add heading links to it and (through the editor) gives its headings their ids. Anyone who can open a document sees its broken links, and fixing or removing one is an ordinary edit of the document (role-based limits were not checked); `link_targets` looks documents up across the Spaces the user belongs to, like `GET /api/v1/documents/:id`, so it reveals nothing a member could not already open. The picker lists the documents in the active Space and loads headings through the normal document endpoint, so a member sees only what they can already open. Role-based limits were not checked.

## Tests
- `frontend/src/data/heading.test.ts` (run offline with the pure-test shim: 15 pass).
- `frontend/src/extensions/HeadingAnchor.test.ts` (real Tiptap editor: id in JSON and HTML, assigning, renaming, linking).
- `frontend/src/hooks/useHeadingLinks.test.tsx` (scrolling, waiting, missing heading, in-app link clicks).
- `frontend/src/components/HeadingLinkPicker.test.tsx`.
- `collab-server/test/schema.test.ts` (heading keeps `id`).
- Broken links: `frontend/src/data/brokenLink.test.ts` (which links are broken, link extents), `frontend/src/hooks/useBrokenLinks.test.tsx` (marking, one request for all links, rescan, click and caret lookup, remove and re-point), `frontend/src/extensions/BrokenLinks.test.ts` (real Tiptap editor: decoration, link range, re-point, remove), `frontend/src/components/BrokenLinkDialog.test.tsx`, `frontend/src/components/HeadingLinkPicker.test.tsx` (title), `frontend/src/api/documents.test.tsx` (one request, the hook), `backend/test/controllers/document_link_targets_controller_test.rb`, `backend/test/models/document_headings_test.rb`.

## Known limits
- The link's text is the heading's text when the link was made. The target follows renames; the visible text does not (the `[[` document link in `docs/backlog/link-to-another-document.md` shows the current title; headings do not yet).
- The stored href is the relative path `/documents/12#launch-plan`. Clicking in the editor works, but "open in new tab" or copying the address gives a path the hash router does not serve until clean URLs ship (`docs/backlog/clean-urls-no-index-html-or-hashes.md`); `parseDocumentHref` in `data/heading.ts` is the one place to update then.
- Clicking any in-app link in the editor navigates away; to edit a link's text use the arrow keys or select it and use the Link button.
- Ids are stored only after an edit. In a document nobody has edited, two headings with the same text are told apart by order ("-2"), so adding another one above shifts them until the next save.
- Copying a heading copies its id. The later of two headings with the same id gets a new id on the next save; if the copy sits above the original, links to the original now reach the copy.
- Broken links: only links to documents and headings in this app (`/documents/12#anchor` and its hash and absolute forms) are checked, not web links, Collections or sheets as heading targets. The answer is cached for 30 s, so a heading deleted in another tab can take that long to show. If the collaboration server is down, a collaborative document is never marked. "Pick a new target" can only pick a heading, not a whole document. A link is found again by its position, so if collaborators edit the text before it while the dialog is open, nothing is changed and a notice says so.
- Headings in a Collection cell or a sheet do not exist, so only documents can be targets. A document's "Linked from" list (`document_backlinks.md`) includes the documents that link to one of its headings, but does not say which heading.
- The `Heading` change touches the editor schema (`collab-server/src/schema.ts`), which `backlog/link-to-another-document` also edits (different lines).

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/link-to-a-heading`, not merged).
- Not implemented: link text that follows heading renames, an `@` trigger, new-tab-safe addresses, backlinks.
- Not verified: `npm run lint`, the type-check, Jest and the collab-server Vitest run (no `node_modules` here), and the editor in a browser (mobile width, dark mode, collaboration). Only the pure data tests were executed (15 pass), plus an offline parse and Sass compile of the changed files.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Broken-link handling implemented 2026-11-09 (not deployed; on branch `backlog/broken-link-handling`, not merged). Alex's decision: mark the link broken and offer a fix (struck through in the danger colour; click opens the dialog with Pick a new target and Remove link). Not implemented: a keyboard shortcut for the fix (use the toolbar button), fixing a link to a whole document without a heading, a count of broken links per document.
- Not verified for broken links: `rails test`, `npm run lint`, `tsc -b`, the real Jest run and the editor in a browser (375 px, dark mode, collaboration, keyboard). Run offline only: the pure and hook/dialog tests under the Jest stand-in, and Sass compile of the stylesheets.
