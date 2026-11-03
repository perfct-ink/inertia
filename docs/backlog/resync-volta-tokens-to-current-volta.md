---
priority: p3
depends_on: []
components: [frontend]
---
# Re-sync the Volta tokens in `_volta.scss` with current Volta

## Objective

`frontend/src/styles/_volta.scss` is a copy of Volta's tokens from commit `5b6faa1` (2026-08-11, Volta 2.0.0). Volta `HEAD` (`fde49fa`, 2026-11-02, 3.0.0) added `--v-color-warning: #a15c00`, `--v-color-danger-subtle: #fff2f4` (dark `#3a1519`) and `--v-on-accent: #fff`. Nothing else in `styles/_colors.scss` or `_variables.scss` changed (see `docs/volta_parity.md`).

## Requirements / notes

- Copy the four values into `_volta.scss`, update the commit in its header, and set the theme's `--primary-foreground` from `--v-on-accent` (see [primary-button-text-contrast-in-dark-mode](primary-button-text-contrast-in-dark-mode.md)). Take `--v-color-danger-subtle` and `--v-color-warning` into the theme (with blue-palette dark values) only where a component needs them.
- Diff `styles/_colors.scss` and `_variables.scss` again at the time: Volta's working tree had uncommitted changes when this was written.
- Update the "Volta version" table in `docs/volta_parity.md`.

## Acceptance criteria

- `_volta.scss` matches the chosen Volta commit; the doc names that commit; `npm run lint` passes and the gallery (`/styleguide`) looks unchanged in both themes.
- Feature doc updated and this file removed.
