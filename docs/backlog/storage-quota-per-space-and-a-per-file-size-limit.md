---
branch: backlog/storage-quota-per-space-and-a-per-file-size-limit
priority: p1
depends_on: []
status: incomplete
---
# Storage quota per Space and a per-file size limit

## Objective

Storage quota per Space and a per-file size limit

## Requirements / notes

Production uses ActiveStorage `:local` today; large uploads need real object storage (see `docs/storage-options.md`).

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* are `collection-image-and-file-fields.md`; the items below still cover uploading files into folders.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

## Acceptance criteria

- Storage quota per Space and a per-file size limit works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built: a per-Space storage limit for uploaded files (`workspaces.storage_limit_bytes`, migration `20261019000024`, default 1 GB), uploads and replacements that would pass it refused with the usage in the message, and "X of Y used" beside the upload buttons (`CreateItem`). Rebased onto main (the old branch's MySQL-format `schema.rb` was replaced by main's PostgreSQL one with the new column added; `formatBytes` now comes from `data/attachment.ts`). One change on the way: the usage is part of the open Space (`GET /workspace`) only, not the list of Spaces, to avoid a query per Space.

Ran: the static checker, `data/document.test.ts` (pure) and `CreateItem.test.tsx` in a Jest stand-in. Not run: the migration and `schema.rb` diff (hand-edited), `rails test` (the new files controller, workspace and blueprint tests), `npm run lint`, `tsc -b`, the real Jest suite, and a browser.

To verify: `cd backend && rails db:migrate && git diff db/schema.rb` (empty), `rails test`; `cd frontend && npm install && npm run lint && npx tsc -b && npm test`; upload a file past a small limit (`Workspace.first.update!(storage_limit_bytes: 20)`) and look at the message and the usage line at 375px and in dark mode.

Known limit (also in the feature doc): two uploads at the same moment can both pass the check. Decision for Alex: the default is 1 GB per Space and the limit has no screen (an operator sets it); say if it should be per plan or editable by Space owners.
