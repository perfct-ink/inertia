# Appearance settings

## What it does
Account dialog (click your name in the sidebar) → **Appearance** opens a dialog with:
- **Theme**: System (follow the OS, the default), Light or Dark.
- **Accent colour**: Teal (Inertia's own theme, the default), Blue, Purple, Pink, Orange, Green or Red.
- **Reset** returns to System and Teal. Changes apply immediately and are remembered.
Light and Dark set `data-theme` on `<html>`; System removes it so the OS preference decides. A non-default accent overrides Volta's `--v-accent`, `--v-accent-hover` and `--v-accent-subtle` as inline custom properties, using the same lightness steps as `_theme.scss` for light and dark (it also follows an OS scheme change while System is chosen).

## API and models
None: the choice is stored in `localStorage` (`inertia-appearance`) on this device and is not sent to the server. Code: `data/appearance.ts` (presets, `isDark`, `themeAttribute`, `accentProperties`), `store/appearance.ts`, `components/AppearanceEffect.tsx` (mounted in `App.tsx`), `components/AppearanceDialog.tsx`.

## Who can view and change
Each person for themselves, per device.

## Tests
`frontend/src/data/appearance.test.ts`, `store/appearance.test.ts`, `components/AppearanceEffect.test.tsx`, `components/AppearanceDialog.test.tsx`.

## Known limits
- Not synced between devices or the Mac app (the Mac shell has its own localStorage); a server-stored preference would follow the person.
- Only preset accents, no free colour picker. Accent text on tinted backgrounds (`--accent-foreground`) keeps the teal value, so contrast with other accents was not checked.
- The first paint uses the default theme until the app mounts (a brief flash is possible for a saved Dark choice with a light OS).
- Components with their own hard-coded colours (for example the status palette, `docs/backlog/status-palette-on-volta-tokens.md`) do not follow the accent.

## History
- Implemented 2026-10-19 on branch `backlog/appearance-settings`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser (colours in light and dark) were not run (no node_modules).
