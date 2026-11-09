---
priority: p1
depends_on: []
components: [macos, frontend]
branch: backlog/native-macos-volta-parity-components
status: incomplete
---
# Native macOS components with iOS styling and React parity

## Objective

**Native macOS components with iOS styling and React parity**

## Requirements / notes

Create reusable SwiftUI controls in `macos/Sources/Inertia/Components/` that match the Volta-backed React components as closely as possible: typography, colors, spacing, sizing, icons, control variants, focus/disabled/error states and light/dark themes. Preserve native keyboard and accessibility behavior and the 40-point minimum for text fields. Apply them to native screens and editors; retain the shared React online layout/sidebar.

Merged in (Alex, 2026-11-09 groom): `native-macos-volta-colors.md`. The native SwiftUI screens (login, local task files) use system colors today; they switch to Volta's colors, with Inertia's own tokens on top, as part of this task.

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's blue palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Native macOS components with iOS styling and React parity works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built on branch `backlog/native-macos-volta-parity-components` (see `docs/features/native_mac_volta_controls.md`): Volta specs in InertiaCore (palette read against `_theme.scss` by a test, metrics, button, link, field, checkbox and surface states), SwiftUI controls in `Components/` (buttons, text field and text area, select, checkbox and radio, panel, divider, link, clickable card), and the sign-in screen, task-file window, planning lists, users sheet and all editors converted to them. The merged `native-macos-volta-colors` work (Volta colors instead of system colors, Inertia's tokens on top) is in the same change. The earlier work-in-progress on this branch used a teal palette and was corrected to the web's blue theme.

Ran here: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors`; a `swiftc -typecheck` of every SwiftUI app file against the built InertiaCore module (with `@State` swapped for a same-shaped wrapper); `VoltaControlsTests`, `ISODateTests` and `RequestsTests` under an XCTest stand-in compiled with InertiaCore.

Not run (no Xcode, XCTest or window session here), run these on a Mac with Xcode:
```sh
make test-native-mac            # VoltaControlsTests, ISODateTests, the existing suites
make build-mac                  # the SwiftUI app target
open macos/dist/Inertia.app
```
Then look at it next to the web app in light and dark mode (System Settings, Appearance): the sign-in card, a task file (File, New) with the Workboard, List, Sprints, Epics and Events views, the New Task, New Sprint, Users and Columns sheets, and an epic or event editor. Check hover on buttons, task cards and links; the focus ring when tabbing between fields, buttons and checkboxes; a bad date turning the field red with a message; select menus with the keyboard; VoiceOver reading selects, checkboxes and error messages; that no control changes size on hover or focus; and that the focus ring is not clipped inside forms and lists.

Open question for Alex: the segmented View switch, the toolbar and the system alert are still native macOS controls; a custom Volta tab control would be a follow-up if they should match the web exactly.
