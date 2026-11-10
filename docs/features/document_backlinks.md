# Backlinks

## What it does
- A "Linked from N documents" section sits at the bottom of a document, under its content and inside the same scrolling page (Alex, 2026-11-09). It lists the documents in the same Space that link to it: each row is a link to that document with its type icon, its title and, when it is in a folder, where it lives ("Album / Songs"). The section is hidden while loading and when nothing links here (design principle 9), so a document nobody links to shows nothing extra.
- A document "links" to another through a link in its text whose address is the other document's id path, which includes a link to a heading in it (`/documents/12#launch-plan`, `heading_links.md`), the hash router's `#/documents/12`, and either behind a scheme and host (`https://app.example.com/documents/12`). The path has to start with `documents/<id>`: links are matched by id, never by title or folder, so renaming or moving a document does not break them, and folder slugs in front of a path (the hierarchical URLs of `backlog/hierarchical-urls`, where heading links keep using id paths) are not mistaken for an id (`/product/documents/5` is not document 5); or through an inline document link node (`documentLink`, the `[[` link of `docs/backlog/link-to-another-document.md`). The node is recognised by name already, so those links start to count the day the editor can create them, with no change here. A link to itself, to a missing document, or to a document in another Space is ignored.
- The list follows the links as documents are saved, including saves from a collaborative session (the collab server saves through the same Rails endpoint).

- The panel shows on every kind of file. A document, and an uploaded file's page, show it in the page's own scroll; a sheet and a Collection, whose screens fill the page and scroll inside, show it as a strip under the grid (`DocumentBacklinks` with `bar`: full width, at most 35% of the screen high, scrolling itself, with a top border). Hidden when nothing links there. Placed in `DocumentScreen`, `FileViewer`, `SpreadsheetEditor` and `TableEditor`.

## API and models
- Table `document_links` (`source_document_id`, `target_document_id`, both foreign keys to `documents`; unique on the pair; migration `20261108130001_create_document_links.rb`). A row says "source links to target".
- `DocumentLink.refresh!(document)` (`backend/app/models/document_link.rb`) rebuilds a document's outgoing rows from its content: `target_ids_in` walks the editor JSON for `documentLink` nodes and link marks, keeps only documents of the same Space, and adds or removes the difference. `Document` calls it after every save that changes the content, the folder (a move to another Space drops links to the old one) or is the first save, only for `doc_type: document`. Rows are inserted with `insert_all`, so two saves racing never fail on the unique pair. Deleting either document deletes its rows.
- `GET /api/v1/documents/:id/backlinks` returns the linking documents (`Document#backlinks`: same Space only, by title; the same fields as the document list, no content). Frontend: `DocumentApi#backlinks` and `useBacklinks` in `frontend/src/api/documents.ts` (refetched every time a document opens), `components/DocumentBacklinks.tsx` (+ `.scss`), `data/backlink.ts`, shown by `view/document/DocumentScreen.tsx`.
- `rails document_links:rebuild` (`backend/lib/tasks/document_links.rake`, `DocumentLink.rebuild_all!`) records the links of documents saved before this existed. Safe to run again.

## Who can view and change
Anyone who can open a document can read its backlinks (the lookup is by the Spaces the user belongs to, like `GET /api/v1/documents/:id`). Nobody edits the rows: they only follow document content. A failed request shows the API client's error notice.

## Tests
- `backend/test/models/document_link_test.rb` (what counts as a link, heading and hash-router addresses, refresh, ignored targets, sheets, a move between Spaces, `backlinks`, `rebuild_all!`, delete) and `backend/test/controllers/document_backlinks_controller_test.rb` (list, update through a save, heading link, other Space, signed out).
- `frontend/src/components/DocumentBacklinks.test.tsx`, `frontend/src/data/backlink.test.ts`, `frontend/src/api/documents.test.tsx`.

## Known limits
- Links written inside sheets and Collections are not tracked (a sheet or Collection can be linked to, and shows the panel, but its own content does not create backlinks).
- Documents saved before this shipped have no rows until saved again or `rails document_links:rebuild` is run once after deploy.
- An address on any host whose path starts with `/documents/<id>` counts, even on another site, as long as that id is a document in the same Space.
- The panel lists titles and places, with no snippet of where the link sits, and does not say whether the link is to a heading.
- A link whose address is a hierarchical path (`/product/requirements`, as copied from the address bar once `backlog/hierarchical-urls` merges) is not matched, because only the id path is read. See `docs/backlog/backlinks-from-hierarchical-path-links.md`. The panel's own links use the id path too (`/documents/<id>`), which that branch opens and rewrites to the hierarchical path.
- `link-to-another-document` adds the `documentLink` node. Nothing in this feature needs to change when it merges; check by adding a `[[` link and finding it listed on the target.

## History
- Implemented 2026-10-19 on branch `backlog/backlinks-each-document-lists-which-documents-link-to`, rebased onto main 2026-11-07 and again 2026-11-09 (Postgres schema, `Document#backlinks` same-Space filter, move handling, race-safe insert, heading and hash-router addresses, folder location, rebuild task). The 2026-11-09 groom put the list at the bottom of the document under its content and hid it when empty; the build already did, so that groom changed the docs here, the migration prefix (`20261108130001`), the link matching (id paths only, so hierarchical URLs do not confuse it) and the tests. Not merged or deployed.
- Not verified: the migration, `schema.rb` (edited by hand), the Rails tests, lint, `tsc -b`, the Jest run and the browser did not run (no database, `node_modules` or network). Only `ruby -c`, a stand-alone run of the content walker, and the offline component and data tests ran. See the task file's Unverified section.
- 2026-11-10: the panel added to sheets, Collections and uploaded files (branch `backlog/backlinks-on-sheets-collections-and-files`). Jest, `tsc` and eslint pass; not checked in a browser at 375px, and the sheet and Collection screens have no placement test beyond the Collection's.
