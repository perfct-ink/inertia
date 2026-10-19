# Document outline (table of contents)

## What it does
A slim outline of a document's headings sits at the top right of the editor. It marks the heading the cursor is under (bold, with a coloured tick), and clicking a heading moves the cursor there and scrolls it into view. Headings indent by level (up to level 4). Below 1100px wide it collapses to tick marks only, like a code-editor minimap; the full heading text stays in each tick's tooltip. A document with only its title heading shows no outline. It updates as you type.

## API and models
No endpoint. `DocumentOutline` (`frontend/src/components/DocumentOutline.tsx`) reads the heading nodes from the editor and uses `activeHeadingIndex` in `frontend/src/data/document.ts`; it is rendered by `view/document/DocumentScreen.tsx`.

## Who can view and change
Anyone who can open the document; it is read-only navigation.

## Tests
`frontend/src/data/document.test.ts` (`activeHeadingIndex`), `frontend/src/components/DocumentOutline.test.tsx` (with a fake editor).

## Known limits
- "Where you are" follows the cursor, not the scroll position, so scrolling with the mouse does not move the marker.
- The outline sits over the page's right margin; on a mid-width window it can overlap wide content (it is sticky and 12rem wide at most).
- Headings are not linkable yet (`docs/backlog/link-to-a-heading.md`), and it is only on documents, not sheets or Collections.

## History
- Implemented 2026-10-19 on branch `backlog/table-of-contents-as-a-minimap`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules), so the sticky positioning and narrow collapse were never seen.
