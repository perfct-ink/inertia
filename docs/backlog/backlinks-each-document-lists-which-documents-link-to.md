---
branch: backlog/backlinks-each-document-lists-which-documents-link-to
priority: p1
depends_on: []
components: [backend]
status: incomplete
---
# Backlinks: each document lists which documents link to it

## Objective

Backlinks: each document lists which documents link to it

## Requirements / notes

Needs a `document_links` table refreshed on save.

**Where** (Alex, 2026-11-09 groom): a "Linked from" section at the bottom of the document, under its content, listing each linking document (title, link to it). Hide the section when nothing links to the document (design principle 9).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today (checked 2026-11-09): links between documents exist. The heading link picker (`docs/features/heading_links.md`) inserts ordinary link marks with in-app hrefs `/documents/<id>#<anchor>`, so backlinks can be found by scanning saved content for those hrefs. A `[[` document picker is still `link-to-another-document.md`. Folders have home documents (`docs/features/folder_home_document.md`).

## Acceptance criteria

- Backlinks: each document lists which documents link to it works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built on `origin/main` of 2026-11-09 and reconciled with the same day's groom (`docs/features/document_backlinks.md` describes it): the `document_links` table (migration `20261108130001`, `schema.rb` edited by hand with `version:` raised to `2026_11_08_130001`), links rebuilt on every save, `GET /api/v1/documents/:id/backlinks`, and a "Linked from" section at the bottom of a document, under its content, hidden when nothing links to it. Links are matched by document id from `/documents/<id>` addresses (heading links included), so they survive renames and moves; the path must start with `documents/<id>`, so the folder slugs of `backlog/hierarchical-urls` are not read as an id. `documentLink` nodes are recognised by name, so `backlog/link-to-another-document` needs no change here.

Ran offline: the static checks (Babel parse, imports, Sass compile), the data and component tests under the stand-in runner, `ruby -c`, and the address pattern and content walker on their own. Did not run (no database, `node_modules` or network): `rails db:migrate`, `rails test`, `npm run lint`, `tsc -b`, the real Jest run, any browser check.

To verify:
- `cd backend && rails db:migrate`, then diff `db/schema.rb` against the committed one (expect no change: the hand-edited `document_links` table has two indexes, the unique pair and `target_document_id`, and two foreign keys), then `rails test`.
- `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
- After deploy, run `rails document_links:rebuild` once so existing documents show their backlinks.
- In a browser at 375px and desktop, light and dark: link document B from document A (a heading link from the toolbar works), open B, scroll to the bottom and see "Linked from 1 document" under the text, click it; remove the link in A and see the section gone after reopening B; a document nobody links to shows no section.

Decisions for Alex: the one-off rebuild is a rake task you run, not part of the migration, so a boot-time `db:prepare` cannot be held up by it. The section shows on documents only (`docs/backlog/backlinks-on-sheets-collections-and-files.md`). A link pasted as a hierarchical slug path is not counted yet (`docs/backlog/backlinks-from-hierarchical-path-links.md`, which waits for `hierarchical-urls`). Merge hazards: `backend/db/schema.rb` `version:` line (other branches raise it too: keep the highest) and the `documents` table area; `Document` model (`has_many` and `after_save` lines, also touched by `hierarchical-urls`, which adds `Sluggable`). Remove this file once the checks above pass and the branch merges.
