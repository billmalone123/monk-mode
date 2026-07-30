> **DONE — build 7.18, commit `550d698`, pushed.**
>
> **Where it lives.** New `#tab-calendar` section sits after `#tab-running` in the markup, with a matching `#tab-btn-calendar` nav button following the existing `.nav-tab` pattern, and `'calendar'` added to `MAIN_TABS` so `goTab()` handles show/hide, the active nav state, the dark training chrome and the last-tab restore with no special-casing. The tab holds a `.calfull-nav` header (prev arrow, "Training Week N of 10" plus that week's date range, next arrow), a `.calfull-weekbtns` row of ten direct-jump buttons, then the same `.cal-grid` of seven day cells and the same explanatory note the Overview widget uses.
>
> **Week navigation.** Three ways in, all the same path: the prev/next arrows call `stepCalendarWeek(±1)`, the ten W1–W10 buttons call `setTrainWeek(n)` directly, and both end up in `setTrainWeek`, which is still the single source of truth. The arrows disable at either end rather than wrapping. The tab opens on whatever week is already selected app-wide — `goTab('calendar')` only renders, it never sets a week.
>
> **No forked logic.** `calRunCells(monday)` already took a Monday, so it needed no generalising, only a second caller. The seven-cell build was pulled out into one `calWeekGrid(monday)` used by both surfaces, and the note text into `calNoteText(runs)`; the Overview widget's inline copy of that markup is gone. Verified directly: with the current week selected, the tab's grid HTML and the widget's grid HTML are byte-identical (1624 chars each).
>
> **Sync confirmed in both directions.** Changing the week in the Calendar tab moves the hero ring, the Overview preview tabs and their `#winfoN` cards, and the Train tab's selector — `syncWeekDisplays` gained the `.cal-week-btn` row and a `renderCalendarTab()` call. Changing it from any of those three updates the Calendar tab too. Tested across all ten weeks in both directions, plus clamping at both ends and the disabled-arrow states.
>
> **One design problem found and fixed mid-build.** My first pass derived each week's dates as "this Monday shifted by (n − currentTrainWeek)", which is self-consistent but meant the selected week was *always* the current calendar week — so W1, W5 and W10 all rendered the same dates and prev/next was useless as a browse control. The tests passed because I had not asserted that weeks differ. Replaced with a session-held anchor: whichever week is selected at load pins week 1 to a Monday, and that anchor holds while browsing, so all ten weeks now have distinct dates seven days apart. A reload re-derives it from wherever you have since said you are, which is the right reading of "I'm on week 6 now".
>
> **Overview widget unchanged**, still current-week only, now with a "View full calendar →" button that jumps to the tab.
>
> **Suites:** calendar tab, chart, week sync, Run tab (89/90 exact), 19/19 stress, 10/10 prior calendar states, all adaptive-logging states. Both script blocks parse, four tab sections, four nav buttons. Not opened in a browser — extension not connected — so this is verified by driving the real render and state functions against a stub DOM.
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

## Context
There's already a combined lift+run calendar, but it's a small embedded widget at the top of `#sec-overview` (inside the Info tab) that only ever shows the current week, built by `calRunCells()` + `renderWeekCalendar()` around `CAL_WEEK`. There's also a shared week-selection system from a recent build: `setTrainWeek(n)` is the single source of truth for "which of the 10 weeks am I looking at," and `syncWeekDisplays(n)` propagates that to the hero ring, the Overview preview tabs, and the Train tab's own buttons.

The user wants this promoted into a full standalone tab, not just the current-week snippet. Read both of the above implementations first, this task reuses their rendering logic rather than duplicating it.

## Task
Add a fourth main tab, "Calendar," alongside Info, Train, and Run (`MAIN_TABS`, `goTab()`, a new `#tab-calendar` section, a new nav button following the existing `.nav-tab`/`#tab-btn-*` pattern).

This tab shows the same combined day-by-day view the Overview widget already renders (lift session and run stacked per day), but for whichever week is selected, not just the current one, with prev/next controls (or reuse the existing week-tab button row pattern, your call on whichever reads better in a full-tab layout vs. the compact Overview widget). Wire it into the same shared state as everything else: changing the week here calls `setTrainWeek(n)` / triggers `syncWeekDisplays(n)`, so navigating weeks in the Calendar tab also moves the hero ring, the Overview tabs, and the Train tab's selector, and vice versa, changing the week from any of those other three surfaces updates what the Calendar tab shows too.

Keep the existing Overview widget as is, don't remove it, it's still useful as an at-a-glance current-week preview on the main page. Add a small link or button on it ("View full calendar" or similar) that jumps to the new Calendar tab. The Calendar tab itself should open on whatever week is currently selected app-wide, not always reset to week 1.

Reuse `calRunCells()` for computing each day's lift+run content, generalize it to accept a week index instead of assuming current week if it doesn't already take one as a parameter. Don't fork a second copy of that logic, one function, two callers (the Overview widget and the new tab).

## Verify before pushing
1. New Calendar tab appears in the nav, opens correctly, closes correctly, doesn't break the existing three-tab cycle.
2. Every week 1 through 10 (plus Week 0 if applicable) renders correctly in the Calendar tab, matching what the Overview widget would show for that same week if you manually set the app to it.
3. Changing weeks from the Calendar tab updates the hero ring, Overview tabs, and Train tab selector. Changing the week from any of those three updates what the Calendar tab shows on next visit.
4. Overview widget still works exactly as before, still shows current week only, new link to the Calendar tab works.
5. No console errors, both script blocks parse, all existing suites (Run tab worked example, stress permutations, prior calendar states, adaptive logging, week sync) still pass unchanged.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: where the new tab lives in the markup, how week navigation works inside it, and confirmation that it stays in sync with the other three week displays in both directions.
