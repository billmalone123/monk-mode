> **DONE — build 7.13, commit `3308c58`, pushed.**
>
> **Final palette.** bg `#1A1A18` · card/surface `#232320` · surface-2 (elevated/hover) `#2C2B27` · border `#302F2A` · border-hi `#3A3935` · text `#F1EFE1` · secondary text `#C9C5B6` (replaces `#ccc`) · muted/hints `#9C978A` · decorative-only `#56534B` (tracks, hairlines, ghost numerals — never text) · input border `#78736A` · brand sparkle gray `#5E5E5E`. Two new tokens were added: `--field` (input borders) and `--gray` (the sparkle). 16 distinct hexes remain, all warm, zero orange and zero navy left.
>
> **Emphasis in place of the orange.** Active/selected states and CTAs are now a **solid cream fill (`#F1EFE1`) with a dark `#1A1A18` label** at 15.08:1 — fill and weight carry what hue used to. Secondary emphasis is a cream outline. Badges/chips are cream at 10–13% alpha over the dark with cream text. The orange body/hero radial gradients were retinted to `rgba(241,239,225,0.05)`.
>
> **Contrast, computed not eyeballed.** text on bg **15.08:1** · text on card **13.64:1** · text on surface-2 **12.26:1** · secondary on card **9.11:1** · muted on bg **5.98:1** · muted on card **5.41:1** · muted on surface-2 **4.86:1** · dark label on cream fill **15.08:1** · input border **3.70:1** (WCAG 1.4.11 needs 3:1). All pass AA. Worth noting the *old* palette actually failed AA — muted on card was 3.77:1 — so this is a net accessibility improvement, not just a repaint.
>
> **Logos.** `assets/brand/rtw-wordmark.png` replaces the text mark in the nav (`.nav-logo`, 30px tall, 22px on mobile) and the footer (`.footer-logo`, 46px), both with `alt="Run the Weights"`; the wrapping divs and their semantic role are unchanged. The PNG carries `#1A1A18` internally, identical to the new page bg, so its padding is invisible and it sits flush. Square mark A was chosen over B — it fills more of its frame, so the letterforms survive better at 192px — and is used for the icons rather than in-page, to avoid a second large download.
>
> **Icons.** All four regenerated from `rtw-square-a.png` with the canvas cleared to `#1A1A18`: `icon-192`, `icon-512`, `apple-touch-icon` (180) full-bleed, and `icon-512-maskable` at 78% content scale so the mark clears the 10% safe zone — verified by scanning for the first lit pixel (x=138, y=194, well inside the 51px boundary). Opened at 100% and confirmed legible. `manifest.json` `background_color`/`theme_color` → `#1A1A18`.
>
> **Bugs caught by the sweep.** A rule-block scanner found four active states that became invisible once orange collapsed to cream — `.week-tab.active`, `.plan-nav-btn.active`, `.prog-week-btn.active`, `.mode-toggle-btn.active` all had a cream fill with a cream label; each now takes a dark label. The `WAVE 1` span inside each week tab had the same problem (orange-on-orange even *before* the rebrand — a pre-existing bug) and now inherits the button's state. Two malformed 5-digit hexes in the deload badge (`#55522`, `#55544`, silently ignored by browsers) were fixed to real warm values. Fifteen `var(--dim)` text usages were moved to `--muted`, since `--dim` at 2.27:1 was never legible enough for the form hints that were using it.
>
> **On flatness.** It does not read flat. The cream-fill active state is a *stronger* signal than the orange was, and the three-step warm text scale plus the card/bg separation carries the rest. No colour was reintroduced anywhere.
>
> **Verified.** Run tab worked example still 89/90 exact; 19/19 stress permutations; all 10 combined-calendar states pass; both script blocks parse; manifest is valid JSON. **Not verified in a real browser** — the Chrome extension is not connected in this environment, so the invisibility checking was done by scanning every CSS rule block and inline style for same-tone fill/text pairs rather than by looking at the page. Worth a glance on the live URL.
>
> ---
>
## Sync first
```
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` shows the current commit before starting.

## Context
Three brand images are already in the repo at `assets/brand/`: `rtw-square-a.png` and `rtw-square-b.png` (two versions of the same square RTW mark, 1024x1024, near-identical, pick whichever renders cleaner at small sizes) and `rtw-wordmark.png` (the wide "RUN THE WEIGHTS" lockup, 1584x340). These are the new brand assets, sampled directly from the actual files, not eyeballed:

Background: `#1A1A18` (warm near-black, not the current cool navy-black)
Foreground/text: `#F1EFE1` (warm off-white/cream, not the current cool blue-white)
Small accent used sparingly in the mark itself (the sparkle icon): `#5E5E5E` (mid gray)

