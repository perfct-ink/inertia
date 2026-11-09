---
priority: p3
depends_on: []
components: [frontend]
---
# Menu: stay inside the screen, type-ahead and a single tab stop

## Objective

`components/ui/Menu.tsx` is anchored to the trigger's left edge (`left: 0`, 14rem to 20rem wide, `position: absolute`). A trigger near the right edge of a 375px screen pushes the list off-screen; there is no flip above or below except the manual `above` prop; and an ancestor with `overflow: hidden` clips it. Items are all tab stops (`tabIndex` 0) instead of one roving stop, and typing a letter does not jump to a matching item as the ARIA menu pattern suggests.

## Requirements / notes

- Position the list like `Select`'s list (a Radix Popover with collision handling, portalled), or keep the markup and flip it left and up with a measured check as `DatePicker` does. Keep `-webkit-app-region: no-drag`, the checked item taking focus on open, and Escape returning focus to the trigger.
- Add type-ahead (as `Select`'s: 500ms, first match after the focused item) and `tabIndex={-1}` on the items.
- Used by the Space switcher, `ProjectNav` and the sidebar: check each at 375px with the trigger at the right edge.

## Acceptance criteria

- At 375px no menu extends past either screen edge.
- Type-ahead and the roving tab stop are covered by tests next to `Menu.test.tsx`.
- Feature docs (space_switcher.md, design_principles.md) updated and this file removed.
