---
priority: p2
depends_on: [local-task-file-initiative-and-milestone-levels]
components: [macos]
---
# Mac screens for Initiatives and Milestones in a local task file

## Objective

Let a person create, edit, link and delete Initiatives and Milestones in the Mac app's local `.inertia-tasks` editor, now that the file format and model hold them.

## Current state

`InertiaCore` reads, validates and writes `initiatives` and `milestones` (see `docs/features/local_task_file_planning.md`), with inheritance and progress helpers on `TaskFile`. The SwiftUI local editor has Workboard, List, Sprints, Epics and Milestones (milestone-type events) views and nothing for the planning levels. The online workspace in the Mac app already has the Initiatives and Milestones pages, because it is the web app in a WKWebView.

## Requirements / notes

- Add planning views to the local editor under `macos/Sources/Inertia/Components/Screens/` using the shared native controls, not a new layout.
- Epic editor gains an Initiative and a Milestone picker; the task editor gains a Milestone picker showing the inherited one when none is set.
- Show progress from `TaskFile.progress(milestoneID:)` and `progress(initiativeID:)`.
- Label the planning Milestone so it is not confused with a milestone-type Event (the file keeps both).
- Decide with Alex whether the existing "Milestones" view should show both kinds.

## Acceptance criteria

- Initiatives and Milestones can be created, edited, linked to epics, tasks and each other, and deleted from the local editor; deleting clears references (already in the model).
- A file edited this way still opens in the model tests.
- `swift build` of the app target and the Swift tests pass on a Mac with Xcode; the feature doc and `macos/README.md` are updated and this file is removed.
