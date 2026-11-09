---
priority: p2
depends_on: [hierarchical-urls, backlinks-each-document-lists-which-documents-link-to]
components: [backend]
---
# Backlinks from links written as hierarchical paths

## Objective

Count a link in a document as a backlink when its address is a hierarchical path (`/product/feature-folders/requirements`) as well as when it is an id path (`/documents/12`).

## Requirements / notes

`DocumentLink.target_ids_in` (`backend/app/models/document_link.rb`) reads only id addresses (`/documents/<id>`, with or without a heading, the hash router's form, or behind a host). Once hierarchical URLs merge, an address copied from the browser's address bar after the page rewrites itself is a slug path, so a link pasted that way is not seen. The heading link picker and the `[[` link keep writing id paths, which are unaffected.

Resolve such a path with the hierarchical URL lookup (`PathResolver`, which also follows old paths of renamed or moved items) in the document's own Space, when the link's host is the app's or the link is relative. Keep matching by id, so a rename or move of the target never loses the backlink, and keep the same-Space rule.

## Acceptance criteria

- A document that links to another through a slug path (including an old, redirected one) is listed in that document's "Linked from" section; a path that names a folder, or nothing, adds no backlink.
- Saving stays fast: one lookup per distinct path, none for id paths.
- Tests cover slug paths, old paths and paths in another Space; `docs/features/document_backlinks.md` is updated and this file is removed.
