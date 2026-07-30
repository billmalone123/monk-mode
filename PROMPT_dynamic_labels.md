> **DONE — build 7.25, commit `52c5afd`, pushed.**
>
> **All three are genuinely dynamic, not re-worded once.**
>
> **1. Hero eyebrow.** Was the literal string `3 on · 1 off · Arnold Split` in markup. Rather than reuse the Run tab readout pattern I factored it into one helper, `splitSummary()` = `liftDaysPerWeek + ' days · ' + activeSplit().label`, which both the hero eyebrow and the Run tab readout now render — so there is one phrasing for the active split rather than two places composing their own. It is written by `updateLiftDaysUI()`, which `setLiftDays()` already calls, so it moves on the same event as everything else. Verified by driving the real function at each setting:
>
> | Days | Hero eyebrow |
> |---|---|
> | 3 | `3 days · Full Body` |
> | 4 | `4 days · Upper / Lower` |
> | 5 | `5 days · Push / Pull / Legs + Upper / Lower` |
> | 6 | `6 days · Arnold Split` |
>
> All four differ, six still names the Arnold Split, and the eyebrow and the Run tab readout produce the identical string. Wording note: six days now reads "6 days · Arnold Split" rather than "3 on · 1 off · Arnold Split" — the rhythm detail is dropped so that one expression can serve all four templates, which is the point of the change. The "3 on · 1 off" phrasing still lives on the Train tab control as the 6-day template s own `note`.
>
> **2. Ring week label.** Now written from `totalTrainWeeks()` — the same function the week selectors use, not a second hardcoded ten. It stays `/ 10 WEEKS` with no running plan (that function s own default) and follows the real block length when a race pushes past ten. The markup keeps `/ 10 WEEKS` as the pre-JS default so nothing flashes wrong on first paint.
>
> **A related bug found while in there:** `renderRing()` and `animateRingOnLoad()` still held the literal seven-slot Arnold array, so the ring s completion count was checking for logged days that the 3, 4 and 5-day templates do not have — a 3-day user could never fill the ring. Both now read `calWeekSlots()` like every other surface. Verified all four templates resolve seven slots with the right training-day count.
>
> **3. Twice a Week pillar.** Rewritten to state the principle across all four templates with no day letters named, keeping the closing sentence byte-identical:
>
> > Every split option in this program, 3 through 6 days, hits each muscle group at least twice a week. Fewer days means fewer body regions per session, not less frequency. The second session of the week always attacks the same muscles from different angles than the first, so you never adapt and stagnate. Frequency is what separates serious programs from gym noise.
>
> **Suites:** a new 25-check dynamic-label suite plus all twelve existing ones pass. Both script blocks parse.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 52c5afd Stop describing a 6-day split the app may not be running
> 051bd82 Record the exercise substitution summary
> ae6ebb6 Tag every swap by equipment, and give people a real custom option
> ```
>
> Local HEAD `52c5afd2caa3010fabc2932e436ce62e3328464d` matches `origin/master`.
>
> **On the Vercel deployment — it is current, not stuck.** Fetched `https://monk-mode-lemon.vercel.app/` after pushing and it serves **build 7.25**, the commit above, with all four nav tabs present (`○ Overview ▲ Train ▷ Run ▣ Calendar`) and the rebranded pull-quote attribution. Since 7.25 did not exist until this push, a stale cache could not be producing that number, so the deploy pipeline is following `origin/master` correctly. The 7.10 seen earlier in the session was a local working tree that was 21 commits behind origin, not the deployment — the site itself was never stuck.
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
Confirm `git log --oneline -3` before starting. HEAD should include `ae6ebb6` (exercise substitution) or newer, which means `liftDaysPerWeek` and `activeSplit()` already exist and already drive the real Train tab split.

## Context
Two pieces of hero copy and one pillar still describe the old fixed 6-day structure as if it's the only one, even though `liftDaysPerWeek` (3–6) is now a real, adjustable, shared setting elsewhere in the app. Read `activeSplit()` and however the Train tab currently displays its own split summary (`mirror.textContent = liftDaysPerWeek + ' days · ' + activeSplit().label` or whatever that's evolved into) before touching anything, reuse that pattern rather than inventing a second way to describe the active split.

Three spots:

1. **Hero eyebrow**, currently static text "3 on · 1 off · Arnold Split" directly under the hero headline.
2. **Ring week label**, `#ring-week-label`, currently static "/ 10 WEEKS" next to the training week ring.
3. **"Twice a Week" pillar**, currently hardcodes the 6-day version by name: "Chest + Back A is flat press machine focus. Chest + Back B is incline and cable focus."

## Task

### Hero eyebrow
Make it read the live `liftDaysPerWeek`/`activeSplit()` state instead of a hardcoded string. At 6 days it should still read something equivalent to today's "3 on · 1 off · Arnold Split." At 3, 4, or 5 days it should describe whichever template is actually active (Full Body, Upper/Lower, PPLUL), using `activeSplit()`'s own label rather than a second hardcoded description per day count. Update it on the same event that already updates the split elsewhere (wherever `setLiftDays`/`activeSplit` changes propagate today).

### Ring week label
Same problem `PROMPT_flexible_messaging.md` already flagged and deferred here: this label should reflect the actual active block length rather than always saying 10. If a running plan is active and its total week count differs from 10 (per the week-11-and-beyond work), this should say that number instead. With no running plan active, it can keep saying 10, since that's still the real default block length. Don't hardcode a second "10" here independent of wherever the actual week count is computed elsewhere in the app.

### "Twice a Week" pillar
Rewrite so it states the frequency principle generally rather than naming one specific split's day letters. Something in the spirit of: "Every split option in this program, 3 through 6 days, hits each muscle group at least twice a week. Fewer days means fewer body regions per session, not less frequency. [keep the closing line] Frequency is what separates serious programs from gym noise." Keep the closing sentence exactly as is, it's already general. Don't describe any one specific day-letter pairing as the example, since which one applies depends on the user's chosen day count.

## Verify before pushing
1. Set lifting days to 3, 4, 5, and 6 in turn, confirm the hero eyebrow updates to match each time, not just the Train tab.
2. Confirm the ring week label still reads "/ 10 WEEKS" with no running plan active, and updates correctly when a running plan pushes the block past 10 weeks.
3. Read the rewritten "Twice a Week" pillar in context, confirm it doesn't name a specific split's day letters and still matches the site's voice.
4. No console errors, both script blocks parse, all existing suites unaffected.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm all three spots are now dynamic (not just re-worded once), and separately, if you have any visibility into it, note whether the site's actual Vercel deployment is serving current `origin/master` or still stuck on an old build, since that was found to be badly out of date (build 7.10) during this session.
