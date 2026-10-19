---
priority: p2
depends_on: []
components: [frontend, backend]
---
# Start and close sprints, carry over unfinished tasks

## Objective
Starting and closing a sprint are actions with consequences, and unfinished tasks move on instead of staying behind in a closed sprint.

## Context
`sprints.status` is planned, active or done, edited through a plain dropdown on the Sprints page. Nothing enforces that one sprint is active or touches the sprint's tasks when it ends.

## Requirements
- A Start action sets a planned sprint to active (and fills a missing start date with today).
- A Close action sets it to done and asks where unfinished tasks go: another sprint, or no sprint.
- Report how many tasks were completed and carried over.

## Acceptance criteria
- Closing moves every non-done task of the sprint to the chosen sprint (or clears `sprint_id`) in one request; done tasks stay.
- A closed sprint cannot be started again.
- Behaviour is covered by a backend test, and failures show an error in the UI.
