## Summary (build 7.44)

**Every day state now renders identically.** There is no branch left anywhere that decides
whether a cell gets fields. `runWeekHTML()` is now `runCellText(c, plan) +
runLogInputsHTML(c, 'run')` with no condition, and the Calendar tab appends the same block
to every cell. `c.before`, `c.after` and `c.miles` still drive the cell's *plan text*, which
is what they are for; they no longer touch whether it can be logged.

Proved by comparison rather than by inspection, per verify step 6: `sets.js` section 16
picks five **distinct** cells — a day earlier this week (the `c.before` case that started
this), today, a future day, a day from a fully elapsed prior week, and a day that was never
a scheduled run — normalises out the date and the prefilled values, and asserts all five
markup strings are **byte-identical**. Same generator, same shape, not three code paths that
resemble each other. It also asserts each carries its own distinct date, so the comparison
is not accidentally comparing a cell with itself.

**The 7.43 link approach is removed, not left alongside.** `logRunAnyway()`,
`runBackfillLinkHTML()`, the `+ log a run anyway` / `edit logged run` markup and the
`.run-backfill` CSS are all gone from the file — asserted by regex over the source, so they
cannot survive as unreferenced dead code. The `loggable` gate is gone too.

**Where the "no future logging" rule lives: `saveRunLog()`, at save time only.** A future
date renders the identical four fields; the write is refused and the cell's own pace slot
says "Not yet — you have not run this one". Nothing about the rendering differs.

**Two bugs uniform rendering would otherwise have caused, fixed here:**

1. *Silent data loss.* `saveRunLog(k)` read its values with
   `document.getElementById('rl-<field>-<date>')`. The moment the same date renders on two
   surfaces those ids collide and the lookup returns whichever rendered first — so typing on
   the Calendar tab would have saved the Run tab's empty fields over the entry. Ids are now
   namespaced per surface (`rl-run-…`, `rl-cal-…`, `rl-missed-…`) and `saveRunLog(k, root)`
   reads the `.run-log` block that was actually typed in. `syncRunLogCells()` then pushes the
   saved values into every other copy of that date on screen, skipping the focused field, so
   the surfaces cannot disagree.
2. *The field vanishing mid-entry.* `saveRunLog()` called `renderRunPlan()`, which rewrites
   `#runSchedule` — and the debounce fires 1200ms after you stop typing, comfortably inside a
   single entry. The input being typed in was destroyed and rebuilt. Any full re-render is
   now held while a run-log field has focus and runs on `focusout` instead. This is very
   likely part of "never to go blank".

**Calendar tab no longer keys off the regenerated plan.** `calRunCells()` is still used for
the run *description* only. The log block is keyed off each cell's own real date
(`runLogInputsHTML({ date: date }, 'cal')`), so a fully elapsed week logs like any other.

**The `#runMissed` "+ Log a missed run" control is now fully redundant** — every date the
Run tab and Calendar tab display has its own inline fields, and the Calendar tab reaches any
historical week. It has been left in place as instructed and still works (it renders under
its own `missed` scope). Its old "that day is already on the plan above" guard was removed:
it keyed off the pre-scope id and, with uniform rendering, would now fire for every visible
date. **Say the word and it can go.**

One judgement call: the Overview tab's week widget shares `calWeekGrid()` but was left as a
summary without inputs, since the task named the Run tab and the Calendar tab. It is one
argument away (`{ logs: true }`) if you want it there too.

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 245/0,
CSS balanced.

**Not seen in a browser.** The extension wedged again before this could be loaded, so the
five cell types have been proved identical as markup but not looked at on screen — and a
log block on all seven cells of a week is a real density change worth eyeballing.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include build 7.43 (the `c.before` fix and the "+ log a run anyway" link) or newer.

**This prompt supersedes `PROMPT_fix_locked_run_days.md` entirely, including the Calendar-tab task still sitting in that file. Don't run that file separately, everything it still needed is folded in here.**

## Context
Build 7.43 found a real bug: `buildRunWeeks()` sets `before: date < block.start`, and because the plan regenerates from today, week 0's `block.start` is today itself, so every earlier weekday of the *current* calendar week (Monday, Tuesday, on a Wednesday) was incorrectly flagged `before: true` and rendered with no inputs, even though that day is not actually in the past relative to the plan. That diagnosis was correct and the bug was real.

The fix it shipped was not what Billy wants, and he's now confirmed that directly after actually trying it: every dead cell got a small "+ log a run anyway" link that force-opens the separate missed-run control (`logRunAnyway()` → `onMissedDatePick()`) instead of showing the log fields in place. The data path works, he confirmed that, but the result is a calendar where some days show real inline fields and others show a link that pops a different control, an inconsistent shape from one cell to the next. His words: "I want it to be the same output throughout. Not to change, never to go blank, never to have to add another run. Just past, present, futures, all the same logs." He is asking for zero structural difference between any two day cells, not a workaround that reaches the same data through a different door.

## Task
1. **Remove every conditional branch that decides whether a cell gets input fields.** No `loggable` check, no `c.before`, no `c.after`, no `c.miles > 0`, no `weekStarted`. Every day cell — on the Run tab's rolling schedule (`runWeekHTML()`) and on the Calendar tab (`renderCalendarTab()`/`calRunCells()`) — renders the exact same `runLogInputsHTML()`-shaped markup, unconditionally, for every date, past, present, or future.
2. **Retire `logRunAnyway()` and the "+ log a run anyway" / "edit logged run" link entirely**, markup and function both, don't leave it as unused dead code. Uniform rendering replaces the reason it existed.
3. **If a "no logging a run in the future" rule is still worth keeping**, implement it as a save-time check inside the existing commit handler, something that declines to persist and says why, not as a different rendering path, a hidden field, or an absent input. Every cell must look and be structured identically regardless of date; only what happens on save may differ for a future date, if you keep that rule at all.
4. **Stop keying the Calendar tab's run inputs off `generateRunPlan()`/`calRunCells()`'s regenerated plan**, since that generator has no memory of elapsed weeks and cannot be the source of truth for a tab that shows fixed historical dates. Key the fields off the tab's own real date for each cell directly.
5. The separate "+ Log a missed run" control (`#runMissed`) is now fully redundant on both fronts, not just for out-of-window dates. Leave it in place, don't remove it without being told to, but say so plainly in the summary.

## Verify before pushing
1. Pick five representative cells: a day earlier this week (the `c.before` case that started this), today, a future day later this week, a day from a fully elapsed prior week, and a day that was never a scheduled run day anywhere. Confirm all five render **identical field markup**, same shape, same structure, no link, no popup, no missing element on any of them.
2. Confirm logging on the past/present ones actually saves and survives a reload.
3. Confirm whatever future-date rule you kept (if any) is enforced only at save time, and doesn't change what's rendered.
4. Confirm this is true in both places, the Run tab's own schedule and the Calendar tab.
5. Confirm `logRunAnyway()` and its markup are actually removed, not just unreferenced.
6. No console errors, both script blocks parse, all existing suites pass, plus new coverage that directly compares the rendered markup of a past cell, today's cell, and a future cell and asserts they come from the same generator with the same shape, not three different code paths that happen to look similar.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: explicit confirmation that every day state (past, present, future, scheduled, unscheduled) now renders identically, confirmation the link-based approach from 7.43 was removed rather than left alongside the new behavior, and where the "no future logging" rule (if kept) ended up living.
