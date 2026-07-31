> **DONE — build 7.31, commit `c182de0`, pushed.**
>
> ## The maxes screen no longer needs the button
>
> Each of the three fields now saves on its own — debounced at **1200ms** to match set logging, with an **immediate commit on blur**. `Save & Enter` stays as the forward action and now calls exactly the same `commitMaxes()` the autosave does, so tapping it after the debounce has already fired is a no-op rather than a second, divergent save path.
>
> **Leave-without-saving test:** typed 315 / 225 / 70, never tapped the button, reloaded the page from scratch — `squat=315 bench=225 ohp=70`. Tapping `Save & Enter` afterwards on already-saved values still closed the modal, moved to the Train tab, left the values intact and updated the max chip to "315 lbs".
>
> ## Three more found, two cleared
>
> **1. Top Set Aim Weight / Reps — the one you flagged, and it was worse than "might not persist": it persisted nowhere at all.** `autoSaveExercise()` reads the aim box, but only ever writes a history entry when a set has reps — otherwise it returns early or deletes the entry. And `renderLiftRowState()` recomputes the aim from the plan target on every render. So a typed aim was purely visual and guaranteed to vanish.
>
> Fixed with an `aims` store, keyed by **exercise + training week + variant** — the same tuple `entryForWeek()` already matches history on, so an aim never leaks into another week or another variant. Deliberately *not* stored inside a session entry: an entry with no sets would register as logged work in the ring, the progress view and the calendar. The test confirms this — after typing an aim and reloading, `sessions` is still `{}` and the row still reads as unlogged.
>
> **2. Set-weight boxes (`s1w`/`s2w`)** had the 1200ms debounce but no commit, so leaving one inside that window lost the value. The *reps* boxes have had `onSetCommit` all along — only the weight boxes were missing it. Now commit on blur with `fireTimer` false, since a weight edit is not a finished set and must not start the rest timer.
>
> **3. Run-log fields (`rl-mi`/`tm`/`hr`/`fl`)** had the identical debounce-without-commit gap. Same fix.
>
> **Already correct, checked rather than assumed:**
> - **Race PR and every other Run tab control** — `onRunInput()` calls `persistRunPlan()` on every single edit, no debounce needed.
> - **Custom variant names** — already commit on `blur` *and* on Enter via `persistVariants()`. The prompt guessed this might be a gap; it is not.
> - **Lift-days and other settings controls** — buttons, not typed input; `setLiftDays()` persists immediately.
>
> The new store is wired through the same paths as every other one: localStorage, the IndexedDB durable mirror, `restoreFromIDB()`, and backup export/import. No second autosave system — the aim fields reuse the debounce-plus-blur-commit shape the set fields established.
>
> ## Verification — typed, left, reloaded
>
> Every case types a value, leaves without any explicit save, then **reloads the page from scratch** (a real second page load on the same origin, so this is persistence and not in-memory state):
>
> | field | left without saving → after reload |
> |---|---|
> | maxes squat / bench / ohp | `315` / `225` / `70` |
> | aim weight × reps (no set logged) | `flat-bb-bench|0|Flat Barbell Bench Press → {w:185, r:6}`, and redisplayed as 185 × 6 |
> | set 1 weight × reps | `200 x 5` |
> | race PR | `"22:30 5k"` |
> | run log | `2026-08-01 → {miles:6.2, secs:3130}`, redisplayed as 6.2 |
>
> **Debounce-only run** (typed and *never* left the field, so only the 1200ms timer could save): the aim still persisted. So neither path depends on the other.
>
> **Rapid typing:** typed `3` → `31` → `315` with no pause. Nothing was stored during the burst — the debounce keeps resetting, so a half-typed value is never committed — and leaving the field stored `315`, never `3` or `31`. Waiting out the debounce afterwards still read `315`.
>
> One honest note on the first test run: the aim redisplay initially read back `200 x 5` rather than the typed `185 x 6`. That was correct behaviour being masked — a logged set outranks a typed aim — so I re-ran it as an aim-only case with no set logged, which is what actually exercises the redisplay path.
>
> **Clean:** no console errors in any run, both script blocks parse, CSS braces 693/693, all thirteen suites pass.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> c182de0 Autosave the maxes screen and the three other fields that still needed a save
> 2e7122d Record the dropdown touch-effect summary
> e61306a Make the dropdown work on touch, not just under a simulated hover
> ```
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
Most of this app already does what's being asked for. The set-logging inputs (weight/reps per set, per exercise) already auto-save with no button, there's a whole system built for it (`scheduleAutoSave()` / `autoSaveExercise()`, debounced at 1200ms, plus an immediate commit on blur via `onSetCommit`), and the comment above it says so directly: "logging happens as you type... no save button anywhere." The Run tab's inputs already persist on every change too, `onRunInput()` calls `persistRunPlan()` on every field edit, not on a submit.

The gap is narrower than "add autosave everywhere," it's specific spots that don't yet follow the pattern the rest of the app already established. Find and fix all of them, starting with the one confirmed here:

**The onboarding maxes screen is a real gate.** "Enter your max weights" (squat, bench, DB press) only saves when the user taps **Save & Enter** (`saveMaxes()`). Type in three numbers, background the app or navigate away before tapping that button, and the values are gone, exactly the scenario described: the user did the work, wasn't trying to skip anything, and loses it over a UI step that has nothing to do with the number itself. This is the one screen in the app that still works the old way while everything else has already moved to autosave.

## Task
1. **Fix the maxes screen specifically.** Each max weight field (squat, bench, DB press) should save on its own, the same debounced/on-change pattern already used for set logging, not gated behind a single submit button. The "Save & Enter" button can stay as the action that moves the user forward into the app (a "continue" action makes sense, people expect a clear next step), but it must stop being the *only* thing that persists the numbers, if the user never taps it, whatever they typed should already be saved.
2. **Audit every other input in the app for the same gap.** Specifically check: the per-exercise "Top Set Aim Weight" and "Top Set Aim Reps" fields (`onAimInput`, around line 3896), confirm they actually persist and aren't purely visual until a set field is also touched. Check anything else in the app that takes typed input, race PR/time entry, custom exercise variant names, lifting-days and other settings controls, and confirm each one follows the established autosave pattern already used elsewhere, don't assume, check each one directly.
3. For anything found that doesn't autosave, fix it using the same mechanism already in the codebase (`scheduleAutoSave` for lift-related fields, `persistRunPlan`/`persistVariants`/whatever the existing analogous persistence function is for that data), don't invent a second autosave system, this app already has one, wire missing fields into it.
4. Confirm the debounce timing (1200ms, matching the existing pattern) is appropriate for any newly-wired field too, not so aggressive it saves incomplete input (a single typed digit before the second one arrives), not so slow that closing the app immediately after typing loses the value, and pair it with a commit-on-blur the way `onSetCommit` already does, so leaving a field (tapping elsewhere, backgrounding the app) forces an immediate save rather than waiting out the debounce.

## Verify before pushing
1. Type values into all three maxes fields, close/navigate away without tapping "Save & Enter", reload or return, confirm the values are still there.
2. Confirm "Save & Enter" still works as a forward action (moves the user into the app) and doesn't break if the values were already autosaved beforehand.
3. Type an aim weight or aim reps value, navigate away without touching any set field, confirm it persisted.
4. Spot check every other input surface found during the audit (race PR text, custom variant names, any settings controls) the same way: type, leave without an explicit save action, confirm persistence.
5. Confirm rapid typing doesn't cause a save to fire on a half-typed value in a way that then gets overwritten oddly, blur/leave should always capture the final value.
6. No console errors, both script blocks parse, all existing suites pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm the maxes screen no longer requires the button to persist values, the full list of any other fields found not to be autosaving and how each was fixed, and confirmation of the leave-without-saving test for each one.
