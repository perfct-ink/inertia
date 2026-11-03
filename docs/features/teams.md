# Teams

## What it does
A team is a named group of people inside a Space that holds one role there together. Everyone on the team gets that role in the Space without needing their own membership, so access for a group is granted, changed or taken away in one place.

- **Teams dialog**: in a shared Space, the Space switcher's modal has a "Teams" button (next to "Members") that opens "Teams in <Space>". It lists the teams by name; each shows its people count, its role with a one-line description of what that role can do, and its people (name and email).
- **Admins and owners** create a team (name plus a role, default member), change a team's role, rename it, delete it (after a confirmation), add a person by the email of an existing user, and remove a person. Everyone else in the Space sees the same list read-only. A personal Space has no Teams button because it cannot be shared.
- **Roles**: a team can be `viewer`, `member` or `admin`, never `owner`. A person's role in the Space is the highest of their own membership and every team they are on, so a team never lowers someone's own role. A person who is only on a team still sees the Space in the Space switcher, with the team's role, and can open it.
- **Effect everywhere**: every API that checks a Space role (writes need `member`, renaming and member/team management need `admin`) and every lookup by document, table or folder id uses the combined role. Initiative, milestone and sprint owners may be someone who is on a team in the Space.
- Removing a person from a team, or deleting the team, removes the access it gave. It never touches anyone's own membership.
- **People who are only on a team are listed with the Space's members.** In the Members dialog they come after the direct members, read-only: their name and email, their combined role as plain text (no role select, no remove button, not even for themselves), and a "via <team>" label naming the teams that give it. From the Space switcher that label is a button that closes Members and opens the Teams dialog, where an admin changes them; from the getting-started "Add people" step it is plain text. The initiative and objective owner pickers, the assignee and filter lists and the getting-started step count them as people of the Space; the owner pickers label them "Cy (via Design)". People with their own membership look and work as before, even when they are also on a team.

