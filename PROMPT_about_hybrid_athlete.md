> **DONE — build 7.15, commit `10b5bdd`, pushed.**
>
> All four paragraphs and the fifth pillar are in place. `<section id="about">` keeps its section label ("What This Is"), heading ("NOT FOR EVERYONE"), the four-paragraph `.about-text` block and the `.pillars` grid exactly as they were — content swapped inside identical markup, no redesign, and zero logic lines touched in the whole diff.
>
> **Bold emphasis.** Six `<strong>` spans across the four paragraphs, matching the old copy's density (it had five). Placement follows the suggestions: "Run the Weights does not make you choose" (P1), "Nothing here is guesswork stitched together from two separate apps" (P2), "actually having done both" (P3), "You do not" (P4). Two additions beyond the suggested list, both mirroring a pattern the old copy already used: "Arnold Split" in P2 is bolded the way the old P2 bolded "10-week Arnold Split", and "former Division 1 cross country captain" in P3 is bolded because the founder credential is the load-bearing claim of that paragraph and it would otherwise be the only paragraph carrying a single mid-sentence bold.
>
> **The five-card grid did need a layout adjustment.** `.pillars` is `1fr 1fr` above 768px, so a fifth card landed orphaned at half width in the last row — visibly a mistake rather than a choice. Added one rule, `.pillar:last-child:nth-child(odd) { grid-column: 1 / -1; }`, so an odd final card spans the pair instead. It is written against odd-ness rather than `:nth-child(5)` so it keeps working if a sixth pillar is ever added. Below 768px the grid is already single-column and `1 / -1` is a no-op there. Checked at 1440 / 1024 / 820 / 768 / 390px: rows come out [1,2] [3,4] [5 spans] above the breakpoint and a clean single stack below, no orphan at any width.
>
> **Verification.** No leftover lifting-only framing — every phrase from the old copy ("spinning their wheels", "is not random", "look completely different", the face-pulls paragraph) is gone. The section carries no hardcoded hex at all, so the new card inherits the warm palette through `var(--card)` / `#F1EFE1` / `var(--muted)` like the other four; zero orange or old-palette values anywhere in it. About-section divs balance 19/19, both script blocks parse, and all four existing suites still pass unchanged (Run tab 89/90 exact, 19/19 stress, 10/10 calendar states, all adaptive-logging states).
>
> ---
>
## Sync first
```
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` shows the current commit before starting. If you hit "cannot lock ref ORIG_HEAD" or a similar stale lock error, remove the lock file (`rm -f .git/ORIG_HEAD.lock` or whatever it names) and retry, a previous session left one behind.

## Task
This is a copy change only, no new logic, no new merge rules. Rewrite the About section (`<section id="about">`, inside `#sec-about`) to reposition the whole app as a hybrid athlete program, strength and cardio together, and to tell the founder story: built by a former Division 1 cross country captain, for people training to be strong and still have a real engine, not one at the expense of the other.

Keep the existing section label ("What This Is") and heading ("NOT FOR EVERYONE") as is, keep the four-paragraph `.about-text` structure and the `.pillars` grid structure exactly as they are, this is a content swap inside the same markup, not a redesign.

### Replace the four paragraphs in `.about-text` with these four, in order

Paragraph 1:
"Most men pick a lane. Get big and slow, or get lean and fast, and quietly let the other side go. Run the Weights does not make you choose. This is a ten week hybrid athlete program: real strength gains on the same calendar as a real running or cycling engine. You add weight to the bar every week. You also show up to your 5k, your half marathon, or your century ride actually ready, not just surviving it."

Paragraph 2:
"The strength side is the same non-negotiable Arnold Split underneath everything here: three days on, one off, bench and squat adding load every single week for three weeks before a deload resets you for Wave 2. Underneath that runs a second engine, a running plan built off your actual race date, current mileage, and experience, that layers onto the same week without wrecking your legs before leg day or your legs before your long run. Hit chest and back in the morning, your easy run or tempo work the same day if the calendar calls for it. Nothing here is guesswork stitched together from two separate apps."

Paragraph 3:
"This was built by a former Division 1 cross country captain who also spent years in the weight room, not a lifter guessing at running volume, and not a runner guessing at what a real hypertrophy block looks like. Both sides of this program come from actually having done both, including the mistakes that come from doing them wrong first."

Paragraph 4:
"Ten weeks from now you squat heavier, press heavier, and you can still run the distance you signed up for. Most men never build both at once because they assume they have to choose. You do not."

Keep any existing `<strong>` emphasis pattern the paragraphs currently use (key phrases bolded), apply that same treatment to the new copy, pick the phrases that carry the most weight in each paragraph (something like "Run the Weights does not make you choose" in paragraph 1, "Nothing here is guesswork stitched together from two separate apps" in paragraph 2, "actually having done both" in paragraph 3, "You do not" in paragraph 4), use your judgment on exact placement, matching how the current copy bolds its strongest lines.

### Add a fifth pillar card
Add one new `.pillar.fade-up` card to `.pillars`, after the existing four, same markup pattern (`.pillar-title` + `.pillar-desc`):

Title: "Two Engines, One Plan"
Description: "Built by a former Division 1 cross country captain who also lifts seriously, not a runner's guess at a hypertrophy block or a lifter's guess at a training run. The running side scales to your actual race, your actual mileage, your actual timeline, then sits on the same calendar as your lifting so the two never collide."

Check the `.pillars` grid CSS handles a fifth item cleanly (wraps sensibly, doesn't leave an awkward orphaned single item in the last row on common breakpoints), adjust the grid if five items break the current layout.

## Verify before pushing
1. Read the new paragraphs back in context, confirm no leftover references to the old framing (nothing implying this is lifting-only).
2. Confirm the fifth pillar card renders in the existing warm palette (cream text, card background) with no leftover orange or old-palette color, this section was already rebranded in the last build, don't reintroduce anything.
3. Confirm the `.pillars` grid still looks intentional with five cards at mobile, tablet, and desktop widths, not just desktop.
4. No console errors, both script blocks still parse.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, no merge commit, then push.

Leave a short summary at the top of this file when done: confirm the four paragraphs and fifth pillar are in place, note anything you changed about the bold emphasis placement, and flag if the five-card grid needed any layout adjustment.
