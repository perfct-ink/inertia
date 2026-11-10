---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/primary-button-text-contrast-in-dark-mode
status: incomplete
---
# Make text on the accent color readable in dark mode

## Objective

Primary buttons, the selected day in the date picker, the active Files filter, the sidebar avatar letter and the Events "today" mark all draw `color(primary-foreground)` on `color(primary)`. In `frontend/src/styles/_theme.scss` `--primary-foreground` is `var(--v-color-base)`, which in dark mode is the near-black page background, so the text is dark navy on mid blue at 2.7:1 (AA needs 4.5:1). The focus ring (`primary` against the dark background) is also 2.7:1 (3:1 is needed for a focus indicator).

## Requirements / notes

- Measured in `docs/volta_parity.md`: white on the default accent is 9.4:1 in light and 6.6:1 in dark. Volta now has a token for this, `--v-on-accent: #fff` (see [resync-volta-tokens-to-current-volta](resync-volta-tokens-to-current-volta.md)); until then set `--primary-foreground` to white in the theme instead of aliasing the page background.
- The Appearance colour themes set their own accent (`data/appearance.ts` `accentProperties`): white on the accent is at least 4.5:1 in dark for every theme except Moss (2.6:1; its current dark text is 6.9:1), and Moss in light is 4.3:1. Pick the text color per theme from the accent's contrast (a small pure function in `data/appearance.ts` with tests that checks every theme in light and dark), and set it as an inline `--primary-foreground` beside `--v-accent`.
- Make the dark accent bright enough that the focus ring reaches 3:1 on the dark background, or give the ring a second outline, without changing the light theme.
- Check in a browser at 375px and desktop, light and dark, with a non-default colour theme.

## Acceptance criteria

- Text on the accent is at least 4.5:1 in light and dark for every colour theme; the contrast function has unit tests.
- The focus ring is at least 3:1 against the page in both themes.
- Light mode looks unchanged.
- A feature doc in `docs/features/` (appearance.md) is updated and this file is removed.

## Unverified

Built: `--primary-foreground` is white; per-theme text color (`onAccentColor`) and Moss's light accent (`accentLightness`) in `data/appearance.ts`; `--focus-ring` in `_theme.scss` used by the `focus-ring` mixin; tests and `docs/features/appearance.md` updated. Frontend Jest (all 200 suites), `tsc` and `npm --prefix frontend run lint` (0 errors) passed.

Not run here: the browser check at 375px and desktop in light and dark with a non-default colour theme (`make up`, then Settings > Appearance), the backend tests (`bundler 2.5.22` missing on this machine: `make test-backend`) and `swift test --package-path macos` (blocked by the sandbox; the Swift palette test reads `_theme.scss` but only its `hsl()` tokens, which didn't change). To finish: run those, then delete this file.