## API and models
- `teams` table: `workspace_id`, `name` (required, up to 80 characters, extra spaces collapsed, unique per Space ignoring case), `role` (integer on the same scale as `workspace_memberships.role`: 0 viewer, 1 member, 2 admin). `Team::ROLES` limits it to those three. A personal Space cannot have teams (validated on create).
- `team_memberships` table: `team_id`, `user_id`, unique per team and user. Teams and their memberships are deleted with the Space; a user's team memberships are deleted with the user.
- `WorkspaceAccess` (`backend/app/models/workspace_access.rb`) builds `{ workspace_id => access }` for a user from their memberships and teams (highest role wins). `WorkspaceScoped#membership_in` and `#accessible_workspace_ids` use it, and `WorkspacesController#roles` reports the combined role as `role` on each Space. `RoleCapabilities` (`can_write?`, `can_manage?`) is shared by `WorkspaceMembership` and `WorkspaceAccess`. `User#accessible_workspaces` is now a method (memberships or teams) rather than an association. `Workspace#accessible_by?(user_id)` backs the "owner must be a member of the Space" check in `PlanningItem`.
- Endpoints, all under a Space named in the path (like members); `X-Workspace-Id` is not used:
  - `GET /api/v1/workspaces/:workspace_id/teams`: teams with `members: [{ id, user_id, user: { id, name, email } }]`, ordered by name. Any member of the Space.
  - `POST /api/v1/workspaces/:workspace_id/teams` (`{ team: { name, role } }`), `PATCH .../teams/:id`, `DELETE .../teams/:id`: admin or owner.
  - `POST .../teams/:team_id/members` (`{ email }`, an existing user) and `DELETE .../teams/:team_id/members/:id` (the team membership id): admin or owner; both answer with the updated team.
  - `GET /api/v1/workspaces/:workspace_id/members` lists the direct memberships (as before, plus `teams: []`), then each person who is only on a team: `id: null` (no membership to change), `role` (the highest of their teams' roles), `weekly_capacity_hours: 0` (capacity belongs to a membership), `user` and `teams: [{ id, name }]`. `PATCH` and `DELETE` there still take a membership id, so they cannot reach these people.
  - Errors: 404 for a Space the caller cannot reach (and for a team of another Space), 403 for a non-admin write, 422 with `errors` for a duplicate or blank name, a role other than viewer, member or admin, a personal Space, an unknown email, or someone already on the team.
- `TeamOnlyMember` (`backend/app/models/team_only_member.rb`) finds those people for a Space in a few queries (team memberships of the Space whose user has no membership there) and works out the role with `WorkspaceAccess.highest`; `TeamOnlyMemberBlueprint` renders them in the shape of `WorkspaceMembershipBlueprint`. On the web the `WorkspacePerson` type is a `WorkspaceMember` or a `TeamOnlyMember` (`id: null`); `frontend/src/data/workspaceMember.ts` has `isTeamOnly`, `directMembers`, `viaTeamsLabel` and `personLabel`. `WorkspaceMembers` takes an optional `onOpenTeams` callback (the switcher passes one for a shared Space), and changing a team refreshes the members list too.
- Frontend: `frontend/src/data/team.ts` (types, `TEAM_ROLES`, role descriptions, `sortTeams`, `teamNameTaken`, `teamPeopleLabel`), `frontend/src/api/teams.ts` (React Query hooks), `frontend/src/components/workspace/WorkspaceTeams.tsx` and `.scss`. Changing a team refreshes the teams, the Space list and the open Space so the signed-in user's own role updates. Failed requests show the shared error notice from `lib/api.ts`.
- User-facing names are in `backend/config/locales/en.yml` (Team, Team membership; a team's workspace is "Space").

## Who can view and change
Any member of the Space, by membership or through a team, can list its teams. Only admins and owners (directly or through an `admin` team) create, change and delete teams and their people. A team can hand out at most `admin`, which an admin could already grant to a named person; the `owner` role can only be granted to a person by an owner.

## Web entry points
Sidebar header, Space name, "Teams" button (`components/workspace/WorkspaceSwitcher.tsx`). The Mac app shows the same sidebar in its web view; there is no native teams screen.

## Tests
- `backend/test/models/team_test.rb`: name rules, role cap, personal Space, cascade deletes, combined role (highest of membership and teams), access removed when the team goes, initiative owner on a team.
- `backend/test/controllers/teams_controller_test.rb`: list, create, update, delete, add and remove people, who may do what, 404 across Spaces, and the combined role through the rest of the API (tasks, documents, rename, delete a Space).
- `frontend/src/data/team.test.ts` (run offline with a small Jest shim) and `frontend/src/components/workspace/WorkspaceTeams.test.tsx`.
- Team-only people in the member lists: `backend/test/models/team_only_member_test.rb`, the team-only cases in `backend/test/controllers/workspace_members_controller_test.rb`, `frontend/src/data/workspaceMember.test.ts`, `frontend/src/components/workspace/WorkspaceMembers.test.tsx`, plus the owner picker case in `view/okrs/OkrsScreen.test.tsx` and the leave-out case in `view/resources/ResourcesScreen.test.tsx`.

## Known limits
- A team belongs to one Space. There are no account-wide teams that could be granted a role in several Spaces; that needs an owner for the team outside any Space.
- People who are only on a team have no membership, so the Resources page leaves them out (weekly capacity and project allocations belong to a membership; the server only allows allocating a member), and a document moved or copied into the Space loses them as task assignees (`docs/backlog/keep-team-only-assignees-in-space-transfer.md`). Only the two owner pickers label them with their team; the other people lists show the plain name.
- Only admins and owners can take someone off a team; a person cannot leave a team (or the Space, if the team is their only access) themselves. See `docs/backlog/leave-a-team.md`.
- Team members are added by the email of an existing user, like members; there are no invitations (`docs/backlog/invite-people-without-an-account.md`).
- Teams grant a role in the whole Space. Per-folder permissions are `docs/backlog/guests-and-per-folder-permissions.md`.
- The dialog lists every team with all its people; it scrolls but is not searchable.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/teams-with-space-roles`).
- Not implemented: account-wide teams, team lists in the Members dialog, leaving a team.
- Not verified: no check was run on the test suites, because this machine has no `node_modules`, database or usable Bundler. Run offline: the static checker over the changed files (TypeScript parse, SCSS compile, `ruby -c`), the pure `data/team.test.ts`, and a plain-Ruby check of the `WorkspaceAccess` role logic with stub models. Not run: `rails db:migrate` (and the diff of `schema.rb`, which was edited by hand), `rails test`, `npm run lint`, the TypeScript build, the Jest component tests, or the screen in a browser at 375px and desktop, in light and dark.

- Implemented 2026-11-03 (not deployed; on branch `backlog/show-team-members-in-space-member-lists`): team-only people in the members endpoint, the Members dialog, the owner pickers and the getting-started step. Not verified: no `rails test`, `rails db:migrate` (no migration was needed), `npm run lint` or `tsc -b`, and nothing in a browser at 375px and desktop, light and dark. Run offline: the static checker, `ruby -c`, `data/workspaceMember.test.ts`, and the Jest stand-in for `WorkspaceMembers`, `ResourcesScreen` and `OkrsScreen`.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
