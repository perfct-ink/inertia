---
priority: p2
depends_on: [collaborate-on-entire-folders, invite-people-without-an-account]
components: [backend, frontend]
---
# Per-folder permissions for guests (view-only, edit, owner)

## Objective

Let a Space's members share individual folders with **named guests**: people who are not members of the Space, invited by email, who get one role on one folder (and everything under it) and see nothing else in the Space. Roles: viewer (read), editor (change), owner (also manage who has access to that folder).

This is the part of "Guests and per-board permissions" that was deliberately not built when view-only share links shipped (see `docs/features/shared_links.md`), because it changes who can see what across the whole API and is a product and privacy decision for Alex.

## Decisions needed from Alex before building

- Is a guest a Space role with no default access, or only a `folder_memberships` row (the design in `collaborate-on-entire-folders`)? Does a guest see the Space in the Space switcher, and what does their sidebar show (only the shared folders)?
- Do guests see who else is in the folder? Member names and emails of the Space must stay hidden unless Alex says otherwise.
- Do viewers get comments (`comments-on-items`)? What does "owner" of a folder add over editor, and can an owner re-share or remove Space members' access?
- Tasks, events, epics and the Gantt cut across folders. Which of them does a guest see: only those whose document or folder is in the shared folder? What about a task in a shared document that belongs to an epic outside it?
- Are guests counted toward any seat limit, and is there a cap on guests per Space?

## Requirements

- Compute one effective role per (user, folder): the highest of the Space role and the nearest ancestor folder grant, inherited by subfolders and documents. Use it in every controller that today scopes by `accessible_workspace_ids` / `WorkspaceScoped`, which assumes workspace-level membership; audit them all (documents, folders, tasks, events, epics, search, files, uploads, collab-server's `GET /api/v1/documents/:id` check).
- A guest's list endpoints return only what the grant reaches (never a Space-wide list with items filtered in the client).
- Invite by email (works with `invite-people-without-an-account`: a pending grant that becomes live when the person signs up), change role, remove, and a "Shared with me" list for the guest.
- Revoking a grant ends access at once, including open collaboration sessions.
- Existing view-only share links keep working unchanged; a link never grants more than view.

## Acceptance criteria

- A guest with viewer on folder A can read A and its descendants and gets 404 for everything else, in every endpoint, with tests per endpoint family.
- An editor can change documents in the folder but cannot reach other folders, Space settings, members or teams.
- No endpoint a guest can call returns another Space member's email or name unless Alex decided otherwise.
- The sidebar, document and folder pages work for a guest at 375px and desktop, light and dark; failed API calls show an error.
- Tests cover each role; a feature doc is written (or `shared_links.md` and the folder collaboration doc updated) and this file is removed.
