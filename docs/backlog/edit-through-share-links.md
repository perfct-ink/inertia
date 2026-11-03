---
priority: p3
depends_on: []
components: [backend, frontend, collab-server]
---
# Edit through share links

## Objective

Let a share link carry **edit** permission, so a person with the link can change the shared document, signed in or not. Today every link is view only: `POST /api/v1/shares` with `permission: "edit"` answers 422, and an old edit-permission row opens view only (see `docs/features/shared_links.md`). Letting the internet change a Space's documents is a product and privacy decision for Alex, so none of this is built.

## Decisions needed from Alex before building

- Should anonymous editing exist at all, or only for signed-in people (which `per-folder-permissions-for-guests` covers better)?
- Who is allowed to make an edit link (any member, or admins only)? Should the dialog warn that anyone with the address can change the document?
- How are anonymous editors shown to others (a cursor name such as "Guest")? Is anything recorded about who changed what (IP address, link id)?

## Requirements

- Allow `edit` in `Share#links_are_view_only` and the dialog (`components/share/ShareDialog.tsx`: a "Can view / Can edit" choice, default view), with a plain warning for edit.
- The collaboration server must accept a share token. Today `collab-server/src/auth.ts` accepts only a signed-in person's JWT and asks `GET /api/v1/documents/:id`; add a Rails check for a share token (a new token-scoped endpoint, or a header) so the server stays secret-free, and open view-token connections read-only.
- The shared page for an edit link renders the editor, not `ReadOnlyDocument`, without the pieces that talk to the signed-in person's Space: task lines must not create or update Space tasks (`syncTaskNodes`, `reconcileTaskLines`, the task item controls) and headings links must not read the Space.
- Abuse limits: a rate limit on the collaboration connection per link, a cap on document size, and the ability to turn the link off and drop open sessions at once.
- Keep it to rich-text documents (see `shared-view-for-spreadsheets-collections-and-files` for the rest).

## Acceptance criteria

- An edit link lets a signed-out visitor type in the document and others see it live; a view link and an expired or turned-off link cannot, including on an already open connection.
- No edit link can reach another document, a task, or any Space data.
- Tests cover the collaboration auth for view and edit tokens and the dialog; the mobile and desktop editor work for a visitor; failed calls show an error.
- `shared_links.md` is updated (the "Edit links: not built" section removed) and this file is removed.
