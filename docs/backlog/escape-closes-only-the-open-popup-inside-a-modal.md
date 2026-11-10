---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/escape-closes-only-the-open-popup-inside-a-modal
status: incomplete
---
# Escape should close only the open calendar or menu inside a modal

## Objective

`DatePicker` and `Menu` handle Escape in a React `onKeyDown` and call `stopPropagation()` so a parent dialog stays open. Radix Dialog listens for Escape on the document in the capture phase (`@radix-ui/react-use-escape-keydown`), which runs before React's handler, so it likely dismisses the whole `Modal` anyway when a date calendar is open inside it, losing what was typed. `Select` is not affected: its list is a Radix layer above the dialog, so Radix closes only the top layer. This is suspected from Radix's source and was not run in a browser.

## Requirements / notes

- Reproduce first: open a modal with a date field (a task or event form), open the calendar, press Escape. Expected: the calendar closes and the modal stays.
- Fix in `Modal`: `onEscapeKeyDown` on `Dialog.Content` calls `event.preventDefault()` when the focused element has `aria-expanded="true"` (the date picker's input and a menu trigger); the component's own handler then closes just the popup. Keep the `stopPropagation` calls.
- Add a test with the real Radix Dialog: a `Modal` containing a `DatePicker`, calendar open, Escape pressed: `onClose` is not called and the calendar is gone; a second Escape calls `onClose`.

## Acceptance criteria

- Escape closes the open calendar or menu first and the modal on the next press, tested.
- Feature doc updated (design_principles.md) and this file removed.

## Unverified

Built and tested with the real Radix dialog (Jest): the fix in `ui/Modal.tsx`, and `DatePicker` handling Esc before it ignores prevented keys (without that the calendar stayed open, because the Modal's `preventDefault` made it skip the key). Jest (all suites), `tsc` and eslint passed. Not done: the browser reproduction and check in a task or event form, in Safari and Chrome. `make up`, open a task with a date field, open the calendar, press Esc: the calendar closes and the modal stays; Esc again closes it. Delete this file when that passes.
