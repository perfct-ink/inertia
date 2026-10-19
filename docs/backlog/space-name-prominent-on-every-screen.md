---
branch: backlog/space-name-prominent-on-every-screen
priority: p1
depends_on: []
components: [frontend]
---
# Show the current Space name prominently on every screen

## Objective
The current Space name is the prominent line at the top left, on every screen and in the Mac app.

## Context
The sidebar header (`components/workspace/WorkspaceSwitcher.tsx` inside `file-manager/Sidebar.tsx`) shows "Inertia" with the Space name as small secondary text. Below the `md` breakpoint the sidebar is a drawer and the mobile bar in `WorkspaceLayout.tsx` shows only "Inertia". The Mac app loads the same web layout.

## Requirements
- Make the Space name the prominent line in that corner.
- Show it in the mobile top bar when the sidebar is hidden.

## Acceptance criteria
- On a phone-width viewport the Space name is visible without opening the drawer.
- On desktop the Space name is the primary line in the sidebar header, in light and dark themes.
- The Mac app shows the same.

## Blocked
Implemented on the branch. To verify: `cd frontend && npm install && npm run lint && npm test`, then check the sidebar header in light and dark themes, a phone-width viewport (the name must show in the mobile bar without opening the drawer), and the Mac app (`make mac-build`). None of that could run here. Then remove this file and merge.
