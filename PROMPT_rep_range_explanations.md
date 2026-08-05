## Summary (build 7.37)

**Field name: `repWhy`.** One string per exercise on `EXERCISES`, sitting directly after
`repRange` so the range and its reason are read together in the config. Static content —
no storage, no migration, no user input, nothing persisted, `.lift-note` untouched.

**All 42 got real per-exercise reasoning, not a tag-level template.** Verified rather
than asserted: 42/42 non-blank, all 42 sentences distinct (`new Set(whys).size === 42`),
every one between 12 and 16 words. The prompt's warning about `tag` was the right one —
`isolation` alone spans 6–10 (Nordic curl) to 15–20 (rear delt fly), five distinct ranges,
so `sets.js` asserts specifically that the isolation sentences are all distinct from each
other. A tag-level copy-paste would have failed that check.

Spot check across brackets, each tied to that movement rather than its category:

| Exercise | Range | Reason given |
|---|---|---|
| Flat Barbell Bench | 5–8 | heavy enough for real strength without burying your CNS |
| RDL | 8–10 | keeps your lower back fresh enough to hold position every rep |
| Ab Wheel Rollout | 8–12 | already bodyweight, and your form breaks before your abs do |
| Leg Extension | 12–15 | spares your knee the shear that heavy leg extensions create |
| Seated Calf Raise | 15–20 | seated targets the soleus, which is almost entirely slow-twitch |
| Nordic Curl | 6–10 | the eccentric is brutal enough that rep eleven does not exist yet |
| Straight Arm Pulldown | 15 | a straight-arm lever is long enough that light is the only option |
| Arnold Press | 8–10 | the rotation adds time under tension a straight press does not |

The last two are the interesting ones: straight-arm pulldown and Arnold press both break
the pattern their tag would predict (an isolation stuck at 15, a `primary` that is not
5–8), and both sentences explain the movement-specific reason rather than the category.

**Where it renders — one place, both paths.** Re-checked fresh as the prompt asked, and
the premise that this markup exists twice is still stale after the flexible-sets build:
`renderDaySections()` fills the 6-day path's hand-written `.lift-rows` hosts from
`liftRowHTML()`, the same generator `#altPlan` uses. So the caption was added once, in
`liftRowHTML()`, immediately after the `.lift-sets-reps` line and before the variant
chips, and both paths get it. `sets.js` section 11 asserts the rendered markup from a
6-day exercise and a shorter-split exercise each contains `.lift-rep-why` *and that
exercise's own sentence*, plus that the caption lands after `.lift-sets-reps` and before
`.lift-note`.

The only other hand-written rows using `.lift-sets-reps` are the REST + STRETCH mobility
rows (couch stretch, pigeon pose, band pull-aparts). Those are not in `EXERCISES`, carry
no `repRange` or `tag`, and are measured in seconds and holds rather than rep ranges, so
they were correctly left alone.

**Kept minor.** `.lift-rep-why` is 11px on `--dim` (a step quieter than the 13px `--muted`
rep count above it), `max-width: 52ch`, 3px top margin. It is a caption, not a control,
with no border, background, or interaction. Guarded with `ex.repWhy ? ... : ''` so a
missing field renders nothing rather than an empty box.

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 86/0
(69 previous + 17 new), both CSS style blocks brace-balanced.

