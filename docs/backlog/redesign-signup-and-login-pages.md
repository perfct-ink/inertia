---
priority: p2
depends_on: []
components: [frontend, macos]
---
# Redesign the signup and login pages

## Objective
Signup and login look polished and consistent with the Volta design system, on web and in the Mac app.

## Context
Web screens share `frontend/src/components/auth/AuthLayout.tsx`; the Mac app has `LoginView.swift`. Design details were not specified, so a first step is proposing a direction.

## Requirements
- Propose the design (layout, branding, provider buttons, copy) and get it approved before building.
- Rebuild the web login and signup on `AuthLayout` with Volta controls from `@/components/ui`, with light and dark mode, responsive down to phone width, and WCAG 2.1 labels, focus order and error announcements.
- Login and signup read as one pair: same layout, a clear link between them, and inline validation.
- Mirror the design in the native login and sign-up views using the shared SwiftUI components, not a new layout (see `mac-app-create-account.md`).
- Update screenshots or notes in `docs/ui-components.md` if shared components change.

## Acceptance criteria
- Both pages work at 320px and desktop widths, in light and dark.
- Keyboard-only sign-in and sign-up work, and errors are announced.
- No raw HTML controls outside `@/components/ui`; lint passes.
- Web and Mac pages share the same look and copy.
