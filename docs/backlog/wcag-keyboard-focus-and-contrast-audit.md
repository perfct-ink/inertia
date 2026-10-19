---
priority: p1
depends_on: []
components: [frontend]
---
# WCAG 2.1 audit: keyboard, focus order and contrast

## Objective
The web app meets WCAG 2.1 AA for keyboard use, modal focus and colour contrast.

## Context
`TabBar` tabs and close controls are buttons with accessible names (`TabBar.test.tsx`). Nothing else has been audited.

## Requirements
- Make every interactive element reachable and usable by keyboard.
- Check focus order and focus return in modals.
- Check colour contrast in light and dark themes and fix failures.

## Acceptance criteria
- Every screen can be completed with the keyboard alone.
- Opening a modal moves focus into it and closing returns focus to the opener.
- Text and controls meet the AA contrast ratio in both themes.
