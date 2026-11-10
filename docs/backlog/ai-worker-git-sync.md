---
priority: p1
depends_on: [ai-worker-agent-access]
components: [backend]
branch: backlog/ai-worker-git-sync
status: incomplete
---
# AI worker: sync a folder with a Git repo as Markdown

## Objective
Agents like Claude Code work best on files in a repository. Mirror an Inertia folder (for example a project's PRDs and backlog) to a folder in a GitHub repo as Markdown files, both ways, so an agent can work in the repo and the app updates when it pushes (follows Alex, 2026-10-19).

## Requirements
- Link a folder to a GitHub repo, branch and path. Each document becomes a `.md` file; sub-folders become directories.
- Inertia edits are committed to the repo; pushes to the repo update the documents, through the live-update path in `ai-worker-live-updates.md`.
- Task lines keep their task IDs in the Markdown so tasks stay linked (see `task-line-two-way-sync.md`).
- Conflicts (both sides changed) are shown to a person, not silently resolved.

## Acceptance criteria
- An agent edits a synced `.md` file and pushes; the document updates in the app.
- An edit in the app shows up as a commit in the repo.
- Tests cover both directions and a conflict; feature docs are updated and this file is removed.

## Blocked

Nothing is built yet. Needs Alex: a GitHub integration (a GitHub App or a deploy key per folder, with its private key stored as a secret), which is an external service and new credentials. It also builds on ai-worker-live-updates, which is itself blocked on Redis. Decide the auth model first, then build the link, the two-way sync and the conflict screen.
