# Native macOS Volta colors

## What it does
The native Mac login screen and the shared native controls use the same colors as the web app's Volta theme (Inertia's default blue theme) instead of system colors: blue accent for tint, focus rings and the link and prominent buttons, Volta's muted text, borders and danger red, and the base surface behind the login form. They follow the system light or dark appearance.

The local task-file screens (`TaskFileView`, `PlanningViews`, `FileUsersView` and the editor forms in `Editors/`) are not converted yet, on purpose: another change is rewriting those screens, so touching them here would only create merge conflicts. They pick up the tint and the shared controls automatically; their remaining system colors are listed in `docs/backlog/native-macos-volta-colors-task-file-screens.md`.

## How it works
- `macos/Sources/InertiaCore/VoltaPalette.swift`: the tokens (accent, accent hover, accent subtle, accent foreground, base and its three subtle steps, trim, trim subtle, danger, card) as light and dark HSL values copied from `frontend/src/styles/_theme.scss`, plus an HSL to RGB conversion that matches CSS. No SwiftUI, so it is testable.
- `macos/Sources/Inertia/Components/VoltaColors.swift`: `enum Volta`, dynamic SwiftUI `Color`s built with `NSColor(name:)` that pick the light or dark value from the current appearance.
- Used by `InertiaTextFieldStyle` (fill, border, focus ring), `LoginView` (muted tagline, base surface filling the window), `AuthComponents` (divider), `EditorComponents` (notes border, validation message, completion text) and `TaskCommentsView`; both app windows set `.tint(Volta.accent)`.

## Who can view and change
Appearance only.

## Tests
`macos/Tests/InertiaCoreTests/VoltaPaletteTests.swift` (HSL conversion, the blue accent, light/dark choice).

## Known limits
- The values are copied, not generated: change `_theme.scss` and `VoltaPalette.swift` together. The palette was teal when first written and was moved to blue on 2026-11-08 after the web theme changed on 2026-11-03.
- Only the default Inertia theme is mirrored. The web app's other colour themes (`docs/features/appearance.md`) and sidebar tints are not, and the Mac app has no theme picker.
- Radii, control heights and the Volta hover steps are not matched (see `docs/backlog/native-macos-volta-parity-components.md`). Buttons still use SwiftUI's bordered styles, tinted blue.
- Status colors (the web app's fixed blue/green/purple) are not used natively.
- The online Space screens are the React app in a web view and were already themed.
- The local task-file screens still use system colors (see above).

## History
- Implemented 2026-10-21 on branch `backlog/native-macos-volta-colors`, then rebased 2026-11-08: palette changed from teal to the current blue, login base surface added, the task-file screens left out. Not merged.
- Verified: `swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` passes. `swiftc -typecheck` passes for `VoltaColors`, `AuthComponents`, `EditorComponents`, `TextFieldStyle`, `Buttons`, `AppLogo`, `LoginView`, `Session`, `SocialSignIn` and `TaskCommentsView` (the `@State` files with `@State` swapped for a stand-in wrapper, since the SwiftUI macro plugin is missing).
- Not verified: `swift test` (`VoltaPaletteTests` was not run, no XCTest here), the SwiftUI app target build (needs Xcode), and how the screens look in light and dark.
