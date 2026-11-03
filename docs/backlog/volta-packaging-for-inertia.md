---
priority: p3
depends_on: []
components: [frontend]
---
# Volta: what must exist before Inertia can import its components

## Objective

Record and drive the work, mostly in the Volta repository (github.com/kriogenx0/volta), that [adopt-volta-components-in-react](adopt-volta-components-in-react.md) needs. The reasons are in `docs/volta_parity.md` ("Why Volta's components are not imported" and "What importing would take").

## Requirements / notes

- A `prepare` script (`vite build`) so a Git dependency has its built `main`, or a published private package; and a lockfile story (Volta's `.npmrc` sets `package-lock=false`).
- CSS as a file wrapped in `@layer libraries`, not injected from JavaScript (unlayered injected styles beat Inertia's `app` and `view` layers); or SCSS entry points per component for Inertia to `@use` inside `@layer libraries`.
- Replace `defaultProps` in the 42 component files that still use it (React 19 ignores it on function components, so `Dialog`, `ModalDialog` and `Dropdown` lose their defaults).
- Per-component entry points or ES modules (the UMD bundle includes all 92 components with TinyMCE, Quill and `moment`).
- Theme coverage for the components Inertia would wrap (Volta's coverage note lists about 15 that follow the tokens).
- In Inertia: the dependency pinned to a commit, Docker (`node:22-slim` needs `git`) and CI install and build, a `declare module` or typed wrappers in `components/ui`, a Jest mapper for the CSS.
- Keyboard, focus and ARIA parity: Volta's `Modal`, `Dialog`, `Dropdown`, `ActionMenu` and `DatePicker` have no Escape, arrow keys or focus trap; Inertia's equivalents must not regress.

## Acceptance criteria

- A one-component spike (`Button`) imported from a pinned Volta build into `components/ui/Button.tsx` passes the existing control tests, renders in the gallery in both themes, and passes `npm run build` in CI and Docker; the result and the bundle-size change are written in `docs/volta_parity.md`.
- This file is removed.
