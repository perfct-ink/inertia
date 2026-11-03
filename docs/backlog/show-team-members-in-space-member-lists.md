---
priority: p2
depends_on: [teams-with-space-roles]
components: [backend, frontend]
branch: backlog/show-team-members-in-space-member-lists
---
# Show people who are only on a team in the Space's member lists

## Objective

A person who has access to a Space only through a team appears wherever the Space's people are listed or picked, so the Members dialog and the owner pickers match who can actually open the Space.

## Requirements / notes

- `GET /api/v1/workspaces/:id/members` lists direct memberships only (`docs/features/teams.md`). Team-only people are missing from the Members dialog (`components/workspace/WorkspaceMembers.tsx`), the initiative owner picker (`view/initiatives/InitiativesScreen.tsx`) and the getting-started "Add people" step, although the server already accepts them as owners (`Workspace#accessible_by?`).
- Return them with their combined role (`WorkspaceAccess`) and the names of the teams that give it, with no membership id to edit; show them read-only in the dialog with a "via <team>" label that opens the Teams dialog.
- Keep the existing member rows, roles and removal rules unchanged.

## Acceptance criteria

- A person who is only on a team shows in the Members dialog and in owner pickers, labelled with their team.
- Their row has no role select or remove button in the Members dialog.
- Failed API calls show an error to the user.
- Tests cover the endpoint and the dialog; `docs/features/teams.md` is updated and this file is removed.

## Blocked

Done on the branch: `GET /api/v1/workspaces/:id/members` also returns people who are only on a team (`id: null`, combined `role`, `teams`), via `TeamOnlyMember` and `TeamOnlyMemberBlueprint`; the Members dialog shows them read-only with a "via <team>" label (a button that opens the Teams dialog when `onOpenTeams` is given, as the Space switcher does); the initiative and objective owner pickers label them "Name (via Team)"; the getting-started step counts them; the Resources page leaves them out (capacity and allocations need a membership); changing a team refreshes the members list. Backend, frontend and data tests added; `docs/features/teams.md` updated. No migration. Left in `docs/backlog/` until merged. Out-of-scope finding: `keep-team-only-assignees-in-space-transfer.md`.

Checks that did not run (no network, `node_modules`, database): `rails test` (including `team_only_member_test.rb` and the new cases in `workspace_members_controller_test.rb`), `npm run lint`, `tsc -b`, the full Jest suite, and the screen in a browser.

Checks that ran: the offline static checker (`/tmp/runner/all.sh`), `ruby -c` on the changed Ruby, `data/workspaceMember.test.ts` with the Jest shim, and the Jest stand-in for `WorkspaceMembers.test.tsx`, `ResourcesScreen.test.tsx` and `OkrsScreen.test.tsx`.

To verify and merge: `cd backend && rails test test/models/team_only_member_test.rb test/controllers/workspace_members_controller_test.rb test/controllers/teams_controller_test.rb`, then `cd frontend && npm run lint && npx tsc -b && npm test`. In a browser, in a shared Space with a team whose person has no membership, open the Space switcher, Members: that person shows read-only with "via <team>" (click it to open Teams) at 375px and desktop, light and dark; check the Objectives and Initiatives owner pickers list them. Merge hazard: `docs/features/teams.md`, `frontend/src/api/teams.ts` (one invalidation line) and `WorkspaceSwitcher.tsx` are also touched by `leave-a-team`.
