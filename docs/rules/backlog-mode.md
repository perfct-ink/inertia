## Backlog Mode

Applies when the user says to work on the backlog. It adds an autonomous, branch-per-task workflow on top of [backlog.md](backlog.md); where the two overlap, backlog.md's rules on task files still hold.

Don't stop to ask which task to take or to confirm scope. Work through the tasks in `docs/backlog/` one at a time:

- **One branch per task, with a prefix.** Start each task from a fresh, up-to-date `origin/main` (`git fetch` first) on a branch named `backlog/<task-filename-without-extension>`. Never stack one task's branch on another's (if a task truly depends on another, say so in its `depends_on` and leave it for after that merges), and never commit backlog work to `main`.
- **Finish what you can.** Implement the task, add tests, update `docs/features/` and remove the task file in the same branch (see Completing Work in backlog.md), commit with a `git log`-style message, and push (`git push -u origin <branch>`). Pushing a `backlog/*` branch is pre-authorized in this mode and doesn't deploy. Run the checks you can, and say plainly in the commit message and your report which you couldn't run.
- **On a blocker, push and note it.** If you hit something only the user can decide or do (a product or privacy call, a risky migration, new infrastructure, an account or secret), commit the work so far and push the branch. Record what's done and what's blocking in that task's own file on the same branch (a `Blocked` section, plus `branch:` frontmatter). Don't edit other tasks' files or any shared index. Then move to the next task.
- **Build the conservative version.** When a call is genuinely the user's, build the cautious option behind the blocker note rather than guessing silently, and document the choice in the feature doc.
- **Keep going.** After each task, pick the next unblocked one. Stop only when every remaining task is blocked or done, then report each branch with its state (complete, partial with blocker, or untested).
- **Pull requests.** This machine's `gh` login may not belong to the repo's account, so don't count on opening PRs from a session. Every pushed `backlog/*` branch must still end up with a PR: on a machine where `gh` is logged in to the right account, run `make backlog-prs`, which opens a PR for each `origin/backlog/*` branch that has none (title and body come from the branch's last commit message, so write that message as the PR description). List every branch you pushed in your report so none are missed.
- **Never merge or push to `main`, and never deploy.** The user reviews and merges.

### Verify before trusting

Backlog and feature docs drift like any other doc. A "still unbuilt" note has turned out to be stale more than once because the fix had already shipped, and a checkmark can be wrong the other way. Check the code before believing either direction, and before deleting a task as already built.
