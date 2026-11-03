# Share links (view only)

## What it does
Anyone who can change content in a Space can make a link that lets other people read one document, or a folder and the documents in it, without an account. The link opens `/shared/<token>`. It is view only: nothing on the page can be edited, and the page says so ("Shared with you, view only.").

Making and managing links:
- **Where:** "Share link…" in the sidebar menu of a document or folder (right-click, or the ⋮ button on a touch device); a "Share link" button at the end of a document's toolbar; a "Share" button in a folder page's header. Viewers in the Space don't see these. Spreadsheets, Collections, uploaded files and a Space's Root folder don't offer it.
- **The dialog** (`components/share/ShareDialog.tsx`) asks when the link expires (in 7, 30 or 90 days, or never; 30 days is pre-selected), makes the link, and lists every link of that item with its address, "View only", when it expires, a Copy button and a "Turn off" button (after a confirmation). If the browser refuses to copy, it says to select the link and copy by hand.
- **Turning a link off** deletes it; the address stops working at once. There is no way to change an expiry date afterwards: turn the link off and make a new one.

What a visitor sees at `/shared/<token>` (`view/shared/SharedScreen.tsx`), the same for signed-out and signed-in people:
- A banner on every shared page: "Shared with you, view only.", the expiry date if there is one, and a link ("Sign in" when signed out, "Go to your Space" when signed in).
- **A document link:** the document's text, read-only, drawn with the editor's own schema and styles (`components/editors/ReadOnlyDocument.tsx`): headings, lists, tables, code, links, images, video, audio and file cards. Task lines (checkbox lines) show as plain list items without a checkbox or status. An empty document says "This document is empty."
- **A folder link:** the folder's name and an outline of the rich-text documents in it and in its subfolders (any depth; archived subfolders and folders with nothing to read are left out). Choosing a document opens it at `/shared/<token>/documents/<id>`. On a wide screen the outline and the document sit side by side; on a phone they take turns, with an "All documents" link back. A folder with nothing readable says so.
- **A Space's roadmap link** (made from the Roadmap page, see [roadmap.md](roadmap.md)) opens on the same page and gets the same banner.
- **An unknown, turned-off or expired link** gets "This link isn't available. It may have been turned off or may have expired." with no banner. The page never says which of the three it was. A busy server (429) or a network failure says so and offers "Try again".
- The page asks not to be indexed (`robots: noindex, nofollow` meta tag) and not to send the address on as a referrer (`referrer: no-referrer`).

## What a link can reach, and the reasoning
A link is a bearer token: whoever holds the address can read what it shares, with no sign-in, until it expires or is turned off. The design keeps what that reaches as small as possible.

