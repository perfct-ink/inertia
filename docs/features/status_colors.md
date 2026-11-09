# Status colors

## What it does
One set of theme tokens colors everything that carries a status meaning: the task status dots, health badges (on track, at risk, off track), project request badges, overdue and deadline marks, error text, Timeline and Gantt bars, calendar chips and the red "delete" hovers. They switch between light and dark with the rest of the theme (OS preference, or `data-theme` on `<html>`). They do not follow the accent color: a red status stays red in every colour theme.

Inertia sits on top of what Volta has (Alex, 2026-11-09):
- **Red** is Volta's `--v-color-danger` and **green** is Volta's `--v-color-success`.
- **Yellow, orange, blue, purple and gray** are Inertia's own tokens, defined in `frontend/src/styles/_theme.scss`. Nothing was added to Volta.

## Tokens
Each of the seven hues (the same seven as a configurable task status: `gray blue yellow green orange red purple`) has two tokens:
- `--status-<hue>`, the fill. Dots, bars, borders, icons and tints. In SCSS: `color(status-red)`, or `color(status-red, 0.15)` for a tint. `tint(status-red, 0.1)` is the opaque version (a toast over other content).
- `--status-<hue>-text`, the hue as text. The fill mixed toward the theme's text color (`--v-color-trim`) with `color-mix()`, so it is darker in light mode and lighter in dark mode. The mix percentage is the least that reaches WCAG AA. In SCSS: `color(status-red-text)`.

Use the fill for things the eye finds by shape or position and the `-text` token for anything read as words, including a link or an error message. Hover tints on red and purple chips go up to 20%, every other tint under text stays at 15% or less; that is the range the contrast figures below cover.

| Hue | Fill | Fill on page, light / dark | Text, light | Text, dark | Weakest text pair, light / dark |
| --- | --- | --- | --- | --- | --- |
| red (Volta danger) | `#dc2828` | 4.80 / 3.76 | `#b7282a` | `#e46f6f` | 4.98 / 4.91 |
| green (Volta success) | `#03a10e` | 3.44 / 5.25 | `#0d771a` | `#27ad30` | 4.78 / 4.74 |
| yellow | `#eab308` | 1.92 / 9.41 | `#7b671f` | `#eab308` | 4.79 / 6.52 |
| orange | `#f97316` | 2.80 / 6.44 | `#985222` | `#f97316` | 5.08 / 4.86 |
| blue | `#3b82f6` | 3.68 / 4.91 | `#3263b1` | `#6098f5` | 4.98 / 4.84 |
| purple | `#a855f7` | 3.96 / 4.56 | `#7f48bc` | `#bb7cf6` | 4.92 / 4.94 |
| gray | `#71717a` | 4.83 / 3.73 | `#65666f` | `#98989e` | 4.72 / 4.99 |

"Weakest text pair" is the lowest ratio of the text token on the page, a card, a muted surface, and the hue's own 15% tint over the page and over a card. The red and purple text tokens also pass on a 20% tint. Figures are for the default Inertia theme; colour themes change only the accent and the sidebar. The hex values are the results of the mixes, for reading; the CSS holds the mixes, so red and green follow Volta if it changes them.

## What changed in how things look
- Red and green fills are Volta's (`#dc2828` in Inertia's theme, `#03a10e`), a little deeper than the Tailwind-style red and green they replace (`#ef4444`, `#22c55e`). Meaning is unchanged.
- Yellow, orange, blue, purple and gray fills keep their old values, so dots, bars and tints look as before.
- Text in these hues is darker in light mode (and lighter in dark mode) than the old fixed colors, to reach AA. Before, red text was 3.76:1 on white, green 2.28:1, orange 2.80:1, yellow 1.92:1 and the blue document link 3.68:1.
- Toasts, the folder and event delete hovers, and the Events page chips used light and dark shades that only switched on the OS preference (`@media (prefers-color-scheme)`), so a person who chose Dark with a light OS saw the light shades. They are tints of the tokens now and follow the chosen mode.
- Where `color(danger)` was used for red text (the bug badge, over-allocated resources, cards), it is the `-text` token. Button and background uses of `danger` are unchanged.

## Known limits
- Two fills are under 3:1 against a white page (WCAG 1.4.11 asks 3:1 for graphics): yellow (1.92) and orange (2.80). They are a status dot beside its name, a Timeline bar's border and tint (the bar carries its title), a calendar chip tint and the rating star. They were left as they were so no status changes look. A conservative fix for a later pass, if Alex wants it: one step darker in light mode only (`#ca8a04`, 3.2:1, and `#ea580c`, 3.6:1). `statusColors.test.ts` lists both as known exceptions and fails if another fill drops under 3:1 or if either is fixed without updating the list.
- Volta's red is 3.76:1 on the dark page as a fill (it passes 3:1 for graphics); red text in dark mode uses the lightened `-text` token.
- Volta now also has `--v-color-warning` and `--v-color-danger-subtle`, but `frontend/src/styles/_volta.scss` is still the older copy without them (a resync is its own backlog item), and Volta's warning is a deep amber used as text, not the yellow of the "In Review" status. Yellow stays Inertia's own.
- The native Mac app has its own status colors; this covers the web app and the Mac shell's web content.
- Not checked in a browser (see History).

## Who can view and change
No data: these are styles, the same for everyone. To change a hue edit `_theme.scss` (and run the test); to change red or green, change Volta and recopy `_volta.scss`.

## Tests
- `frontend/src/styles/statusColors.test.ts` reads `_theme.scss` and `_volta.scss`, resolves the tokens for light and dark, and checks: every configurable status color has a fill, a text token in both themes and a `StatusDot` rule; red and green come from Volta; each text token is at least 4.5:1 on the page, cards, muted surfaces and its tint; each fill is at least 3:1 except the two known ones; no stylesheet uses `palette()` for anything but white and black.
- `frontend/src/util/cssColor.test.ts` covers the small CSS color reader and contrast function the test uses.

## History
- Implemented 2026-11-08 on branch `backlog/status-palette-on-volta-tokens`. Not merged or deployed. Replaces the fixed `palette()` colors in `_tokens.scss` (red, orange, yellow, green, blue, purple, zinc), which are gone; `palette()` keeps `white` and `black`.
- Earlier the task waited on Volta gaining status colors; Alex decided on 2026-11-09 that Inertia defines its own instead.
- Verified: the SCSS compiles and the two Jest files above pass in the offline stand-in. Not verified: lint, `tsc -b`, the real Jest run and a browser look in light and dark at desktop and 375px (no node_modules or browser here).
