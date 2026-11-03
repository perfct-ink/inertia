---
priority: p2
depends_on: []
components: [frontend]
---
# Make `@include dark` follow the Appearance setting

## Objective

`@mixin dark` in `frontend/src/styles/_tokens.scss` is only `@media (prefers-color-scheme: dark)`. The theme tokens follow the OS until `data-theme` is set on `<html>` (Appearance: Light or Dark), but anything written with `@include dark` ignores that: with Appearance set to Dark on a light OS the error toast stays pale red, and with Light on a dark OS it turns dark on a light page. It is used by `components/ui/Toast.scss`, `components/file-manager/_file_manager.scss` (`danger_hover`) and `view/events/EventsScreen.scss` (four places).

## Requirements / notes

- Make the mixin emit two rules with no change in specificity: `:where(:root:not([data-theme])) &` inside the media query, and `:where([data-theme='dark']) &`. Volta's own backlog (`docs/backlog.md`, "Fix the `dark` mixin") lists the same fix.
- Better, move each use onto tokens (a danger background and text token) so the mixin can be deleted; the toast would use danger colors in both themes.
- Compile the stylesheets before and after and diff the output, and check the toast, the sidebar delete hover and the Events chips in light and dark with the OS in each mode.
- A light panel inside a dark page (the gallery's `data-theme="light"` panels with the OS in dark mode) is not covered by selectors; tokens are.

## Acceptance criteria

- Toast, Events chips and the file-manager delete hover follow the Appearance choice in every combination of OS and setting.
- Feature doc updated (appearance.md) and this file removed.
