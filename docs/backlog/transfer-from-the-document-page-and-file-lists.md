---
priority: p3
depends_on: [move-or-copy-content-between-spaces]
components: [frontend]
---
# Move or copy to another Space from the document page and file lists

## Objective

Offer "Move to Space…" and "Copy to Space…" wherever a document or folder is shown, not only in the sidebar tree.

## Requirements / notes

- The sidebar menus open the shared dialog through `store/transfer.ts`; the other entry points should open the same dialog with a `TransferRequest` (`data/transfer.ts`) instead of adding a second implementation.
- Candidates: the document page toolbar, the All files list, the Projects page and the folder page. Each must work on a phone (a visible button or menu, no right-click or hover).
- Consider dragging a document or folder onto the Space name in the switcher, with a touch alternative.

## Acceptance criteria

- The action is reachable from the document page, All files, Projects and the folder page at 375px and on desktop, in light and dark mode.
- Items are hidden when the user has no other Space to write in.
- Component tests cover each entry point; `docs/features/space_transfer.md` is updated and this file is removed.
