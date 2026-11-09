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

Finished 2026-11-09 after Alex lifted the "conservative" limit and the wait for Volta (see [shared_ui_patterns.md](../features/shared_ui_patterns.md)). All seven patterns are components (or an SCSS mixin) in `components/ui` / `styles/_tokens.scss`, and their local copies are migrated:

- Underline-only input/select: `variant="underline"` on `Input`, `Select`, `Textarea`, `DatePicker` (Milestones, Sprints, OKRs, Roadmap, Epic planning).
- Muted-text link: `Button variant="muted"` (Tasks, Events, Folder page, Epics).
- Icon-size helper: `icon-size` mixin; all 108 remaining identical width/height pairs now use it (its own commit; the compiled CSS is byte-identical).
- Danger-hover icon button: `IconButton` with `tone="danger"` and `fill` (Tasks, Epics, Initiatives, Ideas, Resources, Events, Folder page, Collection editor, sidebar, Hierarchy, task-field tags and the screens from the first pass).
- Tab / segmented control: `Tabs` / `Tab` plus `variant="segmented"` (sidebar quick add) and `"outlined"` (Events Type) in ten screens.
- Sortable table header: `SortHeader` / `SortButton` / `SortArrow` (Task table, Portfolio, All files).
- Save-status indicator: `SaveStatus` (document and spreadsheet).

**Decisions for Alex** (small visible differences, listed in the feature doc): inactive tabs on Tasks, Events and the Folder page gain the hover pill the other tabs had; All files List/Gallery and Collection Grid/Map are real Tabs (the active one is visibly filled); the Tasks row's history icon darkens on hover; Hierarchy's chevron gets the shared focus ring. Revert any of them by giving the view a local override.

**Left alone on purpose** (details in the feature doc): four underline fields that differ in padding (Planning new, Tasks add row, Events form, task item due date), the Files gallery chips, ghost-based icon buttons, `project_nav-label`, the task item's due button.

**Checks run (offline stand-in only):** `JEST_STUB_NET=1 /tmp/runner/all.sh` static checks (babel parse, unused/unresolved imports, sass compile of every changed `.scss`); a before/after compile of all 83 stylesheets for the `icon-size` sweep (identical CSS); the Jest stand-in over all 85 component test files: 72 pass (the 69 that pass on `origin/main` plus the new Epics, Initiatives and Events suites), 8 fail and 5 skip exactly as on `origin/main` (the failures are the known stand-in limits: `api/base`, `api/documents`, `TabBar`, `Select`, `StatusSettings`, `TransferDialog`, both Gantt pane suites); the Tasks and Roadmap suites (skipped there) pass with inert `@dnd-kit` stubs; a partial `tsc --noEmit` (TypeScript 5.9 with React types, no react-query/axios types) shows no error about any changed component, only the cascades from the missing types.

**Not run (no network, node_modules, browser):** `npm run lint`, the real `npx tsc -b`, the real `npm test`, the Epic planning and Hierarchy suites (they need the real react-query), a browser look. No backend or migration change.

To verify: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then in a browser at 375px and desktop, light and dark, compare against `main`: the tab rows (Tasks, Events, Folder page, Epics, Initiatives, All files, Collection editor; hover and active), the sidebar's Task/Event switch in the quick-add dialog (tray with a raised active tab), the Events form's Type choice, every delete/remove X (grey, red on hover; hidden until row hover where it was), the sidebar's tool icons and row actions (hover box), the Collection editor's add and delete icons, Hierarchy's chevron and Move, and a tag's remove button.
