# Hierarchical URLs

## What it does
Folders and documents have addresses that mirror the folder tree, for example `/product/feature-folders/requirements`: the slugs of the folders from the top of the Space down to the item. The Space's permanent Root adds nothing to a path, and the Space itself is not in the address: the Space you have open is tried first, then your other Spaces (see Links to other Spaces).

- **Slugs.** Every folder and document has a slug made from its name or title ("Feature Folders" is `feature-folders`; accents are dropped; a name with no letters or digits becomes `untitled`). A slug is unique within its folder, shared by sub-folders and documents, so a path names one item. A taken slug gets `-2`, `-3`, and so on.
- **Links use them.** The sidebar, breadcrumb, All files, Projects, Portfolio, My work, Resources, project requests, the task and event screens, the Cards view and the folder page tabs all build paths from the Space tree. Until the tree has loaded, or for something just created, a link falls back to the id path.
- **Ids still work.** `/documents/12` and `/folders/3` open the item and the address is then rewritten (a replace, so Back isn't trapped) to its hierarchical path, keeping `?query`, `#heading` and the page state (a new document still focuses its title). Heading links, notifications, tabs and the "new document" navigation keep using id paths because they stay right when something is renamed or moved.
- **Old paths redirect.** Renaming or moving an item (and so everything under a folder) saves its old paths. Opening one finds the item and redirects to its current path. A path in use again by a live item stops being an alias. An item that moves to another Space leaves no alias in the old one.
- **Case and slashes don't matter.** `/Product/Feature-Folders/` redirects to `/product/feature-folders`.
- **Reserved first segments.** Items directly under the Root never take a slug the app already uses at the site root (`tasks`, `login`, `api`, `shared`, ...); such a name becomes `tasks-2`. The list is `Slug::RESERVED`; specs fail when `App.tsx` or `frontend/nginx/default.conf` gains a route it lacks.
- **Links to other Spaces.** A slug link to an item in another Space you belong to (by membership or through a team) switches to that Space and opens the item: the page shows "Opening in <Space name>" while it switches, then the address is replaced (Back isn't trapped), keeping `?query`, `#heading` and state. Switching is the same as choosing the Space in the switcher (open tabs and the open project are dropped). The server looks only in the Spaces you can open, never beyond. When more than one of your Spaces holds the same path, the Space you have open wins; if it doesn't hold the path, the Space with the lowest id wins. An old path (after a rename or move) in another Space switches there and lands on the item's current path.
- **Not found.** An address that names nothing you can open shows "Page not found" inside the Space layout with a button back to the Space home. The server gives the same 404, and the screen the same words ("Nothing you can open is at this address. It may have been deleted, or you may not have access to it."), whether the item does not exist or sits in a Space you are not in, so nothing is revealed about Spaces you cannot see. Any other failure of the lookup shows its error, as does a Space that failed to load.
- **Native apps.** Electron, the iOS app and the Mac shell keep their hash router (`docs/features/clean_urls.md`); the same route list and `ItemRoute` serve `#/product/requirements` there. No native code changed.

## How it works
Backend:
- Migrations `20261108040001_add_slugs_to_folders_and_documents` (adds `slug` to `folders` and `documents`, backfills oldest first so the oldest item keeps the plain slug, then adds unique indexes on `[parent_id, slug]` and `[folder_id, slug]`) and `20261108040002_create_path_aliases` (`path_aliases`: `workspace_id`, `path`, polymorphic `target`, unique on `[workspace_id, path]`).
- `Slug` (`app/services/slug.rb`): pure slugify, uniqueness, reserved list, path split/join.
- `Sluggable` (`app/models/concerns/sluggable.rb`), included by `Folder` (`slugged_by :name, within: :parent`) and `Document` (`slugged_by :title, within: :folder`): assigns the slug on create, rename and move, validates it, and on a rename or move saves the previous paths of the item and everything under it as `PathAlias` rows. Saves that only change content do nothing.
- `PathResolver` (`app/services/path_resolver.rb`): live tree first, then aliases. An alias only counts while its target is still in the Space asked about. `PathResolver.find_across(workspaces, segments, preferred:)` tries the preferred Space (the open one) and then the rest by id, and returns the item with its Space; the controller passes `current_user.accessible_workspaces`, the same set `WorkspaceScoped` allows, so no Space outside it is ever searched.
- `GET /api/v1/paths?path=product/feature-folders/requirements` (`Api::V1::PathsController`) returns `{ type, id, path, moved, workspace }` or 404. `workspace` is the Space the item is in (`id`, `name`, `personal`, `role`, `root_folder_id`, as in the Spaces list), which is the one in `X-Workspace-Id` unless that Space doesn't hold the path. Any member, viewers included, may look up; it only reads. A Space named in the header that you cannot open is the same 404 as before.
- `slug` is in the folder and document JSON (`FolderBlueprint`, `DocumentBlueprint`), so the Space payload carries it for the whole tree.
- `Workspace#ensure_document_root!` gives folders it adopts under a new Root their slugs. Moving a document or folder between Spaces (`SpaceTransfer`) picks a slug free in the new folder.

Frontend:
- `data/path.ts`: pure path building (`buildPathIndex`, `folderHref`, `documentHref`), `resolvePath`, `parseIdPath`, `redirectFor`; `hooks/usePaths.ts` is the one way to build a link (`paths.document(doc)`, `paths.folder(id)`, `paths.itemAt(pathname)`); `store/paths.ts` and `components/PathSync.tsx` keep the Space tree where any component can read it.
- `view/item/ItemRoute.tsx` serves `/documents/:id`, `/folders/:id` and the catch-all route in `App.tsx`; `api/paths.ts` is the server lookup (`usePathLookup`), used only when the tree doesn't know an address. When the answer's `workspace` is not the open Space, `ItemRoute` shows the item only after `useOpenInWorkspace` (`hooks/useSwitchWorkspace.ts`, the core of `useSwitchWorkspace`: sets the active Space, drops tabs, project and cached data, navigates) has switched. It switches once per target, so a Space that never becomes the open one can't loop.
- `FolderDetailScreen` and `DocumentScreen` take the id as a prop from `ItemRoute` (they still read `:id` when mounted on an id route).

## nginx
No new location was needed. Hierarchical paths are served by the existing `location /` (`try_files ... /index.html`), and the only new API path, `/api/v1/paths`, is under `/api/`. Slugs contain only `a-z`, `0-9` and `-`, so they never match the static-asset location. A comment in `frontend/nginx/default.conf` ties its locations to `Slug::RESERVED`. In development `historyApiFallback` does the same job.

## Who can view and change
Anyone can resolve a path in any Space they can open (member, viewer or through a team); a Space they cannot open is never searched and gives the same 404 as a path that names nothing. No access rule changed: the lookup is read-only and uses the set of Spaces the rest of the API already allows. Opening the item then goes through the usual checks of its own Space. Slugs follow the item's name and location, so renaming or moving needs the permission it already needed; nothing here changes who can do what.

## Tests
- `backend/test/services/slug_test.rb`: slug rules, reserved list against `App.tsx` and nginx.
- `backend/test/models/sluggable_test.rb`: slugs on create, rename, move, aliases, cleanup and Space moves.
- `backend/test/controllers/paths_controller_test.rb`: the lookup, old paths, sign-in, slugs in the Space payload; resolving across Spaces (membership, team, old path), the open Space preferred, lowest id otherwise, a non-member's 404 identical to a missing path (also with that Space in the header), a Space the person left.
- `backend/test/services/path_resolver_test.rb`: `find_across` order, aliases, only the Spaces it is given.
- `frontend/src/data/path.test.ts`: path building, resolving, redirects.
- `frontend/src/view/item/ItemRoute.test.tsx`: hierarchical and id addresses, rewrite keeping query/hash/state, server lookup and redirect, switching to the item's Space (keeping query, hash and state; once only), no switch when the item is in the open Space, not-found (identical for no access) and error states.
- `frontend/src/hooks/useSwitchWorkspace.test.tsx`: switching Spaces and opening a path in one.

## Known limits
- The address doesn't name the Space, so two of your Spaces with the same path are told apart only by the rule above (the open Space, then the lowest id); the other one's item can't be reached by that address while the first holds it, so reach it by switching Space.
- A folder id link (`/folders/3`) to a folder in another Space still doesn't open it (a document id link does, since documents are looked up across your Spaces).
- The Space switch drops open tabs, the open project and cached data, as the switcher does.
- A document's slug follows its title as it is edited, so its address changes as the title does (the open page is not reloaded, and the old address redirects).
- Names with only non-Latin letters get `untitled`, `untitled-2`, ... slugs.
- Archived folders are not in the Space tree, so they open through the server lookup.
- Saving a title makes one alias row per rename; they are removed with the item and are never pruned otherwise.
- Heading links and the editor's internal links still point at id paths (`docs/features/heading_links.md`); they open and are then rewritten.

## History
- Implemented 2026-11-08 on branch `backlog/hierarchical-urls`, not merged or deployed.
- 2026-11-09 (Alex's decision: "If there isn't access, yes"): links to items in another of your Spaces now switch to that Space and open the item; "Page not found" is only for an address nobody in your Spaces can open, identical whether the item is missing or in a Space you are not in. Same branch, not merged or deployed.
- Not verified: the Rails tests, both migrations against a database (the backfill and the schema), `npm run lint`, `tsc -b`, the real Jest run, a browser pass at 375px and desktop in light and dark, and the Electron, iOS and Mac shells. Only the offline stand-ins ran (see the task file).
