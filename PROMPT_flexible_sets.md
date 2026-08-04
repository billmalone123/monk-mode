## Summary (build 7.36)

Per-exercise 2-or-3 working sets and real warm-up set logging, both additive. The
`_v1` keys were not touched and no migration was written, because nothing changed
shape — `s3` is an optional field on an entry that otherwise looks exactly as it
always has, and the warm-up log is a separate store.

**Where the set-count control lives.** On the row itself, inside `.lift-log-inline`,
as a "Working Sets · 2 | 3" pair directly above Set 1 — the point of use, and inside
the block that already stops click propagation so it cannot collapse the row. The
variant chips were the other candidate suggested by the prompt, but those sit above
the warm-up/target block and are about *which movement*, not *how much of it*;
putting a set count up there separates it from the boxes it governs.

Keyed by exercise id alone. An exercise belongs to exactly one day, so per-exercise
already delivers "three sets that day or two sets of certain exercises" without a
second dimension to keep in sync. Deliberately *not* keyed by week: how many sets a
lift takes is a property of the lift, and a choice that silently reset every Monday
would be worse than no choice. Absent reads as 2, and the value is validated rather
than trusted — a stale or hand-edited `4` reads as 2 rather than rendering a slot
nothing else knows about.

**Both render paths — the prompt's premise here was stale, in our favour.** The task
described the original 6-day markup as having "the same two-set structure duplicated
by hand across its rows". That is no longer true: `renderDaySections()` fills the
6-day path's hand-written `.lift-rows` hosts from `liftRowHTML()` (index.html:3792),
the same generator the shorter splits use for `#altPlan`. The set inputs exist in
exactly one place in the file. So three-set capability could not land on one path and
miss the other, and no second edit was needed. What stays hand-written on the 6-day
path is the day *sections* — headers, nav, the mobility warm-up panels — not the rows.
Covered explicitly by section 9 of `sets.js`, which asserts both paths' generated
markup contains the third slot and that the 6-day host is filled by that generator.

**The third set.** Rendered always, hidden by CSS until the exercise is switched to 3,
so toggling is a class flip rather than a re-render that would drop anything half-typed
in the row. Same wiring as the first two slots: `onSetInput`/`onSetCommit` on reps, and
the dirty flag plus blur-commit `onLogEdit`/`onLogCommit` on weight that the autosave
audit established. Read only when the count is actually 3, so switching back down does
not resurrect a set the user just turned off. Best-set now scans all three slots.

Every other reader was walked, not assumed. Only two sites read set slots at all —
`renderLiftRowState` and `renderRowStatus` — and both now include `s3`; `normSet()`
already returns null for an absent slot, so old entries render the two sets they have.
The progress view, calendar and ring never read `s1`/`s2` directly at all; they read
`entry.weight`/`entry.reps`, so they pick up a third-set top set for free via the
extended best-set comparison. The rest-timer comparison includes `s3` so finishing a
third set starts the timer like the others.

**The warm-up log is genuinely separate from working-set data.** Its own key
(`monk_warmup_logs_v1`), keyed exercise + week + variant like `aims`, for exactly the
reason the aims store is separate: an entry with no working sets would count as logged
work in the ring, progress view and calendar. None of those three read this key.
`sets.js` section 7 asserts it directly — after logging warm-ups and nothing else,
`monk_sessions_v1` is still absent, `sessions` is still empty, and the progress view
shows no work. Three slots per exercise, weight and reps each, same debounced-plus-blur
autosave as everything else, no save button, and no rest timer (a warm-up is not a
working set). The suggested ramp becomes the *placeholder* on each box, never the
value, so nothing is ever auto-logged.

One deviation worth recording: the prompt asked to reuse the `.warmup-panel` /
`toggleWarmup()` UI. Those turned out to be a per-*day* mobility routine (5 min bike,
CARs, band pull-aparts), hand-written and present only on the 6-day path — so putting
per-exercise set logging there would have been the wrong scope *and* would have left
every shorter-split user without it. The logging went into the per-exercise row
instead, beside the ramp it records, which exists on both paths. The suggested-steps
panel is untouched.

