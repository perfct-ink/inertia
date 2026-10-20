# Uploaded files

## What it does
Files of any type can be uploaded into a folder as items of their own, listed with documents, sheets and Collections (sidebar tree, folder pages, All files, search). "Upload files" next to the New buttons (in All files, a folder, a project) picks one or more files and uploads them one after another into the chosen folder. Opening a file shows a viewer: the file name (edit it and leave the field to rename), its type and size, a Download link, and an in-page preview for images, video and PDFs (SVG and every other type are download-only, so scripts in an SVG never run in the page). Renaming, moving, pinning, archiving and deleting work as for any item. In the viewer a **Folder** menu moves the file, and **Replace with a new version** swaps its contents for another upload (same item and name; `PUT /api/v1/documents/:id/file`, 404 for non-file items and other Spaces' files; the old contents are purged). **Drag files from your computer onto a folder in the sidebar tree** to upload them into it (the row gets a dashed outline; items dragged inside the app are ignored). The size limit is 100 MB per file.

- **Gallery**: on All files, a List / Gallery switch. Gallery shows the Space's uploaded files as cards (image thumbnails, an icon for everything else, name and size), newest first, with filters All / Images / Videos / PDFs / Other; the search box above still narrows by name or folder. Opening a card opens the viewer. (`FilesGallery`, `galleryFiles` in `data/document.ts`.)

## API and models
`documents.doc_type` gains `file` (3); `Document has_one_attached :file` (Active Storage); a file item must have its attachment and be at most `Document::MAX_FILE_SIZE`. `POST /api/v1/folders/:folder_id/files` (multipart `file`) creates the item named after the file; the document JSON has `file: { url, filename, content_type, byte_size }` for files. The migration `create_active_storage_tables` adds Active Storage's three tables with `if_not_exists` guards: the repository had no migration for them even though image and video embedding already uses Active Storage (`UploadsController`), so check whether your database already has them. Frontend: `useUploadFiles` (`api/workspace.ts`), `FileViewer`, `filePreview` and `formatBytes` (`data/document.ts`), `DocTypeIcon`.

## Who can view and change
Anyone who can write to the folder uploads; anyone who can open the folder can download. Files are not shared by public link yet. Local-disk storage (`config.active_storage.service = :local`) is used, with no per-Space quota.

## Tests
`backend/test/controllers/files_controller_test.rb` (incl. replace), `frontend/src/components/FileViewer.test.tsx`, `backend/test/models/document_file_test.rb`, `frontend/src/data/document.test.ts` (`filePreview`, `formatBytes`; stand-in runner: pass), `frontend/src/components/CreateItem.test.tsx`.

## Known limits
- No virus scanning, no per-Space storage quota or per-type limits (`docs/backlog/storage-quota-per-space-and-a-per-file-size-limit.md`), no version history on replace, no thumbnails in lists, and dropping onto the folder page's main area (not the sidebar) is not wired.
- Downloads use the Active Storage URL, which serves files to whoever has the (unguessable) link; browsers show only safe types inline.
- Files uploaded as embedded document media (`UploadsController`) are still not listed as items.
- Uploads run one at a time; a failure stops the rest and shows the error.

## History
- Implemented 2026-10-19 on branch `backlog/upload-files-and-images-into-a-folder` (also covers `upload-any-file-type`). Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, component tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
- Replace, move and sidebar drag-and-drop added 2026-10-19 on branch `backlog/file-download-rename-move-replace`, stacked on `backlog/upload-files-and-images-into-a-folder` (merge that first); the same unverified caveats apply.
- Gallery added 2026-10-19 on branch `backlog/file-previews-and-gallery`, stacked on `backlog/file-download-rename-move-replace`. `galleryFiles` passes in a stand-in runner; the rest is unverified (no node_modules).
