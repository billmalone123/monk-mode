## Sync first, before anything else

Your local `master` is behind `origin/master` by several commits, including the full rebrand to "Run the Weights" (build 7.10), a deload-every-4th-week feature, a session-key integrity fix, and variant-aware exercise logging. There's also a stale local commit here (message: "Add running plan generator...") that was built against the old pre-rebrand code and is NOT compatible with current origin/master, do not merge or push it.

Run this first:

```
git fetch origin
git branch backup-stale-run-attempt
git reset --hard origin/master
```

That saves the old attempt on a throwaway branch in case any logic is worth referencing later, then brings the working tree to the real, current, live version of the site (matching what's deployed at https://monk-mode-lemon.vercel.app/). Confirm you're synced: `git log --oneline -3` should show `1b307a4` (or newer) at the top, and `grep -c "RUN THE WEIGHTS" index.html` should return a non-zero count.

## Project context

Single-file app, `index.html`, currently build 7.10, branded "Run the Weights." All HTML, CSS, and JS live inline in that one file. Deployed two places: GitHub Pages (`github.com/billmalone123/monk-mode`, `.nojekyll` present) and Vercel (`monk-mode-lemon.vercel.app`, auto-deploys from `origin/master` on push). Don't break either deploy path, don't touch `manifest.json` or `sw.js` unless the feature genuinely requires it, and bump the SW cache version if you do touch caching, the site has had real data-loss bugs from stale service worker caches before, per commit history.

Since the code has moved since it was last inspected (deload logic, session keyed by training week instead of date, variant-aware logging), re-read the current lifting generator implementation in `index.html` fresh, do not assume it still looks the way an older description of it might suggest. Match whatever conventions are actually there now: naming, state handling, DOM structure, code style.

## Task

Add a running plan generator next to the existing lifting plan generator, that merges into one combined weekly schedule when both are active. New "Run" tab beside the existing tabs. Do not build this as a standalone thing that looks or works differently from what's already here.

## What it does

User moves sliders/fills fields, app generates a week by week running plan. If a lifting plan is already active, merge the two into one combined weekly schedule using the merge rules below. Every user gets a plan scaled to their specific inputs, not a fixed template.

## Inputs

Race date. Date picker. Drives total weeks available.

Race distance. Dropdown: 5k, 10k, half marathon, marathon. Drives long run ceiling and taper length.

Days per week to run. Slider, range 3 to 6.

Peak weekly mileage target. Slider. Show a suggested default based on experience level and race distance (see caps table) instead of leaving it blank.

Current weekly mileage. Number input or slider, range 0 to 60. This is the starting baseline the whole progression builds from. If 0, treat as a true beginner and switch to a run/walk progression instead of straight mileage.

Experience level. Three way toggle: new to running, casual/returning, competitive/experienced. Controls how aggressive the week over week ramp is allowed to be, and whether tempo/threshold work is included at all. New runners get easy running plus strides only, no formal tempo work until a base is established.

Current PR or recent race time, optional. Free text like "22:30 5k" or "no PR." If given, calculate real pace zones. If not given, output effort based zones only and prompt for a time trial 2 to 3 weeks in.

Lifting days per week, optional. If the user already has a lifting plan active in the app, pull those days directly instead of asking again. Otherwise ask which days and how many. Current live program is a 3-on-1-off Arnold Split (Chest+Back, Shoulders+Arms, Legs+Abs, Rest), confirm that's still accurate when you read the code, since it may have changed since this was written.

## Algorithm

### Total weeks
`weeks = floor((race_date - today) / 7)`. If today isn't a Monday, show the remainder as a separate short "Week 0" restart week that doesn't count toward the main progression.

### Weekly mileage progression
No more than 10 to 15 percent increase week over week for new/casual runners, up to 20 to 25 percent for competitive/experienced runners rebuilding from a real training background, not from zero.

Insert one cutback week (roughly 20 to 25 percent reduction) every 3rd or 4th build week. Never place a cutback the week immediately before taper.

Taper length by race distance: 5k/10k, 1 week. Half marathon, 1 to 2 weeks. Marathon, 2 to 3 weeks. Taper reduces volume roughly 40 to 60 percent off peak by race week. Race distance itself counts as that week's long run.

If `weeks` is too short to reach the requested peak mileage without breaking the ramp rule, don't force it. Cap the achievable peak and tell the user plainly, in the UI, not buried in copy.

### Suggested peak mileage caps (slider defaults, not hard limits)

| Experience | 5k/10k | Half marathon | Marathon |
|---|---|---|---|
| New to running | 15 to 20 | 20 to 25 | not recommended as a first race without a longer base first |
| Casual/returning | 20 to 30 | 25 to 35 | 35 to 45 |
| Competitive/experienced | 30 to 45 | 35 to 50 | 50 to 70 |

### Day of week template
Always anchor around one long run (weekend, or the day with most available time). Casual and competitive levels get one tempo/progression day. New runners get all easy days plus strides, no tempo.

3 days: long run, one easy, one tempo (or easy if new runner).
4 days: long run, two easy, one tempo.
5 days: long run, two easy, one tempo, one recovery/easy.
6 days: long run, two easy, one tempo, one recovery/easy, one additional easy or double day.

### Merging with a lifting plan
Days carrying both a lift and a run: lift stays upper body/core focused, run is easy or the tempo day, never stack two hard stimuli same day.

Lift only days (no run scheduled): heavier lower body lifting goes here.

Long run day: no lower body lifting same day. Upper body only if the user insists on lifting that day. Check the current program's deload weeks too, if a deload week overlaps a running cutback week, don't stack two down-weeks worth of message fatigue, just let both apply, don't add extra logic to compensate.

The user's one full rest day from lifting, if there is one: any run here is short and easy, or fully optional.

### Pace calculation
If a PR/recent race time is given, convert it to a baseline pace using a standard race time equivalency method (Riegel formula or an equivalent VDOT style table), not a flat percentage, since half and full marathon equivalents don't scale linearly off a 5k time. Output:

Easy pace: roughly 60 to 90 seconds per mile slower than goal race pace.
Tempo/threshold pace: roughly 25 to 35 seconds per mile slower than 5k race pace, or close to current half marathon race pace for someone training for a half or full.
Long run pace: easy pace, with the last 1 to 2 miles of the final two long runs at goal race pace as a dress rehearsal.

If no PR is given, skip numeric paces and use effort language only (conversational, comfortably hard, easy), then prompt for a time trial around week 2 to 3 to unlock real numbers. Don't guess a number and present it as fact.

## UI flags to surface, not bury in copy
If requested peak mileage can't be reached safely in the time available, say so and show the achievable number instead of quietly capping it.

If the mileage jump from current to peak exceeds roughly 3x in under 10 weeks, show a soft warning about injury risk, don't block submission.

If lifting days overlap heavily with hard running days (5 to 6 lift days plus a running peak above 25 to 30 miles), show a note recommending lighter lower body volume during peak and taper weeks.

## Worked example, use this as the test case

Inputs: half marathon, race date 59 days out (Sept 26, 2026 from a July 29, 2026 start), 4 to 5 days per week, current mileage 10 to 15, target peak 30 to 35, experience competitive/returning, no current PR, lifting 6 days a week with 1 rest day.

Expected output: a restart Week 0 (partial, 14 miles) plus 7 full build weeks plus 1 taper/race week. Peak lands at 32 miles in week 7. One cutback week around week 4. Taper week around 22 total miles including the race itself.

Full week by week for this test case:

| Week | Dates | Phase | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Weekly miles |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Wed Jul 29 to Sun Aug 2 | Restart | (already past) | (already past) | Lift + 3mi easy | Lift only | Lift + 3mi easy, strides | 5mi long, easy | 3mi easy | 14 |
| 1 | Mon Aug 3 to Sun Aug 9 | Build | Lift + 3mi easy | Lift + 4mi tempo (1 to 2mi at tempo effort) | Lift only | Lift + 3mi easy | Lift only | 6mi long, easy | 2mi easy | 18 |
| 2 | Mon Aug 10 to Sun Aug 16 | Build | Lift + 4mi easy | Lift + 4mi tempo | Lift only | Lift + 4mi easy | Lift only | 7mi long, easy | 2mi easy | 21 |
| 3 | Mon Aug 17 to Sun Aug 23 | Build | Lift + 4mi easy | Lift + 5mi tempo | Lift only | Lift + 4mi easy | Lift only | 8mi long, easy | 3mi easy | 24 |
| 4 | Mon Aug 24 to Sun Aug 30 | Cutback | Lift + 3mi easy | Lift + 4mi tempo | Lift only | Lift + 3mi easy | Lift only | 6mi long, easy | 3mi easy | 19 |
| 5 | Mon Aug 31 to Sun Sep 6 | Build | Lift + 4mi easy | Lift + 5mi tempo | Lift only | Lift + 4mi easy | Lift only | 8mi long, easy | 3mi easy | 24 |
| 6 | Mon Sep 7 to Sun Sep 13 | Build | Lift + 5mi easy | Lift + 6mi tempo | Lift only | Lift + 5mi easy | Lift only | 9mi long, last 1mi at goal HM pace | 3mi easy | 28 |
| 7 | Mon Sep 14 to Sun Sep 20 | Peak | Lift + 6mi easy | Lift + 6mi tempo | Lift only | Lift + 5mi easy | Lift only | 12mi long, last 2mi at goal HM pace | 3mi easy | 32 |
| 8 | Mon Sep 21 to Sat Sep 26 | Taper + Race | Lift + 4mi easy | Lift + 3mi easy, strides | Lift only | 2mi easy shakeout, no lift | Full rest, no lift no run | RACE: half marathon | (Sun 27: full rest/recovery, outside this block) | 22.1 |

Use this table as the literal expected output when you test the generator with these inputs. If your generated output for this exact input set drifts meaningfully from this table, something in the algorithm is off, debug against this before moving on.

## Last steps
After building it, run it against the worked example inputs above and show the diff between what it generates and this table.

Then confirm the commit is a clean fast-forward on top of `origin/master` (`git log --oneline --graph -8` should show a straight line, no merge commit) before pushing, so Vercel deploys without conflict.
