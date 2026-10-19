---
priority: p1
depends_on: []
components: [macos, backend]
---
# Create an account from the Mac app

## Objective
A new user can sign up inside the Mac app, without being sent to a browser.

## Context
`macos/Sources/Inertia/Components/Screens/LoginView.swift` offers email/password and provider sign-in, plus a "Create an account" link that opens `/index.html#/signup` on the web. The web signup uses `POST /api/v1/auth/signup` (Devise registrations) and social start/exchange endpoints under `api/v1/auth/social`. Native login already stores the session through `session.login`.

## Requirements
- A native sign-up screen in `Components/Screens/` (e.g. `SignupView.swift`), reached from the login screen and back again, reusing the shared text-field style, provider buttons, progress and error components.
- Email and password sign-up calls the signup API, then signs the user in the same way `session.login` does.
- Provider sign-up (Apple, Google) works from the same screen, using the existing social flow.
- Validation errors from the API (taken email, weak password) show inline; failed calls show an error.
- Remove the web link, which also stops depending on the `/index.html#/signup` URL.
- Field fits follow the 40-point minimum and the shared focus and disabled states.

## Acceptance criteria
- From a signed-out Mac app, a user creates an account and lands signed in, in the first Space.
- A duplicate email shows the API's error and keeps the entered email.
- No browser opens during email sign-up.
- Tests cover the session sign-up call and error mapping.
