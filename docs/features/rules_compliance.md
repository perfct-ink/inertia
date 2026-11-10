# Rules compliance

The audit of the repository against the shared rules in `docs/rules/` and this repo's `docs/project/`, with what was fixed and where the rest is tracked. It is written from the code as of 2026-11-09. `docs/rules/` is synced from the agent-rules repo and was not edited; where the rules disagree or no longer fit this repo they are listed under "Notes for the agent-rules repo".

The earlier version of the task named rule files that no longer exist (`product.md`, `ui-organization.md` as a rule, `repo-layout.md`, `running-locally.md`, a Tailwind `web/` app). Those are gone, so this audit covers the current files only.

## What it does for users

Nothing directly. It is a record: for each rule file, what was checked, whether it is met, what was changed, and which backlog task covers the remainder. Results are **met**, **not met** (with the fix or the task) and **not checkable here** (needs a browser, a database, Docker, production access, or is a working practice rather than code).

## How it was checked

Read each rule file, then searched the code with `grep`/`find` and small scripts (counts of controllers against tests, `ENV` reads, inline styles, raw HTML controls, transition lengths, feature index against files, backlog frontmatter, runtime versions across Dockerfiles and CI, compose variables against the docs). The offline runner ran the pure unit tests, the Jest stand-in for the changed components, and the static checks (see History for what could not run). A rule that needs eyes on a rendered page was not claimed as met.

## Loaders and project docs

| File | Result |
| --- | --- |
| `AGENTS.md` / `CLAUDE.md` | Met. `AGENTS.md` loads all 15 files in `docs/rules/`, the five in `docs/project/` and the feature index; `CLAUDE.md` only imports it. |
| `docs/project/settings.md` | Met. Platforms `frontend, backend, mac`; prototyping mode `on`. |
| `docs/project/product.md` | Spot-checked: user-facing text says Space and Collection (the code, API and database keep `workspace` and `table`). Not exhaustively read in every screen: part of the visual QA task below. |
| `docs/project/ui-organization.md` | Met for the React side: pages in `view/<name>/`, primitives from `@/components/ui`, 40px minimum text fields (`.ui-input`). Raw controls are now a lint error (below). The native side was not audited. |
| `docs/project/checks.md` | Fixed. It named a root `eslint.config.mjs` that does not exist, said `make test` ran only two suites, and called RuboCop's lint a check. It now matches `frontend/eslint.config.mjs`, `collab-server/eslint.config.mjs`, the new lint rules and the new `make test`. |
| `docs/project/deployment.md` | Met: matches `docs/deployment.md`, `docker-compose.coolify.yml` and the CI `deploy` job. |

## Rule files

### `project-settings.md`
Met. `docs/project/settings.md` exists in the required shape. The Capacitor iOS shell lives in `frontend/ios/` and is treated as part of the `frontend` platform; `iOS` is not listed as a platform.

### `backend.md`
| Rule | Result | Notes |
| --- | --- | --- |
| Architecture (MVCS) | Partly met | Services (`app/services`), Blueprinter serializers (`app/blueprints`) and models exist. About 66 query-builder calls (`where`, `joins`, `order`, `group`, `pluck`, `select`) remain in controllers. Not rewritten: the rule itself says not to rewrite working code solely to adopt the structure. |
| Health checks (`/health`, `/status`) | Not met | Rails has only `/up`, nginx has `/healthz`. Task: `health-and-status-endpoints`. |
| ORM, no SQL outside models | Met | No raw `execute` calls in controllers or services. |
| Migrations compatible with rollback | Not met, two files | `20260611051106_add_workspace_id_to_tasks` and `20261021000001_create_task_participants` backfill with a bare `execute` in `change`, so they cannot be rolled back. The earlier agent had edited them; those edits were reverted because shipped migrations are never edited. Recovery is documented in `docs/deployment.md` (Rollback). |
| Initializers (env parsed at start-up only) | Not met | `ENV` is read in `application_controller.rb`, `marketing_controller.rb`, `auth/social_sign_in.rb` and `quip/importer.rb`. Task: `parse-env-in-initializers` (it also asks for `BYPASS_AUTH` to be ignored in production). |
| Routes without file extensions | Met | |
| API: serializers and request tests | Partly met | Blueprinter everywhere. No request test for events, event tasks, shares, Quip imports, sign-up and sign-in, team members. Task: `request-tests-for-untested-controllers`. |