**Seen on screen after all — and it was wrong (fixed in build 7.38).** The caption rendered
in the right place (under "2 sets × 5–8 reps", above the SWAP chips, reading "Five to eight
keeps the load heavy enough for real strength without burying your CNS"), but measured
**2.05:1 contrast** against the row against 5.41:1 for the rep count above it. Well under
the 4.5:1 AA threshold — `--dim` at 11px is unreadable body copy on a phone in a gym, which
defeats the point of writing 42 real explanations. "Keep it minor" had been taken too
literally in colour when the hierarchy should come from size and position. Changed to
`--muted` (5.41:1 measured), keeping 11px and the position. The type scale still makes it a
caption; it is just legible now.

Getting a browser at all required finding why one had been unavailable for three builds:
`sw.js:14` posts a RELOAD message to every client on activate and `index.html:7345` calls
`window.location.reload()` in response, so on a fresh profile the page reloads itself right
after `load` and the extension's `document_idle` wait never resolves. Proven rather than
assumed — `manifest.json` on the same origin answers instantly while `index.html` times out
at 45s. The workaround is to serve a copy with no `sw.js` beside it, so registration 404s
into its own `.catch`. Unrelated but noticed while there: `sw.js:10` deletes every cache key
on activate including its own, so the cache-first path never has anything to hit. Neither
was touched — the reload is presumably deliberate — but both are worth a decision.

Still outstanding elsewhere: `PROMPT_browser_verification.md` (480px modal, dropdown
regression) and `PROMPT_flexible_sets.md` (the 2/3 control and the warm-up block on screen).

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include whatever build `PROMPT_flexible_sets.md` produced or newer.

## Context
Every exercise in the `EXERCISES` array (starts around index.html:3384) already carries a `repRange` (e.g. `[5,8]`, `[12,15]`) and a `tag` (`primary` / `secondary` / `isolation`), and both render today as plain text, "2 sets × 5–8 reps," with no explanation of why that particular range was picked for that particular movement. There are 42 exercises total. The actual breakdown, checked directly rather than assumed:

- `primary` (5 exercises): ranges 5–8, 5–6, 8–10 — the heavy compound strength lifts
- `secondary` (17 exercises): ranges 8–10 through 12–15 — moderate hypertrophy work
- `isolation` (20 exercises): ranges as low as 6–10 and as high as 15–20 — **this tag does not cleanly predict rep range**, it spans the widest spread of any tag

That last point matters: whoever does this cannot template an explanation off `tag` alone, isolation movements alone range from 6-10 reps (ab wheel) to 15-20 reps (lateral raises, rear delt fly). Each exercise's rep range has its own real reason, tied to that specific movement, not a category-wide copy-paste.

The existing `.lift-note` field on each exercise (rendered in `.lift-note` in both render paths) is already long, form-cue-focused copy, "how to do this exercise correctly." A few notes happen to mention rep-range reasoning in passing (seated calf raise: "15–20 reps is the right zone for this muscle type"), most don't, and it's buried mid-paragraph either way. This task is not about editing those notes. It's a separate, short, consistently-present line specifically about the rep count, brief enough that someone glancing at the row gets the point without reading a paragraph.

## Task
1. **Add a new short field per exercise** (call it `repWhy` or similar, your call on the exact key name, keep it consistent). One sentence, roughly 8–16 words, in the same direct, second-person coaching voice the existing notes already use ("you," not "the lifter"). It explains specifically why *that* movement uses *that* rep range, grounded in real training reasoning for that exercise, not a generic tag-level template. Some real texture to work with, by rep-range pattern, but write the actual sentence per exercise, don't mail it in:
   - Heavy low-rep compounds (5–8ish): CNS demand, load management, strength is the point, not fatigue.
   - Moderate ranges (8–12ish): enough volume for hypertrophy while the load is still real weight.
   - High-rep isolation (15–20ish): usually a small or fragile joint (rotator cuff, elbow, wrist) or a muscle that responds better to volume than load (calves, rear delts, side delts).
   - Low-rep isolation (6–10ish, e.g. ab wheel): still light on load but demands strict control through a long range, so reps stay low even without heavy weight.
   Write all 42. This is real content, not filler, someone using this app should read it and learn something true about why the program is built the way it is.
2. **Render it briefly**, a small muted line directly under the existing "X sets × Y–Z reps" text, not mixed into `.lift-note`. Find the current live rendering for that line fresh in both places it exists, the generated path (`liftRowHTML()`) and the hand-written 6-day markup, since `PROMPT_flexible_sets.md` likely already touched this exact spot to handle variable set counts, don't assume the line numbers or exact markup from before that build.
3. **Keep it minor, not another attention-grabbing element.** Same constraint as the last build: someone glancing at a row for the first time should see the exercise name, the log inputs, and now a small "why" line that reads as a caption, not a new UI control or anything that competes with what's actually actionable on the row.
4. Do not touch `.lift-note`, don't touch any persisted data, this is a static content field on `EXERCISES`, nothing here is user input and nothing here needs a storage migration.

## Verify before pushing
1. Spot check at least one exercise from each rep-range bracket (5–8, 8–12, 12–15, 15–20, and the odd one like ab wheel's 8–12) and confirm the explanation is actually true for that movement, not reused boilerplate.
2. Confirm every one of the 42 exercises has a `repWhy` line, none blank, none obviously copy-pasted word-for-word between unrelated exercises.
3. Confirm the line renders in both the generated (shorter-split) and hand-written (6-day) paths, and doesn't visually compete with the row's actual inputs.
4. No console errors, both script blocks parse, CSS braces balanced, all existing suites pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: the field name chosen, confirmation all 42 exercises got real per-exercise reasoning rather than tag-level templates, and where the line ended up rendering in both paths.
