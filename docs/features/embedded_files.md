# Files embedded in documents

## What it does
A file of any type can be put inside a rich-text document, by drag-and-drop onto the page, by pasting, or from the paperclip button in the toolbar ("Insert image, video, audio or file"; on a phone or tablet that button is the way to attach, and it opens the device's file picker). Several files at once are uploaded one after another and inserted where the cursor is. What each file becomes depends on its type (`frontend/src/data/attachment.ts`, `attachmentKind`):
- **Images** (JPEG, PNG, GIF, WebP, AVIF) and **video** (MP4, WebM, QuickTime, Ogg) are shown inline, as before.
- **Audio** (any `audio/*`: MP3, M4A, WAV, FLAC, OGG, Opus, AAC) gets an `audio` node: a card with an icon, the file name, the type and size, a browser audio player and a Download button.
- **Everything else** (PDF, ZIP, Word, Excel, PowerPoint, text...) gets a `fileAttachment` node: a card with a type icon, name, type label ("PDF", "ZIP archive", "Word document"), size and a Download button. PDFs and images that can't be shown inline also get **Preview**, which opens the file in a dialog (an image or a PDF frame) with an "Open in a new tab" link and a Close button.
- Images and video a browser can't draw or play (TIFF, HEIC, MKV...) become file cards, so they download rather than show a broken picture. SVG is one of them on purpose: Active Storage serves SVG as a download (an SVG can carry script), so as an `<img>` it would not show. This changes SVG, which used to be inserted as a picture.
- When the browser sends no file type (common for FLAC and OGG) the extension decides. The kind is chosen from the type the server stores, not the browser's guess.
- While editing, each card has a Remove button (an icon button at least 40px square, so it works by touch). Download uses Active Storage's `?disposition=attachment`, so the browser saves the file instead of opening it.
- A file over 100 MB is refused before it is sent ("name is larger than 100 MB and can't be attached."). A failed upload shows the error as a notice (`lib/api.ts`) and the remaining files still upload.
- Pasting only embeds files when the clipboard has no HTML: a screenshot or a file copied in Finder is uploaded, but a copy from Word, Excel or a web page (which carries a picture of the selection next to its HTML) stays an ordinary text paste.

## API and models
- `POST /api/v1/uploads` (multipart `file`) stores the file in Active Storage and returns `{ url, filename, content_type, byte_size }` (before, only `url`). Any content type is accepted (`ALLOWED_TYPES` is gone); a missing type is stored as `application/octet-stream`; the cap is `Api::V1::UploadsController::MAX_SIZE` (100 MB, 422 "File too large"); a request without a file is a 422. The controller now includes `WorkspaceScoped`: the Space comes from `X-Workspace-Id` and a viewer gets 403. Uploaded blobs are not attached to any record and are not listed anywhere; the document only holds the URL.
- Nodes (document JSON, `frontend/src/extensions/Attachment.ts`): `audio` and `fileAttachment`, both blocks and atoms with attributes `src`, `name`, `size` (bytes) and `type` (MIME type). The static HTML form is `<audio controls src>` and `<div data-type="fileAttachment"><a href download>`. The same nodes are mirrored in `collab-server/src/schema.ts` (without it a shared document containing a file can't be saved); keep the two in step.
- Migration `20261101080001_create_active_storage_tables`: Active Storage's three tables (`active_storage_blobs`, `_attachments`, `_variant_records`) with `if_not_exists` guards. The repository had no migration or `schema.rb` entry for them even though image and video embedding already used Active Storage, so a database built from `schema.rb` could not store any upload.
- `frontend/nginx/default.conf`: `client_max_body_size 105m` on `/api/`. nginx's 1 MB default would have rejected nearly every audio, video or PDF upload in production.
- Frontend: `data/attachment.ts` (kinds, labels, size formatting, URL safety, the node built from an upload, paste filtering), `api/uploads.ts` (`uploadFile`), `components/ui/AttachmentCard` (the card), `components/editors/AttachmentView` (the editor node view), `ButtonLink` (a link drawn as a button) in `components/ui/Button.tsx`, and a `wide` option on `Modal`.

## Who can view and change
Anyone who can open the document sees the cards and can play or download the files. Members and above (not viewers) upload; this is enforced by the API. Files are served by their Active Storage URL, which is long and unguessable but not access-checked: anyone who has the link can fetch the file, signed in or not (the same as images and video before). Document content is shared and editable, so a card's link is shown only if it is `http(s)` or a site path (`safeAttachmentUrl`); `javascript:` and `data:` sources render as "Unavailable". Active Storage serves HTML, SVG, scripts and XML as downloads rather than inline pages (its `content_types_to_serve_as_binary`; not exercised by a test here).

## Web entry points
The document page (`frontend/src/view/document/DocumentScreen.tsx`): the toolbar paperclip, drop onto the editor area, and paste into the editor.

## Tests
- `backend/test/controllers/uploads_controller_test.rb`: audio, PDF, ZIP and unknown types accepted with their metadata; missing file; the size cap; sign-in required; member allowed and viewer refused.
- `frontend/src/data/attachment.test.ts` (15 tests, run with the stand-in runner: pass): kind by type and extension, preview kinds, icons and labels, byte formatting, the size message, URL safety, download URL, the node for each upload, attribute round trip, paste filtering.
- `frontend/src/components/ui/AttachmentCard.test.tsx` (file card, PDF preview dialog, no preview for ZIP, audio player, Remove only when editable, unsafe URL) and `frontend/src/extensions/Attachment.test.ts` (schema, HTML round trip, unsafe source), both Jest/RTL.
- `collab-server/test/schema.test.ts`: the node name list now includes `audio` and `fileAttachment`.

## Known limits
- Embedded files are not items of their own: they do not appear in a folder, All files, search or a gallery, and cannot be renamed, moved or replaced (see the `upload-*` and `file-*` backlog tasks). The card name is the original file name and can't be edited.
- Files are stored on the API container's disk (the `storage` volume in production), with no virus scanning, no per-Space quota and no per-type limit. Deleting a card does not delete the stored file.
- An iframe PDF preview needs the API and the app on one origin (true behind nginx in production; in local development the API's `X-Frame-Options: SAMEORIGIN` blocks it, and the "Open in a new tab" link still works). Phones may show only the first page of a framed PDF.
- Audio plays only in formats the browser supports (OGG and Opus do not play in Safari); the Download button is always there.
- Pasting does not embed when the clipboard also has HTML, even if it also has a file.
- Uploads go one at a time with no progress bar; the file is inserted when its upload finishes, at the cursor's position then.
- If `backlog/upload-files-and-images-into-a-folder` merges as well, both branches add the same Active Storage tables (its migration is `20261019000023_create_active_storage_tables`, this one `20261101080001_create_active_storage_tables`). Both are guarded, so either order migrates; in `schema.rb`, keep one copy of the three tables and the two foreign keys and the highest `version:`. That branch's `formatBytes` in `data/document.ts` then duplicates `formatBytes` in `data/attachment.ts`; consolidate to one.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/embed-any-file-type-in-documents`). It also covers the "allow any file type" part of `upload-any-file-type` for embedded files; that task's folder-item part is separate.
- The backlog note said drops and pastes were filtered; there was no paste handling before, so paste is new here.
- Not verified: the Rails tests, the migration and `schema.rb` (hand-edited; no database), ESLint, Stylelint, the TypeScript check, the Jest and RTL tests, the collab-server tests, and the screens in a browser (phone width, dark mode, real audio and PDF files, Safari). Passed: `ruby -c` on the Ruby files, a sass compile of the stylesheets, the static import and syntax check, and the 15 data tests in the stand-in runner. The lucide icon names (`FileAudio`, `FileVideo`, `FileImage`, `FileArchive`, `FileSpreadsheet`, `FileText`, `File`, `Paperclip`, `Eye`, `Download`) were written from memory of lucide-react 0.468, not checked against the package.
