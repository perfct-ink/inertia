# Native macOS Volta colors

## What it does
The native Mac screens (login and the local task-file screens) use the same colors as the web app's Volta theme instead of system colors: teal accent for buttons, focus rings and tint, Volta's muted text, borders and danger red, and the card and column surfaces. They follow the system light or dark appearance.

## How it works
- `macos/Sources/InertiaCore/VoltaPalette.swift`: the tokens (accent, accent hover, accent subtle, accent foreground, base and its three subtle steps, trim, trim subtle, danger, card) as light and dark HSL values copied from `frontend/src/styles/_theme.scss`, plus an HSL to RGB conversion that matches CSS. No SwiftUI, so it is testable.
- `macos/Sources/Inertia/Components/VoltaColors.swift`: `enum Volta`, dynamic SwiftUI `Color`s built with `NSColor(name:)` that pick the light or dark value from the current appearance.
- Used by `InertiaTextFieldStyle` (fill, border, focus ring), `TaskFileView`, `PlanningViews`, `FileUsersView`, `LoginView`, `AuthComponents`, `EditorComponents`, `TaskCommentsView` and `TaskEditors`; both app windows set `.tint(Volta.accent)`.

## Who can view and change
Appearance only.

## Tests
`macos/Tests/InertiaCoreTests/VoltaPaletteTests.swift` (HSL conversion, light/dark choice).

## Known limits
- The values are copied, not generated: change `_theme.scss` and `VoltaPalette.swift` together.
- Radii, control heights and the Volta hover steps are not matched (see `docs/backlog/native-macos-volta-parity-components.md`). Buttons still use SwiftUI's bordered styles, tinted teal.
- Status colors (the web app's fixed blue/green/purple) are not used natively.
- The online Space screens are the React app in a web view and were already themed.

## History
- Implemented 2026-10-21 on branch `backlog/native-macos-volta-colors`. Not merged.
- Verified: `VoltaPalette.swift` compiles and its conversions were checked with a small `swiftc` program (white, red, green, blue, the teal accent); `Volta`-using files that don't use `@State` type-checked with `swiftc -typecheck`.
- Not verified: `swift test` (no XCTest here), a full app build (`@State` needs the SwiftUI macro plugin from Xcode), and how the screens look in light and dark.
