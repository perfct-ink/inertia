---
branch: backlog/file-download-rename-move-replace
priority: p1
depends_on: [upload-files-and-images-into-a-folder]
---
# Drag-and-drop and multi-file upload onto a folder

## Objective

Drag-and-drop and multi-file upload onto a folder

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* are `collection-image-and-file-fields.md`; the items below still cover uploading files into folders.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

## Acceptance criteria

- Drag-and-drop and multi-file upload onto a folder works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on `backlog/file-download-rename-move-replace`, stacked on `backlog/upload-files-and-images-into-a-folder` (merge it first; this branch covers both this task and drag-and-drop onto a sidebar folder). To verify: `cd backend && bundle install && rails test`, `cd frontend && npm install && npm run lint && npm test`, then try replace, move and a file drag from the desktop in a browser. None of that could run here. Then remove this file and merge.