- **Token.** `SecureRandom.urlsafe_base64(16)`: 128 bits from the system's secure random source, 22 URL-safe characters, made on the server only (a client cannot choose or send one), with a unique index. It cannot be guessed or enumerated. Lookups are by exact match on the indexed column.
- **Scope.** A document link reaches that one document. A folder link reaches the rich-text documents in that folder and its active subfolders, and nothing else; `GET /shared/:token/documents/:id` walks up from the document's folder to the shared folder, and refuses (the same 404 as an unknown id) a document that is outside it, is not a rich-text document, or sits under an archived folder. A link never reaches the Space around it: no other folders or documents, no tasks, events, members, teams or settings.
- **Payload is built by hand** (`backend/app/models/shared_content.rb`), field by field, not from the usual blueprints. A document shows its title, type, text and last-changed time. A folder listing shows the folder's name and icon, its subfolders' ids, names and icons, and each document's id, title, folder id and last-changed time (at most 500 folders and 500 documents; "Only the first documents are listed" appears if cut). There are no member or author ids, names or emails, no `created_by`, no Space id or name (the roadmap link keeps showing the Space name, as before), no pin or archive flags, and no share ids or tokens in the response. The internal task ids on checklist lines are stripped out of the text, so a link holder reads the lines, not the Space's tasks. The tests assert that a creator's name and email never appear.
- **What it does not hide.** The text itself is whatever the writers put in it (names, links, anything). Images, videos and files embedded in a document are Active Storage URLs with signed ids; the page loads them, and anyone who saved such a URL can still fetch it after the link is turned off. Turning a link off stops the page, not copies of what was already read. Links inside a shared document that point at other documents lead to the app, which asks for sign-in.
- **Revocation.** "Turn off" deletes the row, and every public request looks the token up in the database, so it stops working immediately. Public responses are `Cache-Control: no-store`, so no browser or proxy keeps one. A link also stops when it expires (404), when its document or folder is deleted (`dependent: :destroy`), when its document stops being a rich-text document, and when its folder, or any folder above it, is archived. Moving a document to another Space keeps its link working (the document is the same record; see [space_transfer.md](space_transfer.md)); a copy has no links.
- **Every failure looks the same.** Unknown, turned-off, expired and no-longer-reachable links, and documents outside a folder link, all answer `404 {"error":"Not found"}`.
- **Request limit.** The two public endpoints are limited to 120 requests a minute per IP address (Rails `rate_limit`, counted in `Rails.cache`; see [../services.md](../services.md)), answering `429` after that. The count includes requests that 404, so scanning for tokens is slowed too. In production the count lives in Rails' default file store: it is shared by the processes on one host but resets when the container is replaced.
- **Response headers** on both public endpoints: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`.
- **The address is the secret.** It appears in the browser's history and in request logs (Rails filters a `token` parameter, but not the path in its "Started GET" line, and nginx logs the path). That is how any "anyone with the link" address works; the expiry default and turning links off are the controls.
- **Signed-in visitors get no extra rights.** The public endpoints ignore sign-in and the Space header. Being a member of the Space, or of another Space, changes nothing on a shared page.
- **Managing links needs write access.** Making, listing, reading and turning off links need the member role or above in the item's Space; a viewer in the Space gets 403 and never sees a token. Someone outside the Space gets 404. Links are found by id across the user's Spaces and then checked against the item's own Space. (The old lookup joined every folder and let any signed-in person read a document link's token by id; this replaces it.)
- **No editing through a link.** See "Edit links" below.

## Edit links: not built, and why
The `shares` table has always had a `permission` of `view` or `edit`, but nothing ever let a link edit, and this keeps it that way on purpose:
- A new link cannot be an edit link: `POST /api/v1/shares` with `permission: "edit"` answers 422 ("Editing through a link isn't available yet; share it as view only"). That also means no dormant edit tokens pile up that would silently become live if editing were built later.
- A link that already has `permission: "edit"` (none can be made through the web app; only the API could have) opens view only: the public payload says `access: "view"` whatever the stored permission, and the dialog labels such a link "View only (made as an edit link)".
- Editing needs real-time sync (the collaboration server accepts only a signed-in person's JWT, checked against `GET /api/v1/documents/:id`; a share token is accepted nowhere that writes), a name for anonymous cursors, abuse limits, size limits and a record of who changed what. Letting the internet change a Space's documents is a product and privacy decision for Alex, so it is a backlog task: `docs/backlog/edit-through-share-links.md`.

## Per-folder permissions and guests: not built
The task title asks for guests and per-board (per-folder) roles (view-only, edit, owner). That is a product and privacy call, so only the conservative first slice above is built, and the rest is in the backlog: `docs/backlog/per-folder-permissions-for-guests.md` (builds on `collaborate-on-entire-folders` and `invite-people-without-an-account`). Roles today are per Space (viewer, member, admin, owner), given by membership or team ([teams.md](teams.md)).

## API and models
- `Share` (`backend/app/models/share.rb`, table `shares`): polymorphic `shareable` (Document, Folder, or Workspace for the roadmap link), `token`, `permission` (`view`/`edit`, unknown values are a validation error), `created_by`, and `expires_at` (nullable; null means until turned off; added by migration `20261103100001_add_expires_at_to_shares.rb`). `Share.open!(token)` is the one way a token becomes a share: it raises RecordNotFound for unknown, expired or no-longer-reachable links. `Share#covers?(document)` decides whether a folder link reaches a document. Validations on create: only rich-text documents, not a Space's Root folder, not `edit`.
- `Folder#archived_in_tree?`: archived itself or inside an archived folder.
- `SharedContent` (`backend/app/models/shared_content.rb`): builds the public payload `{ kind: "document" | "folder" | "roadmap", access: "view", expires_at, resource }`.
- Signed in, member role or above in the item's Space (`Api::V1::SharesController`):
  - `GET /api/v1/shares?document_id=<id>` or `?folder_id=<id>`: the item's links.
  - `POST /api/v1/shares` with `document_id` or `folder_id` and `share: { permission: "view", expires_in_days }` (a whole number from 1 to 365, or empty for no expiry; anything else is 422).
  - `GET /api/v1/shares/:id`, `DELETE /api/v1/shares/:id`.
