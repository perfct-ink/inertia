---
priority: p0
depends_on: []
branch: backlog/native-macos-online-gantt
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

## Blocked
The "current state" above is stale: nothing in `macos/README.md` names the Gantt as a future stage, and the Mac app's online mode loads the React workspace in a WKWebView, so the Gantt tab already runs there with the same API (documented in `docs/features/gantt_scheduling.md`, Mac app). A separate native SwiftUI Gantt would contradict `docs/rules/ui-organization.md`, so none was built.
Left in place because it needs a person: build and open the Mac app (`make mac-build`, needs Xcode) and confirm the Gantt tab works in the WKWebView (drag, dependency modes, export); and answer the open question (is the web Gantt in the Mac shell enough?). If yes, delete this file.
