## Summary (build 7.35) — PARTIAL, one real bug found and fixed

First build this session actually looked at in a rendered browser (Chrome via the
extension, app served over `http://127.0.0.1:8777`). Two of the three flagged items
were fully verified on screen, one partially. **This pass is not complete** — see
"Not verified" below. It is being landed anyway because the bug it found is real and
because the next prompt starts with `git reset --hard`, which would have destroyed it.

**1. Shorter-split Train tab — VERIFIED, renders correctly.** With `liftDaysPerWeek`
= 4 and a from-scratch reload, the Train tab rendered fully: day nav showing
UA·UPPER A / LA·LOWER A / UB·UPPER B / LB·LOWER B, and all four days clicked through
with real content, not just the first. Upper A showed Flat Barbell Bench Press,
2 sets × 5–8, swap chips, the warm-up ramp (70×5 / 105×3 / 140×2) and "Suggested
start: 175 lbs from your bench max"; Lower A showed Barbell Squat off the 315 squat
max with a 4-step ramp and Set 1 / Set 2 rows; Upper B showed the Incline/Arnold
variants, distinct from Upper A; Lower B showed Deep Goblet Squat at 2 × 12–15.
Nothing blank. The `switchDay()` fix from the backward-compat audit is confirmed as
the thing actually on screen, not just the thing the assertions claimed.

**2. Maxes estimate toggle — VERIFIED, swaps and computes correctly.** Opened from
the EDIT MAXES button. "I Know My 1RM" showed single full-width fields (315 / 220).
Clicking "Estimate It" visibly swapped the card: each lift became side-by-side
WEIGHT (LBS) / REPS fields. Entering 275 × 5 displayed "≈ 320 lbs estimated 1RM" —
correct Epley (275 × (1 + 5/30) = 320.83, rounded to 320) — and the settings bar
behind the modal updated to SQUAT 320 lbs live. Switching back to direct entry
carried 320 into the 1RM field, and typing 335 over it persisted
(`{"squat":335,...}`). Both directions work.

**3. Run-setup modal at phone width — PARTIALLY verified, and this is where the bug
was.** Chrome would not resize below its minimum window width, so the app was
rendered in a same-origin iframe at exactly 390 CSS px — real layout, real media
queries, real rendering, and scriptable. At 390px the modal renders correctly:
card 359px wide inside the 390 viewport, "STEP 2 OF 2", race date with native
picker, distance select, and the three-button experience toggle (NEW / CASUAL /
RETURNING / COMPETITIVE / EXPERIENCED) all unclipped. `documentElement.scrollWidth`
equalled `clientWidth` (386) — **no horizontal scroll**. The experience toggle's
`scrollWidth` equalled its `clientWidth` (272), so the pre-flagged concern that
"COMPETITIVE" would overflow was wrong; the `<br>` handles it. The card scrolls
internally (1026 content in 735) which is expected at this height.

### The bug the assertions missed

`enhanceSmoothInput()` wraps text inputs in a `span.smooth-wrap` that was
`display: inline-block`. Shrink-to-fit sized that wrapper to the input's *intrinsic*
width, and the input's own `width: 100%` then resolved against the shrunken wrapper —
collapsing every full-width text field to the browser default ~169px. Live measurements:

| field | rendered | should be |
|---|---|---|
| `run-pr` (Run tab) | 169px | 346px (its sibling date field) |
| `onb-run-pr` (onboarding step 2) | 169px | 273px (its grid column) |

On screen this was a visibly half-width box sitting directly under a full-width one.
`type="number"` fields escaped it because `caretSelectable()` throws on them and bails
before wrapping, which is why the maxes modal looked fine. No assertion could catch
this: the classes, values, and wiring were all correct — only the rendered box was wrong.
This is exactly the gap this prompt existed to close.

Fixed at `index.html:1876` by making `.smooth-wrap` `display: block`, so the wrapper is
layout-neutral. Re-verified at 390px after the fix: `run-pr` 346px, `onb-run-pr` 273px,
both matching their siblings, still no horizontal overflow.

### Not verified — still open

- **Run-setup modal at 480px**, and completing it with real values / confirming the
  Run tab reflects them / the skip path. Clicking the native date input opened Chrome's
  calendar popup, which is an OS-level window that blocks CDP; it wedged the renderer
  for the whole origin and never recovered. Race date *was* confirmed wiring through
  live (typing 06/13/2026 set `runPlan.raceDate` and updated the weeks hint) before
  the freeze.
