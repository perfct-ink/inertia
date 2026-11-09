# Component gallery

A development-only page, `/styleguide`, that shows every shared control from `frontend/src/components/ui/` in its states, once in a light panel and once in a dark panel side by side. It is the visual half of the Volta parity work; the component inventory, the Volta version and the keyboard, accessibility and narrow-layout findings are in [../volta_parity.md](../volta_parity.md).

## What it does for users

Developers (and Alex) open `http://localhost:5174/styleguide` in the dev server (`make dev` or `docker compose up`) and see, in sections: Colors (the theme tokens), Buttons (primary, secondary, ghost, destructive and unstyled, each enabled, disabled and with the keyboard focus ring, plus links drawn as buttons), Fields (text, number, password, disabled, focused, invalid with its `FormError`, checkbox and radio states, text areas), Select, Date picker (empty, with a date, limited by `min`/`max`, disabled, read-only), Menu (with checked items, a hint and a divider), Dialogs (modal, wide modal, confirm, destructive confirm, prompt), Feedback and status (`FormError`, an error toast button, `HealthBadge`, the seven `StatusDot` colors) and Attachment card (PDF, audio with player, selected with Remove, unavailable). A "Panel width" select narrows the panels to 375px for a phone-sized look at the inline controls. Hover states are the real ones (hover a control); focus states are drawn by a `styleguide-state--focus` class that reuses the `focus-ring` mixin.

It is not a product page: it is not linked from the app, needs no sign-in, calls no API and is not part of a production build.

## How it works

- `frontend/src/view/styleguide/StyleguideScreen.tsx` (root class `view-styleguide`, page title "Component gallery"), `examples.tsx` (one example component per section, and the `SECTIONS` list), `StyleguideScreen.scss` (in the `view` layer, descendants named `styleguide-*`).
- Every section renders the same examples in two `data-theme` panels (`light` and `dark`), each a `role="group"` named "<Section>, <theme> theme". Examples are real components with their own state, so each panel is interactive.
- `frontend/src/styles/_theme.scss` makes the panels work: its light, dark and semantic color values live in mixins, and `[data-theme='light']` and `[data-theme='dark']` re-declare them on any element, so a panel gets its own tokens whatever the page's theme is. (Custom properties that point at other properties are resolved where they are declared, so a wrapper has to declare them again.) The `:root` output of the theme is unchanged.
- `App.tsx` registers `/styleguide` only when `process.env.NODE_ENV !== 'production'`, with `React.lazy`. The project builds with webpack, not Vite, so there is no `import.meta.env.DEV`; webpack replaces `process.env.NODE_ENV` at build time and drops the route and the gallery's chunk from production bundles.

## Who can view and change

Anyone who can run the development build. There is no data and no permission.

## Tests

- `frontend/src/view/styleguide/StyleguideScreen.test.tsx`: the root class and title, a light and a dark panel for every section, each control in its states in both themes (variants enabled and disabled, field states, select and date states, menu, dialog buttons, health and status marks, attachment card, colors), opening a select list and a confirm dialog, the toast button pushing a notice, and the panel width control.
- `frontend/src/components/ui/Modal.test.tsx` and `Toast.test.tsx` (new): `Modal`, `ConfirmDialog`, `PromptDialog` and `ToastRegion`, which had no tests.

## Known limits

- Popups open over the page, not inside a panel: select lists, the date picker's calendar (outside a dialog), dialogs and the toast region are portalled to `<body>` and use the page's own theme. Switch the page's theme in Account, then Appearance, to see them in the other one.
- The "Panel width" control narrows the panels, not the window: media queries (`pointer: coarse`, the `md` and `lg` breakpoints), calendars, lists and dialogs follow the real window, so resize the window to 375px to check those.
- Hover cannot be shown statically; a few states (a half-typed date, an open list) need a click.
- A light panel on a page whose OS preference is dark gets light tokens, but the few stylesheets written with `@include dark` (the toast) follow the OS, not the panel ([backlog/dark-mixin-follows-explicit-theme.md](../backlog/dark-mixin-follows-explicit-theme.md)).
- Appearance colour themes set the accent inline on `<html>`; a panel re-declares the Inertia accent, so the gallery always shows the default colour theme.

## History

- Implemented 2026-11-03 on branch `backlog/volta-component-mapping-and-parity` (not merged, not deployed).
- Not implemented: component usage snippets or prop tables, a screenshot test, a gallery for components outside `components/ui/` (the sidebar, editors), and the audit follow-ups, which are separate backlog files listed in [../volta_parity.md](../volta_parity.md).
- Not verified: `npm run lint`, `tsc -b`, the real Jest suite and a production build were not run (no `node_modules`), and the gallery was not looked at in a browser, at 375px or in either theme. The new tests ran in an offline stand-in (the sibling Volta checkout's Jest, React and Testing Library with stubs for Radix Dialog/Popover, `lucide-react` and `zustand`) and passed; the `_theme.scss` change was compiled with Sass and its `:root` output compared with the old one.
