---
priority: p1
depends_on: []
branch: backlog/broken-link-handling
status: incomplete
---
# Broken-link handling when a target doc or heading is deleted

## Objective

Broken-link handling when a target doc or heading is deleted

## Requirements / notes

Show the link as broken rather than removing it.

**Decision (Alex, 2026-11-09 groom): mark broken, offer relink.** A link whose target document or heading was deleted shows struck through in the danger colour. Clicking it opens a small dialog (shared modal) saying the target is gone, with **Pick a new target** (the heading link picker) and **Remove link** (keeps the text, drops the link).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today (checked 2026-11-09): document and heading links exist through the heading link picker (`docs/features/heading_links.md`). Following a link to a deleted heading opens the document and shows "That heading is no longer in this document" after 6 s; nothing marks the link itself as broken beforehand, and a link to a deleted document isn't handled.

## Acceptance criteria

- Broken-link handling when a target doc or heading is deleted works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built on `backlog/broken-link-handling` (resumed after an earlier session was cut off by the API cost limit): the batched endpoint `GET /api/v1/documents/link_targets`, the editor marking (struck through in the danger colour, view-only decoration), the fix dialog (Pick a new target, Remove link, Cancel) and the toolbar path for the keyboard. Documented in `docs/features/heading_links.md`. Not done: a keyboard shortcut for the fix (the toolbar Link button turns into "Fix broken link" with the caret in a broken link).

Ran here (offline): the static checks (Babel parse, unused or unresolved imports, Sass compile, `ruby -c`), the pure `data` tests (`brokenLink.test.ts`, 11 pass), and under the Jest stand-in `useBrokenLinks.test.tsx` (14 pass), `BrokenLinkDialog.test.tsx` (5 pass) and `HeadingLinkPicker.test.tsx` (7 pass). Nothing was type-checked.

Not run (no network, node_modules or database): `rails test` (`document_link_targets_controller_test.rb`, `document_headings_test.rb`), `npm run lint`, `tsc -b`, the real Jest suites that need react-query or Tiptap (`api/documents.test.tsx`, `extensions/BrokenLinks.test.ts`), and any browser check.

To verify:

```sh
cd backend && rails test test/controllers/document_link_targets_controller_test.rb test/models/document_headings_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser (desktop and 375 px, light and dark): in document A link to a heading of document B (toolbar # button), delete the heading in B and delete another linked document C. Reopen A: both links are struck through in red with the tooltip; the network panel shows one `link_targets` request however many links there are. Click each (tap on a phone): the dialog says what is gone. "Pick a new target" opens the picker and re-points the link keeping its text; "Remove link" keeps the text without the link; Esc and Cancel change nothing. Put the caret in a broken link and check the toolbar button says "Fix broken link" and opens the dialog by keyboard (Tab to the button, Enter). With two browsers on A, check the marking appears in both and nothing is saved by it (no "unsaved" state, nothing in undo). Also check a link to a heading in the document itself is not flagged while the document is still loading.
