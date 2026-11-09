---
priority: p1
depends_on: []
---
# Attach uploaded files to tasks

## Objective

Attach uploaded files to tasks

## Requirements / notes

Tasks only (Alex, 2026-11-09 groom). Features are left out: a feature's requirements document (`features-with-requirements-docs.md`) can already hold embedded files.

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* have shipped (`collection-image-and-file-fields.md` is gone).

Today (checked 2026-11-09): any file type can be uploaded as a folder item (`docs/features/uploaded_files.md`) or embedded in a document (`docs/features/embedded_files.md`). Nothing attaches a file to a task.

## Acceptance criteria

- Attach uploaded files to tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
