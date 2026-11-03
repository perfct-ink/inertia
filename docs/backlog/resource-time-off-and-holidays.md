---
priority: p2
depends_on: [resource-capacity-management]
components: [backend, frontend]
branch: backlog/resource-time-off-and-holidays
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

## Blocked

Built on branch `backlog/resource-time-off-and-holidays` but not merged: the project's own checks could not run here (no network, `node_modules`, database or usable bundle), and the product call below is Alex's.

**Product call (Alex).** The conservative option was built and is written in `docs/features/resource_management.md`:
- A day off is **one fifth of the weekly capacity** over a Monday to Friday week (40 h with two days off is 24 h), not capacity divided by the days a person usually works.
- **Only admins and owners** record time off and holidays; members cannot record their own leave (to allow it, relax the manage check in `Api::V1::TimeOffsController` for rows whose `user_id` is the signed-in user).
- Leave **notes** are only sent to admins and owners, since a reason for leave can be private.

**Done.** Migrations `20261103030001_create_time_offs` and `20261103030002_create_holidays` (`schema.rb` edited by hand, `version:` left at `2026_11_03_120001`), models `TimeOff` and `Holiday` (shared `DayRange`), `AdminManagedList` controller concern, `/api/v1/time_offs` and `/api/v1/holidays`, locale names, Minitest tests, `weekOff`/`weekCapacity` and `personLoads(..., absences)` in `frontend/src/data/resource.ts` with tests, `api/timeOffs.ts` and `api/holidays.ts`, the People tab showing the reduced capacity and "N days off" with the reason, and a Time off tab on the Resources page (holidays and leave: list, add, edit, remove).

**Ran (stand-in runners only).** `ruby -c` on the Ruby files, Sass compile, the parse/import/undefined-name check, `frontend/src/data/resource.test.ts` in the data-test shim (44 passed), `ResourcesScreen.test.tsx` under the stand-in Jest (15 passed).

**Did not run.** `rails test`, `rails db:migrate`, `npm run lint`, `tsc -b`, the project's own Jest run, a browser check at 375px and desktop in light and dark. The `CalendarOff` icon was not checked against the installed `lucide-react`.

**To verify and merge.**
1. `cd backend && rails db:migrate`, then check `git diff backend/db/schema.rb` is empty (it was edited by hand: tables `holidays` and `time_offs`, their indexes and foreign keys), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
3. In a browser, open `/resources` as an owner and as a member: add a holiday and leave on the Time off tab, check the People tab week cells show the lower capacity, "N days off" and the reason, and an over-allocated week warns; check 375px and dark mode.
4. Merge, then delete this file (the feature doc is already updated).
