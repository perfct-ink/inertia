---
priority: p2
depends_on: []
components: [backend, frontend]
---
# Resource planning: time off and holidays

## Objective

Let a person's capacity change for a week: days of leave and Space-wide holidays reduce the hours they can be allocated, so the Resources page warns before someone on leave is over-allocated.

## Current state

`workspace_memberships.weekly_capacity_hours` is one number for every week (`docs/features/resource_management.md`). A person on leave for a week can only be modelled by editing the number back and forth.

## Requirements / notes

- Time off per person (start date, end date, optional note) and Space holidays (date range), managed by admins and owners; a member may ask to record their own leave if the product call is made to allow it.
- The week's capacity is the weekly capacity minus the share of the working week that falls in leave or holidays (decide whether a day is one fifth of the week or capacity divided by the person's working days).
- Resources People tab shows the reduced capacity and why ("2 days off").
- Keep the pure calculation in `frontend/src/data/resource.ts` next to `personLoads`.

## Acceptance criteria

- A week with leave shows lower capacity and warns when the allocated hours exceed it.
- Failed API calls show an error; works at 375px and in dark mode.
- Tests cover the calculation and the API; the feature doc `docs/features/resource_management.md` is updated and this file is removed.
