> **DONE — build 7.14, commit `c75810b`, pushed.**
>
> **Where the logging inputs live.** Inside each run-day cell of the Run tab's weekly grid, appended by `runLogInputsHTML(c)` from `runWeekHTML`. Four fields in two rows — Miles, Time, Avg HR, Feel 1–10 — using `.run-log-group` / `.run-log-label` / `.run-log-input`, the same treatment as the lift side's `.log-inline-*` pair, scaled down for the grid (which widened from 134px to 172px columns to fit). A computed pace line sits under them. Auto-save mirrors the lift pattern exactly: `onRunLogEdit(dateKey)` → 1200ms debounce → `saveRunLog(dateKey)`, no save button. Store is `RUN_LOG_KEY = 'monk_run_logs_v1'`, shaped `{ 'YYYY-MM-DD': { miles, secs, hr, feel } }`, mirrored to IndexedDB alongside sessions/maxes/variants/runPlan and carried in export/import.
>
> **Time, not pace, is the entry field.** A mistyped pace is invisible; a mistyped time is caught the moment the computed pace looks wrong. `clockToSecs` accepts `mm:ss`, `h:mm:ss`, or plain minutes, and rejects junk to `null`.
>
> **Adaptation thresholds as implemented,** applied to build weeks only (taper and race week are prescriptive wind-downs and are left alone), reading the immediately preceding week's block:
> - no logs, or logs with no distance → **planned number stands**, unchanged
> - avg feel **≥ 7** → planned number stands, normal advance
> - avg feel **4 to 6.9** → **hold** at last week's actual logged total
> - avg feel **< 4** → **step back** to `round(actual × 0.875)`, a 10–15% cut
>
> The average is taken over whatever was entered — one logged run out of four is fine and produces a one-entry average. Only weekly target mileage moves; dates, taper length and race day are untouched. The note renders in the week cell as `Held at 24mi, last week averaged 5.2/10`.
>
> **Where the chart lives.** `#runChart`, between the pace panel and the schedule table, built by `runChartHTML(plan)` as hand-written inline SVG — no library, no build step. Grouped bars per week across W0 → race week: planned is an outlined bar (`--field` stroke), logged is a solid cream fill. Y-axis rounds up to a clean multiple of 5 with four gridlines. Styled as a `.run-chart-card` matching the lift side's `.prog-card` (same background, radius, header rule, and header/label type). Carries a Clear Logs control that mirrors `clearDayLogs`'s confirm.
>
> **Test results.** (1) *No logs:* all original numbers, no notes, outline bars only, empty-state message, no junk. (2) *Feel 8.75:* week 2 stays at its planned 20, no note. (3) *Feel 5.3:* holds at 20 — `Held at 20mi, last week averaged 5.3/10`. (4) *Feel 3.3:* steps to 18, a 10% cut inside the 10–15% band — `Adjusted to 18mi…`. (5) *1 of 4 runs logged:* average uses the single entry, no NaN. (6) *Export/import:* logs round-trip byte-identical and reproduce the same adaptation. (7) *Chart edges:* viewBox finite, W0 and the race week both labelled, no negative or NaN coordinates. (8) *No junk* across all six states; `clockToSecs`/`secsToClock` verified both directions including malformed input. Existing suites still green — Run tab 89/90 exact, 19/19 stress, all 10 calendar states.
>
> **Two things worth knowing.** A bug the tests caught: when only one short run is logged, holding at that total can fall below what the week's run days can structurally carry (a 5-day week floors at 11mi), and the note was quoting the requested number while the table showed the floored one. The note now quotes what is actually scheduled and says why — `Held at 11mi … (floor for 5 run days)`. Separately, because the plan always regenerates from today it contains no past weeks, so log inputs appear on the week currently under way — all of its run days, not just today's — with each later week opening as it arrives. Back-filling a week that has already rolled past is not possible; that would need the plan to retain history, which is a bigger change than this task.
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
Confirm `git log --oneline -3` shows the current commit before starting. If any lock file blocks a git command, delete that specific lock file and retry, a previous session (mine, investigating this task) left `.git/index.lock` behind after a failed reset.

