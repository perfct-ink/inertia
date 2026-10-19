## Backlog Mode

Applies when the user says to work on the backlog. It adds an autonomous workflow on top of [backlog.md](backlog.md); where the two overlap, this file wins for how work is delivered (backlog.md's rules on task files still hold).

Don't stop to ask which task to take or to confirm scope. Work through the tasks in `docs/backlog/` one at a time, highest priority first (`p0` before `p1`, and so on), skipping tasks whose `depends_on` files are still in `docs/backlog/`:

- **Work from `main`.** `git fetch` and start each task from an up-to-date `main`. Don't stack work on someone else's branch.
- **Completed task → commit and push to `main`.** Implement it, add tests, update `docs/features/`, and remove the task file, all in one commit with a `git log`-style message. Then `git push origin main`. Pushing `main` deploys to production through GitHub Actions, so only push a task you consider complete and whose checks you could run; say plainly in the commit message and your report which checks you couldn't run.
- **Incomplete task → branch, commit, push.** If you can't finish (a product or privacy call, a risky migration, new infrastructure, an account or secret, or a needed tool that isn't available), put the work so far on a branch named `backlog/<task-filename-without-extension>`, commit it, and `git push -u origin <branch>`. Don't push the partial work to `main`. Record what's done and what's blocking in that task's own file on the branch (a `Blocked` section, plus `branch:` frontmatter). Leave the task file in place on `main`.
- **Don't edit other tasks' files or any shared index** when recording a blocker.
- **Build the conservative version.** When a call is genuinely the user's, build the cautious option behind the blocker note rather than guessing silently, and document the choice in the feature doc.
- **Keep going.** After each task, pick the next unblocked one. Stop only when every remaining task is blocked or done, then report each task with its state: pushed to `main` (complete), pushed on a branch (partial, with the blocker), or untested.
- **Pull requests.** This machine's `gh` login may not belong to the repo's account, so don't count on opening PRs from a session. Every pushed `backlog/*` branch should end up with a PR: on a machine where `gh` is logged in to the right account, run `make backlog-prs`, which opens a PR for each `origin/backlog/*` branch that has none (title and body come from the branch's last commit message, so write that message as the PR description). List every branch you pushed in your report so none are missed.
- **Never deploy by any other route**, and never force-push `main`.

### Verify before trusting

Backlog and feature docs drift like any other doc. A "still unbuilt" note has turned out to be stale more than once because the fix had already shipped, and a checkmark can be wrong the other way. Check the code before believing either direction, and before deleting a task as already built.
