> **DONE — build 7.26, commit `1340f89`, pushed.**
>
> **Rule 06 is in place**, exactly as specified: *"Built around your race, your days, your equipment. Adjust the plan. Never skip the work."*
>
> **Rules 01–05 are untouched, provably.** `git diff --stat` is **1 insertion, 0 deletions** — the diff contains a single `+` line and nothing else, so byte-for-byte identity of the first five is not a claim, it is what the diff shows.
>
> ```
> 01  Face pulls every pull day. Every single one.
> 02  Hip mobility every leg day. This is what separates you.
> 03  Full rest on main lifts. Cutting it short is for amateurs.
> 04  Deload every 4th week. The weak skip it. You won't.
> 05  Log every set. If you're not tracking, you're not progressing.
> 06  Built around your race, your days, your equipment. Adjust the plan. Never skip the work.
> ```
>
> **Layout holds with six.** Checked rather than assumed: all six rules serialise to an identical markup shape (`.footer-rule` + `.footer-rule-num`), numbering is two-digit zero-padded across all six, and **no new CSS was needed**. `.footer-rules` sets only `max-width: 400px`, `.footer-rule` is a plain flex row with `margin-bottom: 8px`, and the `<footer>` itself is `display: flex` with `flex-wrap` and `align-items: flex-end` and no height constraint at any of its four breakpoints — so a sixth row simply extends the stack downward and the footer grows with it. Footer divs balance 11/11.
>
> **Voice.** Rule 06 is two short declarative sentences after the qualifying clause, imperative in both, and ends on a flat instruction rather than an explanation — the same shape as 03 ("Cutting it short is for amateurs") and 04 ("The weak skip it. You won't"). It is the longest of the six by a few words, which is the cost of naming three variables; nothing was softened to compensate.
>
> **Suites:** all thirteen pass, both script blocks parse. Copy-only, no logic touched.
>
> **Push confirmation** (`git log --oneline origin/master -3`):
>
> ```
> 1340f89 Add rule 06 to The Code
> 0241231 Record the dynamic labels summary
> 52c5afd Stop describing a 6-day split the app may not be running
> ```
>
> Local HEAD `1340f89ab3711d104bd6b05cfbd01bca4acd229b` matches `origin/master`.
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
Confirm `git log --oneline -3` before starting. HEAD should include `ae6ebb6` (the exercise substitution build) or newer.

## Context
Copy change only, no new logic. The footer has a five-rule list, `.footer-rules` / `.footer-rules-title` ("The Code") in `index.html` (around line 2384):

```
01 Face pulls every pull day. Every single one.
02 Hip mobility every leg day. This is what separates you.
03 Full rest on main lifts. Cutting it short is for amateurs.
04 Deload every 4th week. The weak skip it. You won't.
05 Log every set. If you're not tracking, you're not progressing.
```

None of these five make a fixed-duration claim, so unlike the six spots `PROMPT_flexible_messaging.md` fixed, there's nothing here that's now factually wrong. What's missing is the adjusts-to-you positioning that's now the pitch everywhere else on the site (hero tagline, About section, the pillar card, the edge section), it isn't represented in the one section written as the program's actual rules. Add it there, in the same voice, don't rewrite the existing five.

## Task
Add a sixth rule, same markup pattern as the existing five (`<div class="footer-rule"><span class="footer-rule-num">06</span>...`):

**06** Built around your race, your days, your equipment. Adjust the plan. Never skip the work.

Keep rules 01 through 05 exactly as they are, byte-for-byte, this is an addition, not a rewrite. Match the existing numbering format (`01`, `02`, ... `06`, two-digit, zero-padded).

## Verify before pushing
1. Confirm rules 01 through 05 are unchanged, diff should show only an addition.
2. Confirm rule 06 renders with the same styling as the other five (number badge, rule text, spacing), no layout break from a sixth item.
3. Read rule 06 in context with the other five, confirm it matches their voice, short declarative sentences, imperative, a little confrontational, not softer or more explanatory than the others.
4. No console errors, both script blocks still parse.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm rule 06 is in place, rules 01–05 are untouched, and the layout holds with six rules instead of five.
