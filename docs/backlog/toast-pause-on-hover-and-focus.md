---
priority: p3
depends_on: []
components: [frontend]
---
# Toasts should not vanish while someone is reading them

## Objective

`ToastRegion` (`components/ui/Toast.tsx`) removes each notice after 8 seconds with no way to keep it: the timer ignores hover and keyboard focus. WCAG 2.2.1 (timing adjustable) wants a way to extend or stop a time limit, and error messages are the ones people need to read slowly or copy. The region also has no accessible name.

## Requirements / notes

- Pause the timer while the pointer is over a notice or focus is inside it (`pointerenter` and `pointerleave`, `focusin` and `focusout`), restart with the full time when it ends, and keep Dismiss.
- Give the region `role="region"` and `aria-label="Notifications"` (each notice stays `role="alert"`).
- Add tests with fake timers in `Toast.test.tsx`.

## Acceptance criteria

- A notice stays while hovered or focused and goes eight seconds after that.
- Tests cover it; the gallery's toast button shows it.
- Feature doc updated and this file removed.