**Old-data-only backward-compat check — explicit result.** `sets.js` section 2 builds
an entry in exactly the shape already sitting in real browsers (`s1`/`s2`, no `s3` key,
no warm-up store), loads it, and asserts: the row, status chip, progress view, calendar
and ring all render without throwing; the status chip contains no `undefined`/`NaN` and
shows exactly `185 × 5 · 185 × 4`, the two sets it has; `normSet` on the absent `s3`
returns null; `setsFor` still reads 2; and merely loading writes neither a set-count key
nor a warm-up key. All pass. Backup/restore carries both new stores and tolerates a
backup file that predates them.

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 69/0
(new), both CSS style blocks brace-balanced.

**Not verified in a browser.** Chrome's renderer was wedged for this origin for the
whole of this build — a native date picker opened during the previous prompt blocked
CDP and never released, and it did not recover. So everything above is assertion-level
plus code reading, and the new UI (the 2|3 control, the hidden third row flipping in,
the warm-up block) has **not been seen rendered**. Given `PROMPT_browser_verification.md`
existed precisely because that gap keeps compounding, this needs a real browser pass
before it is trusted: the CSS `.set-row[data-setrow^="3-"]` show/hide, and whether three
set rows plus three warm-up rows leave the row usable at phone width, are layout claims
no assertion here can make. `PROMPT_browser_verification.md` also still has its own 480px
and dropdown items outstanding.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include whatever build `PROMPT_browser_verification.md` produced (run that one first if it hasn't landed yet) or newer.

## Context
Every exercise row in this app is hardcoded to exactly two working sets. This is real, not assumed: `liftRowHTML()` (around index.html:3724) writes `s1w-`/`s1r-` and `s2w-`/`s2r-` inputs and nothing else, `autoSaveExercise()` (around index.html:4036) only ever calls `readSet('s1')` and `readSet('s2')`, and the stored history entry shape is fixed: `{ d, week, weight, reps, s1, s2, failure, variant }`. There is also a second, separate hand-written markup path for the original 6-day split (the comment at index.html:3766 explains why it's kept apart from the generated template) that has the same two-set structure duplicated by hand across its rows, not generated.

Warm-ups already exist on screen, but only as static suggested-steps text (`.warmup-panel`, `toggleWarmup()`), there is no logging of an actual warm-up set anyone performed, no weight, no reps, nothing saved.

The ask, from Billy directly: let someone choose how many working sets they're doing for a given exercise, 2 or 3, not one fixed number for the whole app, since some days or some lifts might call for a third set and others don't. And let them actually log warm-up sets, not just read the suggested ramp.

**Real constraint, not a nice-to-have: this app is about to be shared with first-time users who have minimal technology experience, and the bar for the first-open experience is "put in your maxes or skip, put in your race or skip, that's it."** The onboarding flow already meets that bar today, don't touch it as part of this task. What this task must not do is quietly raise the bar on the screen everyone lands on right after onboarding, the Train tab. A new control on every single exercise row, if it's visually loud, reads as "one more thing to figure out" to exactly the person this app is trying to stay simple for. Default behavior must be indistinguishable from today's two-set app for anyone who never touches the new control, not just in what gets saved (already required above) but in what the row looks like. If someone never asks for a third set, their row should look the same as it does right now.

**This is a bigger structural change than recent builds, treat it accordingly.** It changes the shape of data that's already sitting in real users' browsers (existing logged history has exactly `s1`/`s2`, nothing else). The standing rule added this session in the block comment above `SESSIONS_KEY` applies directly here: any new persisted field needs a safe default for people who don't have it yet. A third set and a warm-up log are both new fields being added to a shape that already has real data in it, this must be additive, not a redefinition. Do not touch the `_v1` key itself for this, an optional `s3` and a separate warmup store are additions, not a breaking shape change, so no version bump is needed, just correct optional-field handling everywhere `s1`/`s2` are currently read.

## Task
1. **Per-exercise, per-day set count, not a global number.** Someone should be able to set a given exercise to 2 or 3 working sets, independent of other exercises and independent of other days, matching how Billy described it: "three sets that day or two sets of certain exercises." Default every exercise to 2 sets, matching current behavior exactly, so nobody's existing plan changes unless they opt in. On where the control lives: it needs to exist, but it must not compete visually with the exercise name, the swap chips, or the log inputs for someone glancing at the row for the first time, a small "+ add a set" style affordance that only expands into the third input when tapped reads better here than a persistent 2/3 toggle sitting next to everything else. Try it, look at the row with fresh eyes, and don't settle for the first thing that technically works.
2. **Wire a third set slot using the exact pattern already established for the first two.** Same input structure, same `onSetInput`/`onSetCommit` for reps and the blur-commit-fixed `onLogEdit`/`onLogCommit` for weight that the autosave audit already fixed for `s1`/`s2`. Only render and enable the third slot when that exercise is set to 3 for that day.
3. **Extend `autoSaveExercise()`'s entry additively.** Add an optional `s3` field, extend the best-set comparison (`weight`/`reps` currently picks the better of `set1`/`set2`) to also consider `set3` when present. Walk every other place in the file that reads `entry.s1`/`entry.s2` (progress view, calendar, ring, anything computing volume or top-set trends) and confirm each one already tolerates a missing `s3` for old entries, and correctly includes `s3` when it's there, don't assume, check each one.
4. **Both render paths need this, not just one.** The generated path (`liftRowHTML()`) and the original hand-written 6-day markup both need three-set capability, since a user can be on either split. Don't leave the 6-day path stuck at two sets while the shorter-split path supports three, or vice versa.
5. **Build actual warm-up set logging.** Weight and reps per warm-up set, using the same autosave pattern as everything else. Store it separately from `sessions[exId]`, the same reasoning the `aims` store already used to stay out of session entries applies here: a warm-up set is not working volume and must never register as logged work in the ring, progress view, or calendar. Reuse the existing `.warmup-panel`/`toggleWarmup()` UI rather than building a second, disconnected panel for it.
6. Autosave everything the same debounced-plus-blur-commit way already established for every other field in this app. No save button for any of this.

## Verify before pushing
1. **The actual back-compat check, done by hand, not just asserted:** take (or simulate) an existing `sessions` entry with only `s1`/`s2` and no `s3`, load it, confirm the row, progress view, and calendar all render it correctly with no `undefined`/`NaN` and no error.
2. Set an exercise to 3 sets, log all three, reload, confirm all three persist and the best-set logic correctly picks the top one across all three, not just the first two.
3. Switch an exercise back down to 2 sets after having logged a third, confirm nothing breaks and no orphaned third-set data causes a display glitch.
4. Log a warm-up set, reload, confirm it persisted, and confirm it does not appear in the ring, progress view, or calendar as working volume.
5. Confirm three-set capability works identically on both the 6-day hand-written path and the generated shorter-split path.
6. **The simplicity check.** Look at an exercise row that's still at the 2-set default with fresh eyes, does it look identical to how it looks on `origin/master` right now, or has something new been added to every row whether or not anyone asked for it? If the new control is visible and unexplained on a row nobody has touched yet, that's a fail against the stated goal, not a style nitpick.
7. No console errors, both script blocks parse, all existing suites pass, plus new coverage for the third set and for warm-up logging, including an old-data-only test (no `s3`, no warmup) as the explicit regression check for point 1.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: where the set-count control ended up living, confirmation both render paths support three sets, confirmation the warm-up log is genuinely separate from working-set data, and the explicit result of the old-data-only backward-compat check.
