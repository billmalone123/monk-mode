> **DONE — build 7.21, commit `5e37b13`, pushed.**
>
> **Choice: option 1, bring back a real headline.** One correction to the premise first — `.hero-title` was *not* still in the DOM. Only dead CSS survived: a `display:none` rule plus four breakpoint overrides sized for the old title-dominant hero. There was no element to unhide, so this genuinely adds one back.
>
> **What landed.** A new `<h1 class="hero-title">Strong and fast.</h1>` above the caption — the hybrid-athlete thesis in the site clipped voice, matching `NOT FOR EVERYONE` / `10 WEEKS. NO EXCUSES.`, and the page first `h1` (it had none, so this is also a small accessibility gain). Sized `clamp(34px, 6.2vw, 84px)` against a 15px tagline, so it is unambiguously the large display element. It does not repeat or collide with the tagline in either wording — the current "Ten weeks. Full progression. No guesswork." or the "Your goals. Your timeline. No guesswork." that `PROMPT_flexible_messaging.md` will introduce; the headline shares no phrasing with either. The stale overrides were removed since one clamp covers width responsiveness; only the short-landscape rule survives, retuned down. `ASSEMBLY_SEL` is still a single constant, now `.hero-title`.
>
> **Retargeting exposed a second, larger bug.** Progress used the enter-from-bottom mapping `(viewportHeight - sectionTop) / (sectionHeight + viewportHeight)`, which reports ~0.5 for a section already on screen. The hero sits at the top of the page, so at load progress was 0.5, `t` was already 1, and the characters were **fully settled before any scrolling** — the effect would have been invisible no matter which element it pointed at. Progress is now how far the section has been scrolled into, `-sectionTop / sectionHeight`, which reads 0 at load and rises as you scroll, and still behaves sensibly for a mid-page target. Verified numerically: old mapping `t = 1.00` at load, new mapping `t = 0.00` at load, `t = 0.50` halfway, fully settled after 35% of the hero is scrolled.
>
> **Two tuning changes** that follow from the new mapping: `ASSEMBLY_SETTLE` moved from the reference 0.5 to **0.35**, so a top-of-page hero finishes assembling well before it leaves view; and scatter dropped from 9px/7deg to **6px/5deg** per character, putting the outermost letter 45px off against 84px type — loose and tilted at rest rather than looking broken to someone who never scrolls.
>
> **Unchanged and re-verified:** one-directional settle (no re-scatter on scrolling back), rAF throttling, the `aria-label` carrying the plain sentence with per-character spans `aria-hidden`, and the reduced-motion early return before any splitting — motion off still yields a static, settled headline.
>
> **Push confirmation** (`git log --oneline origin/master -3` after pushing):
>
> ```
> 5e37b13 Give the scroll assembly a real headline to land on
> cad937a Record the edge carousel summary
> d76e3d0 Turn the Real ROI cards into a swipeable carousel
> ```
>
> Local HEAD `5e37b13` matches `origin/master`.
>
> **Note on queue order:** the runner lists this file second, after `PROMPT_flexible_messaging.md`. This one was already complete and verified when the runner arrived, so it was pushed first rather than discarding finished work; the dependency between them is only that the headline must not collide with the tagline, which holds for both the current and the planned wording.
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
Confirm `git log --oneline -3` before starting. HEAD should be `cad937a` (or newer), which already includes the edge carousel build, this prompt no longer needs to build that, only the scroll-assembly fix below.

## Context
The edge carousel is done, confirmed live on `origin/master` as of `d76e3d0`/`cad937a`, no action needed there.

The scroll-assembly effect is still landed on the wrong element and reads as broken. It's real, live, pushed code (`initScrollAssembly`, `ASSEMBLY_SEL`, committed in `5a49755`), but `ASSEMBLY_SEL` points at `.hero-desc`, a small description line, not a headline. The original spec (`PROMPT_scroll_assembly.md`) called for wrapping "the app's one comparably large display-type element." Read the current hero markup and CSS before touching anything: there is a `.hero-title` element still present in the DOM, but it's set to `display:none` in the CSS, a leftover from an older hero layout before it was replaced with the current ring-based design. Right now nothing in the hero is actually large display-type text, so the effect has no correct target to point at without a real content decision.

## Task
Pick one of these, don't just swap the CSS selector onto more small text and call it done:
- Bring `.hero-title` back as real visible large display text (unhide it, give it actual headline copy matching the hero's current voice, style it at a size consistent with the rest of the hero's type scale) and point `ASSEMBLY_SEL` at it.
- Or, if there's a product reason `.hero-title` should stay retired, pick whichever existing hero element is closest to a headline, size it up to genuinely read as large display type first, then point the effect at it.

Either way, the end state must be: a large, prominent piece of hero text that visibly assembles from scattered to settled as the user scrolls, not a small paragraph line doing the same motion unnoticed. `ASSEMBLY_SEL` stays a single constant either way, per the existing code's own comment that retargeting should be a one-line change, don't refactor that mechanism, just point it correctly and make sure the target is actually big.

If `PROMPT_flexible_messaging.md` has landed by the time you read this, the hero tagline (`.hero-desc`) will already have changed to "Your goals. Your timeline. No guesswork." Whatever you pick as the assembly target, make sure it doesn't visually collide or compete with that line, they're two different pieces of hero copy now.

## Verify before pushing
1. Scroll the hero section, confirm the retargeted element is visually large and prominent (not a small line easy to miss) and assembles smoothly from scattered to settled, matching the original scroll-assembly behavior (one-directional settle, no re-scatter on scrolling back up).
2. `prefers-reduced-motion: reduce` still disables the effect's motion (static settled position), confirm it wasn't regressed by this change.
3. No console errors, both script blocks parse, all existing suites unaffected (Run tab worked example, stress permutations, calendar, week sync, chart, adaptive logging).
4. Confirm this is a genuinely new commit on top of current `origin/master`, not a silent no-op, `git diff --stat` against the pre-sync commit should show real changes to `index.html`.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, no merge commit.

**Push, and confirm the push actually happened**: run `git log --oneline origin/master -3` after pushing and confirm it matches local HEAD.

Leave a short summary at the top of this file when done: what you chose for the scroll-assembly retarget and why, and the output of the post-push `git log` comparison proving it actually reached origin.
