# Status colors

## What it does
One set of theme tokens colors everything that carries a status meaning: the task status dots, health badges (on track, at risk, off track), project request badges, overdue and deadline marks, error text, Timeline and Gantt bars, calendar chips and the red "delete" hovers. They switch between light and dark with the rest of the theme (OS preference, or `data-theme` on `<html>`). They do not follow the accent color: a red status stays red in every colour theme.

Inertia sits on top of what Volta has (Alex, 2026-11-09):
- **Red** is Volta's `--v-color-danger` and **green** is Volta's `--v-color-success` (in light mode nudged 5% toward the text color, see Fills below).
- **Yellow, orange, blue, purple and gray** are Inertia's own tokens, defined in `frontend/src/styles/_theme.scss`. Nothing was added to Volta.

## Tokens
Each of the seven hues (the same seven as a configurable task status: `gray blue yellow green orange red purple`) has two tokens:
- `--status-<hue>`, the fill. Dots, bars, borders, icons and tints. In SCSS: `color(status-red)`, or `color(status-red, 0.15)` for a tint. `tint(status-red, 0.1)` is the opaque version (a toast over other content).
- `--status-<hue>-text`, the hue as text. The fill mixed toward the theme's text color (`--v-color-trim`) with `color-mix()`, so it is darker in light mode and lighter in dark mode. The mix percentage is the least that reaches WCAG AA. In SCSS: `color(status-red-text)`.

Use the fill for things the eye finds by shape or position and the `-text` token for anything read as words, including a link or an error message. Hover tints on red and purple chips go up to 20%, every other tint under text stays at 15% or less; that is the range the text figures below cover.

### Fills
Every fill is at least 3:1 (WCAG 1.4.11, graphics) against the page, a card and a muted surface, in light and in dark (Alex, 2026-11-09). Light mode needed three changes; dark mode already passed and is unchanged.

| Hue | Light fill | Dark fill | Light: page / weakest surface | Dark: page / weakest surface |
| --- | --- | --- | --- | --- |
| red (Volta danger) | `#dc2828` | `#dc2828` | 4.80 / 4.16 | 3.76 / 3.30 |
| green (Volta success) | `#049b10` | `#03a10e` | 3.68 / 3.20 | 5.25 / 4.61 |
| yellow | `#a67c00` | `#eab308` | 3.82 / 3.31 | 9.41 / 8.26 |
| orange | `#db5e06` | `#f97316` | 3.74 / 3.25 | 6.44 / 5.65 |
| blue | `#3b82f6` | `#3b82f6` | 3.68 / 3.19 | 4.91 / 4.31 |
| purple | `#a855f7` | `#a855f7` | 3.96 / 3.43 | 4.56 / 4.01 |
| gray | `#71717a` | `#71717a` | 4.83 / 4.19 | 3.73 / 3.28 |

"Weakest surface" is the lowest ratio over the page, a card and a muted surface; in every row it is the muted surface. The light-mode changes:
- **Yellow** `#eab308` (1.92 on white) to `#a67c00`, a deep gold. A yellow that reaches 3:1 on a muted surface cannot be bright; hue stays 45 degrees.
- **Orange** `#f97316` (2.80) to `#db5e06`, a burnt orange. Hue stays about 25 degrees, apart from red at 0.
- **Green** is Volta's `--v-color-success` mixed 5% toward the text color (`#049b10`). Volta's own `#03a10e` is 3.44 on white but 2.98 on a muted surface, just under.
- Dark mode keeps the bright yellow and orange (and Volta's green exactly) by overriding the three tokens in the dark block of `_theme.scss`; they are 3.28:1 or better there.

### Text
| Hue | Text, light | Text, dark | Weakest text pair, light / dark |
| --- | --- | --- | --- |
| red | `#b7282a` | `#e46f6f` | 4.60 / 4.69 |
| green | `#0d791a` | `#27ad30` | 4.65 / 4.74 |
| yellow | `#7e630f` | `#eab308` | 4.81 / 6.52 |
| orange | `#a34e13` | `#f97316` | 4.77 / 4.86 |
| blue | `#3263b1` | `#6098f5` | 4.98 / 4.84 |
| purple | `#7f48bc` | `#bb7cf6` | 4.61 / 4.62 |
| gray | `#65666f` | `#98989e` | 4.72 / 4.99 |

"Weakest text pair" is the lowest ratio of the text token on the page, a card, a muted surface, and the hue's own tint (15%; 20% for red and purple) over the page and over a card. Figures are for the default Inertia theme; colour themes change only the accent and the sidebar. The hex values are the results of the mixes, for reading; the CSS holds the mixes, so red and green follow Volta if it changes them.

## What changed in how things look
- Red and green fills are Volta's (`#dc2828` in Inertia's theme, `#03a10e`), a little deeper than the Tailwind-style red and green they replace (`#ef4444`, `#22c55e`). Meaning is unchanged. In light mode green is a touch deeper still (`#049b10`).
- Blue, purple and gray fills keep their old values. In **light mode only**, yellow and orange are deeper than before (`#eab308` to `#a67c00`, `#f97316` to `#db5e06`) so they reach 3:1: the "In Review"-style yellow dot, the at-risk Timeline bar's border and tint, the calendar and task chips, the rating star and the event dot read as gold and burnt orange rather than bright yellow and orange. Dark mode keeps the bright ones.
- Text in these hues is darker in light mode (and lighter in dark mode) than the old fixed colors, to reach AA. Before, red text was 3.76:1 on white, green 2.28:1, orange 2.80:1, yellow 1.92:1 and the blue document link 3.68:1.
- Toasts, the folder and event delete hovers, and the Events page chips used light and dark shades that only switched on the OS preference (`@media (prefers-color-scheme)`), so a person who chose Dark with a light OS saw the light shades. They are tints of the tokens now and follow the chosen mode.
- Where `color(danger)` was used for red text (the bug badge, over-allocated resources, cards), it is the `-text` token. Button and background uses of `danger` are unchanged.

