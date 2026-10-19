---
priority: p1
depends_on: []
---
# Storage quota per Space and a per-file size limit

## Objective

Storage quota per Space and a per-file size limit

## Requirements / notes

Production uses ActiveStorage `:local` today; large uploads need real object storage (see `docs/storage-options.md`).

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `rename-tables-to-collections-in-ui.md`). Files and images as a collection *field* are `collection-image-and-file-fields.md`; the items below still cover uploading files into folders.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

## Acceptance criteria

- Storage quota per Space and a per-file size limit works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
