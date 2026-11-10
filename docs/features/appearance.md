# Appearance settings

## What it does
Account dialog (click your name in the sidebar) → **Appearance** opens a dialog with:
- **Mode**: System (follow the OS, the default), Light or Dark, in the shared `Select` dropdown.
- **Colour theme**, picked from preview cards as in Slack: each card shows the theme's sidebar beside a page with its accent. Inertia (the default: blue accent, plain sidebar), Midnight (blue accent, deep navy sidebar), Harbor (blue), Plum (purple), Rose (pink), Crimson (red), Ember (orange), Moss (green) and Graphite (blue accent, grey sidebar). Every theme but Inertia tints the whole sidebar a deep colour with light text, a little deeper in dark mode; menus that open inside the sidebar keep the page's colours.
- **Reset** returns to System and Inertia. Changes apply immediately and are remembered.
Light and Dark set `data-theme` on `<html>`; System removes it so the OS preference decides. A theme other than Inertia overrides Volta's `--v-accent`, `--v-accent-hover` and `--v-accent-subtle`, and `--primary-foreground` (the text on the accent), as inline custom properties, using the same lightness steps as `_theme.scss` for light and dark. Text on the accent is white (9.4:1 on the default accent in light, 6.6:1 in dark) and reads at 4.5:1 or better on every theme's accent and hover shade in both modes: `onAccentColor` switches Moss in dark mode to the dark page color, and `accentLightness` deepens Moss's light accent from 32% to 31%. In dark mode the focus ring (`--focus-ring`) is the accent mixed 60% toward the text color, 4.8:1 or better against the page for every theme; in light mode it is the accent. A tinting theme also sets `--sidebar-*` properties and `data-sidebar="tinted"` on `<html>`, which `Sidebar.scss` reads to redefine the sidebar's tokens. Both follow an OS scheme change while System is chosen.

## API and models
None: the choice is stored in `localStorage` (`inertia-appearance`) on this device and is not sent to the server. Code: `data/appearance.ts` (`COLOR_THEMES`, `isDark`, `themeAttribute`, `accentProperties`, `accentLightness`, `onAccentColor`, `sidebarColor`, `sidebarProperties`), `store/appearance.ts` (persisted as version 1; a version 0 `accent` becomes the colour theme with the same id, so earlier choices keep their colour), `components/AppearanceEffect.tsx` (mounted in `App.tsx`), `components/AppearanceDialog.tsx`.

## Who can view and change
Each person for themselves, per device.

## Tests
`frontend/src/data/appearance.test.ts`, `store/appearance.test.ts`, `components/AppearanceEffect.test.tsx`, `components/AppearanceDialog.test.tsx`.

## Known limits
- Not synced between devices or the Mac app (the Mac shell has its own localStorage); a server-stored preference would follow the person.
- Only preset themes, no custom colour picker (Slack has one). Accent text on tinted backgrounds (`--accent-foreground`) keeps the default blue value, so contrast with other accents was not checked.
- The first paint uses the default theme until the app mounts (a brief flash is possible for a saved Dark choice with a light OS).
- Status colours (`docs/features/status_colors.md`) follow light and dark but deliberately not the accent: a red status stays red in every colour theme.

## History
- 2026-11-10: text on the accent is white instead of the dark page color in dark mode (it was 2.7:1), chosen per colour theme from its contrast, and the dark focus ring reaches 3:1. Checked by `data/appearance.test.ts` (reads `_theme.scss`). Not checked in a browser at 375px and desktop, and not deployed.
- 2026-11-03: the default accent (Inertia and Midnight) changed from teal (hue 174) to blue (hue 217). The theme id stays `teal`.
- Implemented 2026-10-19 on branch `backlog/appearance-settings`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser (colours in light and dark) were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Colour themes added 2026-11-02 (Slack-style cards, tinted sidebar, Mode select). Lint, `tsc -b` and Jest pass; checked in a browser (Chromium, against a mocked API) in light and dark at 1280px and 375px. Not committed or deployed.
