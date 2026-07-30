> **DONE — build 7.23, commit `35acad3`, pushed.**
>
> **Where the shared control lives.** A four-button segmented control (3 / 4 / 5 / 6) in the **Train tab settings bar**, beside the maxes chips — chosen over the Calendar tab because that is where the split actually renders, so the change is visible the moment it is made. It writes `liftDaysPerWeek` to `monk_lift_days_v1` and mirrors it into IndexedDB with the other stores, and it rides along in backup/restore. The Run tab slider is **gone**, replaced by a read-only readout, and `readRunInputs()` returns the shared value, so there is exactly one editable place and the two numbers can no longer drift.
>
> **5-day template — Push / Pull / Legs + Upper / Lower** (Mon Push, Tue Pull, Wed Legs, Thu Upper, Fri Lower, Sat + Sun rest):
>
> - **Push** (6): Flat Barbell Bench Press *(chest)*, Incline Machine Press *(chest)*, Seated Dumbbell Press *(arms)*, Lateral Raise Machine *(arms)*, Tricep Rope Pushdown *(arms)*, Overhead Tricep Extension *(arms)*
> - **Pull** (6): Lat Pulldown Machine *(chest)*, Seated Cable Row *(chest)*, Diverging Low Row *(chest)*, EZ Bar Curl *(arms)*, Cable Curl *(arms)*, Face Pulls *(chest)*
> - **Legs** (7): the `legs` pool unchanged — Barbell Squat, Leg Press, RDL, Leg Extension, Leg Curl, Seated Calf Raise, Ab Wheel Rollout
> - **Upper** (7): Incline Barbell Bench Press *(chest-b)*, Machine Row *(chest-b)*, Dumbbell Arnold Press *(arms-b)*, Single-Arm Cable Row *(chest-b)*, Cable Face Pull *(arms-b)*, Incline Dumbbell Curl *(arms-b)*, Machine Dip *(arms-b)*
> - **Lower** (7): the `legs-b` pool unchanged — Deep Goblet Squat, Cossack Squat, Reverse Lunge, Sissy Squat, Nordic Curl, Weighted Leg Raise, Weighted Sit-Up
>
> Frequency: chest 2, back 2, shoulders 2, arms 3, legs 2, rear-delt/rotator 2. Upper deliberately reuses the 4-day Upper B rather than inventing a third variant, per the spec.
>
> **3-day template — Full Body** (Mon A, Wed B, Fri C, rest Tue/Thu/Sat/Sun), six exercises each, one lower pattern + one press + one pull + one shoulder + one arm + one finisher, rotating the pattern each session so nothing repeats three times:
>
> - **Full Body A**: Barbell Squat *(legs — squat)*, Flat Barbell Bench Press *(chest)*, Lat Pulldown *(chest — vertical pull)*, Seated Dumbbell Press *(arms)*, EZ Bar Curl *(arms)*, Ab Wheel Rollout *(legs — core)*
> - **Full Body B**: Romanian Deadlift *(legs — hinge)*, Incline Barbell Bench Press *(chest-b)*, Seated Cable Row *(chest — horizontal pull)*, Lateral Raise Machine *(arms)*, Tricep Rope Pushdown *(arms)*, Seated Calf Raise *(legs)*
> - **Full Body C**: Leg Press *(legs — machine squat)*, Machine Chest Press *(chest-b)*, Machine Row *(chest-b)*, Dumbbell Arnold Press *(arms-b)*, Incline Dumbbell Curl *(arms-b)*, Cable Face Pull *(arms-b — rear delt)*
>
> Frequency: chest 3, back 3, shoulders 3, arms 3, legs 3 — the three-touch target, cleared. At 2 sets per exercise that is 6 sets per group per week, below the 10-20 band; the spec is explicit that the band is a ceiling on how many exercises may touch a group, not a licence to add more, and three short sessions is the point of the template.
>
> **4-day** is exactly the worked example: Upper A (8), Lower A = `legs`, Upper B (7), Lower B = `legs-b`. **6-day** routes straight through the six original pools and was verified identical, exercise-for-exercise and in order.
>
> **Day-of-week placement.** Rest days are spread, not clustered, and Saturday is kept clear of heavy lower-body work on every shorter template so it never collides with the long run the merge rules already protect. 6-day: Mon-Wed A-days, Thu rest, Fri-Sun B-days (unchanged). 5-day: Mon-Fri lifting, weekend clear. 4-day: Mon/Tue and Thu/Fri paired around a Wednesday rest, weekend clear. 3-day: Mon/Wed/Fri, everything else rest. `CAL_WEEK` is now `calWeekSlots()` reading the active template; verified all four render seven clean cells with no junk.
>
> **Wraparound copy** — one variant per slot, reused on every lap after the first (week 21 reuses week 11 s, not a third version). Phase, intensity and explosive work carry over unchanged; only Focus and Mindset differ:
>
> | Slot | Focus | Mindset |
> |---|---|---|
> | 1 | Second lap baseline — re-establish working weights on numbers that are already heavier | Same baseline week. Except your baseline is heavier than it was the first time. |
> | 2 | Load again, from a higher floor than the last lap started on | You know what this week feels like now. That is not a reason to take less weight. |
> | 3 | Overload — beat the lap-one numbers for this slot, not just last week | Last lap this week was your ceiling. This lap it is your starting point. |
> | 4 | Deload — you have earned it twice over, take it properly | Backing off is what let you add weight last lap. Do it again. Do not be clever. |
> | 5 | Wave 2 base, second lap — return heavier than this lap started | Two full waves in. Compare against your own log, not against week 1. |
> | 6 | Build — volume climbing on top of everything the last lap added | The numbers on the bar are the only honest record. Beat the ones already there. |
> | 7 | Load — highest volume week again, at a weight the last lap could not carry | This is the week that separated people last lap. You already got through it once. |
> | 8 | Overload — push past the territory the last lap called new | Beat your week 8 numbers this time, not just week 3 s. |
> | 9 | Peak — test week, measured against your own best, not the program s | Top sets only. The number to beat is the one you set last peak. |
> | 10 | Final deload of this lap — recover, then test maxes and go again | You finished another one. Recover completely, retest, and start the next lap heavier. |
>
> **Confirmed rather than assumed:** deload cadence (`isDeloadWeek`) and weight progression (`prevWeekEntry` off logged history) are pure functions of the week number and needed no changes — weeks 11, 15, 19, 23 still land as deloads, and week 11 rolls off week 10 s logged weight normally. Week-tab count defaults to 10 and stretches to the running plan total when a race runs longer.
>
> **Suites:** a new 60-check split/week-extension suite plus all ten existing ones pass. Three harnesses needed updating because the calendar now reads the split config — harness changes only, no product code involved.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 35acad3 Make lifting days a real shared setting, and let the block run past week 10
> 7b2bdc7 Record the flexible messaging summary
> 0c3d0e7 Stop selling a fixed ten weeks
> ```
>
> Local HEAD `35acad311ca5dbb09fa60a4e026fc77b4bed6642` matches `origin/master`.
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
Confirm `git log --oneline -3` before starting. HEAD should be `6191195` (or newer). If `PROMPT_scroll_carousel_fixup.md` hasn't landed yet when you start, that's fine, this task doesn't touch the hero, nav, or `#edge` section.

