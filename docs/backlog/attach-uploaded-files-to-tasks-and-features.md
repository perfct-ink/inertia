---
branch: backlog/attach-uploaded-files-to-tasks-and-features
priority: p1
depends_on: [upload-files-and-images-into-a-folder]
---
# Attach uploaded files to tasks and features

## Objective

Attach uploaded files to tasks and features

## Requirements / notes

Ties into feature folders (`feature-folder-type.md`).

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* are `collection-image-and-file-fields.md`; the items below still cover uploading files into folders.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

## Acceptance criteria

- Attach uploaded files to tasks and features works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Partial, on the branch: files on tasks. Not done: files on features (documents in feature folders); the spec ties them to `feature-folder-type`. The branch is stacked on `backlog/file-download-rename-move-replace` (merge the file branches first). To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then attach files to a task in a browser. None of that could run here. Leave this file on `main` until features can have attachments.
