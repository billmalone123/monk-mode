> **DONE — build 7.16, commit `3689bb9`, pushed.**
>
> **First, a correction: the bug described in this prompt did not exist.** I ran the exact greps before touching anything and all three "missing" things were present on `origin/master` at `80c63f5` — `function setTrainWeek` (line 3741) and `function highlightTrainWeek` (3750), `currentTrainWeek` assigned in four places (declaration, import, the setter, and the load restore), and `TRAIN_WEEK_KEY` declared, written and read back. The Training Week selector worked: clicking a Train tab button set the week, persisted it, re-rendered the lift rows, and — through a wrapper in the second script block — updated the hero ring and the calendar header too. So Part 1 was already done, and I did not fabricate a fix for it. What follows is Parts 2 and 3, which were genuinely missing.
>
> **What was actually broken.** `selectWeek(idx, btn)` — the Overview's ten preview tabs — wrote to a *separate* `currentWeek` variable and never called `setTrainWeek`. That variable was assigned in exactly one place and read nowhere, so the Overview tabs were pure cosmetics: clicking Week 7 there flipped a description card and changed nothing else. The reverse direction was missing too — setting the week from the Train tab never moved the Overview's active tab or visible `#winfoN`. And on load, the restored week highlighted the Train button but left the Overview hardcoded on Week 1, so a reload on week 6 showed week 6 in two places and week 1 in a third.
>
> **Both directions now sync.** One setter, `setTrainWeek(n)`, is the single source of truth: it clamps and integer-parses its input, sets `currentTrainWeek`, keeps the now-vestigial `currentWeek` aligned, persists to localStorage *and* the IndexedDB mirror (`trainWeek`, which the app was mirroring for every other store but not this one), re-renders the lift rows and progress cards, then calls `syncWeekDisplays(n)` which updates the Train buttons, the Overview tabs, the `#winfoN` cards, the hero ring number and the calendar header together. `selectWeek` is now a one-line delegate. The old wrapper IIFE that re-patched `setTrainWeek` to add the ring and calendar renders is gone, since the setter does that itself. Verified by driving the real functions against a stub DOM: 10 Overview clicks and 10 Train clicks each move all three displays, in both directions, plus persistence, out-of-range and junk input (`-3`, `99`, `"4"`, `null`, `NaN`, `3.9` all clamp sanely).
>
> **What being "broken" had been silently affecting — checked honestly, and the answer is nothing.** Because `currentTrainWeek` was in fact a real, assigned, persisted integer, the fourteen readers keyed off it were all behaving correctly the whole time: `isDeloadWeek(currentTrainWeek)` in `getSessionTarget`, `entryForWeek` / `prevWeekEntry` for per-week history and variant filtering, the `week:` field stamped onto every saved set, `clearDayLogs`'s week filter, `hasLogsForDay` for the ring, and `liftWeekFor` in the calendar's deload marker. I re-ran all four existing suites after the change and they are unchanged. The one thing that genuinely *was* wrong is the Overview desync described above, which was cosmetic — no logged data or deload calculation ever depended on `currentWeek`.
>
> **Run week vs training week labelling.** The Run tab is untouched and still computes purely from today against the stored race date. In the combined calendar header the two now sit side by side, deliberately unlike each other: **"Training Week 5 of 10"** in accent weight (a pointer you set, 1-of-10) next to a muted **"Race in 6 weeks · Sat Sep 26"**. I did not use a "Race Week N" counter, which was my first attempt — because the run plan is rebuilt from today on every render, that index always resolves to week 0 or 1 and would have been actively misleading. A countdown is fixed to the calendar and cannot drift. It reads "Race this week · Sat Sep 26" inside race week, "Race done · …" after, and hides entirely when no race date is set.
>
> **Suites:** week sync all pass, Run tab 89/90 exact, 19/19 stress, 10/10 calendar states, all adaptive-logging states. Both script blocks parse. Not opened in a browser — the extension is not connected here — so the DOM work is verified by driving the real functions against a stub, not by clicking.
>
> ---
>
## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting.

## Context, read this before touching anything
This task has two parts because the second depends on fixing something that's currently broken, not just disconnected.

