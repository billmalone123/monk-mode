> **DONE — build 7.19, commit `5a49755`, pushed.**
>
> `attachTooltip(el, text, opts)` with one bubble element reused for every trigger, **appended to `document.body`** so a scrolling or `overflow:hidden` ancestor can never clip it, positioned from the trigger `getBoundingClientRect()` and **flipped** top/bottom when the preferred side would leave the viewport, plus horizontal clamping with the arrow offset compensating so it still points at the trigger.
>
> **Applied to:** the deload badge, the Held/Adjusted adaptation notes, the week phase chips, the trend arrow, the Today chip, the maxes values, the failure toggle, the race-clock label, the feel 1-10 inputs, and the WAVE 1 / WAVE 2 markers — indicators a user plausibly would not understand, not decoration for its own sake.
>
> **The chart existing native `title=` tooltips were left alone.** They sit on SVG shapes inside a scrolling container where the browser already positions them correctly, and each carries three values rather than a short label; migrating them would add positioning work for no real gain.
>
> Hover for mouse, focus for keyboard, tap-to-toggle for touch with a document-level tap dismissing. Any native `title` on an enhanced element is stripped so the two bubbles never double up. Fade plus scale-in, neutralised by the global reduced-motion block.
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
The user pasted a Radix UI `Tooltip` component (React, a Portal, an arrow SVG). No Radix, no React, no portals in this app, single `index.html`, ES5, no build step. Translate the visual/behavioral spec, not the code: a small rounded bubble with a pointed arrow, appearing near whatever triggered it, fading and scaling in briefly rather than snapping.

## Task
Build one reusable vanilla tooltip system, something like `attachTooltip(el, text, opts)`, and apply it broadly to indicators and tappable elements across the app that currently have no explanation or only a native `title=` attribute: the deload badge, the "Held at Xmi / Adjusted to Xmi" adaptation notes, the "WAVE 1"/"WAVE 2" week-tab labels, the feel 1-10 scale inputs, and any other short/cryptic label or icon you find worth explaining. Use judgment on the full list, the point is genuine indicators a user might not immediately understand, not decorating everything.

Must support both triggers, not just hover:
- **Hover** (mouse enter/leave) for desktop
- **Tap** for touch: first tap on the trigger shows the tooltip, a second tap anywhere else on the page (or on a different trigger) dismisses it, since touchscreens have no hover state at all and a hover-only implementation would make this invisible on mobile

Visual treatment:
- Rounded bubble, small padding, using the site's own tokens (`--card` background, `--text` foreground, `--border` outline), not the reference's `bg-background`/`text-foreground` Tailwind classes
- A small arrow pointing at the trigger, translate the reference's arrow SVG shape but recolor it to the site's palette instead of `var(--color-background)`/`var(--color-border)`
- Fade plus a slight scale-in on appearance, matching the reference's `fade-in-0 zoom-in-95` feel, respect `prefers-reduced-motion` and skip the animation for those users, matching the pattern already established elsewhere in this app
- Position near the trigger with basic collision awareness, if the default side would render off-screen, flip to the opposite side rather than clipping. A full Popper-style engine isn't needed, just don't let it render off the visible viewport
- Render the tooltip element appended to `document.body` (a lightweight equivalent of the reference's Portal), positioned via `getBoundingClientRect()` on the trigger, rather than nesting it inside whatever container the trigger lives in, so it's never clipped by a scrolling or `overflow:hidden` ancestor

## Verify before pushing
1. Hover each enhanced element on a mouse-driven check, confirm the tooltip appears, positions correctly, and dismisses on mouse leave.
2. Simulate a tap trigger (or reason through the event path if a real touch environment isn't available here) and confirm it shows on first tap and dismisses on a second tap elsewhere, not stuck open.
3. Confirm at least one tooltip near a screen edge flips side instead of rendering off-screen.
4. Confirm `prefers-reduced-motion: reduce` skips the fade/scale animation.
5. Confirm nothing is clipped by a parent's `overflow:hidden` or scroll container, this is the reason for appending to `document.body`, check it actually solves that.
6. No console errors, both script blocks parse, all existing suites (lift logging, run logging, adaptive thresholds, week sync, chart, calendar) still pass unchanged.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: the full list of elements that got tooltips and why each was chosen, whether the chart's existing native `title=` tooltips were migrated to this system or left as is (and why), and confirmation of the hover, tap-dismiss, edge-flip, and reduced-motion checks.
