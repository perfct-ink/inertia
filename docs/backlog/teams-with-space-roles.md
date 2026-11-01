---
priority: p1
depends_on: []
branch: backlog/teams-with-space-roles
---
# Teams: groups of users that can be granted a role in a Space

## Objective

Teams: groups of users that can be granted a role in a Space

## Requirements / notes

Builds on `workspace_memberships` (see `docs/spaces.md`).

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Teams: groups of users that can be granted a role in a Space works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/teams-with-space-roles` (not merged, not deployed). Delete this file when the branch is merged.

What is done: `teams` and `team_memberships` tables (migrations `20261101050001` and `20261101050002`, `db/schema.rb` edited by hand), the `Team`, `TeamMembership` and `WorkspaceAccess` models, nested `teams` and `teams/:id/members` endpoints, the combined role (highest of membership and teams) in `WorkspaceScoped`, `User#accessible_workspaces` and the Spaces list, the Teams dialog in the Space switcher, tests, and `docs/features/teams.md`.

Product call made conservatively (Alex may want to change it): a team belongs to one Space and holds a role (viewer, member or admin, never owner) in that Space only. Account-wide teams that could be granted roles in several Spaces would need an owner for the team outside any Space and are not built.

Checks that did not run (no network, `node_modules`, database or Bundler on the machine that wrote this):
- `rails db:migrate`, then diff `backend/db/schema.rb` against the hand-edited version (index order in the dump may differ; the table and column definitions should match).
- `cd backend && rails test` (new: `test/models/team_test.rb`, `test/controllers/teams_controller_test.rb`; existing workspace, member and milestone tests exercise the changed `WorkspaceScoped`). Also `bundle exec rubocop`.
- `cd frontend && npm install && npm run lint && npx tsc -b && npm test` (new: `src/data/team.test.ts`, `src/components/workspace/WorkspaceTeams.test.tsx`).
- Look at the Space switcher, "Teams" in a shared Space at 375px and on desktop, in light and dark: create a team, add a person by email, change its role, remove, rename, delete; then sign in as the added person and check the Space appears with the team's role.

What did run: the offline static checker over all changed files (TypeScript parse, SCSS compile, `ruby -c`), `data/team.test.ts` with the Jest shim, and a plain-Ruby check of `WorkspaceAccess` with stub models.

Merge hazards: the open branch `backlog/invite-people-without-an-account` also edits `workspace.rb`, `routes.rb` and `schema.rb` (resolve by keeping both sets of lines); `backlog/multiple-assignees-and-watchers` edits `user.rb`. Follow-ups: `docs/backlog/show-team-members-in-space-member-lists.md` and `docs/backlog/leave-a-team.md`.
