# Design principles in the web app

Alex's nine design principles (`docs/rules/product.md`, "Design principles") as they are applied in the React frontend. Most of them are enforced once, in the shared styles, so every view inherits them; this page says where each one lives so a new view gets them for free.

## What users get

- Every page fits a 375px phone without sideways scrolling, and page text keeps at least 16px from the screen edge.
- Checkboxes, radios and selects look the same in Chrome, Safari and Firefox, in light and dark mode.
- Buttons, links, tabs and fields react to the cursor; plain text and containers don't.
- Every animation and transition takes 150ms.
- Dragging across or double-clicking a button, tab, select, label or icon doesn't highlight its text.
- Buttons that only appear when a row is hovered (close a tab, delete a card or task, unarchive, folder actions) are always shown on touch screens, which can't hover.

## Where each principle lives

| Principle | Implementation |
| --- | --- |
| 1. Responsive | `page-header` mixin (`styles/_tokens.scss`): the title, view tabs and actions bar wraps onto a second line on a phone, with 16px side padding (24px from `md`). `page-padding` mixin does the same for page content. Views: Tasks backlog rows wrap their epic and document under the title; Epic/Initiative card fields wrap; All files hides the Location column below `sm`; folder view tabs wrap; the document toolbar scrolls sideways with full-size buttons; the document page uses 16px side padding on a phone. The layout and sidebar use `100dvh` so the phone's browser bar doesn't hide the bottom. `reveal-on-hover` shows hover-only controls on `(hover: none)` screens. |
| 2. Native controls | `Select.scss`: `appearance: none` with a chevron drawn from two gradients in `--muted-foreground`. `checkable` mixin (`_tokens.scss`) draws checkboxes and radios; `Input` uses it for `type="checkbox"`/`"radio"`, and the document editor's task-list checkboxes (rendered by TipTap) use it too. `DatePicker` (`components/ui/DatePicker.tsx`) replaces every native `<input type="date">`: a text box you type `YYYY-MM-DD` into plus a calendar popup drawn by the app, so the date field looks and behaves the same in Chrome, Safari and Firefox (see "Date picker" below). `color-scheme` follows the theme (`_theme.scss`), so scrollbars turn dark in dark mode. Dialogs were already the `Modal`/`ConfirmDialog`/`PromptDialog` components. |
| 3. Hover only on clickable things | The All files row no longer highlights (only its name and location links are clickable). Underline fields inside cards (`field-underline` mixin) now firm their underline on hover, where before they didn't react. |
| 4. Global / App / View | Unchanged: the `libraries`, `app.*`, `view` cascade layers in `styles/app.scss`. The new shared rules sit in `libraries` (reset) and `app.ui`; views only add layout. |
| 5. Text off the edge | `page-header` and `page-padding`; the Timeline clips a month label that runs past the chart instead of letting it reach the screen edge. |
| 6. 150ms animations | Every `transition` goes through the `transition` mixin (`--v-anim-speed`, 150ms). The sidebar drawer (was 200ms) and onboarding progress bar (was 300ms) now match; Fortune Sheet's own 100–300ms transitions are set to 150ms in `SpreadsheetEditor.scss`. The loading spinner's 1s rotation is a continuous indicator, not a state change, and is unchanged. |
| 7. Hover never moves things | Audited: no app hover rule changes size, padding, margin, border width or position. (the active tab uses an inset accent line without changing its dimensions.) |
| 8. No selecting control text | `_reset.scss`: `user-select: none` on `button`, `select`, `label`, `summary`, `svg` and `[role=button|tab|menuitem|option]`. |
| 9. Only things of value | The app has no pagination. The Hierarchy screen's "Unassigned" label now shows only when something is unassigned or a drag is under way (the drop zone is still there). |

Shared mixins added to `_tokens.scss`: `page-header`, `page-padding`, `reveal-on-hover`, `field-underline` (replaces five copies of the same underline-field rules), `checkable`, and `$select-chevron-room` (right padding a restyled select needs for its chevron; views set `background-color`, not the `background` shorthand, so the chevron survives).

## Date picker

`components/ui/DatePicker.tsx` (`ui-date_picker`, styles in `DatePicker.scss`, calendar math in `util/calendar.ts`) takes the same props as the shared `Input` minus `type`, and keeps the native date input's contract: `value`/`defaultValue` are `YYYY-MM-DD` or `''`, and `onChange` runs with an event whose `target.value` is that string, so callers only swapped the component. Typing a complete, real date sends it; half-typed text is not sent and goes back to the last date on blur; emptying the text or pressing Clear sends `''`. Clicking the field (or ArrowDown, or autofocus) opens the calendar: month arrows, six weeks so the height never jumps, Today and Clear, `min`/`max` days disabled, the selected day filled, today ringed. Focus stays in the text box while the calendar is open (a mouse press on the calendar is `preventDefault`ed), so parents that react to the field's blur, like the Tasks add row, behave as before. On a phone the popup is at most `100vw - 32px` wide with 40px days, and the touch keyboard stays closed (`inputMode="none"` on touch screens). Compact underline fields (`field-underline`) keep the plain text look without the calendar mark. Used on Tasks, Epics, Initiatives, Milestones, Sprints, OKRs, Events, the sidebar quick add and document task items.

## Tests

- `components/ui/DatePicker.test.tsx`: open/close, picking, month arrows, typing complete and half-typed dates, clearing, Today, keyboard, focus kept in the text box, min/max, selected day, disabled/read-only, native props and ref, parent value changes.
- `util/calendar.test.ts` (runs with plain Node): date parsing and validation, day and month arithmetic, the six-week grid, bounds, labels.

- `view/hierarchy/HierarchyScreen.test.tsx`: the Unassigned label is hidden when nothing is unassigned and shown when an epic has no parent.
- `components/ui/Controls.test.tsx` (existing): checkboxes keep native selection behaviour.
- Checked in a browser (Chromium via Playwright against a mocked API) at 375, 768 and 1280px on every route, including each folder view: no page-level horizontal overflow, no control text selectable, no transition other than 150ms, no unstyled checkbox or select. Light and dark mode checked for checkboxes, selects and date fields.

## Known limits

- The date picker's keyboard model is partial: ArrowUp/ArrowDown move a week, PageUp/PageDown a month (Shift: a year) and Enter picks, but ArrowLeft/ArrowRight keep moving the cursor in the text, so a keyboard user types the date or steps by weeks. The week starts on Sunday.
- The date picker was not run in a browser, so its position (below the field, flipped above near the bottom, kept 16px from the screen edge) and the 375px layout are unverified.
- The Gantt and Roadmap timelines are usable but cramped on a phone.
- Rows that reveal their buttons on hover (task rows, cards, sidebar rows) keep doing so; the row itself doesn't change, only its buttons appear.
- Not checked in Safari, Firefox, or the Electron, iOS and Mac shells; not checked against a real backend.

## History

- Implemented 2026-10-22: shared rules above, view fixes, Hierarchy test. Deployed by the push to `main` (Coolify deploys once CI passes).

- Integrated 2026-10-29: the Space landing page offers Documents, Tasks and Events while preserving onboarding; tabs have a persistent close affordance and active accent line, navigation exposes the current page, and shared text contrast is stronger. Frontend build, tests and lint verified; this integration was not checked in a browser.
- Implemented 2026-11-01 (date picker; on branch `backlog/styled-date-picker`, not merged or deployed). Not verified: lint, type-check, Jest (including `DatePicker.test.tsx`) and the browser were not run (no `node_modules`); `util/calendar.test.ts` was run with plain Node.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
