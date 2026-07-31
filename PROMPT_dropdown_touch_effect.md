> **DONE — build 7.30, commit `e61306a`, pushed.**
>
> ## Approach: tap-triggered roll, copied from the tabs verbatim
>
> Option 1, and not really a choice — the old nav tabs already solve this exact problem and the instruction was not to invent a third way. Their solution is at `index.html:6267`, with the reasoning in the comment: *"Touch has no hover-exit event, so a hover-driven roll would stick half-transitioned. Roll once on tap and always clear it."* The dropdown items now use the same five listeners and the same timings — `mouseenter`/`mouseleave`/`blur` for a mouse, `touchstart` rolling once and clearing after **700ms**, and `click` clearing after **320ms**.
>
> The CSS had to change to match. My items were driven by `.navmenu-item:hover`; the tabs are driven by a `.rolling` **class** (`.nav-tab.rolling`), which is exactly why theirs can be fired by a tap and mine could not. Now `.navmenu-item.rolling`.
>
> ## Driving it with a real touchstart found two worse bugs
>
> The reported symptom was cosmetic. Replacing `.click()` with an actual `touchstart`/`touchend`/`click` sequence showed **the dropdown was not usable on a touchscreen at all**:
>
> **1. Tapping a destination did not navigate.** A finger landing on a menu item bubbled to the document-level dismiss handler, which closed the panel *before the tap resolved*. I did not take my own word for this — `elementFromPoint()` at the item’s centre, after the touchstart, returned **`settings-modal-sub`**: body copy on the card underneath. A real tap hit-tests by coordinate, so it would have hit the page beneath and the item would never fire. My earlier verification missed this precisely because `.click()` dispatches straight at the element and skips hit-testing.
>
> **2. A second tap on the logo could never close the menu.** `touchstart` closed it, then the `click` immediately reopened it. On a phone it would just flicker and stay open.
>
> Both fixed by stopping `touchstart` propagation on the panel and on the trigger, mirroring the `click` `stopPropagation` that was already there for the same reason. This also answers the secondary question about the entrance animation: it was not a separate problem — the panel was being closed and reopened out from under the tap.
>
> ## Never stuck mid-roll
>
> Three independent guards, since this was the original spec’s hard requirement: the 700ms clear after `touchstart`, the 320ms clear after `click`, and a `.rolling` wipe in `openNavMenu()` — the panel is built once and reused, so a stale roll would otherwise reappear on reopen.
>
> ## How this was actually verified
>
> Real `touchstart`/`touchend`/`click` sequences with `--touch-events=enabled`, never a synthetic `mouseenter`. Before/after at **390px and 428px**:
>
> | | before | after |
> |---|---|---|
> | touchstart on item rolls it | no | **yes** |
> | menu survives the finger landing | **no — closed instantly** | yes |
> | element under the finger | `settings-modal-sub` (the card beneath) | the menu item |
> | tap navigates and closes | not reliably | yes |
> | second tap on logo closes | **no — reopened** | yes |
> | rolling left set 900ms after tap-and-leave | 0 | 0 |
> | stuck mid-roll on reopen | 0 | 0 |
>
> **On "visible", honestly:** per-frame animation progress is *not* measurable in this harness — CSS transitions do not advance under `--virtual-time-budget`, and sampling mid-tap reads 0px in runs where the class is provably applied. Rather than claim more than I checked, I isolated it: with `.rolling` forced on and transitions disabled, the letters resolve to **14.9px of travel, a full line-height** (over-row up, under-row waiting at +14.9), returning to 0 when the class is removed. So the CSS target is right, the class fires from a genuine touch, and the timing is right — but the frame-by-frame motion is the one thing here that still wants a real device to confirm.
>
> **Desktop unchanged:** `mouseenter` rolls, `mouseleave` and `blur` both clear. **Reduced motion unchanged:** letters are not wrapped at all and no listeners are attached, matching `initNavRolls()`.
>
> **Clean:** no console errors, both script blocks parse, CSS braces 693/693, all thirteen suites pass, and the dropdown/a11y/tab-row probes are unchanged — outside-tap still dismisses, Escape still returns focus, and all four tabs still activate with the indicator moving.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> e61306a Make the dropdown work on touch, not just under a simulated hover
> 2084221 Record the logo dropdown push confirmation
> 5ac0309 Turn the logo into a dropdown and place the brand mark in two more spots
> ```
>
> Note: the tab-row removal referenced in "Sync first" has **not** landed — `PROMPT_remove_tab_row.md` is still unrun, so the tab row is live and `initNavRolls()` is not dead code.
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
Confirm `git log --oneline -3` before starting. HEAD should include `5ac0309` (the logo dropdown build) or newer, and ideally the tab-row removal if that's landed by the time you read this.

## Context
The logo dropdown's menu items got the letter-roll treatment (`wrapTextRoll()`) applied on hover, the same effect already used on the old nav tabs. That's a hover-triggered effect, and phones don't have a hover state, so on a real touchscreen it likely never fires at all, there's no mouse-enter event to trigger it. The prior build's verification confirmed the roll works when `prefers-reduced-motion` is forced off and a hover is simulated in headless Chrome, but a simulated hover event in a headless browser is not the same thing as what happens on an actual phone. That gap is almost certainly why the effect isn't visible on mobile even though it tested "working."

This exact problem was already solved once in this app, for the original nav tabs, before they were replaced by this dropdown: `PROMPT_nav_flow.md`'s original spec required handling touch explicitly, either skip the hover effect gracefully on touch, or trigger it briefly on tap, but never leave it stuck mid-transition on a device with no hover-exit event. Read how that was actually implemented for the old tabs (if any of that logic still exists anywhere, even dead code from the tab-row removal) and apply the same reasoning here, don't solve this a third, different way.

## Task
Make the dropdown menu items' letter-roll effect actually visible on touch devices. Pick one of the two approaches the original nav-flow spec allowed, whichever reads better once you've actually tried it:
- Trigger the roll briefly on tap (the item still needs to navigate on tap too, so this is a quick roll-then-navigate, not a roll that blocks the tap), or
- Skip the roll gracefully on touch and rely on some other, touch-appropriate feedback for the tap (a brief background highlight, a scale-down on press, matching the tap micro-interaction pattern already used elsewhere in this app, e.g. the timer's buttons).

Whichever you choose, it must never leave letters visually stuck mid-roll on a device with no hover-exit event, that was the original spec's hard requirement and it still applies.

If the dropdown's open/close entrance animation itself (the fade + scale from `.vtip`'s pattern) is also not visible on real devices for a different reason (not just the reduced-motion default headless Chrome runs under), check that too, but the letter-roll on the items is the primary, most likely suspect here.

## Verify before pushing
1. This needs verification beyond headless-Chrome-simulated hover, since that's what let this ship looking correct the first time. If real device testing isn't available, at minimum simulate an actual touch event sequence (touchstart/touchend, not a synthetic mouseenter) and confirm the chosen effect fires from that, not from a hover event that a touchscreen would never dispatch.
2. Confirm the effect (whichever approach was chosen) is visible on a tap at 390px and 428px.
3. Confirm tapping still navigates correctly and closes the dropdown, the visual effect must not delay or block that.
4. Confirm no letters are ever left stuck mid-transition, rapid tap-and-move-away (or tap-and-immediately-tap-elsewhere) should not leave a broken half-rolled state.
5. Confirm desktop hover behavior is unchanged by this fix.
6. No console errors, both script blocks parse, all existing suites pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: which approach was chosen (tap-triggered roll vs. skip-and-substitute), how it was actually verified on touch rather than simulated hover, and confirmation nothing gets stuck mid-transition.
