# Local task file: initiatives and milestones

## What it does
The `.inertia-tasks` file format (see `docs/task-file-format.md`) can hold the hosted app's planning hierarchy, **Milestone > Initiative > Epic > Task**: optional `milestones` and `initiatives` root arrays, `milestone_id` on tasks and epics, `initiative_id` on epics and `milestone_id` on initiatives. A task inherits its milestone from its epic, and an epic from its initiative (the same rule as `MilestoneRollup` in the backend). Progress per milestone and initiative is counted from done tasks. The fields mirror the Rails columns (`status` planned/active/done, `horizon` now/next/later on initiatives and epics, `position`, `folder_id`, owner, dates), so an object from the hosted API opens in a file as is and a later import can map them one to one.

This is the file format and its model (`macos/Sources/InertiaCore/`) only. The Mac app has no screens yet to create or edit initiatives and milestones; files made by hand or by other tools open, validate and round-trip. The online workspace in the Mac app is the web app in a WKWebView, so it already has the Initiatives and Milestones pages; only the local file lacks screens (follow-up: `docs/backlog/local-task-file-planning-screens.md`).

## Compatibility
The version stays 4. The new arrays are omitted when empty, so a file that does not plan is byte-identical in shape to before. A file that does plan is rejected by earlier version 4 builds ("Unrecognized file fields"), not silently stripped. `horizon` and `position` on an epic count the same way: an epic that carries them is not readable by an earlier build.

## Who can view and change
Local files only; whoever has the file.

## Tests
`macos/Tests/InertiaCoreTests/PlanningLevelsTests.swift` (round trip, omission when unused, inheritance, progress, removal, validation, hosted-API columns, unknown fields).

## Known limits
- No editing UI; no sync with the hosted app (no automatic import, as for the rest of the format).
- The two kinds of "milestone" (the planning Milestone and a milestone-type Event) coexist in a file.
- Initiative progress counts tasks under its epics only. The hosted app also counts tasks in documents that name the initiative (`Initiative#rolled_up_tasks`); a file has no documents.
- `health` and the rollup counts of the hosted milestone and initiative are not stored; the file computes progress from its tasks.

## History
- Implemented 2026-10-19 on branch `backlog/local-task-file-initiative-and-milestone-levels`; not merged, not deployed.
- 2026-11-07: rebased onto `origin/main`. Checked against the backend: status and horizon values, the inheritance rule and the cascade on delete still match. Added the columns the hosted API gained since (`horizon` and `position` on epics, `position` and `folder_id` on initiatives).
- Verified 2026-11-07: `swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` passes. XCTest is not installed here, so all four test files (`PlanningLevelsTests`, `TaskFileTests`, `SharedEntityTests`, `RequestsTests`) were compiled against a small XCTest stand-in and every test ran and passed, including the bundled example and v3 fixture. Not run: `swift test`, the SwiftUI app target (needs full Xcode), lint.