No color accent otherwise appears anywhere in the provided brand images. The current site's accent is a bright orange, `#F5A623`, used everywhere (CTAs, active tab state, glows, hero gradient, 80+ hardcoded instances outside the CSS variables). Matching the brand images faithfully means dropping that orange in favor of a monochrome warm black/cream system, using weight, size, outline, and the small gray as the only accents, the way the logo itself does it. If this ends up feeling flat once it's built, that's worth flagging back rather than silently reintroducing a color the brand images don't have.

## Task
Rework the site's entire color system to this warm monochrome palette, and place the actual logo images wherever "Run the Weights" currently appears as text.

### Palette remap
This app defines CSS custom properties in `:root` but also has 80+ hardcoded hex colors scattered through inline styles and JS-generated HTML strings, a variable-only find-and-replace will miss most of it. Inventory every hardcoded color first (`grep -oE "#[0-9A-Fa-f]{3,6}" index.html | sort | uniq -c | sort -rn` to see the full list), then remap by what each one actually does, don't blind find-and-replace:

- `--bg` (`#080918`) and its 80-instance-orange sibling `#F5A623` used as backgrounds/CTAs → new bg `#1A1A18`, CTAs move to a bold cream fill or cream outline instead of a color fill
- `--card`/`--surface`/`--surface-2` (`#131528`, `#0F1024`, `#141630`) → a warm dark tone a shade lighter than the new bg for elevation, something like `#232320`, adjust until card vs bg is clearly distinguishable but still reads as one family
- `--border`/`--border-hi` (`#1A1C38`, `#252748`) → warm dark borders between bg and card, something like `#302F2A` / `#3A3935`
- `--text` (`#EEEFFE`) and the near-white hardcoded values (`#fff`, `#f0f0f0`) → `#F1EFE1`
- `--muted` (`#6E6F98`) and grays (`#ccc`, `#8585A0`, `#555`, `#666`, `#444`) → warm muted tones between bg and text, keep the same relative lightness steps they currently have, just shift the hue warm
- The backward-compat aliases (`--red`, `--blue`, `--green`, `--purple`) are all already just aliased to the orange accent, no real semantic color use to preserve, they can all point at whatever the new single accent/emphasis treatment ends up being
- `#0C0D1F`, `#0F0F1A`, `#0F1127`, `#B8902A`, `#E0BC5A`, `#ffbe0b`, `#2D2D3D`, `#23232E` and anything else the grep turns up: figure out what each is actually used for (hover state, glow, shadow, gradient stop) and give it a warm equivalent at the same relative brightness, rather than guessing a single universal swap.

The body background currently has a radial gradient tinted orange (`rgba(245,166,35,0.06)`), retint that to a very faint warm cream glow (roughly `rgba(241,239,225,0.05)`) or remove it if it reads muddy against the new dark.

### Logo placement
Wherever the text "RUN THE WEIGHTS," "Run the Weights," or the stylized "RUN THE.WEIGHTS" wordmark currently renders as text (nav bar, footer brand mark, hero if it's there), replace it with an `<img>` using `assets/brand/rtw-wordmark.png`, sized and cropped appropriately for each context, with real alt text ("Run the Weights"). Keep the semantic heading/nav structure intact, swap the visual content, not the markup's role. Use one of the square marks (`rtw-square-a.png` or `-b.png`, pick the cleaner one) anywhere a compact icon-only mark fits better than the wide wordmark, if such a spot exists (nav corner, loading state, etc), your judgment on whether that's worth adding versus just using the wordmark everywhere.

### Icons and manifest
Regenerate `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `apple-touch-icon.png` from the square mark (it's already 1024x1024, resize down, and for the maskable version add safe-zone padding per the standard maskable icon spec, don't just resize the same file three ways with no padding adjustment for maskable). Update `manifest.json`'s `background_color` and `theme_color` from `#0C0D1F` to the new `#1A1A18`.

## Verify before pushing
1. Contrast: check the new text color against the new bg and the new card tone both meet WCAG AA (4.5:1 for body text, 3:1 for large text/UI components). Compute this, don't eyeball it.
2. No orange, or any of the old cool-navy tones, left anywhere, re-run the same grep from the top of this file after your changes and confirm every hex on the page belongs to the new warm palette.
3. All three existing features still work and are legible in the new palette: the lift plan (Train tab), the running plan generator (Run tab), and the combined week calendar on the overview section. Check active/selected states are still visually distinguishable from unselected ones now that there's no color accent doing that job, weight/outline/fill needs to carry that instead.
4. Icons render correctly at their actual sizes (open `icon-192.png` etc at 100%, not just check they exist), the maskable icon isn't clipped once you account for the safe zone.
5. No console errors, nothing unreadable (cream text on a light card, or bg-colored text on bg, that kind of accidental invisibility).

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, no merge commit, then push.

Leave a short summary at the top of this file when done: what the final hex values landed on for bg/card/border/text/muted, what you used for CTA/active-state emphasis in place of the orange, where the logo images ended up, and the contrast ratios you computed.