- **Logo dropdown regression check (item 4).** Not started.
- Anything below the fold in the modal at 480px.

Redo these before trusting them. When picking this back up, drive the date field
through its `onchange` wiring rather than clicking it — same code path, no popup.

Minor observation, not fixed (out of scope, pre-existing): a past race date renders
"-8 weeks out (-51 days)" rather than being rejected or reworded.

Suites all pass at 7.35: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0,
both CSS style blocks brace-balanced. No console errors observed in any of the above.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include `fbbde89` (backward-compat audit, build 7.34) or newer.

## Context
Every build this session, including the last two (onboarding expansion and the backward-compat audit), was verified with scratch JS assertion harnesses only, not a rendered browser. That's an explicit gap called out at the end of the last run: the assertions confirm the logic is right, not that the page actually renders right. This app now has real users on it, so that gap needs closing before any more feature work stacks on top of it, not left for later.

Two specific items are known risk, flagged directly by the last two builds and never actually looked at on screen:

**1. The shorter-split Train tab.** `switchDay()` had a bug where `#altPlan` living inside `#plan` meant activating an alt day cleared `.active` from every `.plan-content` on the page, including the one it had just turned on, so the Train tab rendered blank for anyone not on the original 6-day split. This was fixed and covered by an assertion harness (`compat.js`), and a pre-fix control run reproduced the exact failure, so the logic fix is credible. But nobody has actually set a 4-day (or other non-6-day) split, reloaded, and looked at the Train tab render with eyes.

**2. The run-setup onboarding modal at phone width.** New this session (`PROMPT_onboarding_expansion.md`, build 7.33), a second onboarding step for race date/distance/PR/days-per-week/experience level, inside the same `.settings-modal` overlay pattern the maxes step uses. Nobody has opened it at an actual phone viewport and confirmed every field is reachable, unclipped, and usable without horizontal scroll.

A third item worth checking while you're in there for the same reason, also new this session and also never seen rendered: the restored max-estimate toggle on the maxes modal (`setMaxesMode()`, "I Know My 1RM" vs "Estimate It"). Confirmed by inspection to be card-level (swaps all three fields together, reused identically for both onboarding and the later settings-triggered edit), but never watched actually swap the UI or display a computed Epley number.

## Task
Use a real rendered browser for all of this, not the DOM-simulation harness style used in prior builds. Take actual screenshots or describe exactly what's on screen, not "assertions passed."

1. **Shorter-split Train tab.** Set `liftDaysPerWeek` to something other than 6 (e.g. 4), reload the app from scratch, navigate to the Train tab, and confirm exercises actually render, the tab is not blank. Switch between the available days and confirm each one shows content, not just the first.
2. **Run-setup modal at phone width.** Open it (either via fresh onboarding or however it can be re-triggered) at 390px and at 480px specifically. Confirm every field, race date, distance, PR, days-per-week, experience toggle, is visible, not clipped, and tappable without horizontal scroll. Complete it with real values, confirm the Run tab reflects them afterward. Then confirm the skip path works cleanly too.
3. **Maxes estimate toggle.** Open the maxes modal, switch to "Estimate It," enter a weight and reps, confirm the UI actually swaps (not just that the class is applied in a DOM check) and the Epley estimate displays and is correct for the numbers entered. Switch back to direct entry and confirm that still works.
4. **General regression pass while a real browser is open anyway:** open the logo dropdown nav, confirm it still opens, navigates, and closes correctly after the last two builds landed on top of it. This already has real-touch verification from an earlier build; the goal here is just confirming nothing since then broke it, not re-litigating it from scratch.
5. Fix anything actually found broken, using the patterns already established in this codebase. Don't invent new mechanisms for this pass, if something's off it's almost certainly a rendering/CSS issue or a missed wire-up, not a reason for a new system.

## Verify before pushing
1. Screenshots (or an equivalent explicit description of what rendered) for: Train tab on a non-6-day split, the run-setup modal at 390px and 480px, the maxes modal in both toggle states.
2. No console errors in any of the above.
3. Both script blocks still parse, CSS braces still balance, all existing suites (including `onb.js` and `compat.js` from the last build) still pass.
4. Confirm the fixes from the backward-compat audit are the thing actually visible on screen now, not just the thing the assertions claim is fixed.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: what was actually seen on screen for each of the three items (Train tab, run-setup modal, maxes toggle), whether anything was found broken that the assertions had missed, and confirm the dropdown regression check passed.
