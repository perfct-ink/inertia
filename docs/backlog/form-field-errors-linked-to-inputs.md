---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/form-field-errors-linked-to-inputs
status: incomplete
---
# Link field errors to their inputs and add a labelled field wrapper

## Objective

`FormError` renders `role="alert"` but nothing connects it to the field it describes, and `Input`, `Select`, `Textarea` and `DatePicker` have no invalid style. Volta's `TextField` and `Field` do both: `label` with `htmlFor`, `optional`, and `error` with `aria-invalid`, `aria-describedby` and a `textfield-error` state. A screen reader announces the alert once, but a person moving back to the field hears no error.

## Requirements / notes

- Add an optional `id` to `FormError`, an invalid style for `[aria-invalid='true']` on `.ui-input`, `.ui-textarea` and `.ui-select` (a danger border, still firm in dark mode), and a small `Field` wrapper in `components/ui/` (label, hint, control, error) that generates ids with `useId` and sets `aria-describedby` and `aria-invalid` on the control. Preserve native props and refs.
- Use it in the login and signup forms first (they render their own errors) and leave other forms for later tasks.
- The gallery's Fields section (`/styleguide`) shows an invalid field; update it to use the wrapper.

## Acceptance criteria

- With an error, the control has `aria-invalid` and `aria-describedby` pointing at the message; tests cover it.
- The invalid state looks right in both themes and at 375px.
- `docs/ui-components.md` documents the wrapper; feature doc updated and this file removed.

## Unverified

Built: `Field`, `FormError id`, the invalid styles, login and signup, and the gallery's Fields section, with tests. `docs/ui-components.md` was not updated (the wrapper is documented in `docs/features/design_principles.md`); add a short entry there. Not done: the browser check of the invalid state in both themes and at 375px. Delete this file when both are done.
