# Mac app sign-up

## What it does
A signed-out Mac app user can create an account without leaving the app. The app opens on a native sign-up screen: name, email and password, plus Continue with Apple and Continue with Google. "Already have an account? Sign in" switches to the sign-in screen, and "Create an account" there switches back. A successful sign-up signs the user in and opens their Space in the shared web view. After the first sign-in, signing out lands on the sign-in screen rather than sign-up.

A rejected sign-up (taken email, short password, blank name) shows the API's messages in red directly under the field they are about; messages that name no field show under the form. The name and email stay in the form after a rejection; the password is cleared. Any other failure (network, server error) opens the shared error alert. The Create Account button is disabled until name, email and password are filled in, and the form is disabled with a progress indicator while the call runs.

## How it works
- `Components/Screens/SignupView.swift` is the sign-up screen and `Screens/LoginView.swift` the sign-in screen. `Screens/RootView.swift` chooses between them (sign-up first, until the first sign-in) and passes each a closure to switch to the other.
- `Components/AuthScreen.swift` is the frame both screens share (logo, provider buttons, divider, progress), plus `ValidatedField` and `ValidationList` for messages under a field. The screens reuse `InertiaTextFieldStyle` (52pt login height, above the 40pt minimum, with the shared focus ring and disabled state), `ProviderSignInButton`, `AuthDivider` and `ValidationMessage`.
- `Session.signUp(name:email:password:)` calls `AuthClient.signUp` and stores the token and user the way `login` does. It returns the API's validation messages for the screen to show; any other failure goes to `session.error`.
- `InertiaCore/Signup.swift` holds the testable parts. `Signup.body` trims name and email and sends the password as its own confirmation. `Signup.outcome(status:authorization:data:)` maps the response to `.signedIn(token:user:)` (201 with a bearer token), `.invalid([messages])` (422 with messages) or throws an `APIError` (other statuses, a 422 with no messages, a 201 with no token). `Signup.field(of:)` and `Signup.grouped(_:)` sort messages by the attribute Devise puts first ("Email has already been taken" goes to the email field). `Signup.canSubmit` is the button's rule. `AuthClient` sends the request through an injectable transport, so tests answer for the server.
- Endpoint: `POST /api/v1/auth/signup` (Devise registration, `Api::V1::Auth::RegistrationsController`). The response carries the JWT in the `Authorization` header (devise-jwt `dispatch_requests`) like login does, and creating the user creates its personal Space.
- Provider sign-up uses the same `session.login(provider:)` flow as sign-in; the server creates the account on first provider sign-in. Email sign-up opens no browser; provider sign-in uses the system web authentication sheet as before.
- The old "Create an account" link to the web page (`/index.html#/signup`) is gone.

## Who can view and change
Anyone, signed out.

## Tests
- `macos/Tests/InertiaCoreTests/SignupTests.swift`: the request body, the 201/422/other outcomes, message-to-field mapping and grouping, the button rule, and `AuthClient.signUp` against a stubbed transport (request method, URL, no token, JSON body; signed in; taken email comes back as messages; server and network failures throw). `RequestsTests.swift` covers `Requests.bearerToken`.
- `backend/test/controllers/signup_api_test.rb`: the contract the screen relies on (201 with a bearer header and a personal Space, the token works on a later call, 422 messages for a taken email, a short password and a blank name).
- There is no UI test of `SignupView` itself.

## Known limits
- No password confirmation field or strength hint; the app sends the password as its own confirmation.
- No terms or privacy acceptance, and no email verification step (the server has none).
- The email is not validated on the device; the server's message shows after sending.
- Sign-in failures (wrong password) still open the error alert rather than showing inline.
- The web sign-up starts the getting-started checklist (a browser-local store); the Mac app's isolated web view does not, so a Mac sign-up does not see it.
- A taken-email message does not offer to switch to sign-in.
- The fields do not show a red outline on error; only the message is red (the native Volta parity backlog task covers error states on the shared text-field style).

## History
- Implemented 2026-11-08 on branch `backlog/mac-app-create-account`. Not merged, not deployed.
- A first version (2026-10-21) had a separate `SignupView`; main then gained a sign-up mode inside `LoginView` (2026-11-04) with `Session.signUp` signing up and then logging in. This version keeps the separate screens the task asked for, keeps sign-up first, and signs in from the sign-up response (one call, not two).
- Verified: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` passes; every file of the SwiftUI app target type-checks with `swiftc -typecheck` against the built `InertiaCore` module (with `@State` swapped for a same-shaped wrapper, because the SwiftUI macro plugin ships only with Xcode); the `SignupTests` and `RequestsTests` cases ran and passed under a small XCTest stand-in compiled together with `InertiaCore`.
- Not verified: `swift test` (no XCTest here), the SwiftUI app build and the screens running (need Xcode), the screens against a running server, the backend test (no Ruby gems or database here; it passes `ruby -c`), and that the sign-up response carries the `Authorization` header on a real server (read from `config/initializers/devise.rb`, the web sign-up and the contract test).
