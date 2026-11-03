---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/volta-component-mapping-and-parity
---
# Document component mappings and validate parity

## Objective

**Document component mappings and validate parity**

## Requirements / notes

Maintain a React-to-native component inventory and visual examples in both themes. Check keyboard interaction, accessibility and narrow layouts. Document the chosen Volta version, installation/build integration and any required configuration. Volta currently requires a source/local dependency and a build before consumption; resolve reproducible CI packaging and incomplete theme coverage during adoption (see its README).

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Document component mappings and validate parity works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Branch: `backlog/volta-component-mapping-and-parity` (not merged, not deployed).

Done:

- `docs/volta_parity.md`: the Volta version in use against Volta `HEAD`, how the tokens are copied, why components are not imported and what importing would take, the React-to-Volta-to-native inventory, and a keyboard, accessibility, narrow-layout and contrast audit of every control in `components/ui`. Linked from `docs/ui-components.md`.
- A dev-only component gallery, `/styleguide` (`frontend/src/view/styleguide/`), registered in `App.tsx` only outside production builds, with a light and a `data-theme="dark"` panel per section; `docs/features/component_gallery.md` and its row in `docs/features/README.md`.
- `_theme.scss` keeps its values in mixins and lets any `data-theme="light"|"dark"` element re-declare the tokens (the `:root` output is unchanged).
- New tests: `StyleguideScreen.test.tsx`, `Modal.test.tsx`, `Toast.test.tsx`.
- Thirteen backlog files for the findings (listed in `docs/volta_parity.md`). No control bug was clear enough, and testable, to fix here.
- The route uses `process.env.NODE_ENV !== 'production'`, not `import.meta.env.DEV`: the frontend builds with webpack and Babel, where `import.meta.env` does not exist.

Not run (no network, `node_modules` or browser): `npm run lint` (ESLint and Stylelint), `tsc -b`, the real Jest suite, `npm run build`, and any look at the gallery in a browser. Ran: the offline checks in `/tmp/runner` (static parse of changed files, Sass compile of the changed SCSS, the three new test files in a Jest stand-in with stubbed Radix, `lucide-react` and `zustand`).

To verify and merge:

```sh
cd frontend && npm install && npm run lint && npx tsc -b --force && npm test && npm run build
```

Then run the dev server (`make dev` or `docker compose up`), open `http://localhost:5174/styleguide`, and check each section in both panels at 1280px and at 375px (resize the window, and try the Panel width select): the dark panel must be dark whatever the OS and Appearance setting are, no text may touch the screen edge, and nothing may scroll sideways. Confirm that `npm run build` output has no `styleguide` chunk and that `/styleguide` redirects to `/space` in a production build.
