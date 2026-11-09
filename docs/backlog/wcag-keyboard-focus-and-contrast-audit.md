---
priority: p1
depends_on: []
components: [frontend]
status: incomplete
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

## Blocked

Partly covered, and the rest needs a browser and a screen reader. `backlog/volta-component-mapping-and-parity` audited the shared controls in `frontend/src/components/ui/` for keyboard use, accessibility and contrast from the code and Volta's tokens (`docs/volta_parity.md` on that branch, "Keyboard, accessibility and narrow layouts", with findings filed as separate backlog tasks, for example dark-mode primary button text at 2.7:1). Review and merge that branch first; its follow-up tasks are the fixes.

What is left for this task and cannot be done offline: completing every screen with the keyboard alone, checking focus order and focus return in every modal and popup, and measuring contrast of what is actually drawn in light, dark and the tinted themes (a computed value from tokens misses overlays, disabled states and the colour themes). Do that in a browser (Tab through each route in `frontend/src/App.tsx`; a screen reader pass in Safari with VoiceOver; the browser's contrast checker or axe), and file each failure as its own task.
