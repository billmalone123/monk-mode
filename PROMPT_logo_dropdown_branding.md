> **DONE — build 7.29, pushed.**
>
> ## The premise was stale, and I built the missing step rather than stopping
>
> This file's "Sync first" says HEAD should already include a mobile logo/home-link build that made `.nav-logo` tap to `goTab('info')` and swapped in the square mark below 520px. **That build never happened** — `PROMPT_mobile_logo_home.md` is still sitting unrun in the repo root. What was actually live was my mobile-audit build, which did the *opposite*: `nav .nav-logo { display: none }` below 520px, because the wordmark was eating 102px of a 390px bar and pushing a tab off screen.
>
> That mattered, because with no logo on mobile there is no trigger, and requirement 5 asks for the dropdown to work at mobile widths. So I built the prerequisite as part of this: below 520px the **square mark replaces the hidden wordmark** at 26px instead of the logo disappearing. There is ~180px of slack in a 390px nav once the four tabs (186px) and padding (24px) are accounted for, so the mark costs nothing. I did *not* implement the tap-to-Overview behaviour from that older file, since this task explicitly replaces it with the dropdown.
>
> ## The dropdown reuses what was here, it doesn't invent
>
> **Entrance is `.vtip`'s, not a new one.** `.navmenu` uses the same `opacity 0→1` plus `scale(0.95)→1` at the same `0.13s ease`, so the two panels in this app open identically. It is appended to `document.body` for the same reason the tooltip has to be — `nav` is a fixed, clipping ancestor and a panel parented inside it would be cut off. Positioning follows the tooltip's collision rule too: anchored under the trigger from a live `getBoundingClientRect()`, flipped above if it would run off the bottom, clamped horizontally to stay 8px inside either edge. Measured, not hardcoded, which was the bar `.nav-indicator` set.
>
> **`wrapTextRoll()` on the items — I tried it before deciding.** It reads well: the items are the same uppercase display face at a similar size to the tabs, so the roll looks like the same control family rather than a different one. Kept.
>
> ## Two brand placements, no sprawl
>
> - **Dropdown header** — the square mark at 26px beside "Run the Weights", so the panel names what you just tapped.
> - **Maxes / onboarding card** — the mark at 40px beside "Enter Run the Weights", via a new `.settings-modal-brand` flex wrapper. This is the first screen a new user sees and it had no imagery at all.
>
> I looked for other candidates and deliberately added none. The hero already carries the wordmark at full size; anything more would be stamping.
>
> ## Two real bugs the rendering caught
>
> **1. A specificity bug that showed both marks at once on desktop.** `.nav-logo img` is (0,1,1) and beat my `.nav-logo-mark { display: none }` at (0,1,0), so the square mark rendered *next to* the wordmark at 1440px. Same class of failure as the nav cascade bug from the audit — fixed by writing `.nav-logo img.nav-logo-mark`.
>
> **2. Resize restarted the entrance animation.** The resize handler called `openNavMenu()`, which re-adds `.on` — so dragging a desktop window would re-fire the 0.13s scale on every one of the many resize events. Split the anchoring out into `positionNavMenu()`; resize now re-anchors without touching the class. It re-anchors rather than closes on purpose: on a phone a resize is usually an orientation change or the URL bar collapsing, and closing on that reads as a glitch.
>
> I also found the roles were writing a cheque the keyboard didn't cover — `role="menu"`/`menuitem` promises arrow-key movement, so Up/Down now cycle the items, and Escape returns focus to the trigger instead of dropping a keyboard user at the top of the document.
>
> ## Verification — rendered, not inferred
>
> Real headless Chrome, driving the actual functions in a live layout (the page runs in an iframe of the exact target width, since Chrome won't open a window below ~512px).
>
> | Check | 390 | 428 | 1440 |
> |---|---|---|---|
> | Opens, 4 items, Overview primary + current ticked | yes | yes | yes |
> | Portal parent is `BODY`, fully inside viewport | yes | yes | yes |
> | Item navigates and closes | yes | yes | yes |
> | Outside click closes **without** navigating | yes | yes | yes |
> | Correct mark only (square ≤520, wordmark above) | square | square | wordmark |
>
> - **Not clipped** — confirmed by screenshot at 390 and 1440, not just by numbers. My probe initially flagged "clipped by an ancestor" but that was it counting `body { overflow-x: hidden }`, which does not clip a fixed panel; the screenshots show the panel painted in full over the page.
> - **Reduced motion** — headless Chrome reports `prefers-reduced-motion: reduce` by default, so the default runs *are* the reduced path: entrance collapses to `1e-05s` and no letter-roll is applied. I then forced the gate to no-preference to exercise the other branch and confirmed the roll wraps correctly (labels still read Overview / Train / Run / Calendar, unmangled). Both branches checked.
> - **Tab row untouched** — clicked all four tabs at 390 and 1440: each activates, each panel displays, and the sliding indicator moves to a distinct position and width every time (390: 46/57 → 103/39 → 142/32 → 174/58). The menu never opened during tab use.
> - **Mobile layout** — no regression: no horizontal scroll at 390/428/1440, and the only out-of-viewport elements are the same two the audit already accepted (`#sb-progression`, which is `overflow-x: auto` by design, and the hero spotlight SVG, clipped by `.hero { overflow: hidden }`).
> - **Clean** — no console errors, no `undefined`/`NaN` in rendered text, both script blocks parse, CSS braces balance 693/693, all thirteen suites pass.
>
> Two of my own probe assertions were wrong along the way and are worth recording as harness faults, not code faults: I asserted resize should *close* the menu (re-anchoring is better), and I read panel visibility from a `.on` class when `goTab()` actually sets `style.display`.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 5ac0309 Turn the logo into a dropdown and place the brand mark in two more spots
> 25a1e90 Record the mobile audit summary
> 890f574 Fix the mobile layout, checked by rendering rather than reading CSS
> ```
>
> Local HEAD matches `origin/master` at `5ac0309`.
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
Confirm `git log --oneline -3` before starting. HEAD should include the mobile logo/home-link build (the one that made `.nav-logo` tap-to-`goTab('info')` and swapped in the square icon mark below 520px) or newer.

## Context
Two things, read both before starting.

**1. The logo becomes a dropdown, not a direct nav link.** The prior task made `.nav-logo` a tap target that jumps straight to Overview. That was step one, this replaces it with something better: tapping/clicking the logo reveals a small dropdown menu directly beneath it, at every width, listing the four destinations (Overview, Train, Run, Calendar), with Overview/Home clearly the first and primary option. This is additive to the existing horizontal tab row, not a replacement for it, the tabs stay exactly as they are, this is a second way in, anchored to the brand mark.

Don't build this animation from scratch. This app already has the pieces:
- `attachTooltip()` (around line 5984) already does a portal-style panel that fades and scales in near a trigger, with collision-aware positioning and `prefers-reduced-motion` handling built in. Reuse its entrance feel (fade + slight scale, not a hard cut) for the dropdown's open/close, even if the dropdown itself needs its own function rather than literally being a tooltip.
- `wrapTextRoll()` (around line 6167) is the letter-roll hover effect already applied to the main nav tabs. Consider applying the same treatment to the dropdown's menu items on hover (desktop), for visual consistency with the primary nav, your call on whether it reads better there or if a simpler hover state fits a dropdown's scale better, but at least consider it before dismissing it.
- `.nav-indicator`'s sliding logic is the third existing animated piece in this nav, not necessarily reusable directly for a vertical dropdown, but the same principle, motion that's computed from real element positions rather than a fixed CSS transition, is the bar this dropdown should be built to clear.

**2. Brand mark placement elsewhere.** The user wants the existing PNGs (`assets/brand/rtw-wordmark.png`, `rtw-square-a.png`, `rtw-square-b.png`) used in a couple more well-chosen spots so the app reads as consistently branded, not just correct in the nav. Two candidates, both good fits, use judgment on exact placement and don't sprawl beyond a small, tasteful set of additions:
- **The new dropdown's own header.** A small instance of the square icon mark at the top of the dropdown panel itself reinforces what just got tapped to open it.
- **The maxes-entry / onboarding card** ("Enter your max weights..." screen), which currently has no imagery at all, a subtle placement of the square mark there (small, not dominating the form) would make the first real interaction a new user has with the app feel branded rather than blank.

If you find one or two other spots while working through this that are clearly better candidates than guesswork, use judgment, but keep this restrained, this is about a few deliberate placements, not stamping the logo everywhere.

## Task
1. Build the logo dropdown: tap/click toggles a panel beneath `.nav-logo` listing all four `goTab()` destinations, closes on selecting one, closes on tapping outside, matches the fade/scale entrance style already established by `attachTooltip()`, and is appended in a way that isn't clipped by any `overflow:hidden` ancestor, same reasoning the tooltip system already had to solve.
2. Apply hover polish to the dropdown's menu items, reusing `wrapTextRoll()` if it reads well at this scale, otherwise a simpler but still deliberate hover state, your call once you've actually looked at both next to each other.
3. Add the square icon mark to the dropdown's own header and to the maxes-entry/onboarding card, sized appropriately for each context (small in both cases, this is a mark not a hero image).
4. `prefers-reduced-motion: reduce` disables the dropdown's fade/scale entrance (snap instead) and disables the letter-roll hover if applied, matching the pattern already established everywhere else in this app.
5. Confirm this works correctly at mobile widths too, the dropdown needs to render usably under a compact nav bar, not just at desktop width where there's more room.

## Verify before pushing
1. Tap/click the logo at 390px, 428px, and 1440px, confirm the dropdown opens, lists all four destinations, and each one navigates correctly and closes the menu.
2. Confirm tapping outside the open dropdown closes it without navigating.
3. Confirm the dropdown isn't clipped by any parent `overflow:hidden`, same check the tooltip system passed.
4. Confirm the horizontal tab row still works exactly as before, this is additive, nothing about the existing nav should have changed.
5. Confirm the square icon mark renders correctly and at a sane size on the dropdown header and the maxes-entry card, at both mobile and desktop widths.
6. Confirm `prefers-reduced-motion: reduce` disables the dropdown's animated entrance and any letter-roll hover applied to its items.
7. No console errors, both script blocks parse, all existing suites pass, including the mobile-layout suite.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: how the dropdown's animation reuses the tooltip/letter-roll patterns rather than inventing new ones, exactly where the brand mark got added and why those spots, and confirmation of the reduced-motion and mobile-width checks.