**Pre-existing bug, confirm it yourself first:** `grep -n "function setTrainWeek\|function highlightTrainWeek"` returns nothing, but the ten `.train-week-btn` buttons in the Train tab call both on every click (`onclick="setTrainWeek(0);highlightTrainWeek(0,this)"` etc). `grep -n "currentTrainWeek\s*="` also returns nothing, the variable is read in ~8 places (exercise history lookups, deload checks) but never assigned, and there is no `TRAIN_WEEK_KEY` or equivalent anywhere for persisting it. The Training Week selector does not work right now. This needs an actual implementation, not a reconnect.

**What currently exists and does work, three separate week concepts:**
1. The hero ring at the top of the Info tab, `#ring-week-num` / `#ring-week-label`, static text right now, nothing updates it.
2. The Week Overview preview tabs (`.week-tab`, `onclick="selectWeek(idx,this)"`), which only toggle which `#winfo0`...`#winfo9` description card is visible. Purely cosmetic, touches nothing else.
3. The combined week calendar's `#calHeadWeek` label ("Training Week 1"), which per its own build notes already re-renders "on training-week change", but since `currentTrainWeek` was never actually being set, check what it's really been displaying, it may have been silently stuck.

Separately, the Run tab's week is calendar-derived from today's date against the stored race date, not a manual pointer at all, it is not the same kind of "week" as the three above.

## Task

### 1. Fix the Training Week selector for real
Implement `setTrainWeek(n)`: set a real `currentTrainWeek` variable, persist it (new `TRAIN_WEEK_KEY`, localStorage plus the IndexedDB mirror the app already does for sessions/maxes/variants/runPlan/runLogs), and on page load restore whatever was last saved instead of defaulting silently. Implement `highlightTrainWeek(n, btn)` to update `.train-week-btn.twb-active` the way the CSS already expects (that class and its styling exist, `.twb-active` at line ~1582, just nothing sets it correctly right now beyond the initial hardcoded button).

### 2. One shared "current week" state, not three independent ones
Make `setTrainWeek(n)` the single source of truth, and have it drive all three displays together:
- Update `#ring-week-num` to `n + 1` (matching the "1 / 10 WEEKS" 1-indexed display)
- Update the Week Overview's active `.week-tab` and visible `#winfoN` card to match, reusing whatever `selectWeek` already does for that toggle, just triggered from the shared setter instead of only from its own click handler
- Update `#calHeadWeek` ("Training Week N")

Then make `selectWeek(idx, btn)` itself call `setTrainWeek(idx)` (in addition to whatever cosmetic toggle it already does), so clicking a week in the Overview preview actually becomes a real change, not just a local display flip. Result: clicking a week anywhere, the Overview tabs, the Train tab's own buttons, should update all three displays identically, regardless of which one the user clicked.

### 3. The run week stays separate, don't force it into the same pointer
The Run tab's week is computed from today's real date against the stored race date, it isn't something a user manually picks the way `currentTrainWeek` is. Don't make `setTrainWeek` override it. Where it's reasonable to show both numbers together without confusing them (the combined calendar header is the obvious spot, since it already displays lift and run content side by side), consider labeling them distinctly, e.g. "Training Week 3" next to something like "Race Week 5" or whatever's clear, rather than one ambiguous "Week" label covering two different systems. Use your judgment on exact wording, the important part is that a user looking at it can tell these are two different clocks, not one number that happens to be wrong half the time.

## Verify before pushing
1. Click through Week Overview tabs 1 through 10 in sequence, confirm the hero ring number, the Train tab's active button, and `#calHeadWeek` all update to match on every click.
2. Click through the Train tab's own W1 to W10 buttons, confirm the same three things update, and the Overview's active tab and visible `#winfoN` card follow along.
3. Reload the page after selecting week 6 from either surface, confirm it comes back on week 6, not reset to week 1.
4. Confirm exercise history, deload-week detection, and anything else keyed off `currentTrainWeek` still behaves correctly now that it's a real persisted value instead of undefined, this touched code that other logic depends on, check for regressions there specifically.
5. Confirm the Run tab and its calendar-derived week are unaffected by any of the above, still computing from today's date and the race date as before.
6. No console errors across all of this. Both script blocks parse.

## Last steps
Bump the build stamp. Commit with a clear message that's honest about this being a bug fix plus a feature, not just a feature. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: confirm the three displays sync correctly in both directions, note anything `currentTrainWeek` being broken had been silently affecting (check the deload and history logic honestly, don't just confirm the happy path), and how you labeled the run week vs training week distinction where they appear together.
