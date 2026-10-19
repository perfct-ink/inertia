# Backlinks

## What it does
Below a document, "Linked from N documents" lists the documents in the Space that link to it, each a link. It is hidden when nothing links to the document. A document "links" to another through an inline document link (a `documentLink` node, see [document_links.md](document_links.md) once merged) or an ordinary link whose address is `/documents/<id>`. Links to itself, to missing documents and to documents in other Spaces are ignored.

## API and models
`document_links` (`source_document_id`, `target_document_id`, unique pair), rebuilt from the source's content by `DocumentLink.refresh!` every time a document's content is saved (including saves from the collab server, since they go through `Document`). `GET /api/v1/documents/:id/backlinks` returns the linking documents (title order). Deleting either document removes its link rows. Frontend: `useBacklinks` in `api/documents.ts`, `components/Backlinks.tsx`.

## Who can view and change
Anyone who can read the document can read its backlinks; rows are only written by saving content (no edit API).

## Tests
`backend/test/models/document_link_test.rb`, `backend/test/controllers/document_backlinks_controller_test.rb`, `frontend/src/components/Backlinks.test.tsx`.

## Known limits
- Existing documents have no link rows until they are next saved (no backfill task).
- Only documents are covered: links from sheets and Collections, or to headings, are not tracked, and a document linked inside a table cell counts only if it is in saved content (it is, being content).
- The panel shows titles only, no snippet of where the link is.

## History
- Implemented 2026-10-19 on branch `backlog/backlinks-each-document-lists-which-documents-link-to`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
