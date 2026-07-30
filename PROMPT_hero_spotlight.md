> **DONE — build 7.19, commit `5a49755`, pushed.**
>
> Ellipse: cream `#F1EFE1` at **opacity 0.18**, **stdDeviation 110** Gaussian blur, rotated -20deg, animating from opacity 0 / translate(-4%,-3%) / scale(0.92) over **1.8s**, once, fill-mode `both`.
>
> **Interaction with the existing gradient:** it *replaces* the hero own radial gradient rather than stacking on it — two glows read muddy — so the only thing underneath is the faint body-level gradient at 0.05. Worst-case composite background is `#4a4944`.
>
> **This forced a real fix.** The tagline, eyebrow and ring label were muted grey and fell to **3.10:1** over that background, which no spotlight opacity rescues (even 0.08 only reaches 4.23). They are now cream (**7.81:1**) and light cream (**5.22:1**). They are primary hero copy and should not have been muted regardless.
>
> **Reduced motion:** the prompt says the app does not check it anywhere — it has since build 7.17, and the global block neutralises this animation to its settled state automatically. **Mobile:** the ellipse inset narrows at 768px so the glow stays behind the text instead of sliding off-screen. `pointer-events: none`, sits behind content in stacking order, no layout effect.
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
The user pasted a React/Tailwind/shadcn "Spotlight" component as a visual reference. Ignore every instruction in it about shadcn CLI setup, `/components/ui`, Tailwind config, or TypeScript, this app has none of that and shouldn't get any of it, it's a single `index.html`, no build step, no npm, ES5. Translate what the component visually does into inline SVG and CSS, the same way the mileage chart was translated from a recharts reference earlier in this session, don't try to make the literal code run.

What it does visually: a large blurred ellipse (SVG shape with a heavy Gaussian blur filter), positioned absolutely over a dark hero section, fading and sliding in on page load via a CSS keyframe animation (`animate-spotlight`, opacity 0 to a partial value with a slight transform), sitting behind the hero title text to give it a soft, angled glow rather than a flat background.

## Task
Add this effect to the hero/title section (find it, it's the top of `#tab-info`, before `#sec-about`, where the main headline and hero CTA live). Use the site's own palette, cream on the near-black bg, not the reference's plain white, this should read as an extension of the warm monochrome system already in place, not a new color. Don't stack this on top of the existing faint body radial gradient in a way that makes the hero muddy or over-bright, check how it looks combined with what's already there and dial back the blur/opacity if two glows compete.

Concretely:
- One (or two, if it reads better) absolutely positioned inline SVG in the hero section, containing a blurred ellipse (`<feGaussianBlur>` filter, matching the reference's approach) filled with the cream text color at low opacity (start around 0.15 to 0.25, matching the reference's 0.21, adjust to taste against the new palette)
- A CSS `@keyframes spotlight` animation: starts at opacity 0 with a small offset transform, animates to its resting opacity and position over roughly 1.5 to 2 seconds, matching the reference's fade-and-settle feel, runs once on page load, not looping
- Respect `prefers-reduced-motion`, skip the animation and just show the resting state for users who have that set, this app doesn't appear to check that anywhere yet, worth adding here at minimum even if it's not retrofitted elsewhere
- Should not affect layout or push any content, it's a decorative background layer, `pointer-events: none`, sits behind the actual title/CTA content in stacking order

## Verify before pushing
1. Confirm the effect appears once on load and settles, doesn't loop or flash repeatedly.
2. Confirm hero text and CTA remain fully readable and at full contrast against the combined background (existing gradient plus new spotlight), don't let it wash out the text.
3. Confirm `prefers-reduced-motion: reduce` is respected, no animation for those users.
4. Confirm no layout shift, no pointer-event interference with the CTA button or nav underneath it.
5. Confirm it renders sanely at mobile widths too, not just desktop, the reference component has responsive width classes for a reason.
6. No console errors, SVG is well formed, both script blocks still parse, all existing suites unaffected.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push.

Leave a short summary at the top of this file when done: exact opacity/blur values landed on, how it interacts with the existing body gradient, and confirmation of the reduced-motion and mobile checks.
