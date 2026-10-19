## Documentation

Keep docs up to date with architecture and architectural diagrams in the `docs/` folder. README.md and all docs live there; the only files that stay in the repo root are AGENTS.md and CLAUDE.md. CLAUDE.md just imports AGENTS.md, and AGENTS.md is a short loader for the rules and features below, so edit those instead.

Always document all internal and external services used, why they are used, and the configuration variables they need (`docs/services.md`).

Planned work lives in `docs/backlog/` (one file per task) and implemented work in `docs/features/`; see [backlog.md](backlog.md) and [feature-docs.md](feature-docs.md). Larger initiatives are split into independently actionable task files there, not written into a shared file.