## Context
The lift side already has a logging pattern worth mirroring exactly rather than inventing a new one: `onLogEdit(exId)` calling `scheduleAutoSave(exId, false)`, inputs marked up as `.log-inline-group` / `.log-inline-label` pairs (e.g. "Top Set Aim Weight" / "Top Set Aim Reps"), and a `clearDayLogs(dayId)` reset function. Read that implementation first and match its shape: auto-save on entry, same input styling, same persistence approach.

The Run tab and the combined week calendar already exist and work (running plan generator, merge logic, mileage progression). This task adds actual-performance logging on top of the planned schedule, and uses it to adjust future weeks.

## Task

### 1. Per-run logging
For each scheduled run day (in the Run tab's weekly table), add an input group capturing what was actually done:
- Distance (miles), number input
- Pace, either a direct min:sec per mile field or a total time field that computes pace from the logged distance, your call on which is less error prone to enter
- Average heart rate (bpm), optional, number input
- Feel, a 1 to 10 scale, 10 meaning it felt great and could have pushed harder, 1 meaning it was rough, label the ends of the scale so it's unambiguous which direction is "good"

Auto-save on entry, matching the existing `onLogEdit`/`scheduleAutoSave` pattern. Persist logs keyed by date in a new store, something like `RUN_LOG_KEY`, structure is your call but keep it simple: date, miles, pace, avgHR (nullable), feel (nullable). Include this new store in the existing export/import functions alongside `runPlan`, so backup and restore carry it the same way.

### 2. Weekly adaptation
When computing the target for a given week, check the previous week's logged feel scores:

- No logs at all for the previous week: use the originally planned mileage for this week, unchanged. Don't adapt on missing data.
- Average feel 7 or higher: use the originally planned mileage for this week, normal advance.
- Average feel 4 to 6: hold, this week's target mileage equals last week's actual logged total (sum of logged miles, not the originally planned number), same pace targets as last week, no volume increase.
- Average feel below 4: step back, this week's target mileage is roughly 10 to 15 percent below last week's actual logged total, a real recovery signal, not just a hold.

Average the feel score across whatever was logged that week, don't require every scheduled run to have a log entered, partial logging is fine and expected.

This only adjusts weekly target mileage. The calendar dates, taper length, and race day stay exactly where they were originally computed, don't reshape the overall timeline, that's out of scope here.

Show the reasoning next to any week that got held or stepped back, something like "Held at 24mi, last week averaged 5.2/10" or "Adjusted to 21mi, last week averaged 3.4/10", so it's clear why a number changed and not just that it did.

### 3. Mileage chart
Add a chart showing planned vs actual weekly mileage across the full program, Week 0 through the taper/race week. Inline SVG, no external chart library, this is a single-file app with no build step. Two series: the plan's target mileage per week, and the actual logged total per week (sum of logged distances, zero or blank for weeks with nothing logged yet). Style it consistent with the existing progress-card treatment already used on the lift side (the cards tracking this week vs last, trend, all-time gain), read how those are styled and match that visual language rather than introducing a new one. Place it in the Run tab, above or below the weekly schedule table, your call on which reads better.

## Verify before pushing
1. No logs entered anywhere: schedule shows all originally planned numbers unchanged, chart shows only the planned series, no errors.
2. A week logged with feel scores averaging 8 to 10: confirm next week uses the plan's original number, unadjusted.
3. A week logged with feel scores averaging 4 to 6: confirm next week holds at last week's actual total, and the explanatory note appears.
4. A week logged with feel scores averaging below 4: confirm next week steps back 10 to 15 percent below last week's actual, and the note reflects that.
5. A week with only 1 of 4 scheduled runs logged: confirm the average uses just that one entry, no error, no NaN.
6. Export then import: confirm run logs round-trip correctly, nothing lost.
7. Chart renders correctly at the very first week and the very last (taper/race) week, no overflow or broken axis at either edge.
8. No console errors, no undefined/NaN/[object Object] anywhere across all the above states. Existing Train tab, Run tab schedule, and combined calendar all still work unchanged.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, no merge commit, then push.

Leave a short summary at the top of this file when done: where the logging inputs live in the markup, the exact adaptation thresholds as implemented, where the chart lives and how it's built, and the results of each test state above.
