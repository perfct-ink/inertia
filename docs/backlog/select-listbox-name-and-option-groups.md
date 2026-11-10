---
priority: p3
depends_on: []
components: [frontend]
branch: backlog/select-listbox-name-and-option-groups
status: incomplete
---
# Select: name the list, show option groups, decide on `multiple`

## Objective

`components/ui/Select.tsx` renders `role="listbox"` with no `aria-label` or `aria-labelledby`, so assistive technology announces an unnamed list. `readOptions` flattens `<optgroup>` and drops its `label`, so grouped options lose their headings. `multiple` and `size` are not supported (none are used today).

## Requirements / notes

- Name the list from the select's `aria-label` or `aria-labelledby`, else from its first label (read `select.labels` when the list opens; a wrapping label's text content includes the option texts, so don't use that).
- Render `optgroup` labels as non-selectable group headings (`role="group"` with `aria-labelledby`) that the arrow keys, Home/End and type-ahead skip.
- Either throw in development when `multiple` is passed or add it, and record the choice in `docs/features/design_principles.md`.
- Add the cases to `Select.test.tsx`.

## Acceptance criteria

- The open list has an accessible name; grouped options show their headings in the list and in the gallery.
- Tests cover naming and groups.
- Feature doc updated and this file removed.

## Unverified

Built and tested in Jest. Not done: a look at a grouped select in the gallery and a browser (the Style menu's "My styles" now shows a heading). Delete this file when that passes.
