> **DONE — build 7.33, commit `0101dd7`, pushed.**
>
> ## A prior implementation was found and reused
>
> Not built fresh. `git log --all -S "maxes-mode-reps"` turned it up in the **initial commit `9c00a6e`**, removed in **`a5ebf2c`** ("Remove 1RM maxes modal…"), which is what left the CSS orphaned. The old markup and `setMaxesMode()` / `updateEpley()` / `saveMaxes()` are the starting point; the CSS needed no changes at all, it still matches (it was only recoloured by the rebrand).
>
> **One deviation from the prompt, flagged deliberately.** The prompt describes a toggle on *each* max field. The implementation that actually existed — and the CSS that survived it — is **card-level**: `.settings-modal-card.maxes-mode-reps` swaps all three fields at once. Since the prompt says the found implementation is the real "before" and the orphaned CSS is the spec, I restored the card-level toggle rather than rewriting the CSS for per-field toggles. Say the word if per-field was actually wanted.
>
> **Three things I changed rather than restoring verbatim:**
> - **The estimate is written into the same 1RM input direct entry uses.** The old code had two save branches in `saveMaxes()`. Now `syncEstimates()` pushes the Epley result into `#max-<lift>`, and `commitMaxes()` reads only that — one read, one save path, and the number the user sees is literally the number that gets stored.
> - **A blank reps pair no longer clears an existing max.** Direct entry still clears on blank (unchanged). But toggling to Estimate mode with empty fields would otherwise have wiped all three maxes on the next autosave tick.
> - **One rep returns itself.** Epley would claim a 235 max off a 225 single (+3.3%). A single *is* a 1RM.
>
> Labels use the prompt's wording ("I Know My 1RM" / "Estimate It") rather than the old "Enter a Working Set". The formula is spelled out under the fields — `1RM = weight × (1 + reps ÷ 30)` — so it is never a hidden calculation.
>
> ## The run-setup step writes into the Run tab's own state
>
> Confirmed, and by construction rather than by copying. `onbRunSync()` copies each onboarding field into the **Run tab's actual input elements**, then calls `onRunInput()` — the Run tab's own parse-and-persist path. There is no second parser, no second `runPlan` write, and no duplicated defaults. `onbSetRunLevel()` likewise delegates to `setRunLevel()`. The test asserts this from both ends: `runPlan.*` holds the onboarded values *and* `#run-race-date` / `#run-distance` / `#run-dpw` / `#run-pr` / the level toggle all show them, and after a reload `initRunPlan()` reads back the same plan and `generateRunPlan()` builds off it.
>
> Peak and current mileage are **pre-filled from `suggestedPeak()`**, not asked — they follow the level and distance just chosen and stay adjustable on the Run tab. Step 2 never re-asks: if `runPlan.raceDate` already exists it closes and goes straight to Train.
>
> ## Both skippable, both autosaving
>
> Confirmed. Step 1 keeps the existing 1200 ms debounce plus immediate commit on blur; the reps fields are wired to the same `onMaxInput()` / `onMaxCommit()` pair, so an estimate persists without touching **Save & Enter**. Step 2 persists on every edit via `onRunInput()` → `persistRunPlan()`, which is what the Run tab already did — no debounce needed, matching the autosave audit's finding.
>
> Skipping step 1 still advances to step 2 (lifting-only users skip step 2 there). Skipping step 2 writes nothing: `runPlan` keeps the defaults `initRunPlan()` set, and the Run tab renders its normal "pick a date" state rather than a half-configured one. **Escape or a backdrop click** ends onboarding outright — deliberately distinct from "Skip for now", which skips only the current step.
>
> ## Verification
>
> `onb.js`, a scratch harness in the repo root (untracked, same convention as `gen.js`), loads both of `index.html`'s real script blocks into a stubbed DOM built by scanning the file's own `id=` attributes — so a test naming an element the markup doesn't have fails rather than passing against an invented one. **71 assertions, all passing**, across the 6 verification points: Epley maths and its null cases, the toggle's CSS-class wiring, estimate-displayed-equals-estimate-saved, the estimate seeding a `maxPct` accessory weight, direct entry unchanged (including blank-clears), no wipe on mode switch, onboarding→`runPlan`→Run-tab-fields agreement, autosave without either save button, reload with no re-ask, `generateRunPlan()` off the onboarded values, both skip paths, and the settings-button entry point *not* triggering the step-2 chain. `check.js` confirms both script blocks parse; the existing `gen.js` generator suite still runs clean.
>
> **Not checked in a real browser this session** — consistent with the standing caveat on every prompt here. Everything above is asserted against the real script running in a stubbed DOM, not against layout or touch behaviour. The two things genuinely worth a real look: how the run-setup form reads inside the 480 px modal card on a phone, and the reps-row two-column layout at narrow widths.

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include `34b15f4` (tab row removal, logo dropdown is the nav) or newer.

