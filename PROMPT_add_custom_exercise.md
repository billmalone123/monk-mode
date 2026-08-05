## Summary (build 7.40)

**Render path premise, checked fresh — and it was half right.** There is still exactly one
*row* generator: `liftRowHTML()`, which both branches map through. But the *day-list
assembly* was duplicated: `renderDaySections()`'s 6-day branch filtered `EXERCISES` inline
(`EXERCISES.filter(ex => ex.day === dayId)`) while the shorter splits called
`splitDayExercises(id)`. So `splitDayExercises()` was **not** the single assembly point the
task assumed, and appending customs there alone would have put them on shorter splits only.

Fixed by routing the 6-day branch through `splitDayExercises(dayId)` as well. That is safe
because `SPLIT_DAYS['chest'].pool === 'chest'` and so on for all six pool days, making the
two expressions equivalent — asserted rather than eyeballed: `sets.js` compares the id list
from `splitDayExercises(d)` against `EXERCISES.filter(e => e.day === d)` for every day in
`DAY_ORDER` and requires them byte-identical. Customs are now appended in exactly one place.

**Where "+ Add Exercise" ended up:** the bottom of each day's `.lift-rows` container, which
both render paths fill, collapsed to a single dashed quiet line until pressed. Opening it
reveals a name field (required) plus an optional Reps From/To pair and an Add button.
Name-only is enough — "Farmer's Carry" then Add.

**`EX_BY_ID` registration survives a fresh reload — verified as a reload, not a same-session
check.** This was the real trap: `EX_BY_ID` is built once from the static `EXERCISES` array,
and `autoSaveExercise()` opens with `var ex = EX_BY_ID[exId]; if (!ex) return;`, so an
unregistered custom exercise renders perfectly and then silently refuses to save.
`loadCustomExercises()` calls `registerCustomExercises()` and runs in init **before**
`renderDaySections()`. The suite adds a custom exercise, logs 95×10, then re-runs the whole
boot path from storage the way a refresh does, and asserts it is still on the day, still in
`EX_BY_ID`, its log still reads 95 — **and that a further edit still saves (115) and reaches
storage**. Registration-at-creation alone would pass everything up to the reload and fail
from there down, so that last pair is the assertion that actually proves it.

**What happens to logged data on removal: it is deleted, with an explicit warning first.**
The confirm names the exercise and, when there is history, the exact number of logged
sessions that will go with it and that it cannot be undone. The alternative — keep the sets
and just hide the row — was rejected deliberately: it would strand history under an id no
longer in `EX_BY_ID`, unreachable and invisible but still in storage and still visible to
anything scanning `sessions`. An understood loss beats a silent orphan. Removal also clears
that id's `variantChoice` and `setCounts` entries so nothing is left pointing at it, and
refuses outright on anything without `ex.custom` — asserted by trying to remove a programmed
exercise and confirming both it and its history survive.

Other details: ids are `cx-<slug>-<base36 timestamp>`, so two identically-named exercises on
the same day cannot collide and a custom id can never shadow a programmed one. No `maxKey`
and no `seedFrom` is deliberate — `getSessionTarget()` falls through to "First session —
establish a baseline", the same path Ab Wheel Rollout already takes, asserted directly. No
`repWhy`, so the guarded caption simply renders nothing. Renaming reuses the existing
"+ Custom" variant chip and its `variantChoice` autosave rather than a new name field; the
one change needed was letting `variantChipsHTML()` emit chips for a custom exercise, which
otherwise bailed out at `variants.length <= 1` and would have left no rename affordance.
Backup/restore carries `customEx` and tolerates an older file without it.

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 142/0
(41 new), CSS balanced.

**Not verified in a browser.** The Chrome extension disconnected during the previous build
and stayed down through this one. The earlier service-worker wedging cause was found and
worked around (serve a copy with no `sw.js` beside it), so that part is solved and reusable
— but the add form, the collapsed control, and the Remove button have not been seen on
screen, and neither has the confirm dialog's copy.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include whatever build `PROMPT_log_past_runs.md` produced or newer.

## Context
Confirmed via clarifying question with Billy: this is about letting someone append their **own custom exercise** to the bottom of a day's list, beyond the ~7-8 already programmed, name it themselves, and log sets against it exactly like any other row. Not about the app generating more exercises by default.

The architecture this needs to plug into, checked directly:

- `splitDayExercises(dayId)` (index.html:3296) is what actually assembles a day's exercise list. For the original 6-day pools it's `EXERCISES.filter(ex => ex.day === d.pool)`; for the shorter-split templates it's `(d.ex || []).map(id => EX_BY_ID[id])`. Both paths, whatever this task adds needs to come out the other end of this function (or wherever it moves), not bypass it.
- `EX_BY_ID` (index.html:3440) is a flat lookup built once at load from the static `EXERCISES` array. Every logging function gates on it, `autoSaveExercise()` opens with `var ex = EX_BY_ID[exId]; if (!ex) return;`, so a custom exercise that isn't registered into `EX_BY_ID` simply cannot be logged, autosave will silently no-op on it.
- Missing `maxKey`/`seedFrom` is already a handled, non-crashing case, the weight-suggestion logic already falls through to "First session — establish a baseline" when neither is present (this is the exact path the Ab Wheel Rollout entry already takes today, it has no `maxKey`). A custom exercise with no max reference rides the same safe fallback, nothing new to build there.
- The `repWhy` caption from the last build is already guarded (`ex.repWhy ? ... : ''`), so a custom exercise with no `repWhy` renders no caption rather than breaking. Same pattern, reuse it, don't invent a different one.
- **Render paths:** the last two builds each had to re-verify, fresh, that there's actually one rendering path now, not two, `renderDaySections()` drives every day (6-day pools included) through `liftRowHTML()`. Confirm this is still true before building on it, don't assume it from this paragraph, it's been correct twice in a row but check fresh anyway.

## Task
1. **New persisted store for custom exercises**, keyed by day (whatever key `splitDayExercises` uses to identify a day, `dayId`). Additive only, empty by default for every existing user, following the standing backward-compat rule from this session, no version bump, just a new key with a safe empty default.
2. **A small "+ Add Exercise" control at the bottom of each day's list.** Low-key, matching the simplicity rule the last two builds established, this is for the person who wants it, not something that competes for attention on a row nobody asked to expand. Ask for a name (required) and, if it fits without cluttering, an optional target rep range. Nothing else mandatory, someone should be able to add "Farmer's Carry" and start logging in two taps.
3. **Generate a collision-safe id** for each custom exercise (e.g. a slug of the name plus a timestamp), and **register it into `EX_BY_ID` both at creation and on every fresh page load** (since `EX_BY_ID` is rebuilt from the static `EXERCISES` array at load time and has no idea a stored custom exercise exists until something tells it). Skipping this step is what would make the row silently fail to autosave, so verify it directly, don't assume registering once at creation is enough.
4. **Route it through `splitDayExercises()`** (or wherever the day-list assembly actually lives after you've confirmed the current render path) so it appears appended at the bottom of that specific day's list only, rendered through the exact same `liftRowHTML()` every programmed exercise uses. No second markup path for custom rows.
5. **Let someone remove a custom exercise they added.** A small delete affordance on that row only, never on a programmed exercise. Decide deliberately what happens to any sets already logged against it, either confirm before deleting so the person knows their log goes with it, or preserve the log and just hide the row, your call, but make it an intentional choice you can explain, not an accident.
6. Autosave the name and any logged sets the same debounced-plus-blur-commit way already established everywhere else in this app. No separate save button for any of this.

## Verify before pushing
1. Add a custom exercise to one day, log a set against it, reload the page from scratch, confirm it's still there, still logged, and still saves further edits, this is the real test of the `EX_BY_ID` registration-on-load step, not just registration-at-creation.
2. Confirm it only appears on the day it was added to, not on every day or every split.
3. Confirm removing it behaves exactly as designed and doesn't silently strand data you didn't mean to strand.
4. Confirm a programmed exercise (one already in `EXERCISES`) is completely unaffected, same id, same rendering, same behavior as before this task.
5. Confirm no crash or blank field anywhere for a custom exercise that has no `maxKey`, no `seedFrom`, and no `repWhy`, it should degrade the same way Ab Wheel Rollout already does today.
6. No console errors, both script blocks parse, all existing suites pass, plus new coverage for adding, logging against, reloading, and removing a custom exercise.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirmation the render path premise was checked fresh rather than assumed, where the "+ Add Exercise" control ended up, confirmation `EX_BY_ID` registration survives a fresh reload (not just the same session), and what happens to logged data when a custom exercise is removed.
