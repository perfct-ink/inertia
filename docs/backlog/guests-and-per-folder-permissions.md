---
priority: p2
depends_on: []
components: [frontend, backend]
branch: backlog/guests-and-per-folder-permissions
status: incomplete
---
# Guests and per-board permissions (view-only, edit, owner)

## Objective

Guests and per-board permissions (view-only, edit, owner)

## Current state

`shares` exists: token links with view/edit on documents and folders; the `/shared/:token` page in the frontend is still a placeholder

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Guests and per-board permissions (view-only, edit, owner) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Only the conservative first slice is built, on branch `backlog/guests-and-per-folder-permissions`. The full feature (named guests with per-folder roles) is a product and privacy call that is Alex's, so it was split out and this file stays until Alex decides.

**Built (see `docs/features/shared_links.md`):** the real `/shared/:token` page, view only, for signed-out and signed-in visitors: a document, or a folder's documents with a read-only document view (`/shared/:token/documents/:id`), or the roadmap, with a "Shared with you, view only." banner; hardened public endpoints (404 for unknown, turned-off, expired and archived links, no people in the payload, no-store/noindex/no-referrer headers, 120 requests a minute per IP); link expiry (`shares.expires_at`, migration `20261103100001`); a dialog to create, list, copy and turn off links (sidebar menu, document toolbar, folder page); a fix for the old `set_share` lookup that let any signed-in user read a document link's token by id. Editing through a link is **not** enabled: new `edit` links are refused with 422 and old ones open view only.

**Not built, as new backlog files:** `per-folder-permissions-for-guests.md`, `edit-through-share-links.md`, `shared-view-for-spreadsheets-collections-and-files.md`, `share-link-controls.md`. Existing related files: `collaborate-on-entire-folders.md` (own branch), `invite-people-without-an-account.md`.

**Decisions made for Alex to confirm:** a new link expires in 30 days by default ("Never" is one choice away); any member (not only admins) can make a public link; only rich-text documents are shareable (spreadsheets, Collections and files are refused, and a folder link leaves them out); a Space's Root folder cannot be shared; task lines show as plain list items with their task ids removed.

**Checks that did not run** (no network, node_modules, database or Docker here): `rails db:migrate` and the `schema.rb` diff (`shares.expires_at` was added by hand; the schema `version:` line was left at `2026_11_03_120001` because it is already higher than `20261103100001`), `rails test`, `npm run lint`, `tsc -b`, the full Jest suite, the browser. **Ran:** `ruby -c` on every changed Ruby file, `SharedContent.public_content` in plain Ruby, `/tmp/runner/all.sh` (static parse and SCSS compile, the pure tests) and the Jest stand-in with stubbed network for `data/share.test.ts`, `api/shares.test.ts`, `ShareDialog.test.tsx`, `ReadOnlyDocument.test.tsx` (the editor is mocked), `SharedScreen.test.tsx`, `FolderDetailScreen.test.tsx`, `useHeadMeta.test.ts`.

**To verify and merge:**
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` (only `shares.expires_at datetime` should differ from this branch's hand edit), then `rails test` (new: `test/models/share_test.rb`, `test/models/shared_content_test.rb`, `test/controllers/shares_controller_test.rb`; the rate-limit test stubs `Api::V1::SharesController.cache_store.increment`).
2. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`. Watch `DocumentScreen.tsx`: its editor extensions now come from `extensions/documentSchema.ts` and `ProseMirror.scss` moved to `components/editors/`.
3. In a browser at 375px and desktop, light and dark: make a link from a document (toolbar and sidebar menu) and a folder; open it in a private window (banner, document text with headings/lists/tables/images, folder outline and the back link on a phone); turn it off and reload (the unavailable message); try a 7-day link after changing the clock or a past `expires_at`; check a task-list document shows plain list items.
4. Merge hazards: `ProseMirror.scss` was moved (other branches editing it will conflict on the rename), `DocumentScreen.tsx`, `FolderItem.tsx`, `Sidebar.tsx` (two lines), `FolderDetailScreen.tsx` and `api/roadmapShare.ts` were edited, `data/share.ts` renamed `sharedRoadmapUrl` to `sharedUrl`, `docs/features/roadmap.md`, `docs/README.md`, `docs/services.md` and `docs/features/README.md` (one appended row) were touched.
