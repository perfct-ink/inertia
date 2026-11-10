# Volta parity: component mapping, version and audit

How Inertia's shared controls relate to the [Volta](https://github.com/kriogenx0/volta) design system and to the native macOS controls, which Volta version Inertia follows, what it would take to import Volta's components, and the results of a keyboard, accessibility and narrow-layout check of every control in `frontend/src/components/ui/`. Written 2026-11-03 from the code: the Inertia repository at `main`, and the sibling checkout of Volta (`/Users/alexv/Sites/alex/volta`) read without running anything. What was and was not run is at the end.

- The controls themselves are described in [ui-components.md](ui-components.md) and [features/design_principles.md](features/design_principles.md).
- Every control in its states, in a light and a dark panel: the component gallery at `/styleguide` (see [features/component_gallery.md](features/component_gallery.md)).

## Volta version

| | |
| --- | --- |
| What Inertia takes from Volta | Design tokens only: colors (light and dark), 4px radius, motion (`--v-anim-speed` 150ms, `--v-anim-ease`), and the look of the button and text field. No Volta JavaScript or CSS file is loaded. |
| Commit Inertia copied from | `11a8494` "make open" (committed `HEAD` on 2026-11-10), recorded in the header of `frontend/src/styles/_volta.scss`; it was `5b6faa1` (2026-08-11, Volta 2.0.0) until then. Colors only. Taken from `11a8494`: `--v-color-warning`, `--v-color-danger-subtle` (dark `#3a1519`), `--v-on-accent`, `--v-color-danger-hover`, and `--v-color-trim-less-subtle` changed from `#808080` to `#6e6e6e`. Not taken (nothing here uses them): the spacing, radius and shadow scales and `--v-focus-ring`. Inertia's theme does not use the new colors yet. |
| Volta now (committed `HEAD`, read 2026-11-03) | `fde49fa` "Consolidate components, add SCSS per component, and rework Makefile" (2026-11-02), `package.json` version `3.0.0`, 29 commits and 3 months after the copy. The sibling checkout also has about 100 files changed but not committed, so its working tree is ahead of `HEAD`; only committed history is used here. |
| What changed in the tokens since the copy | Three light tokens and one dark token were added to `styles/_colors.scss`: `--v-color-warning: #a15c00`, `--v-color-danger-subtle: #fff2f4` (dark `#3a1519`) and `--v-on-accent: #ffffff` (text on the accent color; Volta's `$color_white` now points at it). Nothing else in `_colors.scss` or `_variables.scss` changed, so every value Inertia copied is still current. Inertia uses none of the new tokens yet; `--v-on-accent` is the right source for the primary button's text color (see [backlog/primary-button-text-contrast-in-dark-mode.md](backlog/primary-button-text-contrast-in-dark-mode.md)). Re-syncing is [backlog/resync-volta-tokens-to-current-volta.md](backlog/resync-volta-tokens-to-current-volta.md). |
| Where Volta documents itself | `docs/README.md` in the Volta checkout (install, import, theming API, coverage note); there is no `README.md` at its root. Its design rules are in `AGENTS.md`, its remaining design-system work in `docs/backlog.md`. |

### How the tokens are copied

By hand, as plain values:

1. `frontend/src/styles/_volta.scss` holds Volta's `:root` custom properties and its `dark-palette` mixin under the same names, with the Volta commit in its header comment. The only addition is the `dark-scheme` mixin, which wraps content in the two selectors Volta uses for dark mode (`@media (prefers-color-scheme: dark)` on `:root:not([data-theme])`, and `:root[data-theme='dark']`) so a theme can put its dark values in the same place and win over Volta's defaults.
2. `frontend/src/styles/_theme.scss` is Inertia's theme: it overrides the `--v-*` tokens with the blue palette, light and dark, then maps Inertia's semantic colors (`--background`, `--foreground`, `--primary`, `--border` ...) onto them. The values are in mixins (`light-tokens`, `dark-tokens`, `semantic-colors`) so the root and any element with `data-theme="light"` or `"dark"` share them.
3. `_tokens.scss` holds Volta's 4px radius (`$volta-radius`, from `$border_radius` in `styles/_variables.scss`) and the `transition` mixin (Volta's speed and easing); `_typography.scss` holds the SF Pro font stack from Volta's `styles/type.scss`.
4. Updating means diffing Volta's `styles/_colors.scss` and `_variables.scss` against the copy, changing `_volta.scss` and the commit in its header, and then this page. Nothing checks the copy automatically.

