---
priority: p2
depends_on: []
components: [frontend]
---
# Fix text and control-boundary colors that miss WCAG contrast

## Objective

Several shared colors in `components/ui` are under the WCAG 2.1 AA minimums (calculated from the theme and palette; see the contrast table in `docs/volta_parity.md`). Fix them without changing the look more than needed.

## Requirements / notes

- `FormError` text is `palette('red-500')`: 3.8:1 on white (light), 4.8:1 on the dark page. Use a color that reaches 4.5:1 in both, for example a theme-aware danger text color.
- `HealthBadge` text is the fixed green/yellow/red 500 on a 15% tint of itself: 2.0, 1.7 and 3.1:1 in light mode (6.2, 7.1 and 4.2 in dark). Use darker text colors in light mode and keep them readable in dark. This overlaps [status-palette-on-volta-tokens](status-palette-on-volta-tokens.md): do the two together, or make the tokens there carry the text colors.
- The secondary button's label (`muted-foreground`) on its hover background (`accent`) is 4.4:1 in light mode.
- A text field's border (`border`) is 1.3:1 on the page in light and 1.4:1 in dark; WCAG 1.4.11 asks for 3:1 for the boundary of a control unless it is identified another way. Volta's own tokens are this quiet, so this is a design call for Alex: either use `border-strong` or a darker border for fields, or accept it and record why. Build the conservative option (a firmer field border) behind a note.
- Checkboxes and radios are 16px, below the 24px target of WCAG 2.5.8 (AA in 2.2) unless a label widens them; make the label part of the click target wherever a bare box is used.
- Part of the broader [wcag-keyboard-focus-and-contrast-audit](wcag-keyboard-focus-and-contrast-audit.md).

## Acceptance criteria

- FormError, HealthBadge text and the secondary button hover meet 4.5:1 in light and dark.
- The field border decision is recorded in `docs/ui-components.md`.
- Checked in the component gallery (`/styleguide`) in both panels and in a browser.
- Feature doc updated and this file removed.
