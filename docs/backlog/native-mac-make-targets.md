---
priority: p3
depends_on: []
components: [macos, docs]
---
# Native Mac make targets: close, install, uninstall, reinstall

## Objective

The Makefile gives the native Mac app the targets `docs/rules/native.md` names, and the `make all` meaning is settled.

## Context

`docs/rules/native.md` (Makefile) lists `make dev`, `build`, `clean`, `setup`, `open`, `close`, `install`, `uninstall`, `reinstall`, `all` and `help`. The Makefile has the Mac app's `mac-build`, `dev-native-mac` (build and open), `build-mac`, `clean-mac` and `test-native-mac`, but no `close`, `install`, `uninstall` or `reinstall`, and `make open` opens the web app in the browser, not the Mac app. `make dev` and `make build` are about the web stack (with `build` also building the Mac app).

Two rule files disagree about `make all`: `docs/rules/make-files.md` says it is an alias for `make help`; `docs/rules/native.md` says it runs `make setup` and `make dev`. The Makefile's `all` runs `setup`, `dev` and `mac-build`. Report this to the agent-rules repo; the repo follows its own `all` until the rules agree.

## Requirements / notes

- `make close`: stop the running dev Mac app (`scripts/stop-native-mac.swift` already does it for `macos/dist/Inertia.app`).
- `make install`: build the release app (`scripts/build-native-mac.sh` already builds with `-c release`) and copy it to `/Applications/Inertia.app`; `make uninstall`: close, then remove it; `make reinstall`: uninstall, then install. Writing to `/Applications` is the point of these targets, so they must say so in their help text and never run as a dependency of another target.
- Decide with Alex what `make open` opens when both a web app and a Mac app exist (today the browser), for example `make open` for the web app and `make open-mac` for the Mac app.

## Acceptance criteria

- The four targets work on a Mac and appear in `make help` under the Native Mac app group.
- `docs/features/rules_compliance.md` (native.md and make-files.md rows) is updated.
