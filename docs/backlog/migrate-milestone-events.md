---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Decide and migrate milestone-type calendar events

## Objective
Remove the duplicate concept: calendar events with `event_type = milestone` and the `milestones` table both describe milestones.

## Context
`Event` has `event_type` deadline or milestone, still created from the Events page (default type milestone). The `Milestone` model, rollups and Gantt diamonds use only the `milestones` table, so an event milestone has no progress or health.

## Requirements
- Decide whether to migrate existing milestone events into `milestones` or keep both.
- If migrating: a data migration that creates a Milestone (title, description, target date from the event date, folder) per such event, and a plan for the Events page.

## Acceptance criteria
- The decision is written in `docs/features/milestones_and_rollups.md`.
- If migrated, every existing milestone-type event has a matching milestone and no data is lost; the migration can run twice without duplicates.
