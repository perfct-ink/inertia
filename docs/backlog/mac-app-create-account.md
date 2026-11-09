---
priority: p1
depends_on: []
components: [macos, backend]
branch: backlog/mac-app-create-account
status: incomplete
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

## Unverified
Built on branch `backlog/mac-app-create-account` (see `docs/features/mac_app_sign_up.md`): a separate `SignupView`, a sign-in-only `LoginView`, `Signup`/`AuthClient` in InertiaCore, inline messages per field, and a backend contract test. The web link was already gone on main.

Ran here: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors`; a `swiftc -typecheck` of every SwiftUI app file against the built InertiaCore module (with `@State` swapped for a same-shaped wrapper); the new and existing `RequestsTests`/`SignupTests` cases under an XCTest stand-in compiled with InertiaCore.

Not run (no Xcode, XCTest, gems or database here), run these on a Mac with Xcode:
```sh
make test-native-mac            # SignupTests, RequestsTests
make build-mac                  # the SwiftUI app target
cd backend && rails test test/controllers/signup_api_test.rb
```
Then open the app signed out: the sign-up screen shows first; create an account with a new email and land signed in, in the first Space; sign up again with the same email and see "Email has already been taken" under the email field with the email kept; try a 3-character password; switch to sign-in and back; sign out and confirm the sign-in screen shows; check light and dark mode and that Apple/Google still work.
