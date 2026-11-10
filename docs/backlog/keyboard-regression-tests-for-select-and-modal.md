---
priority: p3
depends_on: []
components: [frontend]
branch: backlog/keyboard-regression-tests-for-select-and-modal
status: incomplete
---
# Tests for the keyboard paths that are not covered yet

## Objective

`Select.test.tsx` covers opening by click and ArrowDown, skipping disabled options and Enter. Not asserted anywhere: `Select` Home/End, type-ahead, Escape, Tab and click-outside; `Modal`'s focus trap, Escape, outside click and focus return to the opener; `Menu` Tab; `DatePicker` Shift+PageUp/PageDown, and the calendar's placement. The new `Modal.test.tsx` and `Toast.test.tsx` cover behaviour but not Radix's own focus and Escape handling, because they were first run in an offline stand-in without Radix.

## Requirements / notes

- Write them for the real Jest setup (`@radix-ui/react-dialog` and `-popover` installed), next to the existing tests. Radix listens for Escape on the document in the capture phase, so fire the key on the focused element (`fireEvent.keyDown(document.activeElement!, { key: 'Escape' })` or `userEvent.keyboard('{Escape}')`).
- Include the case in [escape-closes-only-the-open-popup-inside-a-modal](escape-closes-only-the-open-popup-inside-a-modal.md) once it is decided.

## Acceptance criteria

- Each path above has a test that fails if the behaviour is removed; `npm test` passes.
- This file is removed.

## Unverified

All paths in the objective are tested except the Escape-inside-a-modal case, whose tests live on `backlog/escape-closes-only-the-open-popup-inside-a-modal`. The `Modal` focus-return fix is covered by Jest only; try it in a browser (open a modal from a button, press Esc, focus is back on the button). Delete this file when that passes.