## Context
Two related gaps in the lifting side of the app, read the current code fresh before touching anything, both areas have moved recently.

**1. Lift days per week isn't real.** The Train tab's actual weekly split is a hardcoded 7-slot array, `CAL_WEEK` (around line 5199): chest+back, shoulders+arms, legs+abs, rest, chest+back B, shoulders+arms B, legs+abs B, mapped straight onto Monday through Sunday, always 6 lifting days and 1 rest day, no matter what. Separately, the Run tab's generator (`readRunInputs()`, `generateRunPlan()`) already has a "Lifting Days Per Week" slider and a "Lifting Rest Day" selector, but those only steer which days the *running* plan avoids stacking a hard run on, they never reach the Train tab. Someone can tell the run generator "I lift 4 days a week" and the Train tab will still generate 6 lift sessions regardless, the two numbers never talk to each other.

Fix direction, confirmed: make lifting days per week (3, 4, 5, or 6) one shared setting, config only, not logs. It should drive the actual Train tab split (which of four day-count templates generates) and be the same value the run generator reads for its merge logic. The lift session history and the run log history stay two completely separate data stores exactly as they are now, this only unifies the *number*, not the workout data.

**2. The program has no week 11.** `currentTrainWeek` is clamped to the range 0–9 in at least three places (`setTrainWeek`, the IDB restore, the localStorage restore), and the week-tab buttons plus the per-week `.week-info` panels (`#winfo0` through `#winfo9`) are ten literal hardcoded blocks in the markup, not generated from data. A runner whose race is more than 10 weeks out has a running plan that keeps going past week 10 with no corresponding lifting week to merge into.

Fix direction, confirmed: keep counting up, Week 11, Week 12, and so on, don't relabel it as a new "cycle" and don't cap it. Content-wise it restarts from week 1's structure once it passes week 10, the same 10-week arc repeats, just under a climbing label.

