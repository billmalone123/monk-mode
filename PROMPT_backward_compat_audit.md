> **DONE — build 7.34, commit `fbbde89`, pushed.** Ran after the onboarding expansion landed (`0101dd7`), so that work is included in the audit.
>
> ## Three gaps found, all the same shape
>
> Every one was code that **predated the feature whose data it was reading** — not the new code being careless, but old code never revisited when the thing underneath it grew. That is worth noting, because the instinct is to audit the newest code hardest and the newest code was fine.
>
> **1. `switchDay()` blanked the Train tab on every shorter split.** The worst of the three, and it was live. `#altPlan` — the markup `renderDaySections()` generates for the 3/4/5-day splits — lives *inside* `<section id="plan">`. `switchDay()` predates it and cleared `.active` from **every** `.plan-content` on the page, then set it on `day-<id>`, which only exists in the 6-day markup. So opening Train on a 4-day split wiped the day the render had just activated and left the nav sitting above nothing. Each surface now clears only its own (`#plan > .plan-content`, `#planNav .plan-nav-btn`), and the shorter splits route to `switchAltDay()` and persist the same way the 6-day path does.
>
> **2. `getMostRecentDay()` validated against the six original day ids.** A hardcoded `['chest','arms','legs','rest','chest-b','arms-b','legs-b']`, written before splits existed. A user on a 4-day split who last opened `upper-a` had it rejected and was handed `chest` — a day that split does not contain, which is what fed gap 1. Now validates against `splitDayIds()` and falls back to the active split's first day. (`'rest'` was dropped from the list; `splitDayIds()` excludes it and no `day-rest` element has ever existed, so it was already dead.)
>
> **3. `suggestedPeak()` and `setRunLevel()` threw on a stale enum.** Both did `RACE_DISTANCES[key].capKey` / `RUN_LEVELS[key].ramp` — indexing a config table with a stored string and reading a property straight off the result. A level or distance this build no longer defines returns `undefined` and throws on the next access. Added `safeRunLevel()` / `safeRunDistance()`, applied at every lookup, in `readRunInputs()`, and in `initRunPlan()` — which previously only checked those two fields for `null`. **Missing was handled; stale was not**, and stale is just as dangerous when the value indexes a table.
>
> ## Checked and clean — verified, not assumed
>
> Every loader (`try/catch` plus a default on the parse). `entryVariant()` on entries written before variant tracking — falls back to the base lift name. `normSet()` on the old numeric set shape — it already reads both shapes, and is the best existing example of doing this right. `storedAim()` / `activeVariant()` / `exVariants()`. `generateRunPlan()`'s `if (!dist || !level || !race) return null`. `activeSplit()` / `splitDayExercises()`. The timer background restore. Run-log reads (`!e` plus `isNaN` on every field). `loadLiftDays()`'s range check. Every field guard in `importData()` — an old backup missing `variants`/`aims`/`runPlan`/`runLogs`/`liftDays` restores cleanly and leaves each current setting alone rather than resetting it.
>
> **The onboarding expansion added no new persisted field at all** — estimate mode writes the same three lift keys, its reps inputs are scratch cleared on open, and run setup writes only fields the Run tab already owned. Asserted in the suite rather than claimed.
>
> ## The standing rule
>
> Added as a block comment at the top of the main script block, above `SESSIONS_KEY` — the first thing anyone reads before touching storage. Two rules: **a new persisted field needs a safe default at the read site** (write it as if the key is absent, because for every existing user it will be, exactly once), and **a value used to index a config table must be validated, not trusted** (missing is not the only bad case). Plus: a genuine *shape* change means bumping `_v1` to `_v2` with a migration — `migrateOldLogs()` is the precedent — never reusing a versioned key for an incompatible shape. It points at `normSet()` and `entryVariant()` as the reference examples.
>
> ## Verification
>
> `compat.js`, a scratch harness in the repo root (untracked, same convention as `gen.js`), boots both of `index.html`'s real script blocks against storage shaped like an existing user's: **empty**, **each of the 13 keys removed one at a time** with the rest populated, **partial old data** (pre-variant history with numeric sets, a run plan holding only `raceDate` + `distance`, one-lift maxes, a weight-only aim, a feel-only run log), **stale values** (`distance:'ultra'`, `level:'beginner'`, `liftDays:99`, an extinct day id), and **corrupt unparseable JSON**. Plus backup/restore against both an old-shaped and a current-shape file, and the last-viewed-day path across all four splits.
>
> **86 assertions, all passing.** The harness was run against the *pre-fix* commit as a control and produced **14 failures** — including the exact `capKey` and `ramp` throws and the blank-day case — so these are demonstrated regressions with demonstrated fixes, not speculative hardening. `check.js` confirms both script blocks parse; the onboarding suite (71) and the `gen.js` generator suite still pass.
>
> **Not checked in a real browser this session**, per the standing caveat. Gap 1 is the one worth a real look — set the Train tab to a 3, 4 or 5-day split, navigate away and back, and confirm a day's exercises are actually on screen.

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting.

