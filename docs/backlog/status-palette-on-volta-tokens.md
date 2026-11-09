---
priority: p1
depends_on: []
branch: backlog/status-palette-on-volta-tokens
status: incomplete
---
# Move the fixed status palette (blue/green/red/purple in `_tokens.scss`) onto Volta tokens

## Objective

Move the fixed status palette (blue/green/red/purple in `_tokens.scss`) onto Volta tokens

## Requirements / notes

Volta has `--v-color-danger` and `--v-color-success` only.

**Decision (Alex, 2026-11-09 groom): Inertia sits on top of what Volta has.** Use Volta's tokens where they exist (red statuses use `--v-color-danger`, green use `--v-color-success`), and Inertia defines its own tokens for the rest (blue, purple and any others) in its own theme layer (`_theme.scss`). Don't add status colours to Volta.

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Move the fixed status palette (blue/green/red/purple in `_tokens.scss`) onto Volta tokens works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built per the 2026-11-09 decision: red and green statuses use Volta's `--v-color-danger` and `--v-color-success`; yellow, orange, blue, purple and gray are Inertia's own `--status-<hue>` tokens in `frontend/src/styles/_theme.scss`; nothing was added to Volta. Every coloured `palette()` use (27 stylesheets, including the toast, event chips and delete hovers that had their own light and dark shades) now reads `color(status-<hue>)` for fills and `color(status-<hue>-text)` for text. `palette()` keeps `white` and `black` only. Details, token table and contrast figures: `docs/features/status_colors.md`.

Contrast (WCAG 2.1, computed from the stylesheets by `statusColors.test.ts`): every `-text` token is at least 4.5:1 on the page, cards, muted surfaces and its own 15% tint (20% for red and purple), in light and dark. **Fills (Alex, 2026-11-09: "fix it, in dark mode as well"):** every status fill is now at least 3:1 against the page, cards and muted surfaces in both modes, asserted with no exceptions. Light mode: yellow `#eab308` to `#a67c00` (was 1.92:1 on white, now 3.82; 3.31 on muted), orange `#f97316` to `#db5e06` (2.80 to 3.74; 3.25 on muted), and green is Volta's success mixed 5% toward the text color, `#049b10` (Volta's own is 2.98 on a muted surface). Dark mode already passed (3.28:1 or better on all three surfaces) and keeps the bright yellow, orange and Volta green. Yellow and orange keep their hue (asserted). Text tokens stayed above 4.5:1 and look the same as before to within a shade. Red text on white was 3.76:1, green 2.28:1, orange 2.80:1, yellow 1.92:1 and the document link blue 3.68:1 before the move to tokens; they now pass.

One call that is Alex's to confirm: the green fill is a mix with Volta's `--v-color-success`, not Volta's exact value, in light mode only, so it clears 3:1 on a muted surface. Drop the mix (and the muted-surface check for green) if exact Volta green matters more.

Ran here: sass compile of every changed `.scss`; the offline runner (`JEST_STUB_NET=1 /tmp/runner/all.sh`), including the new `frontend/src/styles/statusColors.test.ts` (41 tests) and `frontend/src/util/cssColor.test.ts` (11), and mutation-checked it (reverting light yellow, light orange or the green mix, darkening dark orange or gray, drifting yellow's hue each fail the matching test).

Not run (no network, node_modules or browser): `npm run lint` (ESLint and Stylelint), `npx tsc -b`, the real Jest run, and a look in a browser. To verify:

```sh
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser, in light and dark (Settings, Appearance, Mode) and at 375px and desktop width, look at the screens below (the deeper light-mode yellow, orange and green were computed, never seen; confirm yellow still reads as yellow and orange as orange, and the at-risk bar and the rating star are not muddy), and check: the Tasks workboard and backlog (status dots, bug and priority badges, overdue dates), the Roadmap and Gantt (at-risk and off-track bars, today line), Portfolio and health badges, project requests (pending, approved, declined), the Events page (deadline and milestone chips, delete button, overdue and today dates), a Toast error (for example a failed save), form errors, a document's links and checklist overdue text, Resources over-allocation. Look for red, green, yellow, orange, blue and purple that read as the same colour they were, text that is legible on its tint, and a Dark choice on a light OS now giving dark toasts and chips.
