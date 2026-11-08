---
priority: p1
depends_on: [local-task-file-initiative-and-milestone-levels, native-macos-online-gantt]
components: [macos]
---
# Local task-file screens use Volta's colors

## Objective

The native local task-file screens use `Volta` colors instead of system colors, finishing `native-macos-volta-colors` (which converted the shared controls and the login screen).

## Requirements / notes

Replace the system colors in `Components/Screens/TaskFileView.swift`, `PlanningViews.swift`, `FileUsersView.swift` and `Components/Editors/TaskEditors.swift` (and any editor or screen added since):

- `.foregroundStyle(.secondary)` becomes `Volta.mutedForeground`, and `.primary` on task titles becomes `Volta.foreground`.
- Task card backgrounds `.background(.background, ...)` become `Volta.card`; column and comment backgrounds `.quaternary.opacity(0.4)` become `Volta.muted`.
- Search for `.secondary`, `.primary`, `.red`, `.quaternary`, `Color.accentColor` in `macos/Sources/Inertia` to find every remaining one; none should be left outside `VoltaColors.swift`.

This was split out so the change does not conflict with the work rewriting those screens; do it after that work has merged.

## Acceptance criteria

- No system colors are left in the local task-file screens and editors; they look the same as the login screen's tokens in light and dark.
- `docs/features/native_macos_volta_colors.md` drops its "task-file screens not converted" limit.
- This file is removed.
