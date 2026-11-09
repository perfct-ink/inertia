---
priority: p2
depends_on: []
components: [frontend]
---
# Finger-sized targets for menu items, ghost buttons and the toast dismiss button

## Objective

Design principle 1 (`docs/rules/product.md`): touch targets are large enough to tap. Measured from the SCSS, `Menu` items are 36px tall, `ghost` buttons about 28px (an icon-only ghost about 24px), and the toast's Dismiss button about 24px by 32px. `Select` options already grow to 44px on touch screens (`@media (pointer: coarse)`), and primary, secondary and destructive buttons and the date picker's days and arrows are 40px.

## Requirements / notes

- Add the same `@media (pointer: coarse)` minimum height (`space(11)`) to `.ui-menu-item`; give `ui-button--ghost` a larger minimum on coarse pointers (or an invisible hit area with `::before` so rows keep their look); give `.ui-toast-dismiss` a 40px target.
- Hover and layout must not change on desktop (principle 7). Check the sidebar rows, tab close buttons, the document toolbar and the card actions that use ghost buttons (18 uses) at 375px so nothing wraps or overflows.

## Acceptance criteria

- On a coarse pointer every menu item, ghost button and toast dismiss is at least 40px in both directions; desktop sizes are unchanged.
- Checked in the component gallery at 375px and on the pages that use ghost buttons.
- Feature doc updated (design_principles.md) and this file removed.
