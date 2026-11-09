---
priority: p1
depends_on: []
components: [frontend, backend]
branch: backlog/promote-local-patterns-to-ui-components
status: incomplete
---
# Promote repeated local patterns into `components/ui`

## Objective

Promote repeated local patterns into `components/ui`

## Requirements / notes

Underline-only input/select, muted-text link, icon-size helper, danger-hover icon button, tab/segmented control, sortable table header, save-status indicator.

**Go ahead now** (Alex, 2026-11-09 groom): build these as Inertia's own `components/ui` components; don't wait for the Volta release. They can move onto Volta's components later.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Promote repeated local patterns into `components/ui` works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Rebuilt 2026-11-07 on `origin/main` from the stopped 2026-11-02 attempt, in the conservative way Alex asked for: only patterns that already exist in three or more places with identical behaviour, one small mechanical replacement per screen, and only on screens that have a test.

**Done** (see [shared_ui_patterns.md](../features/shared_ui_patterns.md)):

- `Button variant="muted"` and `IconButton` (`tone="muted"` or `"danger"`): replace the local muted-until-hovered / red-on-hover icon buttons in Milestones, Sprints, OKRs (delete, and the key result edit pencil, which stays red on hover as it was), the Gantt pane's dependency list and Epic planning.
- `Tabs` / `Tab`: replace the local copy of the `planning-tab` / `resources-tab` rules in Roadmap, Project requests and Resources.
- `SortArrow`: the sort direction arrow in Task table, Portfolio and All files.
- `icon-size($size)` mixin in `_tokens.scss`, used by the Collection editor's and the sidebar's local icon mixins.

**Checks run (offline stand-in only):** `JEST_STUB_NET=1 /tmp/runner/all.sh` static checks (babel parse, unused/unresolved imports, sass compile of the changed `.scss`), the pure data/util tests, and the Jest stand-in for `IconButton`, `Tabs`, `SortArrow` and the Milestones, Sprints, OKRs, Project requests, Resources, Task table, Portfolio and All files tests (all pass). The two Gantt pane suites fail in the stand-in exactly as they do on `origin/main`.

**Not run (no network, node_modules, browser):** `npm run lint`, `npx tsc -b`, the real `npm test`, the Epic planning, Roadmap and Hierarchy tests (they need `@dnd-kit`), a browser look. No backend or migration change.

To verify: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then in a browser at 375px and desktop, light and dark, compare against `main`: the Roadmap, Project requests and Resources tabs (hover and active), the delete X on a Milestone, Sprint, Objective, key result and Gantt dependency (grey, red on hover), the Epic plan add and remove buttons (grey, darker with a grey background on hover), and the sort arrows (12px).

**Left out on purpose, for a later pass** (other branches are editing these, or they have no test, or the copies are not identical):

- Epics and Initiatives (tabs, delete X; no test, and the Epics page is being edited). Once they use `Tab` and `IconButton`, delete `.planning-tab`, `.planning-tabs` and the colours of `.planning-card-delete` in `view/planning/PlanningScreen.scss`; Ideas shares `.planning-card-delete` and can move with them.
- Events switcher, Tasks tabs, Folder view tabs and the All files List/Gallery buttons: they have no hover background, or a different look, so using `Tab` would change them. Decide whether `Tab` should gain that hover everywhere, then convert.
- The Tasks screen's row delete X and "add" icon, the Collection editor's delete buttons (`icon_button_danger` in `TableEditor.scss`), the sidebar's unpin and unarchive buttons and the Folder page's `folder_detail-subtle` buttons: all the same muted/danger pattern, but on screens other branches are editing (or without a test). Use `IconButton` or `Button variant="muted"` and delete the local colour rules.
- Hierarchy's expand/collapse chevron is a raw `<button>`; moving it to `IconButton` adds the shared focus ring and colour transition, so it is not an identical swap.
- About 35 more `width`/`height: space(n)` pairs could use `icon-size`.
- Underline fields that are not `field-underline` copies (Planning add form, Events, Tasks add row, task item due date) differ in padding, outline or size, so they were not merged.
- Save-status indicator (document and spreadsheet only): two places, below the three-place bar.
- A full `SortHeader` (button plus `aria-sort`): the three tables style their headers differently; only the arrow was shared.
