---
priority: p3
depends_on: []
components: [macos]
branch: backlog/mobile-apps
status: incomplete
---
# Mobile apps

## Objective

Mobile apps

## Requirements / notes

macOS app exists; iOS/Android do not.

## Context

Section "Platform, AI, admin" of the retired shared backlog.

## Acceptance criteria

- Mobile apps works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not built: the task is a one-line "iOS/Android do not exist", and each platform is a project of its own that needs decisions only Alex can make, plus tooling that is not available where this was groomed (Xcode, an Android SDK, signing accounts, store listings). What already exists, from the code and docs: `@capacitor/core` is a frontend dependency, the API allows the `capacitor://localhost` origin (`CORS_ORIGINS` in `docs/services.md`), the router switches to hashes for the Capacitor shell (`frontend/src/util/router.ts`), and a macOS app exists (`macos/`, a native shell around the web app). There is no `ios/` or `android/` project in the repository.

Decisions needed from Alex: iOS only, or Android as well; a Capacitor shell around the existing web app (cheapest, matches the Electron and Mac shells) or native SwiftUI/Compose screens; Apple Developer and Google Play accounts and who holds them; push notifications; offline support. A conservative first slice once those are answered: generate the Capacitor iOS project (`npx cap add ios`), load the built web app, sign in against the production API, and check the phone layout at 375px; that needs a Mac with Xcode, not this environment.
