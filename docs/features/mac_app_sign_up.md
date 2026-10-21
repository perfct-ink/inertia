# Mac app sign-up

## What it does
A signed-out Mac app user can create an account without leaving the app. The login screen's "Create an account" button opens a native sign-up screen (name, email, password, plus Continue with Apple and Google); "Back to sign in" returns. A successful sign-up signs the user in and opens their Space. After signing out the app starts on the sign-in screen again.

## How it works
- `Components/Screens/SignupView.swift`, reached from `LoginView` through `RootView`; it reuses `InertiaTextFieldStyle`, `ProviderSignInButton`, `AuthDivider`, `ValidationMessage` and `ProgressView`.
- `Session.signUp(name:email:password:)` posts to `POST /api/v1/auth/signup` (the Devise registration, which also returns the JWT in the `Authorization` header) and stores the token like `login` does. A 422 returns the API's messages (taken email, short password) which the screen shows under the fields; any other failure goes to the shared error alert. The name and email stay in the form after an error and the password is cleared.
- Provider sign-up uses the same `session.login(provider:)` flow as sign-in.
- `Signup.body` and `Signup.errors` in `InertiaCore/Models.swift` build the request and read the messages.
- The old link to `/index.html#/signup` on the web is gone.

## Who can view and change
Anyone, signed out.

## Tests
`macos/Tests/InertiaCoreTests/RequestsTests.swift` (`testSignupBodyWrapsTrimmedFieldsInUser`, `testSignupErrorsReadTheValidationMessages`). There is no test of `Session.signUp` itself (it uses `URLSession.shared` directly).

## Known limits
- No password confirmation field or strength hint; the app sends the password as its own confirmation.
- No terms or privacy acceptance, and no email verification step (the server doesn't have one).
- The email is not validated on the device.

## History
- Implemented 2026-10-21 on branch `backlog/mac-app-create-account`. Not merged.
- Verified: `Signup.body` and `Signup.errors` compile and ran in a small `swiftc` program; the `InertiaCore` target type-checks.
- Not verified: `swift test` (no XCTest here), a full app build (SwiftUI macros need Xcode), and the screen against a running server.
