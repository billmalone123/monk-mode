> **DONE — build 7.28, commit `890f574`, pushed.**
>
> **This was checked by rendering, not by reading CSS.** Real headless Chrome, measuring `getBoundingClientRect()` in a live layout at 390 / 428 / 768 / 1440, plus full-page screenshots I looked at. Chrome will not open a window narrower than ~512px, so the page runs inside an iframe of the exact target width — an iframe gets its own viewport, so media queries resolve correctly. One harness detail worth recording: the first screenshots showed a broken logo, which was the temp copy sitting outside the repo, not a bug — but it also meant the nav measured *narrower* than reality, so a `<base>` tag was added before trusting any number.
>
> ## Actually broken (3 of 7)
>
> **1. Nav — serious, and the cause was not the fourth tab.** `.nav-tabs` and `.nav-tab` are re-declared as base rules at lines ~1248/1255, *after* the media queries at 713–780. Equal specificity, later source order, so **every mobile nav rule has been dead since it was written** — including the original three-tab one. The bar was rendering at full desktop metrics on a phone: `font=15px pad=28px`, 651px of nav inside a 390px viewport. Run was 63px off the right edge and Calendar 210px off, both unreachable; on the Calendar tab even the *active* tab was off screen. Fixed by prefixing the mobile rules with `nav` so the cascade stops depending on source order. The wordmark gives way below 520px — the hero shows it full size immediately underneath, and a tab you cannot reach is worse than a logo you see twice. The active tab is also scrolled into view, because the webfont loads after first paint and font metrics decide whether four labels fit.
>
> **2. Variant chips — flex items shrinking instead of wrapping.** Default `flex-shrink: 1` with no floor, so chips compressed below their content and broke names into three-line blobs with the equipment tag stranded mid-phrase. They no longer shrink, and below 520px each becomes a full-width row: name left, tag right, one line each.
>
> **3. Lift row — the real reason the chips had no room.** `.lift-row` is a four-column grid; at 390px the name column was down to **~136px**, and the variants, warm-ups, targets and log inputs all live inside it. Below 520px it stacks to a single column, the chevron comes out of flow, and the column headers are dropped since they no longer label anything.
>
> ## Already fine (4 of 7) — confirmed by rendering, not assumed
>
> - **Hero eyebrow.** Checked at all four split lengths. The 5-day string, `5 DAYS · PUSH / PULL / LEGS + UPPER / LOWER`, wraps to two centred lines and does not overflow or disturb the hero. The flagged risk was real but the layout already absorbed it.
> - **Edge carousel.** At 390px the neighbours genuinely drop out, one card is centred, and the arrows and three dots are usable at touch size. The build summary claim holds.
> - **The Code.** Six rules stack cleanly; rule 06, the longest, wraps to two lines without breaking the row.
> - **Tooltips.** 48 triggers attached. The topmost trigger requests `top` and correctly **flips to bottom**; both test cases land fully inside the viewport with horizontal clamping; tap-elsewhere dismisses; portal parent is `BODY`.
>
> Calendar grid at 390px also renders correctly — day cards stack, nothing crushed, no horizontal scroll.
>
> ## A regression I introduced and caught mid-audit
>
> My first nav fix inserted a new `@media (max-width: 430px)` block *inside* the existing 768px block, so it swallowed everything after it — hero, pillars, footer, lift-row and subnav rules all silently narrowed to ≤430. Braces still balanced, so nothing errored. Restructured so the 768px rules resume after the new tiers.
>
> ## Verification
>
> Final sweep: **no horizontal page scroll and nothing outside the viewport at 390, 428, 768 or 1440, on all four tabs.** The only remaining out-of-viewport element is `#sb-progression` in the info subnav, which is `overflow-x: auto` and scrollable by design, predating this session. The hero spotlight SVG also measures outside the viewport but is clipped by `.hero { overflow: hidden }` and causes no scroll — decorative, correct.
>
> Desktop unchanged at 1440 (`font=15px pad=28px`, logo and icons visible). Reduced motion re-verified after the markup changes: all five CSS neutralisers plus the JS gates still in place, and the carousel still has no autoplay to suppress. Tooltip tap-dismiss re-verified above. Both script blocks parse, CSS braces balance 404/404, and all thirteen suites pass.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 890f574 Fix the mobile layout, checked by rendering rather than reading CSS
> 7821f0c Record the hybrid Code rewrite summary
> 3dd4edc Make The Code hybrid, not lifting-only with a mobility footnote
> ```
>
> Local HEAD `890f57459bec56949b34fdcd2fb8a86115690054` matches `origin/master`.
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
Confirm `git log --oneline -3` before starting. HEAD should include `3dd4edc` (the hybrid Code rules) or newer.

## Context
Everything built this session, going back through the hero spotlight, nav flow, timer, tooltips, scroll assembly, edge carousel, adaptive split, exercise substitution, dynamic labels, and Code rules, was verified by driving the real functions against a stub DOM or by a raw text fetch, not by actually looking at the rendered page. Every one of those completion summaries says so directly. That's fine for logic, it's not fine for layout, and the user is now reporting that things which work on desktop aren't showing up correctly on mobile. This task is a real visual audit at mobile widths, not another stub-DOM pass, that testing method is exactly why this wasn't caught earlier.

Use actual browser dev tools device emulation (or equivalent) at minimum these three widths: **390px** (a common small phone), **428px** (a common large phone), **768px** (tablet/breakpoint boundary). Screenshot or otherwise directly observe each section below at each width, don't infer from the CSS whether it should work, confirm it does.

## Likely suspects, check these first
These are flagged from reading the code, not confirmed broken, verify each one directly rather than trusting this list or dismissing it:

1. **Hero eyebrow.** `splitSummary()` now produces strings of very different lengths depending on the active split: `6 days · Arnold Split` is short, but `5 days · Push / Pull / Legs + Upper / Lower` is roughly twice as long. If the eyebrow's container or font-size wasn't built to accommodate the longest case, the 5-day string is the one most likely to wrap badly, overflow, or break the hero layout on a narrow screen. Check all four day counts (3, 4, 5, 6) at all three widths, not just the current default.

2. **Nav tabs.** The nav grew from three tabs to four (`Info`, `Train`, `Run`, `Calendar`) during this session, and separately gained the letter-roll hover effect and a sliding position/width indicator computed from `offsetLeft`/`offsetWidth`. Four tabs plus that indicator logic is more likely to overflow or misalign on a narrow nav bar than the three-tab version ever was. Check the indicator still lines up correctly under each tab at all three widths.

3. **Exercise variant chips.** Each chip now carries an equipment tag label inside it, plus a "Custom" chip was added to every row. A row that used to hold 3-4 plain-text chips now holds 4-5 chips each carrying extra text. Check these rows don't overflow their container, clip, or force horizontal scroll on a narrow screen, and that the equipment tag label doesn't make chip text wrap awkwardly.

4. **Edge carousel.** The build summary claims neighbor cards drop to zero opacity below 720px so the active card stands alone. Confirm that's actually what happens at 390px and 428px, not just that the code intends it, and confirm the carousel's dots/arrows are still usable at those widths.

5. **The Code footer.** Now six rules instead of five, confirm the footer still reads cleanly stacked at narrow widths and rule 06 (the longest of the six) doesn't wrap in a way that breaks the row's layout.

6. **Calendar tab grid.** A full seven-day grid with lift and run content stacked per day, check it doesn't force horizontal scroll or crush content unreadably at 390px.

7. **Tooltips.** Built with edge-collision flipping in mind, confirm that logic actually holds at phone widths where most of the viewport is "near an edge," and confirm tap-to-show/tap-elsewhere-to-dismiss still works cleanly on a touch-sized target.

## Task
For every section above, and any other section you find broken while doing this pass that isn't already listed, identify the actual CSS or markup cause (not a guess) and fix it. Common causes to check for specifically: fixed pixel widths that don't shrink, `white-space: nowrap` on text that's now longer than it used to be, flex/grid children without `min-width: 0` or `flex-shrink` causing overflow instead of wrapping, and any breakpoint media query that was written before a section existed and never updated to account for it (the four-tab nav and the six-rule Code list are the two clearest candidates for this).

Don't just shrink font sizes until things fit, if a fix requires changing the actual layout approach (wrapping, stacking, truncating with a "show more," reducing the number of visible items), do that instead of making text illegibly small to force a fit.

## Verify before pushing
1. Every section in the likely-suspects list, screenshotted or directly observed at 390px, 428px, and 768px, confirmed correct, not inferred.
2. Hero eyebrow specifically checked at all four split lengths (3/4/5/6 days) at all three widths, since the 5-day string is the longest content this session introduced anywhere in the hero.
3. Full page scroll-through at 390px, top to bottom, confirming nothing is clipped, overlapping, or forcing unwanted horizontal scroll.
4. Confirm nothing that worked correctly on desktop regressed as a side effect of a mobile fix, spot check the same sections at 1440px after making changes.
5. `prefers-reduced-motion` and touch-tap-dismiss behaviors (tooltips, carousel swipe) re-verified after any markup changes in those areas, since layout fixes can accidentally touch the same elements those interactions depend on.
6. No console errors, both script blocks parse, all existing suites pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: which of the seven likely suspects were actually broken versus already fine, what the real root cause was for each confirmed bug (not just "fixed spacing"), and confirm this was checked with actual rendering at mobile widths rather than reasoned about from the CSS.
