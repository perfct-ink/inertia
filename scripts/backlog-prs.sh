#!/usr/bin/env bash
# Opens a pull request for every origin/backlog/* branch that has none
# (docs/rules/backlog-mode.md, `make backlog-prs`). The title and body come from
# the branch's last commit message. Needs `gh` logged in to the repo's account.
# DRY_RUN=1 lists the branches that would get a pull request without opening any.
set -euo pipefail

command -v gh >/dev/null || { echo "gh is not installed" >&2; exit 1; }

cd "$(dirname "$0")/.."
git fetch --prune origin

opened=0
for ref in $(git for-each-ref --format='%(refname:short)' 'refs/remotes/origin/backlog/*'); do
  branch=${ref#origin/}
  if [ "$(gh pr list --head "$branch" --state all --json number --jq length)" != 0 ]; then
    echo "skip   $branch (has a pull request)"
    continue
  fi
  title=$(git log -1 --format=%s "$ref")
  if [ -n "${DRY_RUN:-}" ]; then
    echo "would open   $branch: $title"
    continue
  fi
  gh pr create --base main --head "$branch" --title "$title" --body "$(git log -1 --format=%b "$ref")"
  opened=$((opened + 1))
done

[ -n "${DRY_RUN:-}" ] || echo "Opened $opened pull request(s)."
