---
priority: p3
depends_on: [retrospective-board-template]
components: [frontend, backend]
---
# Retrospective board: drag cards, vote limits and reveal mode

## Objective
Make a retrospective board work better as a live meeting, on top of the board that `retrospective-board-template.md` adds.

## Context
The first board (`docs/features/retrospective_boards.md`) moves cards with a picker, lets anyone vote any number of times on different cards, and shows every card as soon as it is saved. Teams usually want the opposite on each of these.

## Requirements
- Drag a card to another column (and keep a usable picker for phones and keyboards, as the Workboard does).
- A limit on votes per person per board (for example 3 or 5), set when the board is created, with the remaining votes shown.
- A "hide cards until the facilitator reveals them" mode so people write independently first.
- Group similar cards under one heading; votes on the group count together.

## Acceptance criteria
- Dropping a card on another column persists its column; a failed save puts it back and shows an error.
- Once a person has used their votes, further vote buttons are disabled with a reason; taking a vote back frees one.
- In reveal mode, other people's cards are hidden from non-facilitators until revealed; the server withholds them, not just the page.
- Every behaviour works at 375px, in dark mode, and by keyboard.
