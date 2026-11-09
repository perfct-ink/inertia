# Shared UI patterns: IconButton, Tabs, SortArrow

Small controls that several screens had each drawn for themselves are now shared components in `frontend/src/components/ui/`, each with its own SCSS (`ui-` root class, light and dark through the colour tokens), exported from `@/components/ui`. This is a code-organization feature: nothing changes on screen, and there is no API, model or permission change (every signed-in member sees the same screens as before).

## What exists

| Component | Root class | What it is |
| --- | --- | --- |
| `Button variant="muted"` | `ui-button--muted` | Quiet text or icon that is muted grey and turns to the full foreground colour on hover. Size and layout stay with the caller's class. |
| `IconButton` | `ui-button ui-button--muted ui-icon_button` | A `Button` that holds only an icon. `label` is required and becomes the `aria-label`. `tone="danger"` (`ui-icon_button--danger`) turns red on hover: delete, remove, discard. Forwards native button props and the ref. |
| `Tabs` / `Tab` | `ui-tabs`, `ui-tab`, `ui-tab--active` | A labelled row (`role="group"`, `aria-label` from `label`) of toggle buttons (`aria-pressed` from `active`) that switch what a page shows. Muted text, a faint pill on hover, a filled pill for the active one. It is not an ARIA tablist: the page re-renders or navigates and there is no panel to point at. |
| `SortArrow` | `ui-sort_arrow` | The 12px up or down arrow (`direction="asc" \| "desc"`) beside the label of the column a table is sorted by; decorative (`aria-hidden`). |

SCSS helper: `icon-size($size)` in `frontend/src/styles/_tokens.scss` sets `width` and `height` together. It replaces two local copies (`icon` in `components/editors/TableEditor.scss` and in `components/file-manager/_file_manager.scss`); `muted-link` and `field-underline` were already shared mixins.

## Where they are used

- `IconButton`: Milestones, Sprints and OKRs (delete X; the key result edit pencil keeps the red hover it had before, because it shared the delete button's class), the Gantt pane's dependency list (remove), Epic planning (add and remove task).
- `Tabs`: Roadmap (Timeline / Now, Next, Later), Project requests (status tabs) and Resources (People / Projects). They had the identical `planning-tab` / `resources-tab` rules.
- `SortArrow`: Task table, Portfolio and All files.

A view still styles a shared component's size and spacing with its own class (views sit in a later cascade layer than `app.ui`), never its colours.

## Tests

- `components/ui/IconButton.test.tsx`: named by its label, native props and ref kept, danger class, disabled does not click, `Button variant="muted"`.
- `components/ui/Tabs.test.tsx`: labelled group, `aria-pressed` and the active class, click.
- `components/ui/SortArrow.test.tsx`: size class, `aria-hidden`, different icon per direction.
- The existing tests of the converted screens (Milestones, Sprints, OKRs, Project requests, Resources, Task table, Portfolio, All files, Gantt pane, Epic planning, Roadmap) find these controls by role and name, so they cover the swap without changes.

## Known limits

- Only patterns found in three or more places with identical behaviour were promoted. Epics, Initiatives, Events, Tasks, the Collection editor, the sidebar, the Folder page, Ideas and Hierarchy still have their own copies; the list, with the reason for each, is in the `Unverified` section of `docs/backlog/promote-local-patterns-to-ui-components.md`.
- The save-status indicator (document and spreadsheet only) is in two places, so it was not promoted.
- Not looked at in a browser; see History.

## History

- Implemented 2026-11-07 on branch `backlog/promote-local-patterns-to-ui-components` (a rebuild of the stopped 2026-11-02 attempt, kept smaller on Alex's instruction). Not merged or deployed.
- Not verified: `npm run lint`, `tsc`, the real Jest run, the Epic planning and Roadmap tests (they need `@dnd-kit`), and a browser check at 375px and desktop in light and dark. The offline stand-in ran the static checks, the sass compile and the new and converted tests; the Gantt pane suites fail in that stand-in on `main` too.
- Not implemented: converting the screens listed above; a shared sortable header with `aria-sort`; the save-status indicator.
