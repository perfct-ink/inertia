---
priority: p2
depends_on: []
components: [backend, frontend, macos]
---
# Plugin system

## Objective
Alex (2026-11-10): "I want plugins." Let Inertia be extended by plugins that connect a Space to an outside tool. The first is `apple-radar-plugin`; this task builds only what that plugin needs to exist, so the design is proven by a real plugin.

## Requirements
- A plugin has a manifest (id, name, version, what it can read and write: tasks, documents, etc.) and is enabled per Space by a Space owner.
- Plugins run where their tool is reachable. A plugin may run locally (in the Mac app or a local agent, signed in as the user) or on the server; the manifest says which.
- A plugin reads and writes through the existing API, with a scoped token (reuse the agent token scopes in `docs/features/agent_access.md`), and every change it makes is attributed to the plugin, as agent changes are.
- A Plugins page in Space settings (owners only): list, enable, disable, configure, and see the plugin's last sync and errors.
- No new infrastructure and no third-party code loaded into the browser; confirm the hosting model with Alex before building (conventions.md).

## Acceptance criteria
- An owner can enable and disable a plugin for a Space; a disabled plugin's token stops working at once.
- Changes made by a plugin show the plugin as the author.
- Works at 375px, light and dark, with errors shown on failed calls; tests cover the backend and the page; a `docs/features/plugins.md` doc is added and this file is removed.
