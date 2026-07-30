> **DONE — build 7.20, commit `d76e3d0`, pushed.**
>
> **Centre/side effect.** The three slides share a single CSS grid cell, so the viewport sizes itself to the tallest card and nothing has to measure heights in JS. Position comes purely from transforms: active is `translateX(0) scale(1) rotateY(0)` at full opacity, the neighbours are `translateX(±62%) scale(0.85) rotateY(∓16deg)` at 0.42 opacity, under a 1500px perspective, transitioning over 0.5s. Each slide index is normalised into `[-1, 1]` against the active one, so whichever card is centred the other two land as exactly one previous and one next — verified for all three positions (`ANP`, `PAN`, `NPA`).
>
> **Wrapping, not clamping.** With only three slides, clamping would leave an arrow dead a third of the time, so next from the last returns to the first and prev from the first goes to the last. Arrows, dots and swipe all route through the same `go()`/`step()` pair, so they cannot disagree.
>
> **Dots and drag are wired to the same state.** The dots are generated from the slide count rather than hardcoded; clicking one calls `go(idx)` directly, and `render()` sets the active dot from the same value that positions the slides. Dragging uses one Pointer Events path covering mouse and touch (with a touch/mouse fallback if `PointerEvent` is missing). The active card follows the finger at 35% damping with transitions suppressed; on release, past a threshold of `max(48px, 16% of viewport width)` it advances, under it every inline transform is cleared and CSS snaps it back. `pointercancel` and `pointerleave` both release the drag so it can never get stuck, and a capture-phase click guard stops a drag from also firing click-to-centre. Clicking a side card centres it, and left/right arrow keys work.
>
> **Autoplay: deliberately not included.** Each card is a heading plus two paragraphs of body copy. Advancing it out from under someone mid-sentence would be hostile, and unlike the reference this is not a photo gallery where drift is harmless. That also means there is no autoplay to pause on hover or suppress under reduced motion — the reason is recorded in the code, not just here.
>
> **Reduced motion** is handled by the global block from 7.17, which neutralises `transition-duration` and `transition-delay` app-wide, so manual navigation snaps instantly rather than sliding. There is no separate timer to disable.
>
> **Widths.** Desktop and tablet (1440px and 900px) keep the 620px viewport with the neighbours peeking and clipped by the carousel `overflow: hidden`. Below 720px the neighbours would be more clipping than peek, so they drop to zero opacity and `pointer-events: none` and the active card stands alone full width, with the dots carrying the sense of position — checked at 390px. Content is untouched: all three eyebrows, titles, index numerals and six paragraphs verified present, cards keep their original inline styling, only the wrapper and a class changed.
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
The user pasted a Swiper.js React component (`Skiper50`/`Carousel_004`), an image carousel with a "creative" 3D effect: slides rotate/translate as they move from center to the sides, plus pagination dots and autoplay options. The reference's own slide content is placeholder stock photography, irrelevant, there is nothing to preserve from it.

No Swiper.js, no React, single `index.html`, ES5, no build step. Translate the visual/behavioral spec, not the code: a swipeable slide row where the active slide sits centered and full-size, the adjacent slides sit rotated/translated to the sides at reduced scale/opacity, paginated dots below, with next/prev controls and optional autoplay.

There is no photo content anywhere in this app (`assets/brand/` only, no gallery images), so this does not become a photo gallery. The fit is the `#edge` section (`YOUR BODY OPENS DOORS`, inside `#sec-edge`): three text cards ("Mental Edge / Confidence", "Social Capital / People Treat You How You Look", "Athletic Output / Strong Men Are Useful Men"), each already built as a self-contained card with a big background index number, a title, and two paragraphs. Right now they sit in a static `auto-fit` CSS grid, all three visible at once side by side. Read that markup first (around line 2151 in `index.html`). Turn that static grid into the carousel: one card centered and active, the other two visible at reduced scale to the sides, swipeable/clickable through, matching the reference's creative effect.

## Task
1. Replace the `#edge` section's static three-card grid with a carousel container holding the same three cards (same content, same big index number/title/paragraph markup, keep the copy exactly as is, this is a layout change not a content change).
2. Build the creative effect: the active (center) slide renders at full scale and opacity, the two neighbors render at reduced scale (roughly 0.85) and reduced opacity, translated to either side, with a smooth transition (translate/scale/opacity) when the active slide changes. Only three slides exist, so "looping" can wrap from the last card back to the first and vice versa, your call on whether that reads better than clamping at the ends, but pick one and make prev/next both respect it consistently.
3. Add prev/next arrow controls and a row of three pagination dots below the carousel, clicking a dot jumps directly to that slide, the dot for the active slide should be visually distinguished (matches the reference's pagination bullets, recolored to this app's own tokens, not the reference's literal classes).
4. Add swipe/drag support for touch and mouse (pointer events or touch events, dragging past a threshold advances to the next/prev slide, releasing under the threshold snaps back), this is a touch-first app pattern already established elsewhere (calendar week arrows, timer controls), match that level of touch support here too.
5. Autoplay is optional per the reference, your call on whether it fits a marketing section like this, if you add it, it must pause on hover/touch interaction and must respect `prefers-reduced-motion` (skip autoplay entirely for those users, same as the pattern established elsewhere in this app for automatic motion).
6. `prefers-reduced-motion: reduce` disables the slide/scale/opacity transition (slides snap directly to their position) and disables autoplay if present, matching the pattern already established for every other animation in this app (chart, hero ring, spotlight, timer, tooltips, nav).

## Verify before pushing
1. All three cards' full content (index number, title, both paragraphs) is unchanged and still present, only the layout/interaction changed.
2. Click/tap through next, prev, and all three pagination dots, confirm the correct card centers each time and the side cards update to match.
3. Drag/swipe on both a touch-style and mouse-style interaction and confirm it advances past the threshold and snaps back under it.
4. If autoplay was added, confirm it pauses on hover/touch and does not run at all under `prefers-reduced-motion: reduce`.
5. Confirm `prefers-reduced-motion: reduce` also removes the transition on manual navigation (instant snap, not just autoplay).
6. Check the section at mobile, tablet, and desktop widths, the reference's card sizing assumptions won't hold at 390px, make sure the centered card and its neighbors still read as intentional (neighbors peeking at the edges or hidden entirely below a breakpoint, your call) rather than overflowing or clipping badly.
7. No console errors, both script blocks parse, all existing suites unaffected, this only touches the `#edge` section's markup and its own new script/style, no shared state.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: how the center/side scaling and transitions work, how swipe/drag and the pagination dots are wired together, whether autoplay was included and how it handles hover/touch pause plus reduced motion, and the results of the mobile/tablet/desktop check.