## Context
This app is about to have real users with real saved data sitting in their own browser storage, not on a server. Pushing an update never touches that storage directly, the actual risk is narrower and specific: new code reading old-shaped data left behind by an older version of the app. If a future change assumes a field exists that an existing user's saved data doesn't have, that's where something breaks for them, not before.

The app already has good bones for this: every storage key is versioned (`monk_sessions_v1`, `monk_mode_maxes_v1`, `monk_run_plan_v1`, `monk_lift_days_v1`, `monk_aims_v1`, and so on), and there's an existing `migrateOldLogs()` precedent for handling a genuine schema change. This task is two things: a real audit of everything built so far this session against that standard, and a standing rule to carry forward into future work on this app.

## Task

### 1. Audit every storage read added or changed this session
Go through every `_v1` key in the file and everywhere it's read (not just written). For each one, confirm: if the key is missing entirely (a user who saved data before this feature existed), does the app fall back to a sane default rather than erroring or rendering `undefined`/`NaN`? If the key exists but is missing a field that a newer version of the app expects (partial old data), same question, same standard.

Specific things added this session worth double-checking directly rather than assuming they're fine: `liftDaysPerWeek` and the split-template system, the `aims` store, exercise custom-variant names, the run-plan's newer fields (any added alongside the adaptive-split/week-extension work), and anything from the onboarding-expansion work if that's landed by the time this runs. Confirm each one degrades gracefully for a user whose saved data predates it, rather than assuming "it's new, so it's fine," a new field being read against old data that simply doesn't have it yet is exactly the failure mode to check for.

### 2. Fix anything that doesn't degrade gracefully
Where you find a gap, fix it the same way the existing code already does elsewhere: a default value, a `typeof x === 'undefined'` or `isNaN` guard, or a proper migration function if the shape genuinely changed rather than just grew. Don't touch the versioned key names themselves unless a real breaking schema change requires it, and if one ever does, that's the signal to bump `_v1` to `_v2` and write a migration, not to reuse the same key for an incompatible shape.

### 3. Write the standing rule down
Add a short, permanent note near the top of `index.html`'s script block (or wherever makes sense as a durable marker future work will actually see) stating the rule going forward: any new persisted field must have a safe default for users who don't have it yet, and any genuine breaking change to an existing field's shape needs a version bump and a migration function, not a silent assumption that everyone's storage already looks like the new shape.

## Verify before pushing
1. For each storage key, simulate a user on old data: clear or partially strip that key's stored value and confirm the app still renders sensibly rather than breaking.
2. Confirm the existing Backup/Restore feature still works correctly against both old-shaped and new-shaped data.
3. No console errors, both script blocks parse, all existing suites pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: which fields were checked, which ones (if any) didn't degrade gracefully and how they were fixed, and confirm the standing rule note was added.
