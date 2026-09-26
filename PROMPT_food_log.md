## Summary (done, build 7.72, SW v43)

**Shipped**
- `/api/meal.js`: POST only, `x-rtw-pass` passcode gate (401), 400 with no photo or note, 413 over 1.5 MB, Anthropic Messages API via built in `fetch`, model `MEAL_MODEL` or `claude-sonnet-5`, `max_tokens: 1000`. Parses fenced or bare JSON, coerces numbers, drops nameless items, and returns 502 with the friendly message when the output can't be read. One addition not in the spec: `thinking: { type: 'disabled' }`, because Sonnet 5 thinks by default and that would spend from the same 1000 token budget the JSON needs.
- Client storage: `monk_food_logs_v1`, `monk_food_targets_v1` and `monk_bodyweight_v1` use localStorage plus an `idbSet` mirror, IDB recovery in `restoreFromIDB()`, and export/import. `monk_meal_pass_v1` stays on the device only and is not exported. Photos are never stored.
- Pure helpers: `mealTotals`, `dayTotals`, `scaleItem`, `weekAvgWeight`, `weightTrend`.
- New **Food** tab (menu, between Calendar and Quick Log):
  - calorie and protein bars, with inline target inputs when no targets are set
  - date stepper
  - Snap meal (camera, downscaled to 1024px JPEG 0.8) or Type it
  - editable review before save: grams scale from the original estimate, typed cal/protein override, add or delete rows, assumptions and confidence shown
  - meal list (tap to edit, delete with confirm)
  - Repeat a meal (last 10 distinct, no API call)
  - Bodyweight: weigh in, 7 day avg, vs last week, distance to goal
  - Copy today's post
- Settings: calorie, protein and goal weight targets, plus Reset meal passcode.

**Lifts line: included.** It reads `sessions[exId]` entries whose `d` matches the day and takes the top set (`weight` x `reps`), Quick Log singles included. Caveat: `d` is the date an entry was last saved, so re-editing an old training week today moves that lift onto today's post.

