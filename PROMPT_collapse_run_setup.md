## Summary (build 7.41)

**The collapse survives a real reload, and that was verified as a reload — twice.** Once in
the assertion harness (`sets.js` section 14 re-runs the whole boot path from storage) and
once in an actual browser: seeded `runPlan.raceDate`, loaded the page fresh, and read back
`runForm.classList.contains('collapsed') === true` with the toggle reading `+ Race setup`.
Nothing is persisted for this. The collapse is *derived* from `runPlan` on every load, which
is precisely what makes it survive a refresh without a second stored flag that could drift
out of sync with the real answer. Asserted directly: no new storage key was introduced.

The "has this been answered" test is not a new one. `runSetupIsAnswered()` is literally
`!!(runPlan && runPlan.raceDate)` — the same condition `openRunSetupModal()` already uses to
decide whether to re-ask the onboarding race step. The suite pins that with a regex over the
source, so the two cannot drift into disagreeing about whether setup is done.

**The collapsed summary line shows:** `Half Marathon · Sat Nov 14 · 5 days/week` — distance,
race date, days per week, separated by the same `·` used elsewhere in the app. Read off the
real rendered page, not composed by hand. One wrinkle worth recording: `RACE_DISTANCES`
labels are lowercase *on purpose* (`half marathon`) because they read mid-sentence elsewhere
— "suggested for casual / returning at this distance". Rather than change shared data other
copy depends on, the label is title-cased at this one display site. `5K` has no leading
lowercase letter and is left exactly as it is.

**The first-time path is unchanged.** With no `raceDate`, measured in the browser: the form
renders expanded at its full 410px, the race date field is visible, and the summary bar
hides itself entirely — there is nothing to summarise and nothing to collapse to, so it
stays out of the way rather than showing an empty line. The suite covers the same, including
clearing a race date back out and returning to the expanded state.

**The schedule and missed-run control genuinely rise — measured, not assumed.** With the
same page in a real browser, toggling the form and reading `getBoundingClientRect()`:

| | collapsed | expanded | rise |
|---|---|---|---|
| `#runSchedule` top | 1412px | 1849px | **437px** |
| `#runMissed` top | 3239px | 3676px | **437px** |
| page height | 3332px | 3770px | 438px shorter |

The collapsed form measures 0×0, so it is out of layout entirely rather than merely
invisible. This is also the direct answer to the missed-run control being buried at the
bottom of the tab: it now sits 437px higher for anyone who has already set a race up.

Deliberate choice worth flagging: `onRunInput()` keeps the summary text current but does
**not** collapse the form mid-edit. The moment someone picks a race date they are usually
still filling the rest of it in, and snapping the form shut under them would fight the edit.
Collapsing is decided at load, or by the toggle. Verify step 2's real test — the reload — is
covered either way.

The toggle uses the same visual language as the missed-run control directly below it: dashed
pill, muted text, `+`/`−` prefix. Confirmed rendered side by side (`+ Race setup` above
`+ Log a missed run`, both `dashed`, both `rgb(156,151,138)`).

Suites: `check.js` both blocks parse, `onb.js` 71/0, `compat.js` 86/0, `sets.js` 171/0
(29 new), CSS balanced, and no console errors across a full page reload.

One limitation: **screenshot capture timed out on every attempt** this session (any region,
any tab), so the evidence above is measured geometry and computed styles from the live page
rather than pixels. Layout, collapse state, text content and colours were all read from the
real rendered DOM; nobody has looked at an actual image of it.

---

## Sync first
```
del ".git\index.lock" 2>nul
del ".git\ORIG_HEAD.lock" 2>nul
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should include whatever build `PROMPT_add_custom_exercise.md` produced or newer.

## Context
The Run tab's actual DOM order, checked directly (index.html:2794 onward): `.run-form` (race date, distance, experience toggle, days-per-week, PR, index.html:2800-2870) comes first, then `#runFlags` / `#runPaces` / `#runChart` / `#runSchedule` (the generated plan output), then `#runMissed` (the "Log a missed run" control from the last build). So right now, every time someone opens the Run tab, they scroll past the whole setup form again before reaching the actual weekly schedule or the missed-run control, even after they've already filled the form in once.

The ask, from Billy directly: once someone has entered their race info, collapse that form down, expandable if they need to change something, so what they actually land on next time is the schedule and the logging tools, not the setup screen again.

There's already an existing, exact signal for "this has been filled in before": `openRunSetupModal()` (index.html:4625) checks `runPlan && runPlan.raceDate` to decide whether onboarding's race step should even open, "already answered — never re-ask." Reuse that same condition here rather than inventing a second way to detect whether setup is done, this app already has a policy for it.

## Task
1. **Collapse `.run-form` by default when `runPlan.raceDate` is already set**, on every Run tab load, not just after actively submitting the form for the first time, someone returning tomorrow should see it collapsed too. When there's no `raceDate` yet (true first-time state, or after a skip), leave it expanded exactly as it renders today, don't change that path.
2. **Collapsed state shows a compact one-line summary**, enough to recognize the current setup at a glance, something like distance, race date, and days-per-week, and a clear way to expand it back out. Keep this brief, it's a summary, not a second form.
3. **Expanding it must not lose or reset anything.** The fields underneath are unchanged, still the same `.run-form` inputs, still wired through the existing `onRunInput()` / `persistRunPlan()` path exactly as they are today. This is a display-state change on top of what already exists, not a new data model, don't touch `readRunInputs()`, `generateRunPlan()`, or `persistRunPlan()` itself.
4. **Collapsing the form should visibly bring the schedule and the missed-run control higher on the page**, which happens for free once the form itself takes up one line instead of the whole block, confirm that's actually true after the change rather than assuming the DOM reorder handles itself correctly.
5. Keep the expand/collapse control itself simple and obvious, one clear tap target, matching the low-key style already used for the missed-run toggle right below it (`+ Log a missed run` / `− Log a missed run`), a consistent visual language on the same tab is worth more here than a novel design.

## Verify before pushing
1. Fresh state, no `raceDate` set: confirm `.run-form` still renders fully expanded exactly as it does today, no regression to first-time setup.
2. Set a race date and the rest of the form, confirm it collapses to the summary line, then reload the page from scratch and confirm it's still collapsed (this is the real test, not just collapsing after a same-session submit).
3. Expand it back out, change a field (e.g. days-per-week), confirm the change still autosaves through the existing `onRunInput()`/`persistRunPlan()` path and the schedule below updates accordingly.
4. Confirm the missed-run control and the weekly schedule now sit visibly higher on the page when the form is collapsed, actually look at it, don't assume.
5. No console errors, both script blocks parse, all existing suites pass, plus new coverage for the collapse-by-default-on-reload behavior specifically, since that's the part most likely to be faked by a same-session-only implementation.

## Last steps
Bump the build stamp. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: confirmation the collapse persists across a real reload (not just the same session), what the collapsed summary line actually shows, and confirmation the first-time (no `raceDate`) path is unchanged.
