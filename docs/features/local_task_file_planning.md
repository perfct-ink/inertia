# Local task file: initiatives and milestones

## What it does
The `.inertia-tasks` file format (see `docs/task-file-format.md`) can hold the hosted app's planning hierarchy, **Milestone > Initiative > Epic > Task**: optional `milestones` and `initiatives` root arrays, `milestone_id` on tasks and epics, `initiative_id` on epics and `milestone_id` on initiatives. A task inherits its milestone from its epic, and an epic from its initiative. Progress per milestone and initiative is counted from done tasks. The fields mirror the Rails columns (`status` planned/active/done, `horizon` now/next/later, owner, dates), so a later import can map them one to one.

This is the file format and its model only. The Mac app has no screens yet to create or edit initiatives and milestones; files made by hand or by other tools open, validate and round-trip.

## Compatibility
The version stays 4. The new arrays are omitted when empty, so a file that does not plan is byte-identical in shape to before. A file that does plan is rejected by earlier version 4 builds ("Unrecognized file fields"), not silently stripped.

## Who can view and change
Local files only; whoever has the file.

## Tests
`macos/Tests/InertiaCoreTests/PlanningLevelsTests.swift` (round trip, omission when unused, inheritance, progress, removal, validation, unknown fields).

## Known limits
No editing UI; no sync with the hosted app. The two kinds of "milestone" (planning Milestone and milestone-type Event) coexist in a file.

## History
- Implemented 2026-10-19 on branch `backlog/local-task-file-initiative-and-milestone-levels`; not merged.
- Verified: `swift build --target InertiaCore -warnings-as-errors`; the new tests' assertions ran through a stand-in runner (all pass), as did reading and round-tripping `examples/Launch.inertia-tasks` and the v3 fixture. Not run: XCTest (`swift test` needs XCTest, which is missing), the SwiftUI app target (needs full Xcode), lint.
