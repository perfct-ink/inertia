---
priority: p0
depends_on: []
components: [frontend, backend]
---
# Key result check-in history

## Objective
Keep a dated history of each number key result's value so progress over a period can be reviewed.

## Context
A number key result stores only `current_value`; updating it on `/okrs` overwrites the previous value, so there is no record of how it moved.

## Requirements
- A `key_result_check_ins` record (key result, value, optional note, author, timestamp) created whenever the current value is updated, and `current_value` follows the latest check-in.
- API to list a key result's check-ins.
- UI on the key result to add a check-in with a note and to view the history.

## Acceptance criteria
- Updating a key result's value adds a check-in and the earlier ones remain listed in order.
- Deleting a key result deletes its check-ins.
- Check-ins of another Space's key result are not readable (404).
- Model and controller tests cover creation, ordering and isolation.
