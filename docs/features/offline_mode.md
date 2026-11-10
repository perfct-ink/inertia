# Offline mode

## What it does
While the browser is offline, a small "Offline" notice with a crossed-wifi icon shows at the top left of every page, and goes away when the connection returns. It is announced to screen readers (`role="status"`). The notice is not clickable and has no hover state.

Nothing else works offline yet: cached documents, creating documents offline and syncing with conflict handling are the rest of `docs/backlog/offline-mode.md`.

## API and models
None. `hooks/useOnline.ts` reads `navigator.onLine` and the `online` / `offline` events; `components/OfflineIndicator.tsx` (styles `OfflineIndicator.scss`) is mounted in `App.tsx`.

## Who can view and change
Everyone; it is local to the browser.

## Tests
`frontend/src/components/OfflineIndicator.test.tsx`.

## Known limits
- `navigator.onLine` is true on a network that goes nowhere, so the notice can be missing while requests fail.
- The notice sits over the top left corner, so it covers the Space logo while shown.
- Not checked in a browser.

## History
- 2026-11-10: indicator only, on branch `backlog/offline-mode` (not merged or deployed).
