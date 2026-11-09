---
priority: p3
depends_on: [migrate-milestone-events]
components: [frontend, backend]
---
# Events page: stop offering the milestone event type

## Objective
Finish removing the duplicate milestone concept on the Events page, once the milestone-type events have been copied into `milestones` (see `docs/features/milestones_and_rollups.md`, Milestone-type calendar events).

## Context
`rails milestones:from_events` copies each milestone-type event into a Milestone and records `milestones.source_event_id`. The Events page still defaults new events to type Milestone, so new duplicates keep appearing. This is the plan the migration task left, not built yet.

## Requirements
- The New event form in `frontend/src/view/events/EventsScreen.tsx` no longer offers Milestone: the type defaults to Deadline, and because only one type is left the type picker is hidden (design principle 9, only show things of value). Keep the picker's code path only if another type is added.
- Existing milestone-type events keep their trophy icon and show a "Milestone" label in the list, the month chip tooltip and the event sidebar. In the sidebar, when a milestone has `source_event_id` equal to the event's id, link to `/milestones`. Expose `source_event_id` on `MilestoneBlueprint` (read only) and in `frontend/src/types/index.ts` for this.
- The API still accepts `event_type = milestone` so older clients keep working; no data is changed or removed.
- Works at 375px and in dark mode; the label is not a button and has no hover state.

## Acceptance criteria
- A new event can only be created as a deadline from the web app.
- Old milestone events are still listed, editable and deletable, labelled Milestone, and link to their milestone when one was copied.
- Tests cover the form (no Milestone option, event created as deadline) and the label and link.
