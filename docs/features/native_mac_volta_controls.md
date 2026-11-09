# Native macOS Volta controls

## What it does
The native Mac screens (sign-in and sign-up, the local task-file window and its editors) look like the web app: the same blue theme in light and dark, the same 4pt corners, 150ms state changes, SF Pro type, and the same buttons, text fields, selects, checkboxes and error messages as the Volta-backed React components. They replaced the system colors, `Picker`, `GroupBox` and bordered/plain button styles the screens used before. The online workspace is unchanged: it is the React app in a web view, which already uses Volta.

What people see:
- **Buttons** in four variants: primary (accent, darker on hover), secondary (bordered card, one shade firmer on hover), ghost (compact, tinted on hover) and destructive. Primary, secondary and destructive are at least 40pt tall; a disabled button fades to half and ignores hover; a keyboard-focused button gets the accent ring.
- **Text fields and text areas** are at least 40pt tall (the sign-in fields stay at 52pt), with a quiet border that firms up on hover and turns accent, with a ring, on focus. A field with a bad value (a date that is not `YYYY-MM-DD`) turns its border danger red and shows the message under it; the message is also announced to VoiceOver, so the error is not shown by color alone.
- **Selects** replace pop-up `Picker`s: a bordered field with a chevron that opens the system menu, so keyboard and VoiceOver behavior stay native.
- **Checkboxes and radios** are 16pt boxes that fill with the accent color and show a white check or dot.
- **Cards and panels**: task cards on the board are clickable cards (the border firms up under the cursor), columns are muted panels, the "Events and milestones" group is a card panel, dividers use the border color.
- **Links**: row titles open their editor and turn accent on hover; "Already have an account? Sign in" is a quiet underlined link.
- **Sign-in card**: the logo, title, providers and form sit on a card (32pt padding, 4pt corners) over the muted page color, as on the web.

## How it works
- `macos/Sources/InertiaCore/` holds the values as plain, tested data, so the SwiftUI controls only translate them:
  - `VoltaPalette.swift`: Inertia's theme (`frontend/src/styles/_theme.scss`) as light and dark HSL tokens, plus `VoltaFill` (a token, a fixed color such as the error red, or a darkened token for the destructive hover) that resolves to RGBA for either appearance.
  - `VoltaMetrics.swift`: radius, 150ms duration, 40pt minimum height, field padding, focus ring, the type scale (`xs` 12 to `3xl` 30 with line heights) and font weights.
  - `VoltaControls.swift`: `VoltaButtonSpec`, `VoltaLinkSpec`, `VoltaFieldSpec` (hover, focus, invalid, disabled), `VoltaCheckableSpec`, `VoltaSurfaceSpec` (card, muted, clickable card), `SelectOption` and `SelectChoices` (select options built from task-file records). `ISODate.swift` is the one `YYYY-MM-DD` check, shared by task-file validation and the date fields.
- `macos/Sources/Inertia/Components/` holds the SwiftUI controls (shared controls at the root):
  - `VoltaColors.swift`: `Volta.*` colors that follow the system appearance, and the view helpers `voltaFont`, `voltaMuted`, `voltaCaption`, `voltaFocusRing`, `voltaSurface`, `voltaWindow`, `voltaList`, `voltaAuthCard` and `voltaTheme` (accent tint plus the text field and checkbox styles for a whole window; `InertiaApp.swift` applies it to the workspace window and the task-file window).
  - `VoltaButtonStyle.swift`: `.buttonStyle(.volta(.primary | .secondary | .ghost | .destructive, fullWidth:))`, `.voltaLink` / `.voltaLink(.title)` and `.voltaCard`.
  - `VoltaField.swift` (`VoltaFieldFrame`, `VoltaTextArea`, `.voltaInvalid()`), `TextFieldStyle.swift` (`InertiaTextFieldStyle`, now the Volta field), `VoltaSelect.swift`, `VoltaCheckable.swift` (`VoltaCheckboxToggleStyle`, `VoltaRadioGroup`), `VoltaPanel.swift` (`VoltaPanel`, `VoltaDivider`).
  - The existing shared components use them: `EditorSheet`, `EditorActions`, `DoneButton`, `RefreshButton`, `OptionalTextField` (with a `FieldRule`, today `.isoDate`), `NotesEditor`, `ValidationMessage`, `CompletionProgress`, `ProviderSignInButton`, `AuthDivider`, `TaskCommentsView`.
- Screens converted: `Screens/LoginView.swift`, `TaskFileView.swift` (header, filters, board, list, sprints), `PlanningViews.swift` (epics, events), `FileUsersView.swift`; editors `TaskEditor`, `SprintEditor`, `ColumnEditor`, `EpicEditor`, `MilestoneEditor`, `FileUserEditor`.
- Keep the palette in step with the web theme: `VoltaControlsTests.testPaletteMatchesTheWebThemeStylesheet` reads `_theme.scss` and fails when a token differs.

## Who can view and change
Anyone who opens the Mac app; nothing here touches accounts, data or the API. Colors follow the macOS appearance (light or dark) of the system.

## Tests
`macos/Tests/InertiaCoreTests/VoltaControlsTests.swift` (palette against the stylesheet, color conversion, metrics, type scale, every button, link, field, checkbox and surface state, hover never changes size, select options and choices) and `ISODateTests.swift`. SwiftUI views themselves have no tests: there is no UI test target.

## Known limits
- The segmented "View" switch on the task-file window, the window toolbar, context menus, the `List` selection and scroll bars, and system alerts (`appErrorAlert`) are native macOS controls and keep the system look; only their tint and surrounding colors follow Volta.
- Icons are SF Symbols, the Mac equivalent of the web's lucide icons, not the same glyphs.
- The native app follows the system light/dark setting. The web app's own Light/Dark/System choice (Appearance) applies only inside the web view.
- `VoltaRadioGroup` is built and tested but no current screen uses a radio group.
- The sign-in fields stay 52pt tall (a deliberate larger target from the earlier login screen); the web's are 40pt. Everywhere else fields are 40pt.
- No visual regression test: the look was derived from the stylesheets and unit-tested as values, but not compared pixel by pixel with the web.

## History
- Implemented 2026-11-09 on branch `backlog/native-macos-volta-parity-components`, merging the 2026-11-09 groom of `native-macos-volta-colors` (screens move from system colors to Volta's tokens with Inertia's on top). Not merged, not deployed.
- Continues the 2026-11-02 work-in-progress on this branch (controls, specs, tests), re-based on current main. That version used a teal palette; the web theme is blue, so the palette was corrected and a test now reads the stylesheet. The sign-in/sign-up screen, the task-file window, the planning lists, the users sheet and the task, sprint and column editors were converted in this pass.
- Verified: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` passes; every file of the SwiftUI app target type-checks with `swiftc -typecheck` against the built `InertiaCore` module (with `@State` swapped for a same-shaped wrapper, since the SwiftUI macro plugin ships only with Xcode); `VoltaControlsTests`, `ISODateTests` and `RequestsTests` ran and passed under a small XCTest stand-in compiled with `InertiaCore`.
- Not verified: `swift test` (no XCTest here), the SwiftUI app build, and how any screen looks or behaves when run (hover, focus ring, select menus, dark mode, keyboard use, VoiceOver): all need Xcode and a Mac session.
