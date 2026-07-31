> **DONE — build 7.32, commit `34b15f4`, pushed.**
>
> ## Removed, not hidden
>
> The `.nav-tabs` markup, the four `.nav-tab` buttons and `#navIndicator` are gone from the DOM, and so is everything that drove them: `moveNavIndicator()` with its debounced resize listener, `initNavRolls()` (which only ever attached to `.nav-tab`), `goTab()`'s active-button bookkeeping, and every `.nav-tab` / `.nav-indicator` CSS rule including the `training-mode` colour overrides. `goTab()` itself is untouched.
>
> `wrapTextRoll()` **stays** — `buildNavMenu()` applies the same letter-roll, with the same touch handling, to the dropdown's own items. Only the `.nav-tab`-triggered selectors were dropped.
>
> `.nav-links` untouched, as instructed — still `display: flex` at desktop and hidden at 768.
>
> ## Two generations of fixes collapsed into none
>
> This was the most useful part of the task. **Three tiers of mobile nav CSS existed for one reason: fitting four tab labels beside the logo.**
>
> - **768px** — tab overflow scrolling, tightened padding and tracking (from the mobile-nav work)
> - **520px** — the wordmark hidden and replaced by the square mark (from the mobile audit, then reinstated as the dropdown trigger in the logo-dropdown build)
> - **430px** — tighter tab padding again, sized against the fallback font
>
> The bar now holds exactly one element at every width, so **all three are deleted** and the **wordmark stays down to the narrowest phone** — verified at 390px, where it renders as the wordmark, not the square mark. The 768 block had been split in two to stop the inserted tiers swallowing the rules below it; that split is merged back into one block, so the workaround for the workaround is gone too.
>
> The square mark itself is still used — dropdown header and the maxes card — just no longer in the nav bar.
>
> ## One thing that was already dead
>
> `switchTab()` predated `goTab()` and was dead before this task: nothing called it, `window.switchTab` is aliased to `goTab`, and the `.tab-page` elements it queried do not exist anywhere in the markup. It held `.nav-tab` references, so it went with the row, along with its unused `.tab-page` / `tabFadeIn` CSS.
>
> ## Verification
>
> | | 390 | 428 | 1440 |
> |---|---|---|---|
> | tab row gone | yes | yes | yes |
> | dropdown opens, 4 destinations, current ticked | yes | yes | yes |
> | navigates and closes on selection | yes | yes | yes |
> | closes on outside click without navigating | yes | yes | yes |
> | nav shows the wordmark (not the square mark) | yes | yes | yes |
>
> Screenshots at 390 and 1440 confirm the bar reads as a deliberate layout — the wordmark sits left in the 60px bar with the dropdown hanging beneath it, no gap where the tabs used to be. No alignment change was needed.
>
> **Full touch sequence re-run** (real `touchstart`/`touchend`/`click`, not `.click()`): opens on tap, item rolls, the finger lands on the menu item rather than the page beneath, tap navigates and closes, a second tap on the logo closes it, and nothing is left stuck mid-roll.
>
> **No console errors**, specifically no null-reference errors from code that used to query `.nav-tab` or `#navIndicator`. Keyboard behaviour intact: `aria-expanded` toggles, Escape closes and returns focus, arrows cycle items. No horizontal scroll at 390; the only out-of-viewport elements are the two the mobile audit already accepted.
>
> **Suites — assertions retired rather than left passing vacuously:**
> - `ui.js` section 8 tested the sliding indicator. It now asserts the row is *actually removed*, including an explicit check that it was not merely `display:none`-d, and that `wrapTextRoll` survived for the dropdown.
> - `caltab.js` checked for `id=tab-btn-calendar`; it now checks the dropdown lists Calendar. Worth noting: this failure cascaded into a second, unrelated-looking one, because that suite passes a shared `pass` flag into a later assertion — the ten-week render was never actually broken.
> - `tabrow.js`, a scratch harness that existed only to test the row, is retired.
>
> All thirteen suites pass. Both script blocks parse, CSS braces 661/661 (down from 693).
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 34b15f4 Remove the horizontal tab row — the logo dropdown is the nav now
> abc0a10 Record the autosave audit summary
> c182de0 Autosave the maxes screen and the three other fields that still needed a save
> ```
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
Confirm `git log --oneline -3` before starting. HEAD should include `5ac0309` (the logo dropdown build) or newer, which means `.navmenu`, `openNavMenu()`/`positionNavMenu()`, and the letter-roll on the dropdown's own items already exist and already work.

## Context
The logo dropdown built in the prior task was additive, the horizontal `.nav-tabs` row (Overview, Train, Run, Calendar as buttons, plus `.nav-indicator` sliding under whichever is active) was left in place next to the logo, on the reasoning that it should stay the primary nav with the dropdown as a second way in. Now that the dropdown is confirmed working well, the user wants the dropdown to be the nav, not a second one, remove the horizontal tab row entirely rather than keeping both.

`goTab()` stays exactly as it is, it's the single function every nav surface calls (the old tab buttons, the dropdown items, and anything else in the app that jumps tabs). This task removes the buttons that used to trigger it and the UI built around them, it does not touch the function itself or anything downstream of a tab change.

Don't confuse `.nav-tabs` (the four app-section buttons this task removes) with `.nav-links` (a separate, already-hidden-on-mobile set of marketing anchor links, `<a>` tags, unrelated to this). Leave `.nav-links` untouched.

## Task
1. Remove the `.nav-tabs` row from the nav bar, both markup and its buttons (the four `.nav-tab` elements) and the `.nav-indicator` sliding element that moved under them.
2. Clean up now-dead code rather than leaving it disconnected: the `wrapTextRoll()` calls that were applied to `.nav-tab` elements at init, the sliding-indicator positioning logic (`offsetLeft`/`offsetWidth` computation, resize listener for it), and any mobile-breakpoint CSS written specifically for the tab row's width/overflow (including the fixes from the mobile-audit and mobile-nav tasks, since those were solving a problem this change removes entirely). Don't just hide it with `display:none` and leave the JS still running against elements that no longer render meaningfully, actually remove what's no longer needed.
3. Confirm the nav bar still reads as an intentional layout with just the logo (and its dropdown) remaining, not an empty bar with obvious dead space where the tabs used to be. Adjust `nav`'s alignment/spacing if needed now that it holds less.
4. Confirm the dropdown already reflects which tab is currently active (the prior build's "current ticked" behavior) since that's now the only on-screen indicator of where the user is, there's no more sliding indicator doing that job.
5. Re-check every place the mobile-audit and mobile-nav tasks touched specifically because of the tab row (the nav overflow fix, the square-mark-below-520px swap, the hero eyebrow interaction if any) and confirm none of it was solving a problem that only existed because of the row this task removes. If something is now solving a problem that no longer exists, simplify it, don't leave two generations of fixes stacked on top of each other.

## Verify before pushing
1. At 390px, 428px, and 1440px: confirm the tab row is gone, the nav bar looks deliberate, and the dropdown is the only way to navigate from the nav itself.
2. Confirm the dropdown still opens, lists all four destinations, marks the current one, navigates correctly, and closes on selection or outside click, exactly as it did before this change.
3. Confirm no leftover references to `.nav-tab`, `.nav-indicator`, or the tab-row-specific mobile CSS remain as dead code, actually removed, not just visually hidden.
4. Confirm `.nav-links` is untouched and still behaves exactly as before.
5. No console errors (specifically check for null-reference errors from code that used to query `.nav-tab`/`.nav-indicator` and no longer finds them), both script blocks parse, all existing suites pass, update or retire any suite assertions that specifically tested the now-removed tab row and sliding indicator.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm the tab row and its dead code are actually removed (not hidden), confirm the dropdown is the sole nav method and still shows the active tab, and note anything from the mobile-audit/mobile-nav/logo-dropdown tasks that got simplified because the problem it was solving no longer exists.
