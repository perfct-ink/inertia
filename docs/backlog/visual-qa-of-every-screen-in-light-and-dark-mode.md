---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/visual-qa-of-every-screen-in-light-and-dark-mode
status: incomplete
---
# Visual QA of every screen in light and dark mode

## Objective

**Visual QA of every screen in light and dark mode** after the Tailwind removal

## Requirements / notes

The conversion was done without a browser. Check hover/focus states, the sidebar, kanban drag overlay, calendar grid, document toolbar, and the Electron/iOS/Mac WebView shells.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Visual QA of every screen in light and dark mode works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Cannot be done without a browser. The task is to look at every screen at desktop and phone width in light and dark mode (hover and focus states, the sidebar and icon rail, the kanban drag overlay, the calendar grid, the document toolbar, and the Electron, iOS and Mac WebView shells), and the machine this was groomed on has no `node_modules`, no dev server and no display. Nothing here can be checked by reading code, and writing "checked" without looking would be wrong.

To do it on a machine with the app running (`make dev`): open each route in `frontend/src/App.tsx` at 375px, 768px and 1280px in light, dark and the tinted colour themes; compare hover, focus and active states against `docs/rules/design-principles.md`; check the console for errors; record findings as one new backlog file per defect (not as code in this task). `backlog/volta-component-mapping-and-parity` adds a dev-only `/styleguide` gallery that shows every shared control in a light and a dark panel, which is the quickest first pass for the shared controls.
