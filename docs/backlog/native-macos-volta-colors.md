---
priority: p1
branch: backlog/native-macos-volta-colors
depends_on: []
components: [macos, frontend]
---
# Native macOS SwiftUI screens (login, local task files) use Volta's colors

## Objective

Native macOS SwiftUI screens (login, local task files) use Volta's colors

## Requirements / notes

They use system colors today.

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Native macOS SwiftUI screens (login, local task files) use Volta's colors works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch; see `docs/features/native_macos_volta_colors.md`. To verify, on a Mac with Xcode: `cd macos && swift test` (runs `VoltaPaletteTests`), `swift build`, then open the app and the login and task-file screens in light and dark appearance. Then remove this file and merge.
