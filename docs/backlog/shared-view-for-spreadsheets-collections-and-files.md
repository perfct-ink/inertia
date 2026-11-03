---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Share spreadsheets, Collections and files by link

## Objective

Share links work for rich-text documents and folders of them. Make spreadsheets, Collections and uploaded files shareable too, view only, so a folder link shows everything in the folder and a link can point at any item (see `docs/features/shared_links.md`).

## Requirements

- **Spreadsheets:** return the sheet data in `SharedContent` and render it read-only (Fortune Sheet with editing off) on the shared page.
- **Collections:** a token-scoped read of the Collection's fields and records (and the cells' display values), rendered read-only. Decide how relation fields to other Collections behave: show the linked record's display text only, never reach into a Collection the link does not cover.
- **Files:** a token-scoped download or preview of the file (the existing preview component), without exposing a long-lived signed blob URL beyond the link's life if that can be avoided.
- Extend `Share::SHAREABLE_DOC_TYPES`, `canShareDocType` in `data/share.ts`, the sidebar and toolbar entries, and `Share#covers?`/folder listings; keep everything else (404 for anything outside the link, no people in the payload, rate limit, headers) unchanged.

## Acceptance criteria

- A link to each kind of item opens it read-only for a signed-out visitor, with no editing controls, at 375px and on desktop.
- A folder link lists and opens all four kinds; nothing outside the folder is reachable.
- Tests cover each kind, including that no member names or emails appear in the payload; `shared_links.md` is updated and this file is removed.
