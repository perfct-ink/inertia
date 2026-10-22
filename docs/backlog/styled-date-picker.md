---
priority: p2
depends_on: []
components: [frontend]
---
# Styled date picker

## Objective

Date fields look and behave the same in every browser (design principle 2 in `docs/rules/product.md`).

## Requirements / notes

Date fields are still `<Input type="date">`. Since 2026-10-22 they follow the light/dark theme (`color-scheme`), but the field's segments and the calendar popup are drawn by the browser, so Safari, Chrome and Firefox differ. Used on Tasks, Epics, Initiatives, Milestones, Sprints, OKRs, Events, the sidebar and document task items.

- Add a shared `DatePicker` in `components/ui/` (its own SCSS, `ui-date_picker` root, light and dark) that keeps the `YYYY-MM-DD` value and `onChange` contract of the native input, so callers only swap the component.
- Keyboard entry and a calendar popup; on a phone the popup fits 375px and has tap-sized days.
- Works inside the compact `field-underline` style used in cards.

## Acceptance criteria

- Every date field in the web app uses the shared picker and looks the same in Chrome, Safari and Firefox.
- Typing a date, picking one and clearing one all still save.
- Tests cover value round-tripping and clearing; `docs/features/design_principles.md` is updated and this file is removed.