One thing to actually look at before wiring the loop: the ten existing `.week-info` panels are not generic, they're a written arc with a beginning and an ending, week 1 is "Baseline, establish working weights", week 8 is "Peak... this is your test week", week 9 is "Final Deload... come back and test maxes." If week 11 repeats week 1's copy verbatim right after week 9 says "go test your new maxes," it reads like the program forgot what just happened. Don't silently loop the literal text, see the task below for how to handle it.

## Task

### 1. Shared lifting-days-per-week setting
Add one shared value, something like `liftDaysPerWeek` (3, 4, 5, or 6, default 6, matching what's live today), persisted the same way `currentTrainWeek` already is (localStorage plus the existing IndexedDB restore path, same keys pattern). Expose one control for it, your call on whether that lives on the Train tab (where the split actually renders) or the Calendar tab (where lift and run already show merged per day), but there should be exactly one place a user sets this, not two independent sliders that can drift apart like today. The Run tab's existing "Lifting Days Per Week" field either becomes a read-only reflection of this shared value or is removed in favor of the new control, don't leave two editable fields claiming to be the same setting. The Run tab's "Lifting Rest Day" field can stay as its own thing, since which specific day is off is a separate question from how many days there are.

### 2. Four day-count templates, not one
Rebuild the lift-split generator so it produces one of four templates based on `liftDaysPerWeek`, all research-backed, matched frequency to what the app already does at 6 days:

- **6 days (unchanged):** current Arnold Split as-is, chest+back / shoulders+arms / legs+abs, run twice. Every muscle group hit twice weekly. Don't touch this path, it's already the reference case, and it's already what the CAL_WEEK array + all six existing exercise day-pools (`chest`, `arms`, `legs`, `chest-b`, `arms-b`, `legs-b`) encode. Route this template straight through the existing pools unchanged.

- **4 days: Upper/Lower, run twice.** This is the evidence-backed match for a 4-day frequency, both upper and lower body still hit twice a week, same frequency guarantee as the 6-day split, just consolidated into two regions instead of three. The two Lower days need no new design, reuse `legs` as Lower A and `legs-b` as Lower B exactly as they exist, both are already complete standalone lower-body sessions (squat pattern, posterior chain, isolation, core). Build two new Upper days by combining and trimming the existing `chest`/`arms` and `chest-b`/`arms-b` pools, don't just concatenate all 14 exercises into one day, that's roughly double a normal session's volume. Worked example, use this as the literal target:

  **Upper A** (from `chest` + `arms` pools): Flat Barbell Bench Press, Lat Pulldown Machine, Seated Dumbbell Press, Seated Cable Row, Lateral Raise Machine, EZ Bar Curl, Tricep Rope Pushdown, Face Pulls. Eight exercises, one press and one pull per major pattern, arm isolation kept light, Face Pulls kept in specifically because the About section already states rotator/rear-delt work belongs on every push and pull day, don't drop it.

  **Upper B** (from `chest-b` + `arms-b` pools): Incline Barbell Bench Press, Machine Row, Dumbbell Arnold Press, Single-Arm Cable Row, Cable Face Pull, Incline Dumbbell Curl, Machine Dip. Seven exercises, deliberately using the incline/Arnold Press variants so Upper A and Upper B hit the same muscles from different angles, matching the stated logic of the existing A/B day pairs elsewhere in the program (see the "Two Engines" and "each muscle group trained twice... from different angles" language already in the About section, this is the same design principle, just applied one level down).

- **5 days: Push/Pull/Legs plus Upper/Lower (PPLUL).** The standard evidence-based 5-day template. Build Push, Pull, Legs, Upper, Lower days pulling from the same six existing pools (a Push day pulls the pressing/tricep exercises out of `chest`/`arms`/`chest-b`/`arms-b`, a Pull day pulls the rowing/pulldown/bicep exercises out of the same pools, Legs reuses `legs` largely as-is, Upper and Lower can reuse the 4-day template's Upper/Lower days built in the step above rather than inventing a third variant). Apply the same volume discipline as the Upper A/B worked example: 6 to 8 exercises per day, one exercise per pattern, don't just dump every isolation exercise from the source pools into one day.

- **3 days: Full Body, three sessions.** The evidence-backed choice for exactly 3 days, each session naturally gives every muscle group three touches a week, which clears the twice-weekly frequency target with room to spare, so each individual session should be shorter than a split day, roughly 5 to 6 exercises, one squat-pattern or hinge-pattern lift, one horizontal press, one horizontal or vertical pull, one shoulder or arm isolation, one core or calf finisher, rotating which specific exercise fills each slot session to session (Day A squats, Day B RDLs, Day C leg press, for example) so the same movement isn't repeated three times a week. Pull every exercise from the six existing pools, do not write new exercises, this is recombination and trimming only.

For both the 5-day and 3-day templates, apply the same standard used in the fully worked 4-day example above: total weekly volume in roughly the 10 to 20 sets per muscle group range (this app's existing rep/set scheme is 2 sets per exercise, so that's a ceiling on how many exercises can touch the same muscle group across a week, not a green light to add more), rotator/rear-delt work present somewhere in the week for anyone doing pressing work at all, and no day exceeding what a single reasonable session should carry. Show your actual day-by-day exercise lists for the 5-day and 3-day templates in the summary at the end of this file, the same level of detail as the 4-day worked example above, so this is reviewable.

`CAL_WEEK`, `calRunCells`, and `calWeekGrid` all currently assume the fixed 7-slot, always-6-lifting-days shape, generalize them to read whichever template is active rather than hardcoding the Arnold Split array. A 3, 4, or 5-day template will not fill all seven weekday slots, decide sensible day-of-week placement (spread rest days rather than clustering them, keep the long run day the run generator already tracks free of heavy lower-body lifting per the existing merge rule) and keep that assumption documented in code the way the current 7-slot comment already documents its own assumptions.

### 3. Week 11 and beyond
Remove the 0–9 clamp everywhere it exists (`setTrainWeek`, the IDB restore path, the localStorage restore path), and generate the week-tab buttons and `.week-info` panels from data instead of ten literal hardcoded blocks, so any week number can render without new markup. Content for week `N` where `N > 9` should reuse week `N % 10`'s phase, intensity range, and explosive-work programming exactly (the underlying training logic, deload cadence via `isDeloadWeek`, and weight progression via logged history already work for any week number with no changes needed, confirm that's still true rather than assuming it).

Don't reuse week `N % 10`'s Focus and Mindset copy verbatim, that's the narrative discontinuity flagged above. Write a light variant for the wraparound instance of each of the ten slots, same phase and intent, acknowledging it's a repeat lap rather than pretending week 1's "establish working weights, own the movement" is happening for the first time again right after week 9 said to come back and test new maxes. Something in the spirit of "Second lap. Same baseline week, except your baseline is heavier than it was the first time" for the wraparound week 1 slot, "Beat your week 8 numbers this time, not just week 3's" for the wraparound peak slot, is the right tone, match the existing copy's voice (direct, second person, a little confrontational) rather than writing generic filler. Keep this to one clearly-written variant per slot, not per lap, week 21's baseline reuses week 11's wraparound copy rather than needing a third version.

How many week-tab buttons render: default to 10 when no running plan is active (unchanged from today), and extend to match the running plan's actual total week count when a race is set and it runs past 10, recomputing if the race date changes. Don't render an unbounded or arbitrary number when there's no running plan driving a specific length.

## Verify before pushing
1. Set lifting days to 3, 4, 5, and 6 in turn, confirm the Train tab actually regenerates a different split each time (not just a different number displayed), and that the Run tab's lifting fields reflect the same chosen value rather than staying independently editable.
2. Confirm 4, 5, and 3-day templates each hit every major muscle group at least twice a week except the 3-day template, which should hit each group three times, spot check by listing which pool each exercise in the new templates came from.
3. Confirm the existing 6-day path is byte-for-byte the same output as before this change (same exercises, same order), this path shouldn't have moved at all.
4. Confirm `calRunCells`/`calWeekGrid` (Overview widget and Calendar tab) render correctly for a 3, 4, 5, and 6-day split without crashing on the now-variable day count.
5. Advance to week 10, confirm week 11 renders: correct phase/intensity/explosive-work carried over from week 1, new non-repetitive Focus/Mindset copy, and that logged weight progression from week 10 carries forward correctly into week 11 rather than resetting.
6. Set a race date requiring more than 10 running weeks, confirm the Train tab's week-tab row actually extends to match, and confirm it still defaults to 10 with no running plan active.
7. No console errors, both script blocks parse, all existing suites unaffected (Run tab worked example, stress permutations, calendar, week sync, chart, adaptive logging), plus whatever new checks you added for the split templates and the week-11 wraparound.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push actually landed.

Leave a short summary at the top of this file when done: where the shared days-per-week control lives, the full exercise list for the 5-day and 3-day templates (not just 4-day, that one's already specified above), how CAL_WEEK's day-of-week placement was decided for the shorter templates, and the wraparound copy you wrote for each of the ten week-info slots.
