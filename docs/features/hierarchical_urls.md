# Hierarchical URLs

## What it does
Folders and documents have addresses that mirror the folder tree, for example `/product/feature-folders/requirements`: the slugs of the folders from the top of the Space down to the item. The Space's permanent Root adds nothing to a path, and the Space itself is not in the address (it is the one you have open, as for every other page).

- **Slugs.** Every folder and document has a slug made from its name or title ("Feature Folders" is `feature-folders`; accents are dropped; a name with no letters or digits becomes `untitled`). A slug is unique within its folder, shared by sub-folders and documents, so a path names one item. A taken slug gets `-2`, `-3`, and so on.
- **Links use them.** The sidebar, breadcrumb, All files, Projects, Portfolio, My work, Resources, project requests, the task and event screens, the Cards view and the folder page tabs all build paths from the Space tree. Until the tree has loaded, or for something just created, a link falls back to the id path.
- **Ids still work.** `/documents/12` and `/folders/3` open the item and the address is then rewritten (a replace, so Back isn't trapped) to its hierarchical path, keeping `?query`, `#heading` and the page state (a new document still focuses its title). Heading links, notifications, tabs and the "new document" navigation keep using id paths because they stay right when something is renamed or moved.
- **Old paths redirect.** Renaming or moving an item (and so everything under a folder) saves its old paths. Opening one finds the item and redirects to its current path. A path in use again by a live item stops being an alias. An item that moves to another Space leaves no alias in the old one.
- **Case and slashes don't matter.** `/Product/Feature-Folders/` redirects to `/product/feature-folders`.
- **Reserved first segments.** Items directly under the Root never take a slug the app already uses at the site root (`tasks`, `login`, `api`, `shared`, ...); such a name becomes `tasks-2`. The list is `Slug::RESERVED`; specs fail when `App.tsx` or `frontend/nginx/default.conf` gains a route it lacks.
- **Not found.** An address that names nothing shows "Page not found" inside the Space layout with a button back to the Space home. Any other failure of the lookup shows its error, as does a Space that failed to load.
- **Native apps.** Electron, the iOS app and the Mac shell keep their hash router (`docs/features/clean_urls.md`); the same route list and `ItemRoute` serve `#/product/requirements` there. No native code changed.

## How it works
Backend:
- Migrations `20261108040001_add_slugs_to_folders_and_documents` (adds `slug` to `folders` and `documents`, backfills oldest first so the oldest item keeps the plain slug, then adds unique indexes on `[parent_id, slug]` and `[folder_id, slug]`) and `20261108040002_create_path_aliases` (`path_aliases`: `workspace_id`, `path`, polymorphic `target`, unique on `[workspace_id, path]`).
- `Slug` (`app/services/slug.rb`): pure slugify, uniqueness, reserved list, path split/join.
- `Sluggable` (`app/models/concerns/sluggable.rb`), included by `Folder` (`slugged_by :name, within: :parent`) and `Document` (`slugged_by :title, within: :folder`): assigns the slug on create, rename and move, validates it, and on a rename or move saves the previous paths of the item and everything under it as `PathAlias` rows. Saves that only change content do nothing.
- `PathResolver` (`app/services/path_resolver.rb`): live tree first, then aliases. An alias only counts while its target is still in the Space asked about.
- `GET /api/v1/paths?path=product/feature-folders/requirements` (`Api::V1::PathsController`) returns `{ type, id, path, moved }` for the Space in `X-Workspace-Id`, or 404. Any member, viewers included, may look up; it only reads.
- `slug` is in the folder and document JSON (`FolderBlueprint`, `DocumentBlueprint`), so the Space payload carries it for the whole tree.
- `Workspace#ensure_document_root!` gives folders it adopts under a new Root their slugs. Moving a document or folder between Spaces (`SpaceTransfer`) picks a slug free in the new folder.

Frontend:
- `data/path.ts`: pure path building (`buildPathIndex`, `folderHref`, `documentHref`), `resolvePath`, `parseIdPath`, `redirectFor`; `hooks/usePaths.ts` is the one way to build a link (`paths.document(doc)`, `paths.folder(id)`, `paths.itemAt(pathname)`); `store/paths.ts` and `components/PathSync.tsx` keep the Space tree where any component can read it.
- `view/item/ItemRoute.tsx` serves `/documents/:id`, `/folders/:id` and the catch-all route in `App.tsx`; `api/paths.ts` is the server lookup (`usePathLookup`), used only when the tree doesn't know an address.
- `FolderDetailScreen` and `DocumentScreen` take the id as a prop from `ItemRoute` (they still read `:id` when mounted on an id route).

## nginx
No new location was needed. Hierarchical paths are served by the existing `location /` (`try_files ... /index.html`), and the only new API path, `/api/v1/paths`, is under `/api/`. Slugs contain only `a-z`, `0-9` and `-`, so they never match the static-asset location. A comment in `frontend/nginx/default.conf` ties its locations to `Slug::RESERVED`. In development `historyApiFallback` does the same job.

## Who can view and change
Anyone who can open the Space can resolve a path. Slugs follow the item's name and location, so renaming or moving needs the permission it already needed; nothing here changes who can do what.

## Tests
- `backend/test/services/slug_test.rb`: slug rules, reserved list against `App.tsx` and nginx.
- `backend/test/models/sluggable_test.rb`: slugs on create, rename, move, aliases, cleanup and Space moves.
- `backend/test/controllers/paths_controller_test.rb`: the lookup, old paths, other Spaces, sign-in, slugs in the Space payload.
- `frontend/src/data/path.test.ts`: path building, resolving, redirects.
- `frontend/src/view/item/ItemRoute.test.tsx`: hierarchical and id addresses, rewrite keeping query/hash/state, server lookup and redirect, not-found and error states.

## Known limits
- The address doesn't name the Space. A hierarchical link opened while another Space is active says the page wasn't found (a document id link still opens, since documents are looked up across the user's Spaces; a folder id link does not). Switch Spaces and open it again.
- A document's slug follows its title as it is edited, so its address changes as the title does (the open page is not reloaded, and the old address redirects).
- Names with only non-Latin letters get `untitled`, `untitled-2`, ... slugs.
- Archived folders are not in the Space tree, so they open through the server lookup.
- Saving a title makes one alias row per rename; they are removed with the item and are never pruned otherwise.
- Heading links and the editor's internal links still point at id paths (`docs/features/heading_links.md`); they open and are then rewritten.

## History
- Implemented 2026-11-08 on branch `backlog/hierarchical-urls`, not merged or deployed.
- Not verified: the Rails tests, both migrations against a database (the backfill and the schema), `npm run lint`, `tsc -b`, the real Jest run, a browser pass at 375px and desktop in light and dark, and the Electron, iOS and Mac shells. Only the offline stand-ins ran (see the task file).
