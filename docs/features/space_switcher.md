# Space switcher

## What it does
The sidebar header shows "Inertia" with the current Space name as a button (`aria-label` "Space: <name>. Switch space"). Clicking opens a modal titled "Spaces" that lists the user's Spaces with role (or "personal") and a check on the current one. Choosing one switches Space. Under the list are "New space" (opens a name prompt, creates the Space and switches to it), "Members" (opens the members dialog for the current Space) and, in a shared Space, "Teams" (opens the teams dialog, see `teams.md`). Switching behaviour is described in `docs/spaces.md`.
The sidebar header shows "Inertia" with the current Space name as a button (`aria-label` "Space: <name>. Switch space"). Clicking opens a dropdown menu anchored to the name (the shared `ui-menu`, `components/ui/Menu.tsx`) that lists the user's Spaces with role (or "personal") and a check on the current one. Choosing one switches Space. Below a divider are "New Space..." (opens a name prompt, creates the Space and switches to it), "Members..." (opens the members dialog for the current Space) and, for members and above, "Automations" (opens the automations page, see [automations.md](automations.md)). Arrow keys, Home and End move between items, Enter chooses, Escape and a click outside close it and Escape returns focus to the name. The menu has `menu`, `menuitem` and `menuitemradio` roles. Switching behaviour is described in `docs/spaces.md`.

## API and models
`useWorkspaces`, `useCreateWorkspace` (`frontend/src/api/workspaces.ts`); see `docs/spaces.md`.

## Who can view and change
Any signed-in user switches between their own Spaces and creates new ones. Member management follows `docs/spaces.md`.

## Web entry points
`frontend/src/components/workspace/WorkspaceSwitcher.tsx`, rendered by `components/file-manager/Sidebar.tsx`. The Mac app shows the same sidebar through its web view; there is no native switcher.

## Tests
`components/ui/Menu.test.tsx` (open, checked current item, keyboard, close, focus return). None for the switcher itself. `backend/test/controllers/workspaces_controller_test.rb` and `workspace_members_controller_test.rb` cover the API.

## Known limits
- The name is small secondary text under "Inertia". Below the `md` breakpoint the sidebar is an off-canvas drawer and the mobile top bar shows only "Inertia", so the Space name is not visible until the drawer opens (`docs/backlog/space-name-prominent-on-every-screen.md`).
- The menu does not flip upward or sideways when it would run off screen, and it does not type-ahead.

## History
- Implemented before 2026-10-15 (switcher, create, members modal); see `docs/spaces.md`. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests and the screen were not run.

## Space name placement (branch `backlog/space-name-prominent-on-every-screen`, not merged)
The Space name is the prominent line in the sidebar header (semibold, normal size, above the smaller muted "Inertia"), and below the `md` breakpoint the mobile top bar shows the Space name instead of "Inertia" (it falls back to "Inertia" while the Space loads). The Mac app loads the same layout, so it shows the same. Test: `frontend/src/components/WorkspaceLayout.test.tsx`. Not verified: lint, type-check, tests and the browser (light and dark themes, a phone-width viewport, the Mac shell) were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Changed from a modal to a dropdown menu 2026-10-21 on branch `backlog/space-switcher-dropdown-menu`; not merged. Jest, lint and tsc not run (no node_modules); SCSS compiled.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
