> **DONE — build 7.24, commit `ae6ebb6`, pushed.**
>
> **How equipment tags were assigned.** An ordered rule list matches the variant name itself, which is enough for all **169** names across the 42 exercises — none fell through to a generic bucket. Order is load-bearing and commented in the code: `smith` before `machine` (so "Smith Machine Bench Press" is not a machine), `cable` before `barbell`, and `dumbbell` before `barbell` (so "Dumbbell Skull Crusher" is not a barbell lift). Seven tags: barbell, dumbbell, machine, cable, smith, band, bodyweight.
>
> **How they are displayed.** A small uppercase label inside each chip, using the existing `--font-display` / letter-spacing / border-token patterns rather than a new visual language. The three minimal-equipment tags — bodyweight, dumbbell, band — render brighter (`--text` on `--field`) than the rest, so the answer to "which of these can I do without a rack or a specific machine" is visible at a glance rather than something you have to know gym equipment to infer.
>
> **Minimal-equipment coverage: all 42 exercises now have one.** The audit found three that did not, and two of those turned out to be tagging faults rather than genuine gaps:
>
> - `skull-crusher` — "Dumbbell Skull Crusher" was matching the barbell rule first. Fixed by moving dumbbell above barbell.
> - `seated-calf` — every calf raise was being called a machine. A standing calf raise needs nothing at all, so the machine rule was narrowed to `seated calf` / `calf raise machine` / `leg press calf raise` and standing/single-leg went to bodyweight.
> - `chest-supp-row` — a real gap: machine, cable and bar only. Gains **Single-Arm Dumbbell Row**, the standard substitute and already used elsewhere in this program. No exotic new exercises were invented.
>
> **How the custom fix works.** At the `exVariants` layer, which is the point of it:
>
> ```js
> function exCurated(ex) { return [ex.name].concat(EX_ALTS[ex.id] || []); }
> function exVariants(ex) {
>   var list = exCurated(ex);
>   var c = variantChoice[ex.id];
>   if (c && list.indexOf(c) === -1) list.push(c);   // a stored custom name IS a variant
>   return list;
> }
> ```
>
> `activeVariant()` validates against `exVariants(ex)`, so including the stored name there is the entire fix — the custom pick survives being read back instead of silently reverting to the default. `exCurated()` is split out so `isCustomVariant()` can still tell the two apart for the edit-again behaviour, without that distinction leaking anywhere else.
>
> **Progression confirmed, not assumed.** `prevWeekEntry` matches history on `activeVariant(ex)`, so once the above is right it follows custom names with **no special-casing** — verified by asserting the function contains no custom-variant branch, and by exercising it directly: a set logged under a custom name rolls forward to the next week; switching to a curated alt rolls off that alt s own history and not the custom one; switching back to the same custom name recovers its own history unblended; and a brand-new custom name starts a clean slate exactly as any new variant does. The test also reproduces the **old** logic and confirms it would have reverted the pick, so the bug is pinned rather than described.
>
> **Guardrails:** whitespace collapsed and trimmed, capped at 40 characters (enforced on both the input and the commit), and a blank submission falls back to the exercise s own name rather than saving an empty variant. Saved through `variantChoice` / `persistVariants`, the same path as a curated pick. `chooseVariant` now reads `data-name` rather than the button text, since the chip text includes the tag label.
>
> **Suites:** a new 30-check substitution suite plus all eleven existing ones pass.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> ae6ebb6 Tag every swap by equipment, and give people a real custom option
> baadddb Record the adaptive split and week-extension summary
> 35acad3 Make lifting days a real shared setting, and let the block run past week 10
> ```
>
> Local HEAD `ae6ebb609254f61f5568d66e6c2b0210a395b054` matches `origin/master`.
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
There's already a per-exercise variant system, `EX_ALTS` (around line 3044), `exVariants()`, `activeVariant()`, `variantChipsHTML()`, `chooseVariant()`. Every lift already offers 3 to 4 alternate exercise names as clickable chips under its name, the user's pick persists (`persistVariants`), and weight/rep progression already rolls off history filtered by whichever variant is currently active (`prevWeekEntry` matches on `activeVariant(ex)`, see the comment above it: "Roll off your last working week, same variant"). Read this system fully before changing it, this task extends it, it doesn't replace it.

This is close to what's being asked for but not quite there. The user wants: people following this plan without access to the exact equipment it assumes should be able to swap in what they do have, curated options first, not a wide-open free-for-all, but a genuine escape hatch when none of the curated options fit. Two concrete gaps in the current system:

1. The alt lists aren't organized by equipment. A user scanning "Dumbbell Bench Press, Machine Chest Press, Smith Machine Bench Press" as three flat chip labels has to know gym equipment well enough to infer what each one requires. Someone training in a small home gym with dumbbells only has no fast way to see "which of these options don't need a machine or a barbell."

2. There's no true custom option. If someone's gym genuinely has none of the listed alternatives for a given lift, they're stuck picking the least-wrong option and mislabeling their log.

## Task

### 1. Tag every variant by equipment
For each exercise's full variant list (the original plus every entry in `EX_ALTS`), add an equipment tag: something like `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `smith`. Use your judgment reading each exercise name, this is inferable from the names themselves in nearly every case (Smith Machine Squat is `smith`, Goblet Squat is `dumbbell`, Wall Sit is `bodyweight`). Surface the tag visibly on each chip (a small label or icon, matching the site's existing token/type patterns, not a new visual language), so a user can tell at a glance which alternatives don't need a rack, a specific machine, or anything at all.

Go through `EX_ALTS` and make sure every exercise's list actually includes at least one `bodyweight` or minimal-equipment option where anatomically reasonable (most do already, spot check ones that don't, e.g. anything currently offering three machine-dependent alternatives and nothing a home-gym or limited-equipment lifter could do). Don't invent exotic new exercises to fill gaps, use standard, well-known substitutes.

