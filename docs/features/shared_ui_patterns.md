# Shared UI patterns

Small controls that several screens had each drawn for themselves are shared components in `frontend/src/components/ui/`, each with its own SCSS (`ui-` root class, light and dark through the colour tokens) and exported from `@/components/ui`. This is a code-organization feature: the screens look and behave as before (the few deliberate differences are listed below), and there is no API, model or permission change; every signed-in member sees the same screens. They are Inertia's own components; they can move onto Volta's components later (Alex, 2026-11-09).

## What exists

| Component | Root class | What it is |
| --- | --- | --- |
| `Button variant="muted"` | `ui-button--muted` | Quiet text or icon that is muted grey and turns to the full foreground colour on hover ("Clear", "Add task", links like "Board →"). Size and layout stay with the caller's class. |
| `IconButton` | `ui-button ui-button--muted ui-icon_button` | A `Button` that holds only an icon. `label` is required and becomes the `aria-label`. `tone="danger"` (`ui-icon_button--danger`) turns red on hover: delete, remove, discard. `fill` (`ui-icon_button--fill`) also shows a faint box behind the icon on hover (toolbars, rows of actions). Forwards native button props and the ref. |
| `Tabs` / `Tab` | `ui-tabs`, `ui-tab`, `ui-tab--active` | A labelled row (`role="group"`, `aria-label` from `label`) of toggle buttons (`aria-pressed` from `active`) that switch what a page shows. Muted text, a faint pill on hover, a filled pill for the active one. A `Tab` is `type="button"` unless told otherwise, so it never submits a form. It is not an ARIA tablist: the page re-renders or navigates and there is no panel to point at. |
| `Tabs variant="segmented"` | `ui-tabs--segmented` | The tabs share the row's width inside a shaded tray; the chosen one is raised like a card. |
| `Tabs variant="outlined"` | `ui-tabs--outlined` | Bordered boxes that share the row's width, for picking one value in a form (the Events form's Type). |
| `SortArrow` | `ui-sort_arrow` | The 12px up or down arrow (`direction="asc" \| "desc"`) beside the label of the column a table is sorted by; decorative (`aria-hidden`). |
| `SortButton` / `SortHeader` | `ui-sort_button` | `SortButton` is the header button (name plus arrow on the sorted column); `SortHeader` wraps it in a `<th scope="col">` with `aria-sort` and an `onSort` callback. |
| `SaveStatus` | `ui-save_status` | Whether a document or sheet is safe: nothing drawn while saved, a spinner while saving, a dot while changes wait. The words ("All changes saved", "Saving…", "Unsaved changes") are a polite `role="status"` for screen readers. |
| `variant="underline"` on `Input`, `Select`, `Textarea`, `DatePicker` | `ui-input--underline`, `ui-select--underline`, `ui-textarea--underline` | A compact field drawn as a line, for dates, statuses and pickers inside cards. The `field-underline` mixin is included by the components; views pass the variant instead of including it. |

SCSS helpers in `frontend/src/styles/_tokens.scss`: `icon-size($size)` sets `width` and `height` together (used for every square mark in the stylesheets); `muted-link` is the muted-until-hovered colour pair behind `Button variant="muted"` and `Tab`; `field-underline` is behind the underline variant.

A view still styles a shared component's size and spacing with its own class (views sit in a later cascade layer than `app.ui`), never its colours.

## Where they are used

- `IconButton`: Milestones, Sprints, OKRs, Epics, Initiatives, Ideas (delete), Resources (remove), Events (close, remove task, month arrows), Tasks (row actions, card actions, timer, add), the Folder page (back, advance, month arrows, expand), the Gantt pane's dependency list, Epic planning, the Collection editor (delete record and field, add field), the sidebar (project tools, row actions, unpin, unarchive), Hierarchy (expand and Move) and task-field tags (remove). The sidebar's `icon_action` mixin and the Collection editor's `icon_button_danger` mixin are gone.
- `Button variant="muted"`: Tasks (filters, clear, add), Events (add task, Today), the Folder page (links, Statuses, Archive) and the Epics clear-filter link.
- `Tabs`: Roadmap, Project requests, Resources, Tasks, Epics, Initiatives, Events, the Folder page (and its compact depth choices), All files (List / Gallery) and the Collection editor (Grid / Map); `segmented` in the sidebar's quick-add switch (Task / Event); `outlined` for the Events form's Type.
- `SortHeader` / `SortButton` / `SortArrow`: Task table, Portfolio and All files.
- `SaveStatus`: the document and the spreadsheet editor.
- `variant="underline"`: Milestones, Sprints, OKRs, Roadmap and Epic planning.

