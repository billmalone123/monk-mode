> **DONE — build 7.12, commit `9e0e3bd`, pushed.**
>
> **What was built:** a combined week calendar showing the lift session and the run for each day of the current week in one place, so Monday reads "1A Chest + Back" with "4mi easy" stacked underneath instead of requiring two tabs.
>
> **Where it lives:** top of `#sec-overview`, above the existing "10 WEEKS. NO EXCUSES." week-tab block, which is untouched and still below it. Markup is the `.cal-head` / `#weekCalendar` / `#calNote` trio; styles are the `.cal-*` block at the end of the second `<style>` (matches `.week-info` card treatment — `var(--card)`, 16px radius, left accent rule). Logic is `CAL_WEEK` + `calRunCells()` + `renderWeekCalendar()` in script block 1, just above `// INIT`. It re-renders on load, on any Run-tab input change, and on training-week change.
>
> **Two assumptions, because the app does not store either.** (1) The split has exactly seven slots (3 on, 1 off, 3 on) and the hero ring already counts them as a 7-day week, so they map straight onto Mon–Sun: Mon 1A, Tue 2A, Wed 3A, Thu Rest, Fri 1B, Sat 2B, Sun 3B. (2) Dates come from the real calendar week containing today, since the training-week selector is manual and carries no program start date — so the week number labels the week, and the dates never drift.
>
> **Test states.** (1) *Both plans populated, mid-program (train week 5, Wed Aug 19 2026):* all seven cells correct, lift on six days, Thu rest, runs on Wed/Fri/Sat/Sun, today highlighted. Cross-checked against the Run tab for the same dates — they agree. (2) *Lift only, never opened the Run tab:* seven lift cells, no runs, note switches to "no race plan yet", no errors. (3) *Boundaries — training week 1, week 10, and deload week 4:* no date drift, no throw; week 4 correctly labels "· Deload". Also covered today-is-Monday, today-is-Sunday, race week, the week after the race, and a corrupt race date — all degrade to lift-only without throwing. All ten states pass with zero `undefined`/`NaN`/`[object Object]` in the rendered output and no empty cells.
>
> **One bug found and fixed while testing:** in race week the generator refuses to build a block (correctly — under 7 days out), which made the calendar silently drop *all* running including race day itself. `calRunCells()` now falls back to the stored race date and still shows "RACE: half marathon" on the right day.
>
> **Known cosmetic inconsistency, not introduced here:** the Run tab lets you pick a "lifting rest day" (defaults Sunday) while the split's own rest day under the mapping above is Thursday. The calendar reports the split truthfully. Worth reconciling one day, but it needs a shared lift-day model, which is new merge logic and out of scope for this task.
>
> **Regression:** the Run tab worked example still reproduces 89/90 cells exactly and all 19 stress permutations pass after the small `runCellText` → `runCellBody` refactor that lets both views share one source of truth. Train tab markup and logic are untouched (zero diff hunks in that path).
>
> ---
>
## Sync first
```
git fetch origin
git reset --hard origin/master
```
Confirm you're on the current commit before starting (`git log --oneline -3`).

## Context
No one is watching this session. Work carefully, verify before pushing, and if you hit a real ambiguity, make the reasonable call and write down what you assumed rather than stalling. Don't push if anything throws a console error or leaves undefined/NaN visible in the rendered output, if that happens leave the commit local and write a clear note at the top of this file explaining what's broken instead.

The running plan generator and lift/run merge logic already work and are live (confirmed working by the user just now). This task is a pure display feature on top of data that already exists, it should not need new merge logic, only a new way of showing what's already being computed.

## Task
Right now, the lift plan and the run plan render in two separate tabs (Train and Run), each showing their own schedule. Build one combined weekly calendar that shows both together, day by day, so someone can look at one place and see "Monday: 1A Chest+Back + 4mi easy run" instead of checking two tabs.

Placement: on the main/info tab (`#tab-info`), near or replacing the existing "Week Overview" block inside `#sec-overview`. This should be one of the first things a user sees, it's the whole point of combining the two plans. Read that section's current markup first, match its visual style (cards, spacing, typography) rather than importing a different look.

Scope: current training week only, 7 day cells (Mon through Sun), not all 10 weeks in this view, that's what the Train and Run tabs are for individually. Each day cell shows:
- Day name and date
- The lift session for that day, if one is scheduled (e.g. "1A Chest+Back"), pull this from whatever the existing training week/day logic already uses to know which lift session lands on which day
- The run for that day, if one is scheduled (e.g. "4mi tempo"), pull this from `runPlan`/the existing run schedule generation
- If a day has neither, show it as a rest day plainly, don't leave it blank/empty looking broken
- If a day has both, stack them in one cell, lift session on top, run underneath (matches the user's ask: "if you're hitting day one, chest and back, just put what run it is that day on top of it")

Update live: if the user hasn't entered a run plan yet, this calendar should still work and just show lift-only days, don't require the run plan to exist. Same the other direction if somehow lift data is missing, degrade gracefully, never throw.

## Verify before pushing, all of these, in order
1. State where run plan exists and lift plan exists, both populated, current training week mid-program. Every day cell should show the right combination, cross check a few days by hand against what the Train tab and Run tab show separately for those same days, they must agree.
2. State where lift plan exists but no run plan has been entered yet (fresh user who hasn't touched the Run tab). Calendar should show lift-only, no runPlan errors in console.
3. State where the training week is the very first one (week 1) and the very last one, make sure day-to-date math doesn't drift or throw at the boundaries.
4. Confirm no console errors, no undefined/NaN/[object Object] visible anywhere in the rendered calendar, across all three states above.
5. Confirm the existing Train tab and Run tab still render correctly and unchanged, this is additive, it should not touch how those two tabs work on their own.

## Last steps
Bump the build stamp. Commit with a clear message describing what was added. Confirm `git log --oneline --graph -5` shows a clean line, no merge commit, then push so Vercel picks it up.

When done, leave a short summary at the very top of this file (above this line) covering: what you built, where exactly it lives in the markup, the three test states and what you saw for each, and the commit hash. That way the person coming back from their workout can read one paragraph and know whether this is done or needs a look.
