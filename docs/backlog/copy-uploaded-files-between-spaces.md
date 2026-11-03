---
priority: p2
depends_on: [move-or-copy-content-between-spaces]
components: [backend, frontend]
---
# Copy uploaded files between Spaces

## Objective

Make "Copy to Space…" work for an uploaded file (a document with `doc_type: file`) and for a folder that holds uploaded files.

## Requirements / notes

- `SpaceTransfer#copy_documents` (`backend/app/services/space_transfer.rb`) creates the copy with only `title`, `doc_type`, `created_by` and `content`. A file document must have its file attached (`Document#file_documents_have_a_file`), so the copy fails validation and the whole transfer is refused with the server's message. Moving a file works, because the same record, with its attachment, changes Space.
- Attach the original's blob to the copy (`copy.file.attach(source.file.blob)`), so the two share the stored file and nothing is duplicated on disk. Check that deleting one of them (and `Document#remove_from_collection_cells`) leaves the other's file in place: Active Storage purges a blob only when no attachment still points at it.
- Collection file and files cells (`TableCell`) that point at an uploaded file must keep working in a copied Collection; decide whether they point at the copy of the file when both are in the transfer, as relation fields do.
- Until this is done, the "Copy to Space…" choice is still listed for files (sidebar tree, the file's page, All files) and the dialog shows the server's message. Once it works nothing in the UI needs to change.

## Acceptance criteria

- Copying an uploaded file, or a folder with files in it, to another Space succeeds and the copy can be opened, previewed and downloaded there.
- Deleting the original does not remove the copy's file, and the other way round.
- Minitest cases cover a file copy, a folder copy holding a file, and deleting either side; `docs/features/space_transfer.md` and `docs/features/uploaded_files.md` are updated and this file is removed.
