---
priority: p3
components: [backend]
---
# Cut release links when a document moves between Spaces

## Objective

Keep a release in one Space from listing a document that has moved to another.

## Requirements / notes

- `ReleaseDocument` requires the document to be in the release's Space, but `SpaceTransfer#move_document` and `#move_folder` do not touch `release_documents`. After a move the release (old Space) still lists the document (new Space), and that link is only checked when it is created (`docs/features/releases.md`).
- A move should delete the `release_documents` rows of every moved document, the same way it removes the Gantt dependencies and event links of moved tasks. A copy needs nothing: copies are not in any release.
- Tell the user beforehand how many releases lose a document, in the same place the transfer dialog tells them about folder-attached records.

## Acceptance criteria

- Moving a document, or a folder holding one, removes it from every release; the release itself stays in the old Space.
- The dialog says how many releases a move will remove the document from.
- Tests cover a document and a folder move; `docs/features/space_transfer.md` is updated and this file is removed.
