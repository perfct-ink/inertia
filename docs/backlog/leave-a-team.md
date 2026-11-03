---
priority: p3
depends_on: [teams-with-space-roles]
components: [backend, frontend]
branch: backlog/leave-a-team
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

## Blocked

Built and pushed on `backlog/leave-a-team`, not merged because the full checks could not run on the machine that wrote it (no `node_modules`, database or usable Bundler).

Done: `DELETE /api/v1/workspaces/:id/teams/:team/members/:membership` lets a person delete their own team membership (204), admins and owners still remove others; a "Leave team" button with a confirmation in the Teams dialog (it warns, closes the dialog and switches to the personal Space when the team was the only way into the Space); `data/team.ts` helpers `ownTeamMembership` and `leavingEndsAccess`; `useLeaveTeam`; tests; `docs/features/teams.md`.

Ran: `ruby -c` on the controller and test, the static checker, `data/team.test.ts`, and `WorkspaceTeams.test.tsx` in a Jest stand-in (16 of 16).

Not run, to verify before merging:

```sh
cd backend && rails test test/controllers/teams_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open the Teams dialog as a team-only person at 375px and desktop, in light and dark: Leave team, the confirmation, and landing on the personal Space. When it merges, delete this file.

Nothing in this task needs a decision from Alex.
