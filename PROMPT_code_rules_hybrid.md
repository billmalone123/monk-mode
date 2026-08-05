## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include `1340f89` (rule 06, already landed) or newer.

## Context
Copy change only, no new logic. The Code currently reads (rule 06 already landed from a prior task):

```
01 Face pulls every pull day. Every single one.
02 Hip mobility every leg day. This is what separates you.
03 Full rest on main lifts. Cutting it short is for amateurs.
04 Deload every 4th week. The weak skip it. You won't.
05 Log every set. If you're not tracking, you're not progressing.
06 Built around your race, your days, your equipment. Adjust the plan. Never skip the work.
```

Rules 01 through 04 are lifting-only, and rule 01 specifically is too narrow a technical detail (a single accessory exercise) to be leading the program's six stated rules, especially now that this app's whole positioning is hybrid strength-and-endurance, not a lifting program with a mobility footnote. Rules 05 and 06 already stay as is, don't touch them.

## Task
Replace rules 01 through 04 with these four, same numbering, same markup pattern:

**01** (replaces the face-pulls rule entirely): Hard lifting and hard running never share a day. One of them always gives.

This states the actual merge principle the running generator already enforces (hard days never stack), which is the real load-bearing rule behind the hybrid pitch, not a single accessory movement.

**02**: Hip mobility every leg day. It's not just your squat. It's your stride.

Keeps the existing hip mobility rule (still true, still worth stating) but ties it to both halves of the program instead of reading as lifting-only.

**03**: Full rest on main lifts, full recovery on hard running days. Cutting either short is for amateurs.

Extends the existing rest principle to cover both disciplines instead of only the barbell side.

**04**: Deload every 4th week, lifting and running both. The weak skip it. You won't.

Extends the existing deload rule to acknowledge running cutback weeks land on the same cadence, matching how the two systems actually interact elsewhere in the app (a lift deload and a running cutback can land the same week, and both simply apply, no special-casing).

Rules 05 and 06 stay exactly as they are, byte-for-byte.

## Verify before pushing
1. Confirm rules 01–04 read as specified above, and 05–06 are unchanged.
2. Confirm no reference to face pulls remains in The Code (it can still exist elsewhere in the app, this is only about removing it from this specific list).
3. Read all six in sequence, confirm the voice is consistent, short declarative sentences, imperative, a little confrontational, matching the existing rhythm of 05 and 06.
4. Confirm layout still holds with six rules (spacing, numbering format), same check as the prior rule-06 addition.
5. No console errors, both script blocks still parse.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirm rules 01–04 read as specified, confirm 05 and 06 are untouched, and confirm face pulls no longer appear anywhere in The Code.
