## Summary (build 7.39)

**Where it landed: a "Log a missed run" control on the Run tab, not the Calendar tab —
and the Calendar tab was genuinely checked first, not skipped.**

The Calendar tab (`renderCalendarTab()`, which draws `calWeekGrid(trainWeekMonday(n))`
for whichever of the 10 training weeks is selected) does render past weeks by real date,
and its cells carry no log inputs — so far so good. But it cannot host this. Its run
detail comes from `calRunCells(monday)`, which calls
`generateRunPlan(readRunInputs(), startOfToday())` and then filters the result to the
week being drawn. For a week that has already elapsed the regenerated plan has no cells
in that range at all, so `calRunCells` returns null and past weeks render **lift days
with no runs on them**. That removes the very thing task 1 wanted to gate on — there is
no "was a scheduled run day" to test, because the generator has no memory of it. The
alternative, putting log inputs on all seven days of every past week, is clutter rather
than the low-key affordance the task asked for. So it went to the Run tab, which is
exactly the fallback task 2 describes.

**No new storage and no second logging mechanism.** The control renders the *same*
`runLogInputsHTML()` used by the in-plan cells. That markup already emits inputs with
`rl-<field>-<datekey>` ids carrying `onRunLogEdit`/`onRunLogCommit`, and `saveRunLog(k)`
reads exactly those ids — so writing through `runLogs`/`persistRunLogs()` happens with
zero new code on the save path. Asserted, not assumed: the suite checks the rendered
markup contains `onRunLogCommit(this.dataset.k)` rather than a new handler.

Two details worth recording:

- The block sits **outside** every container `renderRunPlan()` rewrites (`#runFlags`,
  `#runPaces`, `#runChart`, `#runSchedule`). Saving a log calls `renderRunPlan()`, which
  would otherwise blow the control away mid-entry.
- If the picked date is **still on the plan above**, its inputs already exist in the DOM
  under those same ids. Rendering a second copy would duplicate ids and `saveRunLog()`,
  which reads by `getElementById`, would silently bind to whichever came first. So that
  case renders nothing, says "still on the plan above — log it there", and scrolls the
  real row into view. Covered by a test.

**A past, fully-elapsed week persists and reaches the totals.** `sets.js` section 12 logs
a run 26 days back — first asserting that date really is absent from every `plan.weeks`
cell — saves 6.2 mi / 52:00 / feel 7 through the shared handler, confirms it lands in
`runLogs` under the plain date key with the time parsed to 3120s, reloads from storage,
and confirms a date-range scan over `runLogs` (the same shape the mileage/summary code
uses) picks up the 6.2 miles. Future dates still render no inputs and say so.

**The rolling generator was not touched.** No edit to `generateRunPlan()`,
`buildRunWeeks()`, or the window computation; the suite asserts
`generateRunPlan(inp, today)` and the `buildRunWeeks(today, ...)` call site are both
still intact in the file.

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 101/0
(15 new), CSS balanced.

**Not verified in a browser.** The Chrome extension disconnected partway through this
build. The service-worker cause of the earlier wedging *was* found and worked around
(serve a copy with no `sw.js` beside it, so registration 404s into its own `.catch`) —
that part is solved and reusable — but the extension itself then dropped. So the
collapsed control, the date picker, and the rendered fields have not been seen on screen.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include whatever build `PROMPT_rep_range_explanations.md` produced or newer.

## Context
Read this carefully before touching anything, the actual gap is narrower and different from "past days are blocked."

Within the Run tab's current week, a day that already passed is **not** blocked. `runWeekHTML()` (around index.html:5996) gates log inputs with `loggable = !c.before && !c.after && c.miles > 0 && weekStarted`, and `weekStarted` just means the current week has begun — it does not check the individual day against today. So Monday's run is already loggable on Thursday of the same week. That part works.

The real gap: `generateRunPlan()` (index.html:5653) builds its weeks by calling `buildRunWeeks(today, race)` — the plan is **regenerated from today forward to race day every time**, and the comment already on `runWeekHTML()` says it plainly: "The plan is always regenerated from today, so it has no past weeks." Once a week fully ends and the calendar rolls to the next one, that old week is not in `plan.weeks` anymore, at all. There's no cell to attach a log input to, so a run from last week (or earlier) has nowhere to go on the Run tab, not because it's disabled, but because the row it would live in no longer exists in the generated model.

This is a rendering gap, not a storage one. `runLogs` (index.html:5429) is keyed by plain date string with zero restriction on what can be written, and `onRunLogEdit`/`onRunLogCommit`/`persistRunLogs()` will happily save a log for any date you hand them. Mileage totals that read from `runLogs` (the block-summary code around index.html:5635 that sums `miles`/`feel` by scanning `runLogs` keys against a date range) already work off the storage directly, not off which weeks the generator currently has in memory. So the fix does not need to touch `generateRunPlan`/`buildRunWeeks` at all, and shouldn't: regenerating the plan to retain real historical weeks would be a much bigger change than what's actually being asked for, and this app already has a whole adaptive-week-generation system built around "always compute forward from today," changing that premise risks breaking it.

There is also a separate full Calendar tab (`renderWeekCalendar()`, index.html:6557) that shows all 10 training weeks by fixed date, including past ones, unrelated to the Run tab's rolling generator. Check first whether it currently has any run-logging input on it at all, or just displays labels. That matters for where the fix belongs.

## Task
Give someone a way to log a run for a day that's already passed, even once that week has scrolled out of the Run tab's current rolling view. Reuse exactly what already exists, no new storage mechanism:

1. **Check the Calendar tab first.** If it already renders past days with real dates and currently shows no log inputs, that's the more natural home for this, since it already displays the historical dates the Run tab's generator no longer has. Wire in the same `runLogInputsHTML()` markup and the same `onRunLogEdit`/`onRunLogCommit` handlers already used on the Run tab, gated only by "this date is today or earlier and was a scheduled run day," not by anything from the rolling `plan.weeks` model.
2. **If that doesn't fit cleanly**, add a small, plainly-labeled "Log a missed run" control directly on the Run tab instead: a date field (any date up to and including today) plus the same four fields (miles, time, avg HR, feel) already used elsewhere, writing through the exact same `runLogs`/`persistRunLogs()`/`onRunLogEdit`/`onRunLogCommit` path. Don't build a second logging mechanism, it's the same four fields, the same storage, just not gated by which week the generator currently has loaded.
3. Either way: keep it simple and low-key, matching the standing rule from the last two builds. This is for the rare case of a late log, not a feature someone should trip over by accident. A single unobtrusive entry point is enough, this doesn't need its own prominent section.
4. Do not modify `generateRunPlan()`, `buildRunWeeks()`, or how the rolling week window is computed. That's out of scope and risks the adaptive-plan logic already built around it.

## Verify before pushing
1. Log a run for a date from a week that has already fully passed (not just an earlier day in the current week, an actual prior week). Confirm it saves into `runLogs` and reads back correctly on reload.
2. Confirm that logged entry is picked up by the existing mileage/summary calculations that scan `runLogs` by date range, the same as any other logged run, since those already read storage directly.
3. Confirm today's and future days behave exactly as before, no regression to the existing within-week logging or the "you cannot log a run in the future" behavior.
4. No console errors, both script blocks parse, all existing suites pass, plus new coverage for logging a date outside the current rolling window.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: where the fix landed (Calendar tab vs. a new Run tab control, and why), confirmation a run logged for a past, fully-elapsed week actually persists and shows up in mileage totals, and confirmation nothing about the rolling plan generator itself was touched.
