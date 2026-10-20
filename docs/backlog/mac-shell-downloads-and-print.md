---
priority: p1
depends_on: []
components: [macos]
---
# Mac app: downloads of generated files and printing

## Objective

Make anything the web app generates in the browser (a blob download, `window.print()`) work inside the Mac app's WKWebView, so the Gantt's Export PNG and Print, and any other generated export, are not silent no-ops.

## Current state

Found 2026-11-07 while checking `native-macos-online-gantt` by reading the code, not by running the Mac app:
- `WorkspaceWebView.Coordinator.webView(_:decidePolicyFor:decisionHandler:)` allows only the workspace page and subframes, opens linked http(s) addresses in the default browser and cancels everything else. A `blob:` address from an `<a download>` click (`frontend/src/util/ganttCanvas.ts`, `exportGanttPng`) is therefore cancelled; the page thinks the export worked and shows no error.
- There is no `WKDownloadDelegate`, so even an allowed download has no destination.
- `window.print()` (`frontend/src/util/printGantt.ts`) has no handler on the shell; `WKUIDelegate` has no print callback.

## Requirements / notes

- In `decidePolicyFor`, return `.download` for `action.shouldPerformDownload` when the address is a `blob:` or `data:` created by the workspace page (or same-origin), still cancelling other foreign addresses.
- Implement `navigationAction(_:didBecome:)` and a `WKDownloadDelegate` that asks for a destination with an `NSSavePanel` defaulting to the suggested file name, and shows an error if the download fails.
- Give `window.print()` a way out: inject a small user script that forwards it to a message handler and run `WKWebView.printOperation(with:)` (or save as PDF) from Swift.
- Keep the changes in `macos/Sources/Inertia/Components/WorkspaceWebView.swift` (or one small new file in that folder); no second native layout.
- Check whether other places in the web app rely on blob downloads or `window.print()` (the Gantt is the known one) and list them in the feature doc.

## Acceptance criteria

- In the Mac app, Gantt "Export PNG" saves `<folder name> gantt.png` where the person chooses, and "Print or save as PDF" opens the macOS print panel with only the chart.
- A failed download shows an error to the user.
- Cancelling the save panel is not an error.
- `docs/features/gantt_scheduling.md` (Mac app) and `macos/README.md` are updated and this file is removed. Needs a Mac with Xcode to build and check; the SwiftUI app target cannot be built in the offline environment.
