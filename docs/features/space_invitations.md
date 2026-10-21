# Invite people to a Space without an account

## What it does
In a Space's Members dialog, admins and owners can type an email and choose **Invite by link** (the existing **Add** still adds someone who already has an account). The invitation appears under "Pending invitations" with a button to copy its link and one to revoke it. **No email is sent**: the inviter passes the link on.

The invited person opens the link (`/index.html#/invite/<token>`). Signed out, they see Sign in and Create an account and are asked to use the invited email, then open the link again. Signed in, they press **Join Space**; they join with the invited role and the app switches to that Space. If their account's email is not the invited one, or the invitation was used or revoked, they see an error and nothing changes.

## API and models
- `workspace_invitations`: `workspace_id`, `email` (lowercased, unique per Space), `role` (viewer, member, admin, owner; default member), `token` (secure, unique), `invited_by_id`, `accepted_at` (migration `20261021000004`). Pending means `accepted_at` is empty.
- `WorkspaceInvitation` validates the email format and uniqueness, that the email isn't already a member, and that the Space isn't personal. `accept!(user)` checks the user's email matches, adds the membership (keeping an existing role) and stamps `accepted_at` in one transaction.
- `GET|POST /api/v1/workspaces/:id/invitations` and `DELETE .../invitations/:id` (admins and owners only; only an owner may invite or revoke an owner invitation, through the shared `WorkspaceRoleGrants` concern). `POST /api/v1/invitations/:token/accept` is for the signed-in invitee and returns the Space with their role; an unknown, used or someone else's token is 404.
- Conservative choices: the email must match to accept (there is no email verification at sign-up, so a link alone must not grant access), and pending invitations are not accepted automatically when someone signs up.
- Frontend: `components/workspace/WorkspaceMembers.tsx`, `view/invite/InviteScreen.tsx`, `data/invitation.ts` (`inviteLink`), hooks in `api/workspaces.ts`.

## Who can view and change
Admins and owners of a non-personal Space create, list and revoke invitations. The token in a link is a secret: anyone who holds it and is signed in as the invited email can join.

## Tests
`backend/test/models/workspace_invitation_test.rb`, `backend/test/controllers/workspace_invitations_controller_test.rb`, `frontend/src/data/invitation.test.ts`, `frontend/src/view/invite/InviteScreen.test.tsx`. No test for the Members dialog changes.

## Known limits
- No email is sent (no mail delivery is configured; see `docs/services.md`). Sending it needs SMTP settings and a mailer.
- After signing in or up from the invite screen the person lands in their own Space and must open the link again.
- Invitations never expire and there is no "resend"; revoke and invite again to get a new link.
- The Mac app has no invite flow; the link opens in a browser.

## History
- Implemented 2026-10-21 on branch `backlog/invite-people-without-an-account`. Not merged, not deployed.
- Not verified: Rails tests and migration (no database), ESLint, tsc, Jest and the browser. Run: `ruby -c`, SCSS compile, `data/invitation` test through the shim.