### 2. Add a genuine custom option
Add one more chip at the end of each exercise's variant row, "Custom" or "Other" (your call on label), that reveals a small text input on click instead of immediately selecting anything. Typing a name and confirming (enter key or a small confirm control, your call) stores that free-text name as the active variant for that exercise, same storage path as a curated pick (`variantChoice`, `persistVariants`), and the chip row should then show the typed name as the active chip, editable again if clicked.

This touches `exVariants()`, which currently only returns `[ex.name].concat(EX_ALTS[ex.id] || [])`, a stored custom name won't be in that list, so `activeVariant()`'s current check (`exVariants(ex).indexOf(c) !== -1`) will silently fall back to the exercise's default name and the custom pick will appear to not have saved. Fix this properly, a stored custom variant needs to survive being read back, not just get written and then invisibly reverted on next render.

Confirm progression logic (`prevWeekEntry`, which matches history entries by `activeVariant(ex)`) works correctly with a custom name exactly the way it works for a curated alt, same-name history rolls forward, a fresh custom name starts a clean slate the same way switching to any other new variant already does today. This should require no special-casing if the fix above is done at the right layer (custom names are a legitimate variant, not a separate code path), confirm that's actually true rather than assuming it.

Reasonable guardrails on the free text: a short max length, trim whitespace, and don't allow an empty string to save as a variant (falls back to the default name if submitted blank).

## Verify before pushing
1. Every exercise's variant chips show an equipment tag, spot check at least one from each of the six exercise pools.
2. Pick a curated alt, confirm the tag displayed matches the equipment that exercise actually requires.
3. Use the Custom option on at least three different exercises, type a name, confirm it saves, persists across a reload, and displays correctly as the active chip.
4. Log a set under a custom variant name, advance a week, confirm progression rolls off that logged set the same way it would for a curated variant (not resetting to a blank baseline).
5. Confirm switching away from a custom variant back to the original or a curated alt still works normally, and switching back to the same custom name later still shows its own history, not blended with a different variant's.
6. No console errors, both script blocks parse, all existing suites unaffected (Run tab worked example, stress permutations, calendar, week sync, chart, adaptive logging), especially anything touching variant selection or weight progression.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: how equipment tags were assigned and displayed, confirmation every exercise has at least one minimal-equipment option, exactly how the custom variant fix works in `exVariants`/`activeVariant`, and confirmation that progression history correctly follows custom variant names the same way it follows curated ones.
