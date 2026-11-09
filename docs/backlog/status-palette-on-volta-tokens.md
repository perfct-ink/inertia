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

Contrast (WCAG 2.1, computed from the stylesheets by `statusColors.test.ts`): every `-text` token is at least 4.5:1 on the page, cards, muted surfaces and its own 15% tint (20% for red and purple), in light and dark. Pairs that do **not** pass and were left as they were so no status changes meaning: the yellow fill (1.92:1) and the orange fill (2.80:1) against a white page, both below the 3:1 that WCAG 1.4.11 asks of graphics. A conservative fix for Alex to approve: one step darker in light mode only (`#ca8a04`, `#ea580c`). Red text on white was 3.76:1, green 2.28:1, orange 2.80:1, yellow 1.92:1 and the document link blue 3.68:1 before; they now pass.

Ran here: sass compile of every changed `.scss`; the offline runner (`JEST_STUB_NET=1 /tmp/runner/all.sh`), including the new `frontend/src/styles/statusColors.test.ts` (37 tests) and `frontend/src/util/cssColor.test.ts` (8).

Not run (no network, node_modules or browser): `npm run lint` (ESLint and Stylelint), `npx tsc -b`, the real Jest run, and a look in a browser. To verify:

```sh
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser, in light and dark (Settings, Appearance, Mode) and at 375px and desktop width, check: the Tasks workboard and backlog (status dots, bug and priority badges, overdue dates), the Roadmap and Gantt (at-risk and off-track bars, today line), Portfolio and health badges, project requests (pending, approved, declined), the Events page (deadline and milestone chips, delete button, overdue and today dates), a Toast error (for example a failed save), form errors, a document's links and checklist overdue text, Resources over-allocation. Look for red, green, yellow, orange, blue and purple that read as the same colour they were, text that is legible on its tint, and a Dark choice on a light OS now giving dark toasts and chips.
