> **DONE — build 7.19, commit `5a49755`, pushed.**
>
> **Letter roll:** `wrapTextRoll(btn)` finds the label text node and replaces it with two stacked rows of per-letter spans built by a shared `charSpansHTML` helper, each letter carrying `transition-delay: 0.035s * |i - centre|` so the roll ripples outward from the middle of the word. The duplicate copy is `aria-hidden` and the button gets a plain `aria-label`, so a screen reader hears the label once, not twice.
>
> **Touch handling:** a touchscreen has no hover-exit event, so rather than relying on `:hover` the roll is class-driven — a tap adds the class and always clears it after 700ms, and clicking clears it too. It can never be left stuck half-rolled.
>
> **Indicator:** one bar inside `.nav-tabs` (made its `offsetParent`), with width and `translateX` read from the active button `offsetWidth`/`offsetLeft`. Nothing is hardcoded, so 3 or 4 tabs both work. Recomputed on every `goTab`, on a 120ms-debounced resize, and once more 260ms after load in case webfonts change the label widths.
>
> **Reduced motion:** skips the wrapping entirely (labels stay static, no listeners bound) and snaps the indicator with the transition disabled.
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
Confirm `git log --oneline -3` before starting. If the Calendar tab prompt hasn't landed yet, this task should still work against whatever `MAIN_TABS` currently contains, it must not hardcode a tab count.

## Context
The user pasted a React/framer-motion component (`Skiper58`/`TextRoll`), a nav list where each label's letters roll away on hover and a duplicate set rolls in from below, staggered outward from the center of the word. No React, no framer-motion, single `index.html`, ES5, no build step, translate the technique, not the code. The nav items in the reference are placeholder demo content (Home, Pricing, Login), irrelevant, apply this to the real nav tabs (`.nav-tab` buttons, driven by `MAIN_TABS` and `goTab()`).

Two separate things to build here, don't conflate them:

## Task

### 1. Letter-roll hover on nav tab labels
For each `.nav-tab` button's text label, wrap it so the reference's effect works: two stacked copies of the letters (each letter as its own inline span), the top copy visible at rest, the bottom copy sitting translated fully out of view below. On hover, the top copy transitions up and out while the bottom copy transitions up into place, each letter's transition delayed by `0.035s * |letterIndex - centerIndex|` (the reference's `STAGGER` constant and center-out formula), so the roll ripples outward from the middle of the word rather than sweeping straight across. On touch devices where hover doesn't really apply, either skip the effect gracefully (no broken half-rolled state stuck on screen) or trigger it briefly on tap, your call, but it must never leave letters visually stuck mid-transition on a device with no hover exit event.

Build this as one reusable function, something like `wrapTextRoll(el)`, applied to each nav tab label at init, not hand-duplicated per button.

### 2. Animated flow between tab switches
Right now switching tabs (via `goTab()`) presumably swaps an active class instantly. Add a persistent indicator element (a pill background or underline bar, your call on which reads better against the existing nav styling) that smoothly slides and resizes to match whichever tab is currently active, transitioning its position and width on every `goTab()` call instead of snapping. Compute the active button's position via `offsetLeft`/`offsetWidth` relative to the nav container, and recompute on window resize too, since the number of tabs is not fixed (`MAIN_TABS` may have 3 or 4 entries depending on whether the Calendar tab has landed), don't hardcode positions for a specific tab count.

### 3. Reduced motion
Both effects respect `prefers-reduced-motion`, matching the pattern already established elsewhere (chart, hero ring, spotlight, timer): the letter-roll effect is skipped (labels just stay static) and the tab indicator snaps to position instantly instead of sliding, for users who have that set.

## Verify before pushing
1. Hover each nav tab, confirm the letters roll correctly, staggered from center outward, no visual glitch or letters left half-transitioned on rapid mouse-in/mouse-out.
2. Switch between all tabs in sequence (including rapid switching) and confirm the indicator slides smoothly to each new position without lagging behind or overshooting.
3. Resize the viewport and confirm the indicator still lines up correctly with the active tab afterward.
4. Confirm this works correctly whether `MAIN_TABS` has 3 or 4 entries, don't assume a fixed count.
5. Confirm `prefers-reduced-motion: reduce` disables both the letter roll and the sliding transition, snapping instead.
6. No console errors, both script blocks parse, all existing suites (lift logging, run logging, adaptive thresholds, week sync, chart, calendar tab if present) still pass unchanged, this only touches nav rendering and tab-switch visuals.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: how the letter-roll wrapping works and how touch devices are handled, how the sliding indicator computes and updates its position, and confirmation of the reduced-motion and resize checks.