### Why Volta's components are not imported

- **Not installable as published.** Volta is `private: true` and not on a registry; `package.json` `main` is `components/compiled/components.js`, a bundle that is not committed (`npm run build` makes it) and there is no `prepare` script, so `npm install github:kriogenx0/volta` yields a package whose `main` does not exist.
- **Its CSS would beat Inertia's layers.** Volta's build (`vite.config.mjs`) injects every component's CSS from JavaScript (`vite-plugin-css-injected-by-js`). Those `<style>` tags are not in a cascade layer, and an unlayered rule beats every layered rule. Inertia's order is `libraries`, `app`, `view` (`styles/app.scss`, [ui-components.md](ui-components.md)), so Volta's styles would override the app and view layers instead of sitting under them.
- **No types, one big bundle.** It is plain JavaScript with `prop-types`. The bundle is UMD with all 92 components, so a single `Button` brings in everything: TinyMCE (copied into the build), Quill, `moment`, `lodash`, `luxon`, `date-fns`, `react-select`, a syntax highlighter and more.
- **Incomplete theme coverage.** Volta's own coverage note says about 15 components (Button, Checkbox, Dropdown, Select, Tabs, Toggle, Tag, ProgressBar, ActionMenu, FileManager, DropdownList, TextField, Radio and what is built on them) follow the accent color and light/dark mode; most of the others still use hard-coded colors.
- **Behaviour gaps Inertia has already closed.** In the Volta source, only `NavBarItem`, `AutoComplete`, `TextEditable`, `Slider`, `ComboBox` and `Tag` handle keyboard events. `Modal`, `Dialog`, `PopOver`, `Dropdown`, `ActionMenu`, `DatePicker` and `CalendarMini` have no Escape handling, arrow keys or focus trap; `Select` is a styled native select. Inertia's `Modal` (Radix Dialog), `Select`, `Menu` and `DatePicker` have all of these.
- **React 19 and `defaultProps`.** 42 Volta component files still use `defaultProps` (its own backlog lists replacing them). React 19 ignores `defaultProps` on function components, so for example `Dialog` and `ModalDialog` lose their `Cancel`/`Save` labels and `Dropdown` loses `showOverlay: true` when rendered under React 19, which Volta itself targets (`react ^19.2.8`).

### What importing would take

Nothing here has been tried. Inertia's frontend builds with webpack and Babel (not Vite) in Docker (`frontend/Dockerfile`, `node:22-slim`) and in the `frontend` job of `.github/workflows/ci.yml`.

