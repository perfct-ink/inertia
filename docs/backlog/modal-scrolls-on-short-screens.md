---
priority: p2
depends_on: []
components: [frontend]
---
# A modal taller than the screen should scroll

## Objective

`.ui-modal-content` (`components/ui/Modal.scss`) is `position: fixed` and centered with a transform, and only `--wide` modals get `max-height` and `overflow-y: auto`. A form modal taller than the viewport (a phone in landscape, or with the keyboard open) runs off both edges and cannot be scrolled, so its buttons are unreachable.

## Requirements / notes

- Give the base modal `max-height: calc(100dvh - #{space(8)})` and `overflow-y: auto`.
- Caution: `DatePicker` places its calendar inside the dialog (`position: absolute`, offsets adjusted by the dialog's `scrollTop`) so clicks on it are not "outside" the dialog. With `overflow` set, a calendar opened by a field near the bottom is clipped and scrolls inside the dialog instead of overflowing it; `--wide` already behaves this way. Check the date field in the task, epic and event modals. The select list is portalled, so it is unaffected.
- Test with a tall `Modal` in the gallery (`/styleguide`, Dialogs) at 375x500.

## Acceptance criteria

- Every `Modal` scrolls when its content is taller than the screen, and its buttons can be reached.
- The date picker still opens fully inside a modal.
- Feature doc updated (design_principles.md) and this file removed.
