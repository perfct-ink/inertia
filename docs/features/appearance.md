# Appearance settings

## What it does
Account dialog (click your name in the sidebar) → **Appearance** opens a dialog with:
- **Mode**: System (follow the OS, the default), Light or Dark, in the shared `Select` dropdown.
- **Colour theme**, picked from preview cards as in Slack: each card shows the theme's sidebar beside a page with its accent. Inertia (the default: teal accent, plain sidebar), Midnight (teal accent, deep navy sidebar), Harbor (blue), Plum (purple), Rose (pink), Crimson (red), Ember (orange), Moss (green) and Graphite (blue accent, grey sidebar). Every theme but Inertia tints the whole sidebar (icon rail and panel) a deep colour with light text, a little deeper in dark mode; menus that open inside the sidebar keep the page's colours.
- **Reset** returns to System and Inertia. Changes apply immediately and are remembered.
Light and Dark set `data-theme` on `<html>`; System removes it so the OS preference decides. A theme with a non-teal accent overrides Volta's `--v-accent`, `--v-accent-hover` and `--v-accent-subtle` as inline custom properties, using the same lightness steps as `_theme.scss` for light and dark. A tinting theme also sets `--sidebar-*` properties and `data-sidebar="tinted"` on `<html>`, which `Sidebar.scss` reads to redefine the sidebar's tokens. Both follow an OS scheme change while System is chosen.

## API and models
None: the choice is stored in `localStorage` (`inertia-appearance`) on this device and is not sent to the server. Code: `data/appearance.ts` (`COLOR_THEMES`, `isDark`, `themeAttribute`, `accentProperties`, `sidebarColor`, `sidebarProperties`), `store/appearance.ts` (persisted as version 1; a version 0 `accent` becomes the colour theme with the same id, so earlier choices keep their colour), `components/AppearanceEffect.tsx` (mounted in `App.tsx`), `components/AppearanceDialog.tsx`.

## Who can view and change
Each person for themselves, per device.

## Tests
`frontend/src/data/appearance.test.ts`, `store/appearance.test.ts`, `components/AppearanceEffect.test.tsx`, `components/AppearanceDialog.test.tsx`.

## Known limits
- Not synced between devices or the Mac app (the Mac shell has its own localStorage); a server-stored preference would follow the person.
- Only preset themes, no custom colour picker (Slack has one). Accent text on tinted backgrounds (`--accent-foreground`) keeps the teal value, so contrast with other accents was not checked.
- The first paint uses the default theme until the app mounts (a brief flash is possible for a saved Dark choice with a light OS).
- Components with their own hard-coded colours (for example the status palette, `docs/backlog/status-palette-on-volta-tokens.md`) do not follow the accent.

## History
- Implemented 2026-10-19 on branch `backlog/appearance-settings`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser (colours in light and dark) were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Colour themes added 2026-11-02 (Slack-style cards, tinted sidebar, Mode select). Lint, `tsc -b` and Jest pass; checked in a browser (Chromium, against a mocked API) in light and dark at 1280px and 375px. Not committed or deployed.