**Tests** (run with Playwright's bundled Node 24, since `node` is not on PATH on this Mac)
- `check.js`: all 3 script blocks parse.
- `food.js` (new): 111 passed, 0 failed. Covers scaleItem (including grams 0 and null), dayTotals with zero, one and many meals, weekAvgWeight with gaps and with no data, the export/import round trip, no passcode in the export, a user with no new keys loading with no throw or NaN, post text, a secret/GET scan, and the `/api/meal.js` stub tests (401/400/413/405/500, fenced JSON, garbage JSON returns 502).
- **The existing suites were NOT green before this change** (checked on a clean `4e09689`), and they give identical results after it:
  - `sets.js`: 241 passed, 4 failed (content drift: 43 exercises vs 42 expected, a 17 word sentence, a caption check).
  - `compat.js` crashes on `getMostRecentDay` and `onb.js` exits with "expected 2 script blocks, found 3". Both harnesses only load 2 of the app's 3 script blocks. Left untouched as out of scope.
- No API key, passcode or model secret appears anywhere in the repo. The only `/api/` call in the food code is a POST.

**Not seen yet:** none of this has been run in a real browser or with a real phone camera. The endpoint has only been tested against a faked `fetch`.

## Needs Billy, not code
1. Anthropic API key from console.anthropic.com. Add as `ANTHROPIC_API_KEY` in Vercel project env vars. Set a monthly spend limit in the Anthropic console.
2. Pick a passcode, add as `MEAL_PASSCODE` in Vercel env vars. Enter the same one in the app the first time it asks.
3. Redeploy on Vercel after adding env vars so the function picks them up.

---

## Sync first
```
git fetch origin
git reset --hard origin/master
```
Confirm `git log --oneline -3` before starting. HEAD should be `4e09689` (build 7.71, SW v42) or newer.

## Context
The brand goal changed. The Hamptons Half was cancelled. New goal: bodyweight 185 to 200 lb, getting stronger, first time ever tracking food seriously, daily Instagram posts showing that day's food and lifts. The app needs a food log that runs off photos, plus a bodyweight trend, so Billy logs here instead of a third party app.

Single file app, `index.html`, all HTML/CSS/JS inline, no build step. Deployed to Vercel from `origin/master`. `/api/strava.js` already establishes the serverless pattern: CommonJS `module.exports = async function handler(req, res)`, POST only, JSON in and out, secrets only in Vercel env vars because this repo is public. Follow that pattern exactly. Every call stays POST so `sw.js` never touches it (see the Strava comments on why).

Storage pattern to copy: `RUN_LOG_KEY` / `loadRunLogs()` / `persistRunLogs()`, localStorage plus `idbSet()` mirror, recovery wired into `restoreFromIDB()`, included in `exportData()` and `importData()`.

## Task

### 1. Serverless function `/api/meal.js`
POST `{ image, mediaType, note }`. `image` is optional base64 (no data URL prefix). `note` is optional text. At least one is required, else 400.

Auth: require header `x-rtw-pass` to equal `process.env.MEAL_PASSCODE`. Missing or wrong returns 401. This endpoint spends real API money and the repo is public, so it cannot be open. Reject images over 1.5 MB of base64 with 413.

Calls `https://api.anthropic.com/v1/messages` with `x-api-key: process.env.ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, model from `process.env.MEAL_MODEL` defaulting to `claude-sonnet-5`, `max_tokens: 1000`. Node built in `fetch`, no dependencies. Missing API key returns 500 with a clear message, same style as the Strava function.

System prompt for the model, verbatim intent:
- You are estimating nutrition for a food log. Return ONLY JSON, no prose, no code fences.
- Shape: `{ "items": [ { "name", "grams", "cal", "protein", "carbs", "fat" } ], "assumptions": [string], "confidence": "low"|"medium"|"high" }`. Numbers are numbers, rounded to whole.
- If the user's note gives weights or quantities, those override anything estimated from the photo.
- Always account for likely hidden calories (cooking oil, butter, dressings, sauces) and list each one as its own item and in `assumptions`, so the user can delete it if wrong.
- If the photo is not food, return `{ "items": [], "assumptions": ["No food found"], "confidence": "low" }`.

Server strips any code fences, parses, validates the shape (coerce numbers, drop items with no name), returns `{ items, assumptions, confidence }`. Parse failure returns 502 with `{ error: 'Could not read the estimate. Try again or add a note.' }`.

### 2. Client data
```
FOOD_LOG_KEY   = 'monk_food_logs_v1'   // { 'YYYY-MM-DD': [ meal ] }
FOOD_TARGET_KEY= 'monk_food_targets_v1' // { cal, protein, goalWeight }
BODYWEIGHT_KEY = 'monk_bodyweight_v1'  // { 'YYYY-MM-DD': lbs }
MEAL_PASS_KEY  = 'monk_meal_pass_v1'   // passcode string, device only
```
Meal shape: `{ id, time, name, items: [ { name, grams, cal, protein, carbs, fat } ], source: 'photo'|'text'|'repeat', confidence }`. Meal totals are always computed from items, never stored separately, so an edit can't leave totals stale.

Load, persist (localStorage plus `idbSet`), IDB recovery, export and import for the first three keys, matching the existing pattern. The passcode is NOT exported (a backup file shouldn't carry a credential). Photos are NOT stored anywhere. The estimate is kept, the image is discarded after the request.

Pure helpers, no DOM, testable: `mealTotals(meal)`, `dayTotals(dateKey)`, `scaleItem(item, newGrams)` (scales cal and macros proportionally, returns item unchanged if original grams is 0 or null), `weekAvgWeight(endDateKey)` (average of logged weights in the 7 days ending that date, null if none), `weightTrend()` (this week's average minus last week's).

### 3. New tab: Food
Add `{ id: 'food', label: 'Food' }` to the nav menu between Calendar and Quick Log, with a `tab-food` panel, wired through `goTab()` like the others. Reuse existing tokens and components (`--surface`, `--border`, `run-setup-bar` style bars, existing input styles). No new visual language.

Top of tab, today:
- Calories and protein against target, as two plain progress bars with the numbers. If no targets are set, show one line: "Set your daily calories and protein to start" with inline inputs. Carbs and fat shown small underneath, no target.
- Date stepper (prev / today / next) so past days can be viewed and edited, same as the calendar's always editable logging.

Add a meal:
- "Snap meal" button opens the camera (`<input type="file" accept="image/*" capture="environment">`). Optional note field right next to it: "Weights or details (8 oz chicken, 250g rice)".
- "Type it" option that sends note only, no photo.
- Before sending, downscale client side to max 1024px on the long edge via canvas, JPEG quality 0.8.
- While waiting, the button reads "Estimating..." and is disabled. On error show the server's message inline under the button. If no passcode is saved, prompt for it once and save to `MEAL_PASS_KEY`. On 401, clear it and prompt again.

Review before save (this is where accuracy comes from, do not skip it):
- Show the returned items as editable rows: name, grams, cal, protein. Editing grams calls `scaleItem`. Editing cal or protein directly overrides that field. Each row deletable. "Add item" row for anything missed.
- Show `assumptions` as a short list under the rows, and the confidence.
- "Save meal" commits to the day. "Discard" drops it. Nothing hits storage before Save.

Logged meals list for the day: meal name, time, cal and protein. Tap to reopen the same editor. Delete with confirm.

"Repeat a meal": last 10 distinct saved meals by name, one tap adds a copy to the viewed day with `source: 'repeat'`, no API call. Bulking meals repeat constantly, this saves money and time.

Bodyweight:
- One input "Weigh in (lbs)" for the viewed day.
- Show 7 day average, change vs last week's average, and distance to `goalWeight` (default 200 if unset, editable). Target rate note in plain words: "Aim for about 0.5 to 1 lb a week."
- The weekly average matters more than any single weigh in. Label it that way.

### 4. Copy for Instagram
Button at the bottom of the day: "Copy today's post". Builds plain text and writes to clipboard:
```
Day N. 185 to 200.
Calories: 3,240
Protein: 196g
Weight: 186.4 (7 day avg)
Lifts: <top set per exercise from that day's lifting log, if any>
```
Day N counts from the first date that has any food log entry. Find how the app stores that date's lifting session and pull the top set per exercise. If that mapping is ambiguous or risky, ship without the Lifts line and say so in the summary rather than guessing. Omit any line with no data. No dashes in this text.

### 5. Settings
In `openSettingsModal()`, a small Food section: calorie target, protein target, goal weight, and "Reset meal passcode". Same markup as existing settings rows.

## Verify before pushing
1. `node check.js`: every script block parses.
2. Existing suites still green: `compat.js`, `onb.js`, `sets.js`. Report counts.
3. New `food.js` harness in the same style as the others (boot index.html in the DOM stub). Cover: `scaleItem` math including grams 0 or null, `dayTotals` with zero, one, and many meals, `weekAvgWeight` with gaps and with no data, export then import round trip preserves food logs, targets, and bodyweight, export does NOT contain the passcode, a user with none of the new keys in storage loads with no throw and no NaN anywhere (the regression check, same idea as sets.js section 2).
4. `/api/meal.js`: node syntax check, and a stub test that fakes `fetch` to confirm 401 without passcode, 400 with no image or note, 413 on oversize, fenced JSON gets stripped and parsed, garbage JSON returns 502.
5. Confirm no API key, passcode, or model secret appears anywhere in `index.html` or the repo.
6. Confirm nothing in the food code path issues a GET to `/api/`.

## Last steps
Bump the build stamp to 7.72 everywhere it appears. Bump `CACHE` in `sw.js` to `monk-mode-v43`. Commit with a clear message. Confirm `git log --oneline --graph -5` is a clean line, push, and confirm with `git log --oneline origin/master -3` that the push landed.

Leave a short summary at the top of this file when done: what shipped, test counts, whether the Lifts line made it into the post text, and the standing caveat that none of this has been seen in a real browser or phone camera yet.

## Needs Billy, not code (list these in the summary too)
1. Anthropic API key from console.anthropic.com. Add as `ANTHROPIC_API_KEY` in Vercel project env vars. Set a monthly spend limit in the Anthropic console.
2. Pick a passcode, add as `MEAL_PASSCODE` in Vercel env vars. Enter the same one in the app the first time it asks.
3. Redeploy on Vercel after adding env vars so the function picks them up.