## Differences from before

Everything above was converted so it looks the same, except:

- Inactive tabs on Tasks, Events and the Folder page now show the faint hover pill the other tabs (Roadmap, Requests, Resources, Epics, Initiatives) already had.
- All files' List / Gallery buttons and the Collection editor's Grid / Map buttons are Tabs now: the active one is visibly filled (List / Gallery showed no state at all) and Grid / Map use the muted tab colour.
- The Tasks row's history icon darkens on hover like the icons next to it.
- Hierarchy's expand/collapse arrow, a raw `<button>`, is an `IconButton`: it gains the shared focus ring and the 150ms colour change.
- A disabled filled icon button no longer shows its hover box.

## Left alone on purpose

- Underline fields that are not `field-underline` copies: the Planning "new" input, the Tasks add row, the Events form and the task item's due date differ in padding (2px more under the text), radius or hover, so converting them would move them. The `planning-date`, `planning-description` and `planning-initiative` classes are also worn by plain text in other views, so they keep the mixin.
- The Files gallery's filter chips (round pills with a filled active chip), the status colour swatches and the rating stars: chips and swatches, not tabs.
- Icon buttons built on `Button variant="ghost"` (Teams, Members, Toast, the date picker's arrows, the Getting started dismiss): ghost is foreground-coloured with a hover box, a different resting colour from `IconButton`.
- `project_nav-label` and the workspace task item's due date button: the first is shared with a plain label, the second has a dimmed empty state that must survive hover.
- Menu items with a danger colour (`folder_item-menu_item--danger`) and the dev login button's dashed border.

## Tests

- `components/ui/IconButton.test.tsx`: named by its label, native props and ref kept, danger class, `fill` class, disabled does not click, `Button variant="muted"`.
- `components/ui/Tabs.test.tsx`: labelled group, `aria-pressed` and the active class, click, a tab never submits a form, the two looks' classes.
- `components/ui/SortArrow.test.tsx`, `SortHeader.test.tsx`: size class, `aria-hidden`, `aria-sort`, `scope`, native props and ref.
- `components/ui/SaveStatus.test.tsx`: the three states, the spinner and dot, the words for screen readers.
- `components/ui/UnderlineFields.test.tsx`: the variant class on each field, native props and ref kept, no `variant` attribute on the DOM.
- New screen tests for the views that had none: `view/epics/EpicsScreen.test.tsx`, `view/initiatives/InitiativesScreen.test.tsx`, `view/events/EventsScreen.test.tsx` (tabs, delete, remove task, close, month arrows, the Type choice not submitting its form).
- The existing tests of the converted screens (Tasks, Folder page, Milestones, Sprints, OKRs, Project requests, Resources, Task table, Portfolio, All files, Collection editor, sidebar, Gantt pane, Epic planning, Roadmap, Hierarchy) find these controls by role and name, so they cover the swaps without changes.

## Known limits

- Not looked at in a browser; the swaps were checked by reading the compiled CSS and the tests (see History).
- Volta's own components are not used; these are Inertia's components in the Volta look.

## History

- Implemented 2026-11-09 on branch `backlog/promote-local-patterns-to-ui-components` (earlier attempts 2026-11-02 and 2026-11-07, kept smaller on Alex's instruction; Alex lifted that limit and the wait for Volta on 2026-11-09). Not merged or deployed.
- Not verified: `npm run lint`, the real `tsc -b`, the real Jest run, and a browser check at 375px and desktop in light and dark. The offline stand-in ran the static checks, the sass compile (the `icon-size` sweep is byte-identical in the compiled CSS), the converted and new tests (the Tasks and Roadmap suites with inert drag-and-drop stubs); the Epic planning and Hierarchy suites need the real react-query and could not run.
- Not implemented: the items under "Left alone on purpose".