- Public, no sign-in, rate-limited: `GET /api/v1/shared/:token` and `GET /api/v1/shared/:token/documents/:document_id`.
- The roadmap link's own endpoints (`/api/v1/roadmap_share`) are unchanged and not reachable through `/api/v1/shares`.
- Frontend: `api/shares.ts` (`ShareApi`, hooks for the owner's list, create and turn off, and the two public reads, which are `silent` because the page explains failures itself), `data/share.ts` (types and pure helpers: URLs, expiry choices and text, `folderOutline`, `unavailableText`), `store/share.ts` (what the dialog is open for; `ShareHost` in the sidebar shows it, like the move/copy dialog), `extensions/documentSchema.ts` (the document's nodes and marks, shared by the editor and the read-only page) and `StaticWorkspaceTaskItem` in `extensions/WorkspaceTaskItem.tsx` (the task line without controls; the editor's version reads and changes the signed-in person's tasks, which a link visitor must not touch). `ProseMirror.scss` moved to `components/editors/` because two views now use it.

## Who can view and change
- Anyone holding a live token can read what it shares, view only.
- Making, seeing and turning off links: member, admin and owner in the item's Space. There is no Space-level switch to restrict who may make public links (see Known limits).

## Web entry points
`/shared/:token` and `/shared/:token/documents/:documentId` (`view/shared/SharedScreen.tsx`, `SharedFolderPage.tsx`); the share dialog from the sidebar tree (`FolderItem.tsx`), the document toolbar (`view/document/DocumentScreen.tsx`) and the folder page (`view/folder_detail/FolderDetailScreen.tsx`).

## Tests
- `backend/test/models/share_test.rb` (token shape and uniqueness, expiry, archive and type changes, what a folder link covers, what cannot be shared, no edit links)
- `backend/test/models/shared_content_test.rb` (task ids stripped, no people in the payload, folder listing, old edit links served view only)
- `backend/test/controllers/shares_controller_test.rb` (making, listing and expiry; roles and other Spaces; public reads signed out and signed in; no leaked names or emails; headers; unknown, revoked, expired and archived are 404; folder links and the documents they cover; the 429 answer)
- `backend/test/controllers/roadmap_shares_controller_test.rb` (unchanged; the roadmap payload still works through the new envelope)
- `frontend/src/data/share.test.ts`, `api/shares.test.ts`, `components/share/ShareDialog.test.tsx`, `components/editors/ReadOnlyDocument.test.tsx` (mocks the editor), `view/shared/SharedScreen.test.tsx`, `view/folder_detail/FolderDetailScreen.test.tsx` (Share button by role), `hooks/useHeadMeta.test.ts`
- Not tested: the real TipTap rendering of a shared document, the sidebar menu item and the document toolbar button.

## Known limits
- Only rich-text documents. Spreadsheets, Collections and uploaded files cannot be shared, and a folder link leaves them out (`docs/backlog/shared-view-for-spreadsheets-collections-and-files.md`).
- Any member (not only admins) can make a public link, with no Space setting to forbid it, no password, no view count or access log, and no way to change an expiry in place (`docs/backlog/share-link-controls.md`).
- A new link expires in 30 days unless the person picks another time; "Never" is one click. That default is a conservative choice, easy to change in `DEFAULT_EXPIRY` (`data/share.ts`).
- Task lines show as plain list items; a task's status, assignee and date are not shown.
- A shared folder's outline is cut at 500 folders and 500 documents.
- The text a link shows is whatever was last saved. A document being edited live shows its saved version, which can lag the editor by a moment.
- The rate limit is per IP address, so many people behind one office address share a budget, and it resets when the container is replaced.
- The address shown in the dialog is built from the page's own origin. In the Electron, iOS and Mac apps that is not a web address, so make and copy links in the browser (the Roadmap link has the same limit); a configured public web address is in `docs/backlog/share-link-controls.md`.

## History
- The `shares` table, `Share` model and `/api/v1/shared/:token` existed from 2026-10-19 (the roadmap link was built on them). Document and folder shares had a backend but no screen to make them, the public endpoint returned the full document and folder blueprints (including `created_by_id`), and `/shared/:token` showed only the roadmap.
- Implemented 2026-11-03 (not deployed; on branch `backlog/guests-and-per-folder-permissions`): the read-only page for documents and folders, the dialog to make, copy and turn off links, expiry, the hardened public endpoints.
- Not implemented: per-folder roles and guests, editing through a link, sharing spreadsheets, Collections and files, a Space setting for who may make links.
- Not verified: no Rails test, migration (`rails db:migrate`, `schema.rb` was edited by hand), `npm run lint`, type-check or browser run (no network, node_modules, database or Docker here). Run offline: `ruby -c` on every changed Ruby file; `SharedContent.public_content` exercised with plain Ruby; the pure and Jest stand-in tests listed above (the stand-in replaces the editor, react-query and the dialog primitive with stubs). The rate-limit test stubs the cache store's `increment` and assumes the controller's captured store is the one it stubs. The Cache-Control, 404 and 403 behaviours, the `enum validate: true` option and `Parameters#permit` use are from reading the Rails 7.2 source, not from running 8.1.
