---
branch: backlog/transfer-from-the-document-page-and-file-lists
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

## Blocked

Built on this branch, not merged: nothing could be checked against the real toolchain here (no network, `node_modules` or database). Nothing was viewed in a browser.

Done: a shared `TransferMenu` (`frontend/src/components/workspace/TransferMenu.tsx`) opens the existing dialog through `store/transfer.ts` from the document page (breadcrumb row), uploaded file page, Collection and sheet headers, every All files row, every Projects card and the folder page header. The "is there another Space to write in" check is now `transferDestinations` and `canTransfer` in `data/transfer.ts`, shared with the sidebar tree. `Menu` gained `triggerVariant` and `alignEnd`; `Breadcrumb` gained an `actions` slot. Skipped on purpose: dragging onto the Space switcher (optional in the task), a menu on All files' Gallery cards (each card is one button). Found while doing it: copying an uploaded file is refused by the server, now `docs/backlog/copy-uploaded-files-between-spaces.md`.

Ran offline: `/tmp/runner/all.sh` (static parse of every changed file, sass compile, the pure data tests including the new `data/transfer.test.ts` cases), and the changed component tests (`TransferMenu`, `Menu`, `Breadcrumb`, All files, Projects, folder page, Collection editor, file viewer) under a Jest stand-in with stubbed lucide, zustand, Radix Dialog, axios and react-query. Not run: `npm run lint`, `tsc -b`, the real `npm test`, `rails test` (no backend change), and a look in a browser.

To verify and merge:

```bash
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open `/documents/:id` (text document, sheet, Collection, uploaded file), `/documents` (All files), `/space` (Projects) and `/folders/:id` with at least two Spaces you can write in, at 375px and on desktop, in light and dark mode. Check that the menu opens fully on screen from the right-hand buttons, that Move and Copy open the dialog, that the buttons disappear with one Space or a viewer role, and that on All files the date column and the ⋮ column still fit a phone.
