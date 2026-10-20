---
priority: p0
depends_on: []
branch: backlog/native-macos-online-gantt
status: incomplete
components: [macos, backend]
---
# Native macOS online Gantt

## Objective

Native macOS online Gantt

## Current state

Named a future stage in `macos/README.md`

## Requirements / notes

Same API as web.

## Open question

Does the Gantt / roadmap need to ship in the macOS online mode at the same time as the web? (From the retired shared backlog.)

## Context

Section "Gantt chart" of the retired shared backlog.

## Acceptance criteria

- Native macOS online Gantt works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Checked 2026-11-07 against the current code. Nothing was built for the Gantt itself, on purpose:
- The "current state" above is stale. `macos/README.md` does not name the Gantt as a future stage. The Mac app's online mode loads the React workspace in a WKWebView (`WorkspaceWebView.swift`), with the same API and route list, so the folder Gantt, the Epics and Initiatives timelines and the Roadmap already run there (`docs/features/gantt_scheduling.md`, Mac app). A separate native SwiftUI Gantt would contradict `docs/project/ui-organization.md` (reuse the online workspace; no second native layout) and duplicate the API client, so none was built.
- The open question is answered by that: the Gantt and roadmap ship in the Mac online mode at the same time as the web, because it is the web app.
- Found while checking: Export PNG and Print from the Gantt do nothing in the Mac shell (blob download cancelled by the navigation policy, `window.print()` not handled). That is shell work, not Gantt work, so it is its own task: `docs/backlog/mac-shell-downloads-and-print.md`. Until it lands, "works as described" holds for viewing, dragging, dependencies, modes and baselines, not for export.
- Docs updated: the Mac app section and a known limit in `docs/features/gantt_scheduling.md`, and `macos/README.md`. No app code, test or migration changed.

Ran: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` (passes; the branch changes no Swift). Not run: the Mac app (the SwiftUI target needs full Xcode, which is not installed here), `swift test`, a browser.

This file stays until a person has opened the Mac app and confirmed the Gantt works inside it. To verify on a Mac with Xcode:

```sh
make mac-build
open -n macos/dist/Inertia.app   # sign in, open a project, Epics > Gantt
```

Check dragging a bar and its edges, a dependency link in each mode, saving a baseline, the zoom buttons, and that Export PNG and Print are the known gap. If all but export work, delete this file once `mac-shell-downloads-and-print` is merged.