## Known limits
- A fill is checked against the page, card and muted surfaces. A fill drawn over its own tint (a bar's border on its 20% fill) is not checked: that border also sits on the page outside the bar, and text on the tint is covered by the text figures. In dark mode gray on a card under its own 15% tint is 2.97:1 and red 3.17:1; if a place needs more, give it a stronger border.
- Not status fills, so not covered: the accent-coloured bars of the Gantt and its PNG export (`util/ganttCanvas.ts`, `--v-accent-subtle` bars) are low contrast on the page; that belongs to the WCAG audit (`docs/backlog/wcag-keyboard-focus-and-contrast-audit.md`).
- Volta's red is 3.76:1 on the dark page as a fill (3.30 on a muted surface; both pass 3:1); red text in dark mode uses the lightened `-text` token.
- Volta now also has `--v-color-warning` and `--v-color-danger-subtle`, but `frontend/src/styles/_volta.scss` is still the older copy without them (a resync is its own backlog item), and Volta's warning is a deep amber used as text, not the yellow of the "In Review" status. Yellow stays Inertia's own.
- The native Mac app has its own status colors; this covers the web app and the Mac shell's web content.
- Not checked in a browser (see History): the deeper light-mode yellow, orange and green are computed, not looked at.

## Who can view and change
No data: these are styles, the same for everyone. To change a hue edit `_theme.scss` (and run the test); to change red or green, change Volta and recopy `_volta.scss`.

## Tests
- `frontend/src/styles/statusColors.test.ts` reads `_theme.scss` and `_volta.scss`, resolves the tokens for light and dark, and checks: every configurable status color has a fill, a text token in both themes and a `StatusDot` rule; red and green come from Volta; each text token is at least 4.5:1 on the page, cards, muted surfaces and its tint; each fill is at least 3:1 on the page, cards and muted surfaces in both light and dark, with no exceptions; yellow and orange keep their hue (40 to 55 and 18 to 35 degrees) after being darkened; no stylesheet uses `palette()` for anything but white and black.
- `frontend/src/util/cssColor.test.ts` covers the small CSS color reader, contrast and hue functions the test uses.

## History
- Implemented 2026-11-08 on branch `backlog/status-palette-on-volta-tokens`. Not merged or deployed. Replaces the fixed `palette()` colors in `_tokens.scss` (red, orange, yellow, green, blue, purple, zinc), which are gone; `palette()` keeps `white` and `black`.
- Earlier the task waited on Volta gaining status colors; Alex decided on 2026-11-09 that Inertia defines its own instead.
- 2026-11-09 (Alex: "fix it, in dark mode as well"): the two documented exceptions are gone. Light-mode yellow, orange and green were deepened (see Fills), the dark fills were checked against all three surfaces (they already passed), and the test now fails on any fill under 3:1. Mutation-checked in the offline stand-in: reverting light yellow, light orange or the green mix, darkening dark orange, darkening gray, and drifting yellow's hue each fail the matching test.
- Verified: the SCSS compiles and the two Jest files above pass in the offline stand-in. Not verified: lint, `tsc -b`, the real Jest run and a browser look in light and dark at desktop and 375px (no node_modules or browser here).