1. **Declare the dependency.** Pin a commit: `"volta": "github:kriogenx0/volta#<sha>"`. A `file:../volta` path does not work: the Docker build context is `frontend/` and CI checks out only this repository. If the Volta repository is private, CI and the Docker build need a token or deploy key, and the `node:22-slim` image needs `git` installed for `npm ci` to fetch a Git dependency. Volta's `.npmrc` sets `package-lock=false`, so its transitive dependencies are not locked from Inertia's side.
2. **Build it.** Add a `prepare` script to Volta (`vite build`); npm runs it for a Git dependency after installing its `devDependencies` (Vite 8, `@vitejs/plugin-react`, `@babel/preset-flow` for its Flow-annotated utilities, `vite-plugin-static-copy`, `sass`). The alternative is a build step in Inertia's Dockerfile and CI job; either way the install gets slower and heavier.
3. **Load its CSS in a layer.** Either change Volta's build to emit a CSS file instead of injecting it, wrapped in `@layer libraries { ... }`, and import that from `styles/app.scss`; or have webpack's `sass-loader` import the SCSS of just the components used (`@use` inside `@layer libraries`, with Volta's `mixins.scss` on `loadPaths`). The second tree-shakes; the first is simpler.
4. **Make the JavaScript consumable.** The UMD bundle can be imported (`import { Button } from 'volta'`) with `react`, `react-dom` and `react-router-dom` resolving to Inertia's copies (all React 19 and React Router 7). Importing Volta's source instead needs Babel to compile `node_modules/volta` including its Flow annotations. Add a type declaration (`declare module 'volta'`) or, better, typed wrappers in `components/ui`.
5. **Keep Inertia's contract.** Per [ui-organization](rules/ui-organization.md) screens import from `@/components/ui`; each Volta component would be wrapped there, preserving native props and refs, the 40-pixel field height, `aria-*` and dark mode, and replacing the wrapper's SCSS. Inertia-only behaviour (`Select`'s hidden native select, `DatePicker`'s `YYYY-MM-DD` contract, `Menu`'s checked items) has no Volta equivalent and would stay.
6. **CI and tests.** Jest needs a `moduleNameMapper` for Volta's CSS, the `frontend` job needs the install and build above, and the production build needs a bundle-size check (the whole UMD file is one import).
7. **Version policy.** Pin the commit, bump it deliberately, and record it here and in the header of `_volta.scss`.

The conservative path, until Volta publishes a built package with layered CSS and fixed `defaultProps` (`backlog/volta-packaging-for-inertia.md`), is the present one: tokens only, wrappers in `components/ui` that borrow Volta's look, and adoption one fully themed component at a time. [backlog/adopt-volta-components-in-react.md](backlog/adopt-volta-components-in-react.md) is the task that would do it.

## Component inventory

"Volta" is the sibling checkout at `HEAD`. "Native today" is `macos/Sources/Inertia/Components/` on `main`: stock SwiftUI controls with one shared style (`InertiaTextFieldStyle`), plus `EditorSheet`, `EditorActions`, `ValidationMessage`, `NotesEditor` and `ProviderSignInButton`. Two backlog branches not yet merged add Volta-styled SwiftUI controls: `backlog/native-macos-volta-colors` (a Volta palette for native screens) and `backlog/native-macos-volta-parity-components` (work in progress: `VoltaButtonStyle`, `VoltaField`, `VoltaSelect`, `VoltaCheckable` and `InertiaCore` control specs); those rows say what the branch targets. The Mac app's workspace screens are the React ones in a `WKWebView` (`WorkspaceWebView`), so they already match; only the native login, the local task-file screens and their editors need native controls.

| React (`components/ui`) | Volta component | Parity with Volta | Native today (SwiftUI) | Native gap |
| --- | --- | --- | --- | --- |
| `Button` `primary` | `Button` `variant="primary"` | Same look: accent fill, darker accent on hover, 4px radius. Differs: Inertia's minimum height is 40px (Volta's is about 36px), disabled is 50% opacity (Volta fills with `accent-subtle`), no `size` prop. | `Button` with `.borderedProminent` (sign-in); `EditorActions` Save is the default action | No shared primary style (branch: `VoltaButtonStyle`). |
| `Button` `secondary` | `Button` default variant | Same: 1px `base-subtle` border, steps one shade on hover. | `Button` with `.bordered` (`ProviderSignInButton`), plain `Button` (Cancel, Refresh) | As above. |
| `Button` `destructive` | `Button` `variant="danger"` | Same red fill. Hover mixes 15% black (Volta: `brightness(0.85)`). | Plain `Button`; `Button(role: .destructive)` is not used (the trash button is `.borderless`) | No destructive style. |
| `Button` `ghost` | None (nearest: `Button` `variant="link"`, accent text with underline on hover; `IconButton`, `CloseButton`) | Inertia only: transparent, accent-tinted on hover. | `.buttonStyle(.borderless)` / `.plain` | No shared ghost style. |
| `Button` `unstyled` | None | Inertia only: the base for tabs, cards and menu items. | `.buttonStyle(.plain)` | n/a |
| `ButtonLink` | `Link`, `ActionLink` (plain links without a button look) | Inertia only. | `Link` / a `Button` that opens a URL; not used | n/a |
| `Input` (text, number, password) | `TextField` (`fieldSize`, `label`, `error`, `optional`, `aria-invalid`), `NumericField` | Same field states: quiet border, firmer on hover, accent on focus. Missing in Inertia: the label, hint and error wrapper (finding F). | `TextField` with `InertiaTextFieldStyle` (40pt minimum, 2pt accent focus ring); `SecureField` on login (whether the style reaches it was not checked) | Radius is 6pt natively and 4px in React. |
| `Input` checkbox and radio | `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup`, `Toggle` | Same idea, drawn by the app: 16px (Volta 18px), accent when checked. | `Toggle` (system checkbox on macOS), used for "Reached" and event membership; no radio group | Unstyled system checkbox. |
| `Textarea` | `Textarea` (`resize`) | Same field states; Inertia minimum 96px tall, Volta has a `resize` prop. | `TextEditor` with `.border(.quaternary)` (`NotesEditor`), `TextField(axis: .vertical)` (comments) | No 40pt/focus style on the editor. |
| `Select` | `Select` (a styled native `<select>`, `fieldSize`), `Dropdown` + `DropdownList` (custom list, mouse only), `ComboBox`, `MultiSelect` | Inertia keeps a hidden native select for value, label and focus, and draws its own list (Radix Popover) with arrows, Home/End, type-ahead and Escape. Closest Volta behaviour is `Dropdown`, which has no keyboard model. | `Picker` (menu style; 14 uses), `.segmented` for the view switch | System look; behaviour is native. |
| `DatePicker` | `DatePicker` (`Date` objects, read-only box that opens `CalendarMini`), `DateInput`, `Calendar` | Different contract on purpose: `YYYY-MM-DD` strings and a box you can type into. | Text fields with the placeholder `YYYY-MM-DD` (`OptionalTextField`); no `DatePicker` | Gap: SwiftUI `DatePicker` bridged to `ISODate` (the branch adds `ISODate`). |
| `Menu` | `ActionMenu` (ellipsis button and list), `Dropdown` | Inertia adds checked items, hints, separators, roving focus and Escape-to-trigger. | `Menu("Move to")`, `.contextMenu` | Native menus; nothing to style. |
| `Modal` | `Modal`, `ModalDialog`, `Dialog`, `PopOver` | Radix Dialog (focus trap, Escape, aria); Volta's have none of these. | `.sheet` with `EditorSheet` (title, 24pt padding, fixed width) | `EditorSheet` is the equivalent. |
| `ConfirmDialog` | `ModalDialog` (okay/cancel), `ModalAlert` | Same shape. | None used; errors use the system `.alert` (`appErrorAlert`) | Use `confirmationDialog` when a native confirm is needed. |
| `PromptDialog` | None | Inertia only. | None | n/a |
| `FormError` | `ErrorText`, `Message`, `ErrorList` | Inertia adds `role="alert"`; Volta's `ErrorText` is a plain paragraph. | `ValidationMessage` (red caption) | Matches. |
| `ToastRegion` | `ToastMessage` (`show()`, four variants, 4s) | Inertia: errors only, 8s, driven by `store/notifications`. | None | By design. |
| `StatusDot` | `IndicatorDot` (`complete`) | Inertia: the seven configurable status colors. | None | n/a |
| `HealthBadge` | `Badge` (`tone`: success, warning, danger, neutral, info) | Same pill; Inertia hard-codes green/yellow/red (see [backlog/status-palette-on-volta-tokens.md](backlog/status-palette-on-volta-tokens.md)). | None | n/a |
| `AttachmentCard` | None (`Card`, `ListCard`, `AudioTrack`, `FileManager` differ) | Inertia only. | None (files are in the web view) | n/a |
| Colors, radius, motion, type | `styles/_colors.scss`, `_variables.scss`, `type.scss` | Copied; see above. | Branch `native-macos-volta-colors` adds the palette; main uses system colors and `.accentColor` | Merge the branch. |

## Keyboard, accessibility and narrow layouts

Checked by reading each component, its SCSS and its tests. "Tested" means a Jest test asserts it. Nothing was checked in a browser or with a screen reader.

| Control | Keyboard and accessibility | Narrow layout (375px) | Findings |
| --- | --- | --- | --- |
| `Button`, `ButtonLink` | Native `<button>` and `<a>`; a 2px focus ring on every variant (`:focus-visible`); disabled buttons are not clickable (tested). | Primary, secondary and destructive are 40px tall and wrap long labels; `ghost` is about 28px tall and `unstyled` has no size. | Ghost buttons are under a finger-sized target (D). Primary text is dark on blue in dark mode (A). |
| `Input`, `Textarea` | Native elements, props and refs forwarded (tested). 40px minimum height; 16px text on touch screens so iOS Safari does not zoom. | Full width. | No invalid style or link to `FormError` (F). Border contrast is 1.34:1 (B). Checkboxes and radios are 16px, smaller than the 24px WCAG 2.5.8 target unless a label or row widens them. |
| `Select` | Hidden native select keeps focus, label and form value. ArrowDown/ArrowUp/Enter/Space open; in the list: arrows (skipping disabled options), Home/End, type-ahead (500ms), Enter/Space pick, Escape/Tab/click outside close (opening, arrows, Enter and disabled options are tested; Home/End, type-ahead, Escape, Tab and click-outside are not). `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`/`"option"`, `aria-selected`, `aria-disabled`. | Face at most 100% wide; list at most `min(24rem, available width)`, flips above near the bottom, 44px options on touch screens. | The list has no accessible name, option groups lose their labels, `multiple` is unsupported (I, K). |
| `DatePicker` | Combobox text box with a `dialog` popup and a `grid`; focus never leaves the box; ArrowDown opens, Up/Down move a week, PageUp/PageDown a month (Shift: a year), Enter picks, Escape closes the calendar; `aria-activedescendant`, `aria-selected`, `aria-current="date"`, `aria-live` month title. 16 tests. | Popup at most `100vw - 32px` (320px wide), 40px days and arrows on touch screens, touch keyboard kept closed. | ArrowLeft/Right keep moving the text cursor, so a keyboard user steps by weeks or types; no year buttons (documented in [design_principles.md](features/design_principles.md)). Placement is untested (no layout in jsdom). Inside a modal, Escape may close the whole modal (M). |
| `Menu` | Trigger has `aria-haspopup`, `aria-expanded`, `aria-controls`; opens with click or ArrowDown/ArrowUp, focuses the checked item, arrows/Home/End wrap, Enter/Space choose, Escape closes and returns focus, click outside closes (5 tests). `menuitem`/`menuitemradio` with `aria-checked`. | List is 14rem to 20rem wide, anchored to the trigger's left edge. | No type-ahead, items all `tabIndex` 0, items 36px tall, no viewport collision handling (D, G). |
| `Modal`, `ConfirmDialog`, `PromptDialog` | Radix Dialog: focus trap, focus returns to the opener, Escape and outside click close, `aria-labelledby`/`describedby`, siblings hidden. New tests cover render, `wide`, class names, confirm/cancel, destructive and prompt submit/trim/reset; the focus trap and Escape come from Radix and are not asserted. | Width `100vw - 32px`, at most 24rem. | Only `wide` modals scroll; a tall form taller than the screen cannot be scrolled (E). A prompt can submit an empty value (callers check). |
| `FormError` | `role="alert"`. | Wraps. | Not linked to its field (F); red-500 text is 3.76:1 on white (B). |
| `ToastRegion` | Each notice is `role="alert"` with a labelled Dismiss button; 8 seconds then it goes (new tests). | Fits `100vw - 32px`, at most 24rem. | Does not pause on hover or focus (H); the dismiss button is about 24px (D); its dark colors follow only the OS preference (C). |
| `StatusDot`, `HealthBadge` | Decorative dot (`aria-hidden`; the status name is always beside it); the badge is text. | Badge never wraps. | Badge text is 2.0:1 (green), 1.74:1 (yellow) and 3.1:1 (red) on its tint in light mode (B). |
| `AttachmentCard` | `role="group"` named for the file, labelled Download/Remove/Play, Preview in a dialog (7 tests). | Actions wrap under the name; Remove keeps a 40px target. | None. |

### Contrast measured

WCAG 2.1 relative luminance, computed from the theme's HSL values (`_theme.scss`) and the fixed palette (`_tokens.scss`). AA needs 4.5:1 for text and 3:1 for the boundary of a control.

| Pair | Light | Dark |
| --- | --- | --- |
| Text (`foreground`) on `background` | 14.7 | 16.2 |
| `muted-foreground` on `background` | 5.7 | 7.8 |
| `muted-foreground` on `accent` (secondary button hovered) | 4.4 (just under) | 6.0 |
| White on `primary` | 9.4 | 6.6 |
| Primary button text as built (`primary-foreground` = the page background) on `primary` | 9.4 | **2.7** |
| White on `danger` (destructive button) | 4.8 | 4.8 |
| `danger` text on `background` | 4.8 | 3.8 |
| `FormError` (red-500) on `background` | **3.8** | 4.8 |
| `HealthBadge` green / yellow / red on its 15% tint | **2.0 / 1.7 / 3.1** | 6.2 / 7.1 / 4.2 |
| Field border (`border`) on `background` | 1.3 | 1.4 |
| Field border on hover / checkbox border (`border-strong`) | 1.8 | 2.1 |
| Focus ring (`primary`) on `background` | 9.4 | 2.7 |

White on the accent for the other Appearance color themes ([features/appearance.md](features/appearance.md)), light / dark: Plum 12.1 / 9.2, Rose 8.9 / 6.1, Crimson 9.3 / 6.5, Ember 7.0 / 4.6, Moss 4.3 / **2.6**. Moss in dark mode is the one color where today's dark text on the accent (6.9) is better than white.

## Findings and where they went

Small bugs found were fixed only if clearly bugs and testable. Nothing in the controls' scripts was a clear bug. Missing tests for `Modal`, `ConfirmDialog`, `PromptDialog` and `ToastRegion` were added (`Modal.test.tsx`, `Toast.test.tsx`). The rest are backlog files, each with its numbers:

| | Finding | Backlog file |
| --- | --- | --- |
| A | Primary button text, the selected day and the avatar letter are dark on blue in dark mode (2.7:1) | [primary-button-text-contrast-in-dark-mode](backlog/primary-button-text-contrast-in-dark-mode.md) |
| B | Error text, health badges and field borders under contrast minimums | [contrast-fixes-for-error-text-badges-and-field-borders](backlog/contrast-fixes-for-error-text-badges-and-field-borders.md) |
| C | `@include dark` follows only the OS, not the Appearance setting | [dark-mixin-follows-explicit-theme](backlog/dark-mixin-follows-explicit-theme.md) |
| D | Touch targets: menu items, ghost buttons, toast dismiss | [touch-targets-for-menu-items-ghost-buttons-and-toast-dismiss](backlog/touch-targets-for-menu-items-ghost-buttons-and-toast-dismiss.md) |
| E | A modal taller than the screen cannot scroll | [modal-scrolls-on-short-screens](backlog/modal-scrolls-on-short-screens.md) |
| F | Field errors are not linked to their inputs (`aria-invalid`, `aria-describedby`) and there is no label/hint/error wrapper | [form-field-errors-linked-to-inputs](backlog/form-field-errors-linked-to-inputs.md) |
| G | `Menu` has no type-ahead, roving tab stop or viewport fit | [menu-viewport-fit-and-typeahead](backlog/menu-viewport-fit-and-typeahead.md) |
| H | Toasts disappear while being read or focused | [toast-pause-on-hover-and-focus](backlog/toast-pause-on-hover-and-focus.md) |
| I | `Select`'s list has no name; option groups and `multiple` are dropped | [select-listbox-name-and-option-groups](backlog/select-listbox-name-and-option-groups.md) |
| J | Volta tokens are three behind Volta `HEAD` | [resync-volta-tokens-to-current-volta](backlog/resync-volta-tokens-to-current-volta.md) |
| K | No tests for Select Home/End, type-ahead, Escape, click-outside or Modal focus and Escape | [keyboard-regression-tests-for-select-and-modal](backlog/keyboard-regression-tests-for-select-and-modal.md) |
| M | Escape on a date picker or menu inside a modal may close the modal too (suspected from Radix's source, not run) | [escape-closes-only-the-open-popup-inside-a-modal](backlog/escape-closes-only-the-open-popup-inside-a-modal.md) |
| L | What Volta needs before Inertia can import it | [volta-packaging-for-inertia](backlog/volta-packaging-for-inertia.md) |

## Not verified

No `npm install` is possible here, so `npm run lint`, `tsc -b`, the real Jest suite and the production build were not run; the gallery was not opened in a browser, at 375px or in either theme; no Safari, Firefox or screen reader check. The new tests were run in an offline stand-in (the sibling Volta checkout's Jest, React and Testing Library with stubs for Radix Dialog/Popover, `lucide-react` and `zustand`), which does not emulate Radix focus or Escape handling. Contrast numbers are calculated, not measured on screen. The Swift side was only read.
