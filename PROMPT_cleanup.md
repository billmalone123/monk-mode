## Sync first
```
git fetch origin
git reset --hard origin/master
```

## Task
Three loose ends from the last two sessions, clean them up:

1. Add `.claude/` to `.gitignore` (create the file if it doesn't exist). It's local tooling config, shouldn't be tracked. If it's currently tracked in the repo, remove it from tracking (`git rm -r --cached .claude`) but leave the actual folder on disk.

2. Delete the `backup-stale-run-attempt` branch, both locally and on origin if it was ever pushed (`git branch -d backup-stale-run-attempt`, and `git push origin --delete backup-stale-run-attempt` if it exists remotely). It was a safety copy of an old attempt built against pre-rebrand code, already superseded, nothing in it is needed.

3. Leave `PROMPT_running_generator.md`, `PROMPT_combined_calendar.md`, and this file as they are, tracked in the repo as a record of what was built and why. No action needed on these.

Do not touch `index.html`, `manifest.json`, or `sw.js`. This is a housekeeping-only task, no app logic changes. Commit with a clear message, confirm `git log --oneline --graph -5` is a clean line, push.
