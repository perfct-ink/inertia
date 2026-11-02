---
priority: p2
depends_on: [teams-with-space-roles]
components: [backend, frontend]
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
