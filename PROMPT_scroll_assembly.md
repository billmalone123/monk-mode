> **DONE — build 7.19, commit `5a49755`, pushed.**
>
> **Progress** is scoped to the section, not the page: `(viewportHeight - sectionTop) / (sectionHeight + viewportHeight)`, clamped 0-1, mapped through a **0.5 settle point** matching the reference `[0, 0.5]` range. Each character is offset `distanceFromCentre * 9px` and rotated `distanceFromCentre * 7deg`, scaled by the remaining slack.
>
> **Throttling:** a ticking flag plus `requestAnimationFrame`, so at most one recalculation per painted frame however many scroll events fire, on a passive listener.
>
> **One-directional:** the highest progress seen is retained, so scrolling back up never re-scatters what has already settled.
>
> **Accessibility:** the element gets an `aria-label` carrying the plain sentence and the per-character spans are `aria-hidden`, so screen readers get the text and not fragments. The transform is decorative and conveys nothing on its own.
>
> **Reduced motion** returns before any splitting happens — no spans, no listener, the text simply sits in its final position.
>
> **A note on the target:** the hero has no headline element, only an eyebrow, the tagline and the ring, so this is applied to the tagline. `ASSEMBLY_SEL` is a single constant, so retargeting it at a `.section-title` is a one-line change. It uses neither the `.fade-up` observer nor `scroll-behavior`, so both keep working independently.
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
The user pasted a React/framer-motion/Lenis scroll animation (`Skiper31`), large text characters that start offset and rotated based on distance from the center of the word, assembling into normal position as the section scrolls through view, tied continuously to scroll progress, not a one-shot trigger. No React, no framer-motion, no Lenis, single `index.html`, ES5, no build step.

Two of the reference's three variants animate app-icon images and marketing copy about a tech stack, neither has any equivalent here, skip them. Only the text-character variant (`CharacterV1`, offset `x`/`rotateX` driven by distance from center) applies, and only to one place: the hero headline, since that's the app's one comparably large display-type element. If that's not where this was meant to go, it's a small redirect, but building it generically enough that retargeting it to a different heading later isn't a rewrite is worth doing anyway.

This app already has a one-shot `.fade-up` reveal pattern driven by an `IntersectionObserver`. This is a different thing, don't just reuse that. The reference ties each character's position continuously to scroll progress while the section is in view, not "trigger once when it enters." Build accordingly.

## Task
Wrap the hero headline's characters (splitting the existing text into per-character inline spans, matching the same technique already used elsewhere in this session for the nav letter-roll effect, reuse that splitting approach if it's already in the codebase from that build rather than writing a second one) and drive each character's transform from scroll position:

- Compute a 0 to 1 progress value based on how far the hero section has scrolled through its own scroll range (not the whole page), matching the reference's `useScroll({ target })` behavior scoped to one element
- For each character, offset `x` and apply a slight `rotateX` proportional to its distance from the center character index, at progress 0 (section just entering) the character sits offset and rotated, at progress 0.5 and beyond it settles into its normal position, matching the reference's `[0, 0.5]` input range mapped to `[distanceFromCenter * 50, 0]`
- Update this on scroll using `requestAnimationFrame`-throttled scroll handling (or an `IntersectionObserver` combined with a scroll listener for the progress calculation), not an unthrottled scroll listener recalculating on every event, this needs to stay smooth and not janky
- Once progress passes the settle point, the characters should stay settled, don't let them re-scatter if the user scrolls back up past the section and the effect re-triggers oddly, match the reference's one-directional assemble behavior within the scroll range

## Verify before pushing
1. Scroll through the hero section slowly and confirm characters assemble smoothly from scattered to settled as the reference describes, no jank, no layout shift affecting surrounding content.
2. Scroll quickly (fling-scroll) and confirm no visible stutter or characters snapping oddly.
3. Confirm this doesn't fight with the existing `scroll-behavior` setting or the `.fade-up`/`IntersectionObserver` pattern used elsewhere, both should keep working independently.
4. Confirm `prefers-reduced-motion: reduce` disables the scroll-scrubbing entirely and just shows the characters in their final settled position statically, matching the pattern already established for every other animation in this app.
5. Confirm the hero text remains fully readable (not an accessibility regression, e.g. don't rely on `rotateX` alone to convey anything, it's decorative only) and that screen readers still get the plain text content, not per-character fragments with no semantic meaning.
6. No console errors, both script blocks parse, all existing suites unaffected, this only touches hero rendering and a scroll listener.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: how scroll progress is computed and throttled, confirmation the effect settles one-directionally and respects reduced motion, and a note on the accessibility check (screen reader text content).