## Context
Two separate additions to the app's first-run onboarding, read both before starting.

**1. A "don't know your max" toggle used to exist and needs restoring.** The CSS is still in the file, unused: `.mode-toggle-btn`, `.settings-modal-card.maxes-mode-reps`, `.maxes-reps-row`, `.maxes-1rm-input`, `.maxes-est-1rm` (around lines 1458–1480). None of it is referenced by any markup or JS function anywhere in the file, it's orphaned styling from a feature that existed and was removed. Before designing this from scratch, check git history (`git log -p --all -S "maxes-mode-reps"` or similar) for a prior implementation, if one exists in an earlier commit, that's the actual "before" being asked for and should be the starting point, not a guess at what it might have looked like. If nothing turns up in history, build it fresh using the existing CSS as the spec for how it should look.

The feature: each max field (squat, bench, DB press) gets a toggle between "I know my 1RM" (a straight weight input, today's behavior) and "Estimate it" (reps-based: enter a weight and how many reps you got at it, the app computes an estimated 1-rep max from that). Use a standard, transparent formula, Epley (`1RM = weight × (1 + reps/30)`) is the simplest and most commonly recognized, matches this app's existing preference for a named, standard method over an invented one (the running generator already does the same thing with Riegel/VDOT for pace). Display the estimated number back to the user (`.maxes-est-1rm` already exists for this) so it's never a hidden calculation. Whichever mode was used, save the value through the same maxes persistence this task's sibling autosave work already fixed, no separate save path.

**2. A first-run running setup, not just lifting.** Right now only the lifting side has an onboarding gate (the maxes modal). The user wants running setup captured at the same moment, not left undiscovered on the Run tab. Add a second onboarding step, shown after the maxes modal (whether it was completed or skipped), asking for the same fields `readRunInputs()`/`generateRunPlan()` already use: race date, race distance, current PR (optional, matching the existing "no current PR" fallback to effort-based pacing), days per week they want to run, and experience level (new/casual/competitive, matching the existing three-way toggle already used on the Run tab). Pre-fill peak and current mileage with the existing suggested defaults (`suggestedPeak()`) rather than asking for them in this first step, they're already adjustable later on the Run tab itself, this onboarding step is about the handful of inputs that actually define the plan, not every dial.

This is not a new system, it's surfacing fields that already exist and already have a generator behind them, one step earlier in the flow. Reuse `readRunInputs()`, `onRunInput()`, `persistRunPlan()`, `setRunLevel()` and the existing Run tab markup/logic as the source of truth, this new modal should write into the same `runPlan` state the Run tab already reads and renders, not a parallel copy.

Running is optional the same way lifting maxes already are, this new step needs its own "Skip for now," someone using this app purely for lifting shouldn't be forced through race-planning to get in.

## Task
1. Restore the max-estimate toggle on the maxes modal, wired to the existing CSS classes, computing and displaying an Epley estimate, saving through the same autosave path as the direct-entry mode.
2. Build the new run-setup onboarding modal (or extend the existing modal flow, your call on whether this is a second full-screen step after maxes or a second screen within the same overlay, whichever reads better once you've built it) capturing race date, race distance, PR (optional), running days per week, and experience level, using the app's existing run-plan state and generator, not a duplicate.
3. Both onboarding steps need a skip path that doesn't block entry to the app, and both need to feed the exact same state the rest of the app already reads (`userMaxes`/whatever the maxes are stored as, and `runPlan`), so filling this in at onboarding and filling it in later from the Train/Run tabs produce identical results.
4. Autosave both, per the pattern already established elsewhere in this app, no explicit save button required to persist what's typed, consistent with the standing direction on this whole app.

## Verify before pushing
1. Toggle to "Estimate it" on a max field, enter a weight and reps, confirm the estimated 1RM displays and is what actually gets saved and used as the starting-weight basis elsewhere in the app.
2. Toggle back to direct entry, confirm it still works exactly as before this change.
3. Complete the new run-setup step with real values, confirm the Run tab reflects exactly those values when visited afterward (same plan, not a re-ask).
4. Skip the run-setup step, confirm the app still opens normally and the Run tab is empty/ready for input rather than in a broken state.
5. Confirm both onboarding steps' fields autosave without requiring their own explicit save button, matching the sibling autosave task.
6. No console errors, both script blocks parse, all existing suites pass, plus new coverage for the restored toggle and the new onboarding step.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: whether a prior implementation of the max-estimate toggle was found in git history and reused, or built fresh from the CSS, confirm the run-setup step writes into the same state the Run tab already reads, and confirm both new/restored inputs are skippable and autosaving.
