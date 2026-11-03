---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Share link controls: who may make them, passwords, expiry changes, usage

## Objective

Give Space admins control over public share links, and give link owners the options view-only links lack today (see `docs/features/shared_links.md`, Known limits). These are product and privacy choices for Alex.

## Requirements

- A Space setting for who may make public links: off, admins only, or members (today any member can). Enforce it in `SharesController#create`, hide the "Share link…" entries when it is off, and say so in the dialog.
- An admin list of every live link in the Space (item, who made it, when it expires) with "Turn off" for each and "Turn off all".
- Change a link's expiry in place instead of turning it off and making a new one.
- Optional password on a link: stored hashed, asked on the shared page, with a limit on wrong attempts.
- Usage: last opened and open count per link, recorded without a database write on every public request (for example counted in the cache and flushed on a schedule).
- Build the copied address from a configured public web address instead of `window.location.origin`, which is not a web address in the Electron, iOS and Mac apps (the Roadmap link has the same problem).

## Acceptance criteria

- With links set to admins only, a member gets 403 on create and sees no share entries; links already made keep working until turned off or expired.
- A password-protected link never returns the content before the right password, and wrong attempts are limited.
- Tests cover the setting, the admin list, password and expiry change; the pages work at 375px, light and dark; `shared_links.md` is updated and this file is removed.
