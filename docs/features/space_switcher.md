# Space switcher

## What it does
The sidebar header shows "Inertia" with the current Space name as a button (`aria-label` "Space: <name>. Switch space"). Clicking opens a modal titled "Spaces" that lists the user's Spaces with role (or "personal") and a check on the current one. Choosing one switches Space. Under the list are "New space" (opens a name prompt, creates the Space and switches to it) and "Members" (opens the members dialog for the current Space). Switching behaviour is described in `docs/spaces.md`.

## API and models
`useWorkspaces`, `useCreateWorkspace` (`frontend/src/api/workspaces.ts`); see `docs/spaces.md`.

## Who can view and change
Any signed-in user switches between their own Spaces and creates new ones. Member management follows `docs/spaces.md`.

## Web entry points
`frontend/src/components/workspace/WorkspaceSwitcher.tsx`, rendered by `components/file-manager/Sidebar.tsx`. The Mac app shows the same sidebar through its web view; there is no native switcher.

## Tests
None for the switcher itself. `backend/test/controllers/workspaces_controller_test.rb` and `workspace_members_controller_test.rb` cover the API.

## Known limits
- The name is small secondary text under "Inertia". Below the `md` breakpoint the sidebar is an off-canvas drawer and the mobile top bar shows only "Inertia", so the Space name is not visible until the drawer opens (`docs/backlog/space-name-prominent-on-every-screen.md`).
- It is a modal, not a dropdown menu, and buttons read "New space" and "Members" (`docs/backlog/space-switcher-dropdown-menu.md`).

## History
- Implemented before 2026-10-15 (switcher, create, members modal); see `docs/spaces.md`. Committed locally; not pushed or deployed.
- Not verified: lint, type-check, tests and the screen were not run.

## Space name placement (branch `backlog/space-name-prominent-on-every-screen`, not merged)
The Space name is the prominent line in the sidebar header (semibold, normal size, above the smaller muted "Inertia"), and below the `md` breakpoint the mobile top bar shows the Space name instead of "Inertia" (it falls back to "Inertia" while the Space loads). The Mac app loads the same layout, so it shows the same. Test: `frontend/src/components/WorkspaceLayout.test.tsx`. Not verified: lint, type-check, tests and the browser (light and dark themes, a phone-width viewport, the Mac shell) were not run (no node_modules).
