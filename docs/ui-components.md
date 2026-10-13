# UI component organization

Inertia reuses the existing React workspace layout and sidebar across its clients, including the Mac shell. Native login, file handling, and local task-file screens use shared SwiftUI components. Do not create an alternative workspace or sidebar layout.

| UI | Component root | Organization |
| --- | --- | --- |
| Native macOS | `macos/Sources/Inertia/Components/` | Shared controls at the root, workspace screens in `Screens/`, editor forms in `Editors/`. |
| React (browser, Electron, iOS, and embedded editors) | `frontend/src/components/` | Shared controls in `ui/`, shared authentication layout in `auth/`, embedded editors in `editors/`, file navigation in `file-manager/`. Page-level views live in `frontend/src/view/<name>/` (outside `components/`), each with its `.tsx` and `.scss` together. |

`InertiaApp.swift` handles native scenes and lifecycle. `App.tsx` and `main.tsx` compose React routing and application providers. Rendering components belong in their platform's component tree. Editor extensions keep document schema and commands in `frontend/src/extensions/`, while their React node views live in `components/editors/`.

## Shared controls

The online document tree has one permanent **Root** folder per workspace. Existing top-level folders live beneath it, and new documents, sheets, tables, and folders default to it. Root can hold files directly and cannot be moved, archived, or deleted. The workspace API exposes `root_folder_id`; root folder responses have `root: true`. The existing sidebar renders it with the same folder tree components. Pinned items are collected across the full tree.

Native screens use `InertiaTextFieldStyle`, `EditorSheet`, `EditorActions`, `OptionalTextField`, `NotesEditor`, `ValidationMessage`, `CompletionProgress`, `ProviderSignInButton`, and `RefreshButton`. Standard SwiftUI controls provide platform behavior. The entire online workspace uses the shared `WorkspaceWebView` wrapper and the existing React `WorkspaceLayout` and `Sidebar` components. The native session is handed to its isolated WebView, and signing out returns to the native login.

React screens import `Button`, `Input`, `Select`, `Textarea`, and `FormError` from `@/components/ui`. The shared primitives forward native element props and refs, so form submission, keyboard input, disabled controls, and editor focus continue working. Button variants cover primary, secondary, ghost, and destructive actions; unstyled controls support tabs and specialized interactive surfaces. Login and signup use one `AuthLayout`.

Text fields have a minimum height of 40 points on macOS and 40 pixels in React. Both platforms provide visible focus states and preserve disabled behavior. Checkboxes and radios use compact dimensions. Contextual class overrides support dense/editor layouts without copying a control implementation.

When changing a control's general appearance, update its shared definition. Keep route-specific state and composition in screen components, and avoid adding another implementation of the same control. The repository's `AGENTS.md` records these conventions for future work.

## Styling

The React frontend uses SCSS (compiled by webpack's `sass-loader`); Tailwind is not used.

- `frontend/src/styles/` holds app-wide styles: `_theme.scss` (light/dark color variables), `_reset.scss`, `_typography.scss`, `_spacing.scss`, and `_tokens.scss` (the `color()`, `palette()`, `space()`, `radius()`, `text()`, `up()` and `dark` helpers every stylesheet imports with `@use 'tokens' as *;`). `app.scss` is the entry point loaded by `main.tsx`.
- Each shared control in `components/ui/` has its own SCSS and a `ui-` root class (`ui-button`, `ui-input`, `ui-modal`). Variants and states use `--` (`ui-button--primary`).
- Each screen or component has a SCSS file beside it. Only the **root element** carries a lowercase `view-` class (`view-tasks`, `view-document`); a root state uses `--` (`view-document--centered`). Descendants use the view's name without the `view-` prefix: a single dash for relationships (`tasks-card`), `--` for states (`tasks-card--dragging`), underscores inside one multi-word term (`tasks-quick_add`). In SCSS, nest descendants inside the root rule with `@at-root .tasks-card { ... }` so they keep their source order without the `view-` prefix.
- Cascade order is explicit through CSS layers declared in `styles/app.scss` (and `main.tsx` imports it first): `libraries` (reset and third-party CSS such as Fortune Sheet), then `app` (`app.base` theme/typography/spacing, `app.ui` for `components/ui`, `app.components` for other shared components), then `view` (everything under `src/view/`). Wrap the rules of a new stylesheet in the matching `@layer`; a later layer wins regardless of selector specificity or import order.
- Classes passed to a `ui-` component do not override its base styles on their own. Views are in a later cascade layer, so a single view class is enough to override it.
- Light and dark mode come from the CSS variables in `_theme.scss` (`prefers-color-scheme`). Use `color()` tokens rather than hardcoded colors. Add a `dark` mixin block only for fixed palette colors.
- Inline `style` is reserved for computed values (percent widths, nesting depth, drag transforms).
- Use the `Modal`, `ConfirmDialog` and `PromptDialog` components instead of `window.alert`, `confirm` or `prompt`.

## API error handling

`frontend/src/lib/api.ts` is the middleware for every API call. A failed call pushes its message to `store/notifications`, which `ToastRegion` (mounted in `App.tsx`) shows as an alert. Pass `{ silent: true }` when the caller renders the error itself (the login and signup forms do). A 401 clears the stored session, so the route guard sends the user to `/login`, and shows a "session expired" notice.

## Verification

```sh
make test-native-mac
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm test -- --runInBand
```

The React control regression tests cover native props, forwarded refs, implicit form submission, disabled actions, and checkbox selection. Native regression tests cover shared data and task-file behavior; compiling the native executable also checks every SwiftUI screen and component.
