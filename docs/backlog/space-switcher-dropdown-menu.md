---
priority: p1
branch: backlog/space-switcher-dropdown-menu
depends_on: []
components: [frontend]
---
# Space switcher as a dropdown menu

## Objective
Switching Spaces uses a real dropdown menu with New Space... and Members... in it.

## Context
Clicking the Space name opens a modal ("Spaces") with a list and "New space" and "Members" buttons under it (`components/workspace/WorkspaceSwitcher.tsx`).

## Requirements
- Replace the modal with a dropdown menu anchored to the Space name: Spaces with a check on the current one, then "New Space..." (opens the name prompt) and "Members...".
- Fully keyboard navigable with menu ARIA roles.

## Acceptance criteria
- The Space name opens an anchored menu, not a modal.
- The current Space has a check; picking another switches to it.
- "New Space..." opens the name prompt; "Members..." opens the members dialog.
- Arrow keys, Enter and Escape work.

## Blocked
Implemented on the branch with a shared `Menu` component and tests; see `docs/features/space_switcher.md`. Not run (no node_modules): `cd frontend && npm install && npm run lint && npm test`, then open the sidebar's Space name in a browser (check the menu isn't clipped by the sidebar, and clicks work inside the Electron/Mac drag header). Then remove this file and merge.
