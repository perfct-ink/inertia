# Spaces

The product calls them **Spaces**; the code, API, routes under `/api/v1` and database still call them workspaces (`Workspace`, `workspaces`, `workspace_id`, `X-Workspace-Id`). The web app's page is `/space`, and the old `/workspace` link redirects there.

A space holds its own folders (under one permanent Root), documents, tasks, epics, initiatives and events, shared by the people who belong to it. Every user also has one **personal** space, created at signup and named "<name>'s Space", that cannot be shared or deleted.

## Files and projects

- **All files** (`/documents`, `view/documents_index/`) lists every document, sheet and table in the current Space, however deeply nested, with its folder path. It searches by title or folder name and sorts by name, location or last modified. The list comes from the folder tree in `GET /api/v1/workspace` (`spaceFiles` in `frontend/src/data/folder.ts`).
- **Projects** (`/projects`, `view/projects/`) are folders with `folders.kind = project` (`folder` is the default). A project lists the docs inside it and its subfolders, and new docs can be made in it from that page. Because a project is a folder, it keeps nesting, pinning, sharing and archiving, opens on the folder page, and shows in the sidebar tree with its own icon. Any folder except Root can be switched with "Make Project" / "Make Folder" in its menu; Root cannot be a project.

## Model

| Table | Purpose |
| --- | --- |
| `workspaces` | `name`, `personal`, `user_id` (the creator; access does not depend on it), `root_folder_id`. |
| `workspace_memberships` | `workspace_id`, `user_id`, `role`, `weekly_capacity_hours` (decimal, default 40, 0 to 168; see `features/resource_management.md`). One row per member; unique per workspace and user. |
| `teams` | `workspace_id`, `name`, `role` (viewer, member or admin; never owner). A group of people that hold one role in the Space together. Names are unique per Space, ignoring case. See `docs/features/teams.md`. |
| `team_memberships` | `team_id`, `user_id`. One row per person on a team. |

Roles, from least to most privileged:

| Role | Can |
| --- | --- |
| `viewer` | Read everything in the workspace. |
| `member` | Also create, edit and delete content. |
| `admin` | Also rename the workspace, add, change and remove members (not owners) and manage teams. |
| `owner` | Also grant or change the owner role and delete the workspace. |

A person's role in a Space is the highest of their own membership and the roles of the teams they are on (`WorkspaceAccess`). A team never grants `owner`, so ownership always comes from a membership.

Rules enforced in `WorkspaceMembership` / `Workspace`: a workspace always keeps at least one owner; a personal workspace has only its owner and is never deleted by itself (only with its user); a user who created a shared workspace cannot be deleted until it is removed or handed over.

## Choosing the workspace for a request

The client sends `X-Workspace-Id: <id>` (see `frontend/src/lib/api.ts`). Without it the server uses the user's personal workspace. A workspace the user does not belong to, by membership or through a team, answers 404. `WorkspaceScoped` (`backend/app/controllers/concerns/workspace_scoped.rb`) resolves it and requires the `member` role for every write (anything but GET/HEAD).

Lookups that start from a record id (`documents`, `tables`, `shares`) search all of the user's workspaces and check the role of the record's own workspace. This keeps the collab server working: it calls `GET /api/v1/documents/:id` with only the user's token.

## API

```
GET    /api/v1/workspaces                      # workspaces the user belongs to, with their role
POST   /api/v1/workspaces                      # create (caller becomes owner)
DELETE /api/v1/workspaces/:id                  # owner only; not personal
GET    /api/v1/workspace                       # the active workspace (header) with its folder tree
PATCH  /api/v1/workspace                       # rename (admin or owner)
GET    /api/v1/workspaces/:id/folders          # one Space's active folders, flat (to choose a move/copy destination)

POST   /api/v1/documents/:id/copy|move         # { target_folder_id }: into a folder of another Space
POST   /api/v1/folders/:id/copy|move           # { target_folder_id }

GET    /api/v1/workspaces/:id/members
POST   /api/v1/workspaces/:id/members          # { email, role } - an existing user; admin or owner
PATCH  /api/v1/workspaces/:id/members/:member  # { role } and/or { weekly_capacity_hours }; admin or owner
DELETE /api/v1/workspaces/:id/members/:member  # admin/owner removes anyone; anyone can leave

GET    /api/v1/workspaces/:id/teams                    # teams with their people; any member
POST   /api/v1/workspaces/:id/teams                    # { team: { name, role } }; admin or owner
PATCH  /api/v1/workspaces/:id/teams/:team              # { team: { name, role } }
DELETE /api/v1/workspaces/:id/teams/:team
POST   /api/v1/workspaces/:id/teams/:team/members      # { email } - an existing user
DELETE /api/v1/workspaces/:id/teams/:team/members/:membership
```

`GET .../members` lists direct memberships only; people who have access only through a team appear under `.../teams`.

## Frontend

`WorkspaceSwitcher` (sidebar header) lists workspaces, creates one and opens `WorkspaceMembers` and, for a shared Space, `WorkspaceTeams`. Switching stores the id in `store/workspaces.ts` (the personal workspace is stored as "none"), clears the query cache and open tabs, and returns to `/space`. Signing in or out resets it so an account never inherits another's workspace.

## Migration

`20261101050001_create_teams` and `20261101050002_create_team_memberships` add the `teams` and `team_memberships` tables. `20261015000001_rename_personal_workspaces_to_spaces` renames personal workspaces still called "<name>'s Workspace" to "<name>'s Space". `20261014000001_create_workspace_memberships` adds `workspaces.personal`, creates `workspace_memberships`, makes every existing workspace's user its owner, and marks all existing workspaces personal.

## Moving and copying content

A document or folder can be moved or copied into a folder of another Space the user can write in, from the sidebar menus; see [features/space_transfer.md](features/space_transfer.md). Everything else stays in its Space: a record never points across Spaces, so a move takes a document's tasks along but clears their epic, sprint, milestone and links.

## Not built yet

Invitations for people without an account and per-folder permissions. See `docs/backlog/invite-people-without-an-account.md` and `docs/backlog/guests-and-per-folder-permissions.md`.
