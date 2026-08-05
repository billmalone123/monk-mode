## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include `3dd4edc` (the hybrid Code rules) or newer.

## Context
This is the most important, most concrete finding from a broader mobile pass, confirmed by reading the code directly: `<nav>` holds `.nav-logo` (the wordmark image) and `.nav-tabs`, a `display:flex` row of four `.nav-tab` buttons (Overview, Train, Run, Calendar) plus the sliding `.nav-indicator` from the nav-flow work. The mobile breakpoint around line 719 only shrinks tab padding and font size (`.nav-tab { padding: 0 10px; font-size: 12px; ... }`), it never wraps, scrolls, or collapses the row. Four tabs at reduced size still overflow a phone-width nav bar with no way to reach the ones pushed out of view, which is exactly what's being reported: only Overview and Train (the first two) are reachable on mobile, Run and Calendar are not.

Fix direction, confirmed: below the mobile breakpoint, replace the horizontal tab row with a hamburger pattern. The wordmark/logo becomes a tap target that returns to Overview (the home tab), and a three-bar toggle button opens a menu containing all four destinations. Desktop is unaffected, keep the existing horizontal tabs, letter-roll hover, and sliding indicator exactly as they are above the breakpoint.

## Task

### 1. Logo becomes a home link
`.nav-logo` (currently just a static wordmark image) gets an `onclick` (or wraps in an anchor/button, your call on cleanest markup) that calls `goTab('info')` and, if the Overview tab has its own sub-navigation state, resets it to the Home sub-section (`goSec('home')`, matching the existing `#sb-home` pattern). This should work at every width, not just mobile, it's a reasonable improvement everywhere, but it becomes load-bearing on mobile since the logo is one of the few things guaranteed visible.

### 2. Hamburger toggle, mobile only
Below the existing mobile breakpoint, hide `.nav-tabs` in its current horizontal form and show a toggle button (three stacked bars, standard hamburger icon, built as CSS or inline SVG matching the site's existing icon patterns like the nav-tab icons already do, not an external icon font) positioned where it reads naturally in the nav bar, right side is the conventional placement, your call if something else fits this layout better.

Tapping it opens a menu (a dropdown panel or a full slide-in, your call on which fits the site's existing motion language, matching the pattern already used for tooltips/other overlays, appended in a way that isn't clipped by any `overflow:hidden` ancestor, same reasoning as the tooltip system) listing all four destinations (Overview, Train, Run, Calendar) as tappable rows, each calling the same `goTab()` the desktop tabs already use, so there's exactly one navigation function, not a second parallel one for mobile. Tapping a destination navigates and closes the menu. Tapping the toggle again, or tapping outside the open menu, closes it without navigating.

The active tab should be visually indicated inside the mobile menu too (matching whatever visual language reads clearly at that size, doesn't need to be the sliding indicator, that's a horizontal-row-specific effect).

### 3. Reduced motion and touch
The menu's open/close transition respects `prefers-reduced-motion` (snaps instead of animating), matching the pattern already established everywhere else in this app. This is a touch-first surface, make sure the toggle button and menu rows are sized for a real tap target, not shrunk to fit the way the current four-tab row was.

## Verify before pushing
1. At 390px and 428px: confirm all four destinations (Overview, Train, Run, Calendar) are actually reachable through the hamburger menu, this is the core bug, don't consider this done until Run and Calendar are tappable on a real narrow width.
2. Confirm the logo returns to Overview/Home from every tab, including from deep inside Train or Run's own sub-navigation.
3. Confirm desktop (1440px, 1024px) is unaffected, horizontal tabs, letter-roll hover, and sliding indicator all still work exactly as before this change.
4. Confirm the menu doesn't get clipped by any parent's `overflow:hidden`, same check the tooltip system already had to pass.
5. Confirm `prefers-reduced-motion: reduce` snaps the menu open/closed instead of animating.
6. Tap the toggle, tap a destination, confirm the menu closes and the correct tab renders. Tap the toggle, tap outside the menu, confirm it closes without navigating.
7. No console errors, both script blocks parse, all existing suites (including the nav-flow and mobile-audit suites if those have landed) pass.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm all four tabs are reachable on mobile with this change (this is the thing that was actually broken), how the logo-as-home-link was wired, and confirmation desktop nav is unchanged.
