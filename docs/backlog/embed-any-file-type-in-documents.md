---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/embed-any-file-type-in-documents
---
# Any file type embedded inside a document

## Objective

**Any file type embedded inside a document** (Alex, 2026-10-13): audio/music (mp3, m4a, wav, flac, ogg) with an inline player, video (already works), and any other file (PDF, zip, Office docs) as an attachment card with name, size, type icon, preview and download

## Requirements / notes

Today the editor accepts images and video only: `DocumentScreen.tsx` filters drops/pastes to `image/*` and `video/*`, and `UploadsController::ALLOWED_TYPES` has no audio or other types. Needs an Audio node and a File-attachment node in the editor, and the allow-list widened (shares the work in `upload-any-file-type.md`).

## Context

Section "Files and images in collections" of the retired shared backlog.

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

Update 2026-10-18: Alex confirmed a collection is what the app calls a table today (see `docs/features/collections.md`). Files and images as a collection *field* are `collection-image-and-file-fields.md`; the items below still cover uploading files into folders.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

## Acceptance criteria

- Any file type embedded inside a document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/embed-any-file-type-in-documents`, not merged: no network, `node_modules` or database were available, so the checks below could not run. Feature doc: `docs/features/embedded_files.md`.

Done: `POST /api/v1/uploads` accepts any type (100 MB cap, Space member role, returns filename/type/size); Active Storage tables migration `20261101080001` (main had none); nginx `client_max_body_size`; `audio` and `fileAttachment` editor nodes with an `AttachmentCard` (icon, name, type, size, player, Preview for images/PDF, Download, Remove); drop, paste and toolbar picker upload any file; collab-server schema mirrors the new nodes; tests written for all of it.

Ran: `ruby -c` on changed Ruby files, sass compile of changed stylesheets, the static import/syntax check, and the pure `data/attachment.test.ts` (15 passed) in the stand-in runner.

Did not run: `rails db:migrate` and `rails test` (migration, hand-edited `schema.rb`, `uploads_controller_test.rb`), `npm run lint` (ESLint and Stylelint), the TypeScript check, Jest and RTL tests (`AttachmentCard.test.tsx`, `Attachment.test.ts`), `collab-server` `npm test`, and any browser check.

To verify and merge:
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited version (the three Active Storage tables and two foreign keys, `version: 2026_11_01_080001`); `rails test`.
2. `cd frontend && npm install && npx tsc --noEmit && npm run lint && npm test` (check the lucide icon names import: `FileAudio`, `FileVideo`, `FileImage`, `FileArchive`, `FileSpreadsheet`, `FileText`, `File`, `Paperclip`, `Eye`, `Download`).
3. `cd collab-server && npm install && npm test`.
4. In the browser, open a document: attach an MP3, a FLAC, a PDF, a ZIP and a Word file with the paperclip, by dropping and by pasting a screenshot; play the audio, Preview the PDF, Download each, Remove a card. Check at 375px and desktop, light and dark. Reload and open the document in a second browser to confirm the shared (collab) copy keeps the cards.
5. If `backlog/upload-files-and-images-into-a-folder` merges too, both add the Active Storage tables: keep one copy in `schema.rb` (both migrations are guarded) and consolidate the two `formatBytes` helpers.

Decisions for Alex: any file type is accepted with no virus scanning or quota (the conservative choice was to keep only the 100 MB cap and the Space-role check); SVG now becomes a download card instead of an inline picture, because Active Storage will not serve SVG inline.
