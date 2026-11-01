# Links to headings

## What it does
- Every heading in a document can carry a permanent `id`. The editor stores one on each heading that has text, about 1.5 s after the last edit (with the save), and never changes it afterwards, so renaming or moving a heading does not break links to it. The id is the slug of the heading's text at that moment ("Launch plan" becomes `launch-plan`; a repeat becomes `launch-plan-2`), so addresses read `#launch-plan` instead of a random token.
- A heading that has no id yet (a document nobody has edited since this shipped, or text typed a moment ago) is still linkable: its anchor is computed from its text by the same rules, and becomes its stored id on the next save.
- The toolbar has a **Link to a heading** button (# icon). It opens a dialog: search the Space's documents by title or folder (sheets and Collections have no headings and are left out; the document being edited comes first and is labelled "This document"; Enter opens the first match), then pick one of that document's headings, indented by level. The document's first heading is its title and is not listed. The pick becomes a link: if text is selected it is linked, otherwise the heading's text is inserted as a link.
- The link is an ordinary link mark whose href is the in-app path `/documents/<id>#<anchor>`. Clicking a link to a document in the editor opens it inside the app without a reload (Cmd/Ctrl/Shift/Alt clicks and links to anything else are left to the browser). The target opens scrolled to the heading, which is highlighted for 2 s. A collaborative document fills in after it opens, so the page waits for the heading; if it has not appeared after 6 s (it was deleted) a notice says "That heading is no longer in this document."
- The router is a hash router, so the address bar shows `/#/documents/12#launch-plan`.

## API and models
No endpoint, model or migration. Document content is already JSON, so the heading node simply gains an `id` attribute (`attrs.id`).
- `frontend/src/extensions/HeadingAnchor.ts`: Heading with the `id` attribute (rendered as `data-heading-id`), `assignHeadingIds`, `findHeadingPos`, `linkToHeading`.
- `collab-server/src/schema.ts` mirrors the attribute. Without it, seeding a room from Rails' JSON would drop the ids. Deploy the collab server together with the frontend.
- `frontend/src/data/heading.ts`: the pure rules (slug, anchors, which ids to store, heading lists from saved JSON, parsing and building document paths).
- `frontend/src/hooks/useHeadingLinks.ts`: `useScrollToHeading` and `useFollowDocumentLinks`, used by `view/document/DocumentScreen.tsx`.
- `frontend/src/components/HeadingLinkPicker.tsx` (+ `.scss`): the dialog. Headings of other documents come from the existing `GET /api/v1/documents/:id`; the open document is read from the editor, since its saved copy can lag. A failed load shows the usual error notice and an inline message.
- `DocumentScreen.scss` styles the landing highlight (`document-heading--target`).

## Who can view and change
Anyone who can edit a document can add heading links to it and (through the editor) gives its headings their ids. The picker lists the documents in the active Space and loads headings through the normal document endpoint, so a member sees only what they can already open. Role-based limits were not checked.

## Tests
- `frontend/src/data/heading.test.ts` (run offline with the pure-test shim: 15 pass).
- `frontend/src/extensions/HeadingAnchor.test.ts` (real Tiptap editor: id in JSON and HTML, assigning, renaming, linking).
- `frontend/src/hooks/useHeadingLinks.test.tsx` (scrolling, waiting, missing heading, in-app link clicks).
- `frontend/src/components/HeadingLinkPicker.test.tsx`.
- `collab-server/test/schema.test.ts` (heading keeps `id`).

## Known limits
- The link's text is the heading's text when the link was made. The target follows renames; the visible text does not (the `[[` document link in `docs/backlog/link-to-another-document.md` shows the current title; headings do not yet).
- The stored href is the relative path `/documents/12#launch-plan`. Clicking in the editor works, but "open in new tab" or copying the address gives a path the hash router does not serve until clean URLs ship (`docs/backlog/clean-urls-no-index-html-or-hashes.md`); `parseDocumentHref` in `data/heading.ts` is the one place to update then.
- Clicking any in-app link in the editor navigates away; to edit a link's text use the arrow keys or select it and use the Link button.
- Ids are stored only after an edit. In a document nobody has edited, two headings with the same text are told apart by order ("-2"), so adding another one above shifts them until the next save.
- Copying a heading copies its id. The later of two headings with the same id gets a new id on the next save; if the copy sits above the original, links to the original now reach the copy.
- Headings in a Collection cell or a sheet do not exist, so only documents can be targets. Nothing lists which documents link to a heading (`docs/backlog/backlinks-each-document-lists-which-documents-link-to.md`).
- The `Heading` change touches the editor schema (`collab-server/src/schema.ts`), which `backlog/link-to-another-document` also edits (different lines).

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/link-to-a-heading`, not merged).
- Not implemented: link text that follows heading renames, an `@` trigger, new-tab-safe addresses, backlinks.
- Not verified: `npm run lint`, the type-check, Jest and the collab-server Vitest run (no `node_modules` here), and the editor in a browser (mobile width, dark mode, collaboration). Only the pure data tests were executed (15 pass), plus an offline parse and Sass compile of the changed files.
