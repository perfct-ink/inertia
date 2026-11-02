# Getting started checklist

New accounts land on their Space home (`/space`) after signing up and see a checklist of first steps instead of the empty "No document open" message.

| Step | Action | Ticks off when |
| --- | --- | --- |
| Create a Space (explains what Spaces are for) | New Space prompt, then switches to it | The account belongs to a shared (non-personal) Space |
| Write a document | Creates an untitled document in Root and opens it | The current Space has a document |
| Start a Sheet | Creates an untitled Sheet in Root and opens it | The current Space has a Sheet |
| Add your first tasks | Opens the task backlog with the new-task form | Any task exists |
| Invite a teammate | Opens the Space's Members dialog (disabled in the personal Space) | The current shared Space has more than one member |
| Look at the roadmap | Opens `/roadmap` | The user opened it from the checklist |

## Code

- `frontend/src/data/onboarding.ts`: step definitions and `completedSteps()` (pure, tested).
- `frontend/src/store/onboarding.ts`: per-account progress in `localStorage` (`inertia-onboarding`). `SignupScreen` calls `start(userId)`, so accounts that existed before never see the checklist. Detected steps are recorded so they stay ticked after switching Spaces. Hiding it (the X, or Done once everything is ticked) can be undone: "Show getting started" in the account dialog (click your name in the sidebar) calls `reopen(userId)`, keeps what was ticked, starts a fresh checklist for an account that predates it, and opens `/space`. The button only shows while the checklist is hidden or was never started.
- `frontend/src/components/onboarding/GettingStarted.tsx`: the checklist, rendered by `view/workspace/WorkspaceScreen.tsx`.

Progress is per device: signing up on the web and then opening the Mac app shows nothing there. Moving it to the server is backlog item `docs/backlog/checklist-progress-on-server.md`.

Reopening was added 2026-10-19 on branch `backlog/reopen-getting-started-checklist` (not merged). Test: `store/onboarding.test.ts`. Not verified: lint, type-check, tests and the account dialog were not run (no node_modules); the button itself has no component test.
Progress is also kept on the server (`users.onboarding`, JSON `{ dismissed, done }`), so signing up on the web and opening the Mac app shows the same checklist. `components/onboarding/OnboardingSync.tsx` (mounted in `App.tsx`) fetches it from `GET /api/v1/onboarding` on sign-in and merges it into this device's copy (the server's hidden/shown choice wins; ticked steps from both are kept), then saves every local change with `PUT /api/v1/onboarding` after a half-second pause. `localStorage` stays as the cache so the checklist appears instantly. The server rejects unknown step ids (422).

Server sync was added 2026-10-19 on branch `backlog/checklist-progress-on-server` (not merged). Tests: `backend/test/controllers/onboardings_controller_test.rb`, `data/onboarding.test.ts`, `OnboardingSync.test.tsx`. Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Limits: an account that signed up before this keeps no checklist unless it already had a local one (it is then pushed up); a change made offline is saved on the next change after reconnecting; two devices editing at once resolve by "server's choice wins, ticks union".
