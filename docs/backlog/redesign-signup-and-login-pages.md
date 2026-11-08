---
priority: p2
depends_on: []
components: [frontend, macos]
branch: backlog/redesign-signup-and-login-pages
status: incomplete
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

## Blocked

Waiting for design approval, as the task requires ("propose the design ... and get it approved before building"). The proposal below is the first step; nothing was built. Findings first: the web login and signup are a centred card on `AuthLayout` with the logo, a title, two or three fields identified only by placeholders, and a dev-only "Continue as test user" button. The native Mac `LoginView` already has the logo, name and tagline ("Your documents, projects, and tasks."), "Continue with Apple" and "Continue with Google" buttons (`SocialController` is the backend for them), an "or sign up with email" divider, the fields and a link to switch. The web has no provider buttons.

### Proposal

One layout for both pages and both platforms, in this order:

1. Logo mark, the name "Inertia" and the tagline above (the Mac copy, now on the web).
2. Title: "Welcome back" (sign in) or "Create your account" (sign up).
3. Provider buttons, "Continue with Apple" and "Continue with Google", full width, above the form (Mac as it is; the web gets them only if the web provider flow exists, see the questions).
4. A divider: "or sign in with email" / "or sign up with email".
5. The form with **visible labels** above the fields (a placeholder is not a label, WCAG 3.3.2): Name (sign up only), Email, Password. 40px fields from `@/components/ui`, `autocomplete` set (`name`, `username`/`email`, `current-password` / `new-password`), the first field focused, a show/hide password button (`aria-pressed`) on the password field.
6. One full-width primary button ("Sign in" / "Create account"), at least 44px tall on a phone.
7. A line linking the two pages: "No account? Sign up" / "Already have an account? Sign in".

Validation and errors: inline, under the field, on blur and on submit (email shape; password at least the server's minimum on sign up; name required), each tied to its field with `aria-describedby` and `aria-invalid`; a failed request (wrong password, taken email) shows one message above the form with `role="alert"` so it is announced, and focus goes to the first field with a problem. The submit button shows progress and is disabled while the request runs.

Layout and theme: the card keeps `max-width: 24rem` on the muted page background, with the surface, border and shadow from the theme tokens (so light, dark and the colour themes follow). At 320px to 480px the card becomes the full page (no side margin, no shadow, 20px padding) so nothing scrolls sideways, and the page uses `100dvh`. All colours come from tokens (`color()`), all motion is 150ms, and hover affects only the buttons and links.

Mac: the same order and copy in `LoginView`, using the shared SwiftUI components (`ProviderSignInButton`, `InertiaTextFieldStyle`, `ValidationMessage`), with field labels added and the same inline messages; no new layout.

Not changed: the dev-only test-user button stays in development builds only; routes, the API, and the return-to-page behaviour on sign-in.

### Questions for Alex before building

- Should the web get "Continue with Apple" and "Continue with Google" too? The backend has the social login endpoint the Mac uses, but the web needs an OAuth redirect or the provider's JavaScript SDK (new third-party scripts and client IDs; `docs/services.md` would grow). The conservative default is to leave them out of the web for now.
- Is there a "Forgot password" flow? None exists (no reset endpoint or mail); adding it is a separate task, so the pages would carry no such link until then.
- Terms of service and privacy policy links under the button (needed if the product is public)? None exist yet.
- Any branding beyond the logo and tagline (a product screenshot, a side panel on wide screens)? The proposal keeps one centred card.

Once approved: rebuild both pages on `AuthLayout`, mirror it in `LoginView.swift`, add tests (labels, inline errors, focus on the first error, keyboard-only sign-in), and update `docs/ui-components.md`.