### `backlog.md`
Met. 98 task files in `docs/backlog/` (before this audit's five), all kebab-case with frontmatter and a `priority`; every `depends_on` names a file that exists; there is no shared `docs/backlog.md`. Completed work has feature docs (see `feature-docs.md`).

### `backlog-mode.md` and `prototyping-mode.md`
Not checkable in code: they govern how sessions work. The repo supports them (`docs/backlog/.stop` is git-ignored; prototyping mode is `on`). This task was worked on `backlog/strictly-follow-all-docs-rules`, never merged, ending with `Backlog-Status: incomplete`.

### `code-requirements.md`
| Rule | Result | Notes |
| --- | --- | --- |
| DRY | Partly checked | Fixed duplicates: three copies of `${api.defaults.baseURL}${url}` became `apiUrl()` in `api/base.ts`; the `errorMessage` helper is imported from one place (`@/util/errorMessage`) and the re-export in `api/tables.ts` is gone; the Makefile's rebuild steps are one `REBUILD` variable. A full duplicate hunt was not done. |
| Static data | Fixed, one left | Four inline collections moved to `src/data/` with tests: `GALLERY_FILTERS` (`document.ts`), `PORTFOLIO_COLUMNS` (`project.ts`), `TASK_LIST_DEPTHS` (`task.ts`), `KEYBOARD_SHORTCUTS` (new `shortcut.ts`). `VIEWS` in `FolderDetailScreen.tsx` stays: each entry holds a React icon component, which a data file should not import. |
| Data files | Met | One singular-named file per entity in `src/data/`, each with a test. |
| Linting | Not checkable here | `npm run lint` needs `node_modules`. Added the lint rules in `frontend.md` below. Warnings: `clear-eslint-warnings`. `make lint-backend` ends in `\|\| true` and there is no Swift linter: `lint-ruby-and-swift-from-root`. |
| Root directory | Partly met | `README.md` did not exist; added. The root still holds `AGENTS.md`, `CLAUDE.md`, `Makefile`, `package.json` and three compose files. `docker-compose.coolify.yml` is where Coolify looks for it, so moving it means changing the resource's compose location in Coolify, which only Alex does. Not moved. |
| Web applications | Partly met | Dockerfile and compose for each service; production compose has health checks for all three services, development compose only for `postgres` and `redis` (task: `health-and-status-endpoints`); the dev database has a seed (`backend/db/seeds.rb`). "Local development never hits live services" is not met by design: `make dev-live` points at the live database on purpose, opt-in, documented in `docs/README.md`. Alex's call. |

### `conventions.md`
Mostly practice, not code. Checked: no new infrastructure was added by this audit, no access rule was changed, and `docs/project/` describes facts. Tests for every change and the git rules cannot be checked after the fact.

### `deployment.md`
| Rule | Result | Notes |
| --- | --- | --- |
| Deploy only through the pipeline; CI in GitHub Actions; deploy after tests pass | Met | The `deploy` job `needs` all six check jobs and runs only on `main`. |
| Serialize deployments, never interrupt one in progress | Fixed | `cancel-in-progress` was `true` for every ref, so a newer push to `main` could cancel a run that was deploying. It is now `false` on `main` (runs queue) and still `true` elsewhere. |
| Build artifacts in CI, not on the production host | Not met by design | Coolify builds the images on its own server. See the notes below. |
| Runtime configuration through an allowlist, documented | Met | Every `${NAME}` in `docker-compose.coolify.yml` appears in `docs/deployment.md` and `docs/services.md`. |
| Consistent runtime versions, lockfiles, bounded job time | Met | Ruby 3.3.8 in `.ruby-version`, both Dockerfiles and CI; Node 22 in the three Dockerfiles, CI and `collab-server` engines; lockfiles for each app; every CI job has `timeout-minutes`. |
| Schema changes compatible with rollback, or a recovery procedure | Fixed | See `backend.md` above; documented in `docs/deployment.md`. |
| Known-good build, health and public checks, no false zero-downtime claim | Partly checkable | Coolify keeps earlier deployments (documented under Rollback). No zero-downtime claim exists. Public checks against production were not run; `/status` would help (`health-and-status-endpoints`). |
| Hands off production | Met | Nothing in this audit touched production. |

### `design-principles.md`
| Principle | Result | Notes |
| --- | --- | --- |
| 1 Responsive, 3 hover only on clickable things, 4 layers, 5 text never at the viewport edge, 9 only show things of value, 10 no invisible masks, 11 show progress, 12 icon buttons with tooltips | Not checkable here | They need a browser at 375px and desktop, light and dark. Task: `visual-qa-of-every-screen-in-light-and-dark-mode`. |
| 2 Native controls look the same | Fixed | 18 native `<input type="date">` fields in 8 files now use `DatePicker`; a hidden file input and one raw `<button>` (`HierarchyScreen`) now use `Input` and `Button`. Raw `<button>`, `<input>`, `<select>` and `<textarea>` outside `components/ui/` are now lint errors. |
| 6 Animations 150-300ms | Met | All transitions go through the `transition` mixin (`--v-anim-speed: 150ms`); no authored duration is over 300ms (the only other animation is the 1s looping spinner). One hard-coded `0.15s` in `Timeline.scss` now uses the mixin. |
| 7 State changes never change size | Fixed, one | `.sidebar-unpin` used `display: none` until hover, so the row changed on hover. It now fades with `opacity` (`reveal-on-hover`, also always visible on touch screens). Not looked at in a browser. |
| 8 Control text not selectable | Met | `_reset.scss` sets `user-select: none` on buttons, selects, labels, summaries, SVGs and button/tab/menu roles. |
| Keyboard focus and contrast (WCAG) | Not checkable here | Task: `wcag-keyboard-focus-and-contrast-audit`. Patterns repeated in views: `promote-local-patterns-to-ui-components`. |

### `documentation.md`
| Rule | Result | Notes |
| --- | --- | --- |
| Architecture docs with diagrams in `docs/` | Fixed | `docs/architecture.md` is new (production, delivery, local development, where code lives), linked from `docs/README.md`. |
| Rules vs project docs; `docs/rules/` not edited | Met for editing; see notes | `docs/rules/` is unchanged. `docs/project/ui-organization.md` and `checks.md` contain instructions, which "project docs never add rules" does not allow. Not changed: it is Alex's call whether they become shared rules or are reworded as facts. |
| Loaders | Met | |
| Services documented | Met | `docs/services.md` lists the internal and external services, stores and variables. |
| Code wins | Fixed | `docs/README.md` said Rails 7 and showed a two-folder tree; it now matches `backend/`, `frontend/`, `collab-server/`, `macos/`, `docs/`, `scripts/`, `examples/` and both compose files, and its link to the sample file is fixed. A root `README.md` was added. |

### `feature-docs.md`
Met. 60 files in `docs/features/`, all snake_case, all indexed in `README.md` with working links, all with a History section. `clean_urls.md` did not say whether it was deployed; it does now. The History of most docs says "merged to main" (which deploys once CI passes), not that production was checked.

### `frontend.md`
| Rule | Result | Notes |
| --- | --- | --- |
| SCSS, no utility framework | Met | |
| Inline styles | Met | 23 `style={{}}` uses, all runtime values (progress widths, depth indents, drag transforms, map pins). A fixed right padding moved out of `FolderItem.tsx` into its stylesheet. |
| Scripts and styles from files | Partly built, unverified | The Rails marketing layout now links a fingerprinted stylesheet and script (`/marketing-<digest>.css|js`, year-long cache, `MarketingAssets`); only the pre-paint theme snippet and the structured data stay inline. `frontend/index.html`'s crash-net script is still inline. Task: `marketing-pages-assets-from-files`. |
| Typed language | Met | No `.js` under `frontend/src`. |
| No native dialogs; form controls through UI components | Fixed | No `alert`/`confirm`/`prompt`; both rules are now lint errors. |
| API errors shown; central sign-out | Met | `lib/api.ts` signs out on 401 and shows the error unless a call is `silent`; no swallowed `catch` found. |
| API clients: one per resource, views never call the HTTP client | Fixed | Login, sign-up and sign-out were called from views and the sidebar; they are now `api/auth.ts` (`AuthApi`, `useLogin`, `useSignup`) with `api/auth.test.ts`. Nothing outside `src/api/` imports `@/lib/api` now. |
| UI components: own file and stylesheet, `ui-` root, light and dark | Met | The 12 components in `components/ui/` each have a stylesheet, a `ui-` root, and no hard-coded colours (hex colours exist only in the token files). |
| Views: own folder, `view-` root | Met | Every page folder has a `view-` root class except the sign-in, sign-up and invite pages, which share `view-auth` through `AuthLayout`, and `planning`, which is only a shared stylesheet. |
| No `id` attributes | Met in spirit | 19 `id` attributes, all for ARIA links (`aria-labelledby`, `aria-controls`), none for styling. See the notes. |
| Responsive, accessibility | Not checkable here | Tasks above. |
| Compilers | Met | Webpack dev builds use source maps without minifying; production builds are minified with content hashes and source maps. |

### `make-files.md`
| Target | Result | Notes |
| --- | --- | --- |
| `setup`, `dev`, `build`, `down` | Met | |
| `up` | Fixed | Was a plain `compose up`; it now stops what is running, rebuilds, and starts attached. |
| `running` | Fixed | Added: prints `Running` and the services, or exits 1. |
| `test` | Fixed | Ran two suites; now backend, frontend, collab server and, on macOS, the Swift tests. Added `make test-collab`. |
| `clean` | Fixed | Now also removes `macos/dist` and `macos/.build`. `clean-mac` cleaned the Electron output; it now cleans the native app and `clean-electron` does the Electron cleanup. |
| `help` | Fixed | Grouped by the Makefile's section headings. |
| `all` | Rule conflict | See the notes. |
| `deploy`, `release` | Not applicable | CI deploys; there is no `VERSION` file. |

Only `make help` and `make -n` ran; the targets that need Docker (`running`, `up`, `test-collab`) did not.

### `native.md`
Not met. Missing `close`, `install`, `uninstall`, `reinstall`, and `make open` opens the web app. Task: `native-mac-make-targets`. The native components folder layout matches `docs/project/ui-organization.md`.

### `versioning.md`
Not applicable. There is no `VERSION` file at the root, and none was created.

## Notes for the agent-rules repo

Rule text that disagrees with itself, another rule, or this repo. None were changed here.

1. `make-files.md` says `make all` is an alias for `make help`; `native.md` says it is `make setup` plus `make dev`. This repo's `all` is setup, dev and the Mac build.
2. `make-files.md` describes `make dev` as "Run `make dev` and open it", which is circular.
3. `frontend.md` bans `id` attributes unless a library requires them, while its own Accessibility section needs ARIA relationships that use ids.
4. `frontend.md` puts shared UI components, with a `ui-` root class, in one shared folder; `docs/project/ui-organization.md` splits primitives (`components/ui`) from other shared components that have no prefix. Say which count.
5. `deployment.md` assumes images are built in CI for a VPS; this project deploys through Coolify, which builds on its own server.
6. `backend.md` says SQL belongs only in models and also says not to rewrite working code to adopt the structure, so existing controllers with queries are neither fix nor exempt.
7. `code-requirements.md` says every collection of two or more objects is static data, without saying what to do when the objects hold UI components (icons).
8. `code-requirements.md` says local development never hits live services; this repo keeps an opt-in `make dev-live`.
9. `documentation.md` says project docs never add rules, while `docs/project/ui-organization.md` reads as instructions.

## Tests

`frontend/src/api/auth.test.ts` (new), and added cases in `frontend/src/data/document.test.ts`, `project.test.ts`, `task.test.ts` and the new `shortcut.test.ts`. The existing component tests for the changed components cover the date, file-URL and error-message changes.

## Known limits

- The browser checks, `npm run lint`, `tsc`, the real Jest run, `rails test` and the Swift build did not run (see History).
- Open work is in the tasks named above: `health-and-status-endpoints`, `request-tests-for-untested-controllers`, `parse-env-in-initializers`, `marketing-pages-assets-from-files`, `native-mac-make-targets`, plus `clear-eslint-warnings`, `lint-ruby-and-swift-from-root`, `promote-local-patterns-to-ui-components`, `wcag-keyboard-focus-and-contrast-audit` and `visual-qa-of-every-screen-in-light-and-dark-mode`.

## History

- Implemented 2026-11-09 on branch `backlog/strictly-follow-all-docs-rules`. Not merged, not deployed.
- An earlier session was cut off by the daily API cost limit and saved its edits as one commit. This one rebased it onto `origin/main`, reviewed every change, and reverted the edits to two shipped migrations and two redundant "Deployment" lines in feature docs. The CI concurrency, Makefile, `.gitignore` (and removing a tracked `.sass-cache` file), README, architecture, `api_layer.md` and code edits were kept after review.
- Ran offline: the pure unit tests (all pass except `util/shortcuts.test.ts`, which needs a browser `window`); the Jest stand-in for the changed components (all pass except `data/task.test.ts` and `api/documents.test.tsx`, which fail the same way on `origin/main` in the stand-in; `EpicPlanScreen` and `HierarchyScreen` tests were skipped for lack of `@dnd-kit/core`); `make help` and `make -n`.
- Not run (no network, `node_modules`, database or Docker): `npm run lint`, `tsc -b`, the real Jest run, `rails test`, RuboCop, the Swift build, the Docker-based `make` targets, and any browser check at 375px and desktop in light and dark.
