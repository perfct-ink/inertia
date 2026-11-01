---
priority: p3
depends_on: [teams-with-space-roles]
components: [backend, frontend]
---
# Let a person leave a team

## Objective

Anyone on a team can leave it, the way anyone can leave a Space.

## Requirements / notes

- Today only admins and owners remove people from a team (`DELETE /api/v1/workspaces/:id/teams/:team/members/:membership`). A person whose only access to a Space comes from a team therefore cannot leave that Space on their own.
- Allow the caller to delete their own team membership. Leaving the last team that gives access takes the Space away from them, so confirm first and switch them to their personal Space afterwards (see `useSwitchWorkspace`).
- Show a "Leave team" action on the teams the signed-in user is on, in the Teams dialog.

## Acceptance criteria

- A person on a team can leave it from the Teams dialog and loses the access it gave them.
- They cannot remove anyone else unless they are an admin or owner.
- Failed API calls show an error to the user.
- Tests cover the endpoint and the dialog; `docs/features/teams.md` is updated and this file is removed.
