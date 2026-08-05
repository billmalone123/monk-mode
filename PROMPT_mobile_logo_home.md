## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include `890f574` (the mobile layout fix, confirmed by rendering) or newer.

## Context
The mobile nav overflow bug is already fixed (dead media query specificity, corrected in a prior task), all four tabs are reachable on mobile now. Part of that fix was dropping `.nav-logo` entirely below 520px (`@media (max-width: 520px) { nav .nav-logo { display: none; } ... }`, around line 740) to make room for four tabs at a readable size, the wordmark image is 1584×340, wide, and there wasn't space for it plus four tabs on a 390px screen.

The user wants the brand mark back on mobile, and wants it to double as a way back to the Overview tab, a home link. This is a real, expected pattern (tap the logo, go home), and it's confirmed not needed as a fix, the nav itself already works, this is a genuine improvement, not a regression fix.

Don't bring back the wide wordmark, there still isn't room for it next to four tabs at small widths. Use the square icon mark instead, `assets/brand/rtw-square-a.png` (1024×1024, already used for the app icons elsewhere in this project), a small square mark reads fine at nav-bar size and won't crowd the tabs back off-screen the way the wordmark did.

## Task
1. Below 520px, instead of hiding `.nav-logo` entirely, replace its content with the square icon mark at a small fixed size (something in the 24–28px range, matching the scale of the nav-tab icons already at that breakpoint, your call on the exact number, check it against the tab row once built rather than guessing one number and moving on).
2. Make the logo (both the icon-mark mobile version and the existing wordmark desktop version, this should apply everywhere, not just mobile) a tap target that calls `goTab('info')` and resets to the Home sub-section (`goSec('home')`, matching the existing `#sb-home` pattern) if the Overview tab has sub-navigation state that needs resetting. Wrap it in a button or add an onclick, whichever is the cleaner fit with the existing markup.
3. Confirm re-adding the icon at mobile width doesn't reopen the space problem the tabs were just fixed for, the four tabs need to stay fully reachable and readable, this addition can't cost that back.

## Verify before pushing
1. At 390px and 428px: confirm the square icon mark is visible in the nav, sized reasonably, and all four tabs are still fully visible and reachable, this can't regress the fix from the prior task.
2. Tap the logo from every tab (Train, Run, Calendar, and from a sub-section inside Overview itself) and confirm it returns to Overview/Home each time.
3. Confirm desktop (1440px, 1024px) is unaffected, the wordmark still renders as before, and it now also works as a home link there too.
4. No console errors, both script blocks parse, all existing suites pass, including the mobile-layout suite from the prior task.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm the icon mark is visible on mobile without reopening the tab-overflow issue, confirm the logo works as a home link at every width, and the exact size you landed on for the mobile icon.
