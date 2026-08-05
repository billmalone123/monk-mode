## What this is
A runner for four already-written prompt files, in the order decided. Work through them one at a time, in this exact order. Do not start the next one until the previous one has fully finished, including its own "Last steps" section and a confirmed push. Do not batch or parallelize them, each one syncs against `origin/master` at its own start and expects the previous one's commit already there.

1. `PROMPT_flexible_messaging.md`
2. `PROMPT_scroll_carousel_fixup.md`
3. `PROMPT_adaptive_split_and_extension.md`
4. `PROMPT_exercise_substitution.md`

## How to run each one
For each file, in order:

1. Open and read the file fully before doing anything, it has its own "Sync first," "Context," "Task," "Verify before pushing," and "Last steps" sections, follow all of them exactly as written.
2. Run its "Sync first" step. Confirm the `git log --oneline -3` check it specifies before writing any code.
3. Do the work described in its "Task" section.
4. Run every check in its "Verify before pushing" section. Don't skip any of them or mark the file done if one fails, fix the issue and re-verify instead.
5. Follow its "Last steps" section exactly: bump the build stamp, commit, confirm a clean `git log --oneline --graph` line, push, and confirm the push actually reached `origin/master` (most of these files ask you to check `git log --oneline origin/master -3` after pushing, do that even if it feels redundant, this queue exists partly because of a prior instance where work landed locally but never reached origin).
6. Write the summary the file's own "Last steps" section asks for at the top of that same file, exactly as the previous prompts in this repo have done, that's the durable record of what happened, not just your final chat message.
7. Only then move to the next file in the list.

## If a file's premise turns out to be stale
Some of these were written expecting a particular prior state. If you sync and find the state has already moved past what a file assumes (for example, if a previous file's changes touched something this one also expected to touch), reconcile in favor of whatever is actually live in `index.html`, note what you changed and why in that file's own completion summary, and continue. Don't stop the queue over it unless the conflict is genuinely unresolvable without a product decision, in which case stop, report exactly where and why, and wait rather than guessing.

## At the end
After all four have landed and pushed, report back:
- Final commit hash on `origin/master`.
- A one-line status per file (done / done with a noted deviation / blocked and why).
- Anything flagged during any file's verification step that's worth a real browser check before trusting it, animation, layout, or touch-interaction claims especially, consistent with the standing caveat on every prompt in this repo: none of this has been checked in an actual browser this session.
