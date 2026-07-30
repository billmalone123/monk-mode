> **DONE — build 7.17, commit `a664a90`, pushed.**
>
> **What changed visually.** Bars now have rounded tops only, drawn as SVG paths rather than `rect rx` (which rounds all four corners and reads wrong on a column standing on a baseline); the radius clamps to half the bar width and to the bar height, so short bars degrade to a plain rect instead of distorting. Every bar carries its value above it — planned in muted mono, logged in cream bold — with one decimal only when it isn't whole. The Y-axis number column is gone entirely: with a label on every bar it was saying the same thing twice, and dropping it freed the width the labels needed. Gridlines are horizontal only, no vertical rules, no axis line, no tick marks, just the week label under each group. The card gained a proper header — "Weekly Mileage" over a description carrying the program's date range (Week 0's start through race day) — using the existing `.prog-card` type treatment rather than new styles. Every bar has a native `<title>`, so hovering gives "W3 — planned 24 mi, logged 21 mi" with no custom tooltip machinery. Colours stay inside the existing tokens: `--field` outlines, cream fill, `--muted`/`--text` for type. No `var(--chart-1)` or anything else from the reference.
>
> **How the trend footer is computed.** `runTrend(rows)` filters to weeks with actual logged mileage above zero, takes the last two in chronological order, and computes `(last − prev) / prev × 100`. Above +0.5% reads "Up N% from W1 (20 → 24 mi)" with a ▲; below −0.5% reads "Down N% …" with a ▼; within that band it reads "Level with last logged week at N mi". Fewer than two logged weeks never produces a number: zero weeks says "Log two weeks to see your trend", exactly one says "One week logged — log another to see your trend".
>
> **The three chart states.** (1) *Zero logged weeks:* header, description with date range, outlined bars only, no cream fill anywhere, footer shows the "log two weeks" message with no percentage and no arrow. (2) *One logged week:* one filled bar, everything else present, footer still refuses to show a trend. (3) *Two logged weeks (20 mi then 24 mi):* footer reads "Up 20% from W1 (20 → 24 mi)" with ▲ — checked by hand, 4/20 = 20%. A downward case was also checked: 24 → 16 gives "Down 33%" with ▼. Label collision was tested by parsing every text node out of the rendered SVG and comparing bounding boxes at monospace width — no overlaps and nothing outside the viewBox. For mobile the SVG gets `min-width: 520px` inside the already-scrolling card, so a phone scrolls the chart sideways rather than shrinking 9px type to 4px; at that width the labels still render at ~7.7px.
>
> **Also in this build, on request: `prefers-reduced-motion`.** A block already existed covering animation and transition durations, but had real gaps. Added: `transition-delay: 0s` and `animation-iteration-count: 1`; `scroll-behavior: auto` on `html`, which was set to `smooth` and is a genuine motion trigger; and `.fade-up { opacity: 1; transform: none }`, since those elements start invisible and rely on an IntersectionObserver — with motion off, content shouldn't wait on a scroll event to exist. The hero ring's entrance is driven by `setTimeout`, which no stylesheet can reach, so `animateRingOnLoad()` now checks `matchMedia('(prefers-reduced-motion: reduce)')` and returns early; the ring is still drawn by `renderRing()`, only the staggered entrance is skipped.
>
> **Suites:** chart, week sync, Run tab (89/90 exact), 19/19 stress, 10/10 calendar states, all adaptive-logging states. Both script blocks parse. Not opened in a browser — extension not connected — so the SVG is verified by parsing the generated markup: balanced tags, finite viewBox, no NaN coordinates, no label overlap.
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
The user pasted a shadcn/recharts React bar chart component as a visual quality reference (rounded bars, value labels on top of each bar, minimal axis, a trend line in the footer). This app has no React, no recharts, no build step, single `index.html`, ES5 throughout. The reference cannot be used directly, treat it as a visual spec to translate into hand-written inline SVG, not code to port.

The mileage chart already exists: `#runChart`, built by `runChartHTML(plan)`, grouped bars per week (planned as an outlined bar, actual logged as a solid cream fill), Y-axis rounding up to a multiple of 5 with four gridlines, styled as `.run-chart-card` matching the lift side's `.prog-card`. Read that implementation first, this is an upgrade to it, not a replacement.

## Task
Bring the existing mileage chart up to the reference's visual polish level, keeping the site's own warm palette (cream/black, no color reintroduced) and keeping the existing two-series structure (planned vs actual), the reference is single-series but ours legitimately needs two:

1. **Rounded bar tops.** Match the reference's `radius={8}` corner treatment on both the planned outline bars and the actual fill bars.
2. **Value labels above each bar.** Each bar gets its number rendered just above it (miles, one decimal if not whole), matching the reference's `<LabelList position="top" offset={12}>`. With two bars per week this means two labels per week group, keep them legible at the existing chart width, reduce font size or stagger if they'd otherwise collide.
3. **Minimal axis.** No vertical gridlines, horizontal only (the reference's `<CartesianGrid vertical={false}>`), no axis line, no tick line, just the week labels sitting under each group (the reference's `tickLine={false} axisLine={false}`).
4. **Card header.** Add a title and short description above the chart matching the reference's `CardTitle`/`CardDescription` pattern, something like "Weekly Mileage" as the title and the program's date range (Week 0's start through the race date) as the description. Match this to whatever heading style `.prog-card` already uses elsewhere in the app rather than inventing new type styles.
5. **Footer insight line.** Below the chart, one computed sentence in the same spirit as the reference's "Trending up by 5.2% this month", but computed from real data, not a hardcoded example: compare the most recent fully-logged week's actual total against the previous week, e.g. "Up 12% from last week" or "Down 8% from last week", with a small up/down indicator. If there isn't enough logged data yet to compute a real trend (fewer than two logged weeks), show something honest instead, like "Log two weeks to see your trend", don't show a fabricated number.
6. **Hover detail.** Reference uses `ChartTooltip`. Add a lightweight equivalent, native SVG `<title>` elements on each bar are enough, showing the exact week, planned mileage, and actual mileage on hover, no need for a custom positioned tooltip box unless that's easy given how the rest of the chart is built.

Keep every color on this chart within the existing tokens (`--field` for outlines, cream fill for actual, `--muted`/`--text` for labels), the reference's own `var(--chart-1)` is a shadcn placeholder color from a different app and should not appear anywhere here.

## Verify before pushing
1. Chart renders correctly with zero logged weeks (labels and card chrome present, bars showing only the outlined planned series, footer showing the "log two weeks" message, not a fake trend).
2. Chart renders correctly with one logged week (still no trend line shown, everything else present).
3. Chart renders correctly with two or more logged weeks (real trend percentage and direction shown, matches what you'd compute by hand from the two most recent weeks).
4. Value labels don't overlap or run off the chart at the narrowest supported width, check mobile.
5. No console errors, chart SVG is well-formed (balanced tags, finite viewBox, no NaN coordinates), existing Run tab worked example and all other suites still pass unchanged.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: what changed visually, how the trend footer is computed, and the results of the three chart-state checks above.
