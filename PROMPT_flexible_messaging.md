> **DONE — build 7.22, commit `0c3d0e7`, pushed.**
>
> **All six spots updated**, each verified in context for grammar and tone:
>
> 1. Hero tagline → "Your goals. Your timeline. No guesswork."
> 2. About para 1 — only the middle sentence swapped; the opening two, the bolded "Run the Weights does not make you choose," and the closing 5k/half/century sentences are byte-identical.
> 3. About para 4 opening → "By the time you hit your race, you squat heavier…"; the rest of the paragraph and the bolded "You do not." untouched.
> 4. Built to Last pillar closing → "…sustainable no matter how long your plan runs."
> 5. Edge intro opening → "Finish this program and you will walk into rooms differently."
> 6. Pull-quote attribution → "Run the Weights — The Arnold Split, Built Around You." The quote itself is unchanged.
>
> **One additional reference found beyond the six and fixed:** the Battle Plan heading read `10 WEEKS.<br>NO EXCUSES.` — the same fixed-duration claim in the same voice. Now `EVERY WEEK.<br>NO EXCUSES.`, cadence and confrontational tone preserved, number dropped.
>
> **One reference found and deliberately kept:** the hero ring label `/ 10 WEEKS`. That is a numeric readout of the live training-week selector, which genuinely still runs W1–W10, sitting directly beneath the ring number it counts against — not a pitch claim. Making it vague would have the UI misreport its own state. Flagging it for `PROMPT_adaptive_split_and_extension.md`: if the block length becomes variable there, that label should become **dynamic**, not removed.
>
> **"Arnold Split" untouched** in all four occurrences — it names the lift rotation, not a duration.
>
> **Nothing logical changed.** `git diff` is 7 insertions / 7 deletions, zero lines matching function/var/const/onclick/state-setter patterns. Ten train-week buttons, ten `#winfoN` panels, the `setTrainWeek` clamp at 9 and the import guard at `data.week <= 9` all still in place. Both script blocks parse; all ten suites pass unchanged.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 0c3d0e7 Stop selling a fixed ten weeks
> f96b8c3 Record the scroll-assembly retarget summary
> 5e37b13 Give the scroll assembly a real headline to land on
> ```
>
> Local HEAD `0c3d0e74ac652192f7712d54648adbc21035c132` matches `origin/master` exactly.
>
> **Queue-order note:** the runner lists this file first, but `PROMPT_scroll_carousel_fixup.md` was already complete and verified when the runner arrived, so it was pushed first rather than discarding finished work. The only coupling between them is that the new hero headline must not collide with this tagline — "Strong and fast." shares no phrasing with "Your goals. Your timeline. No guesswork.", checked after this change landed.
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
Copy change only, no new logic, no markup restructuring. The site currently sells itself on a fixed duration, "ten week program," in six places. Now that the program actually adjusts to a person's race date (short or long) and their chosen lifting days per week (see `PROMPT_adaptive_split_and_extension.md` if that's landed by the time you read this, this task doesn't depend on it, but the messaging should stop promising a number the product no longer hard-codes), the pitch itself needs to move: not "here is a fixed ten week block," but "this adjusts to your goals, your timeline, your day-to-day life." Same voice throughout, direct, second person, a little confrontational, don't soften the tone while removing the specific week count.

## Task
Six exact locations, replace as specified, nothing else in each surrounding block changes:

**1. Hero tagline** (`.hero-desc`, currently "Ten weeks. Full progression. No guesswork."):
Replace with: "Your goals. Your timeline. No guesswork."

**2. About section, paragraph 1** (currently opens "...This is a ten week hybrid athlete program: real strength gains on the same calendar as a real running or cycling engine..."):
Replace just that sentence with: "This is a hybrid athlete program built around your race date, your training days, and where you're actually starting from, not a fixed calendar you have to fit yourself into." Keep the rest of the paragraph (opening two sentences, the bolded "Run the Weights does not make you choose," and the closing two sentences about the 5k/half marathon/century ride) exactly as is.

**3. About section, paragraph 4** (currently opens "Ten weeks from now you squat heavier, press heavier, and you can still run the distance you signed up for..."):
Replace the opening clause with: "By the time you hit your race, you squat heavier, press heavier, and you can still run the distance you signed up for." Keep the rest of the paragraph (the "most men never build both at once" sentence and the bolded "You do not.") exactly as is.

**4. Pillar card** (currently ends "...the reason this program's pressing volume is sustainable for the full 10 weeks and beyond."):
Replace the closing clause with: "...the reason this program's pressing volume is sustainable no matter how long your plan runs." Keep the rest of that pillar's copy (the face pulls/band pull-aparts/shoulder CARs opening) exactly as is.

**5. Edge section intro paragraph** (currently opens "After 10 weeks of this program, you will walk into rooms differently..."):
Replace the opening clause with: "Finish this program and you will walk into rooms differently." Keep the rest of that paragraph exactly as is.

**6. Edge section pull-quote attribution** (currently "Run the Weights — 10-Week Arnold Split"):
Replace with: "Run the Weights — The Arnold Split, Built Around You." Keep the actual pull-quote text above it ("The average man will never know what he was capable of...") unchanged, this only touches the attribution line.

Search the full file for any other literal occurrence of "ten week," "10 week," "10-week," or similar (case-insensitive) beyond these six, in case one was missed here or added since, and apply the same directional fix (remove the fixed duration claim, replace with adjusts-to-you framing) using the same voice. Don't touch "Arnold Split" as a name anywhere, that refers to the lift rotation itself, not a time duration, and should stay.

## Verify before pushing
1. Search the rendered page for "ten week," "10 week," "10-week" (case-insensitive), confirm zero remaining hits outside of code comments or variable names that aren't user-facing copy.
2. Read all six replaced spots in context, confirm no leftover grammar breaks from the swap (dangling connectors, tense mismatches) and that voice and tone match the surrounding unchanged sentences.
3. Confirm nothing about the actual 10-week default program length changed, this is copy only, the underlying week count logic is untouched.
4. No console errors, both script blocks still parse.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm all six spots were updated, list any additional "10 week" references found and fixed beyond the six listed here, and confirm the Arnold Split name itself was left untouched.
