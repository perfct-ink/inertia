# UI component organization

Inertia reuses the existing React workspace layout and sidebar across its clients, including the Mac shell. Native login, file handling, and local task-file screens use shared SwiftUI components. Do not create an alternative workspace or sidebar layout.

| UI | Component root | Organization |
| --- | --- | --- |
| Native macOS | `macos/Sources/Inertia/Components/` | Shared controls at the root, workspace screens in `Screens/`, editor forms in `Editors/`. |
| React (browser, Electron, iOS, and embedded editors) | `frontend/src/components/` | Shared controls in `ui/`, authentication in `auth/`, workspace screens in `screens/`, document editors in `editors/`, file navigation in `file-manager/`. |

`InertiaApp.swift` handles native scenes and lifecycle. `App.tsx` and `main.tsx` compose React routing and application providers. Rendering components belong in their platform's component tree. Editor extensions keep document schema and commands in `frontend/src/extensions/`, while their React node views live in `components/editors/`.

## Shared controls

The online document tree has one permanent **Root** folder per workspace. Existing top-level folders live beneath it, and new documents, sheets, tables, and folders default to it. Root can hold files directly and cannot be moved, archived, or deleted. The workspace API exposes `root_folder_id`; root folder responses have `root: true`. The existing sidebar renders it with the same folder tree components. Pinned items are collected across the full tree.

Native screens use `InertiaTextFieldStyle`, `EditorSheet`, `EditorActions`, `OptionalTextField`, `NotesEditor`, `ValidationMessage`, `CompletionProgress`, `ProviderSignInButton`, and `RefreshButton`. Standard SwiftUI controls provide platform behavior. The entire online workspace uses the shared `WorkspaceWebView` wrapper and the existing React `WorkspaceLayout` and `Sidebar` components. The native session is handed to its isolated WebView, and signing out returns to the native login.

React screens import `Button`, `Input`, `Select`, `Textarea`, and `FormError` from `@/components/ui`. The shared primitives forward native element props and refs, so form submission, keyboard input, disabled controls, and editor focus continue working. Button variants cover primary, secondary, ghost, and destructive actions; unstyled controls support tabs and specialized interactive surfaces. Login and signup use one `AuthLayout`.

Text fields have a minimum height of 40 points on macOS and 40 pixels in React. Both platforms provide visible focus states and preserve disabled behavior. Checkboxes and radios use compact dimensions. Contextual class overrides support dense/editor layouts without copying a control implementation.

When changing a control's general appearance, update its shared definition. Keep route-specific state and composition in screen components, and avoid adding another implementation of the same control. The repository's `AGENTS.md` records these conventions for future work.

## Verification

```sh
make test-native-mac
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm test -- --runInBand
```

The React control regression tests cover native props, forwarded refs, implicit form submission, disabled actions, and checkbox selection. Native regression tests cover shared data and task-file behavior; compiling the native executable also checks every SwiftUI screen and component.
