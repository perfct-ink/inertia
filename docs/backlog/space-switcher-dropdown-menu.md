---
priority: p1
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
