## Summary (build 7.45) — NOT YET PUSHED, blocked on two things only Billy can do

**What's built.** A new `/api/strava.js` Vercel serverless function (no dependencies,
uses Node's built-in `fetch`) handling three POST actions: `exchange` (OAuth code ->
tokens), `refresh` (expired access token -> new one), `activities` (server-side fetch
of recent Strava activities, so the browser never has to deal with Strava's CORS
story). The client secret lives only in Vercel env vars, never in this repo.

Client side, in `index.html` right after `persistRunLogs()`: a `STRAVA_CLIENT_ID`
constant (currently blank — see below), a `stravaToken` object persisted to
localStorage (`monk_strava_token_v1`), and the connect/OAuth-redirect/refresh/sync
functions. A "⚡ Connect Strava" button sits on the Run tab, right below the existing
race-setup bar, reusing the `run-setup-bar`/`run-setup-toggle` classes so no new CSS
was needed. Once connected it relabels to "⚡ Sync Strava" and doubles as a manual
sync button. `initStravaSync()` runs from the app's existing `DOMContentLoaded` init,
right after `initRunPlan()`.

**Auto-sync, not true push.** On every app open, if more than 20 minutes have passed
since the last sync, it silently pulls the last 35 days of Strava activities and
fills in any `runLogs` date that's still empty. A date you already logged manually
is never touched — your typed miles always win over Strava's. This is not a webhook;
nothing happens if the app is never opened. Garmin -> Strava -> here, but only once
you open the app. A true zero-touch version (a run shows up here within seconds of
finishing, app closed or not) needs a real backend data store behind a Strava webhook
subscription — a materially bigger build than this, and not started.

**Deliberately routed everything through POST.** `sw.js`'s fetch handler only
intercepts GET requests. Keeping every Strava call (exchange, refresh, activities) as
POST means none of it touches the service worker cache layer at all — no edits to
`sw.js`, no cache-version bump, nothing near the code this repo's own history flags as
having caused real data loss before.

**Test results.** `check.js`: both script blocks still parse. `compat.js` 86/0,
`onb.js` 71/0, `sets.js` 245/0 — all pre-existing suites, none touch Strava code, all
still green, confirming no regression. **No new automated coverage was written for
the Strava path itself** (network calls, can't be simulated in the Node harness the
way the rest of this repo's logic is), and **none of it has been seen in a browser or
tested against a real Strava account** — there was no client_id/secret to test with.

**Two things block actually shipping this, both need Billy, not code:**

1. **A Strava API app.** Go to strava.com/settings/api, create one (any name/website
   is fine, doesn't need to be public), set "Authorization Callback Domain" to
   `monk-mode-lemon.vercel.app`. That gives a Client ID and Client Secret. Paste the
   Client ID into `STRAVA_CLIENT_ID` in `index.html` (safe to commit, it's not
   secret). Add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` as environment
   variables in the Vercel project settings (Settings -> Environment Variables),
   secret only there, never in the repo.
2. **Push access.** This session's git remote is not authorized to push to
   `billmalone123/monk-mode` — everything above exists only in a local clone in this
   session. Either authorize this repo for the session so it can commit and push
   following this repo's normal convention, or take the modified files
   (`index.html`, new `api/strava.js`) and commit them directly.

**Scope note:** this only works on the Vercel deploy. GitHub Pages has no serverless
functions, so the Connect button will fail there (`STRAVA_CLIENT_ID` check catches the
unconfigured case, but even fully configured, `/api/strava` doesn't exist on Pages).
Given the live app is the Vercel URL, that's assumed fine — flag if not.

---

## Context
Single-file app, `index.html`, all HTML/CSS/JS inline in two `<script>` blocks, no
build step. Deployed to both GitHub Pages and Vercel from `origin/master`; only Vercel
supports serverless functions. `runLogs` (keyed `YYYY-MM-DD`, shape
`{ miles, secs, hr, feel }`, every field nullable but miles) already exists and is
read by the mileage/summary and adaptive-week-target code. Manual entry already
works via `runLogInputsHTML()` / `onRunLogEdit()` / `saveRunLog()`.

## Task
Garmin has no direct third-party API; it auto-pushes completed activities to Strava,
and Strava has a real developer API. So "connect Garmin" here means: OAuth into
Strava, then on each run's `runLogs` date, fill in miles / time / avg HR from
whatever Strava has, unless that date already has a manually-logged run.

## Verify before trusting this in production
1. Create the Strava app, fill in the env vars and `STRAVA_CLIENT_ID`, deploy.
2. Click Connect Strava, complete the real OAuth flow, confirm redirect back lands
   cleanly (no code/state left in the URL) and the button relabels to "Sync Strava."
3. Log a real run on Garmin (or manually create one in Strava for testing), wait for
   Strava to have it, reload the app, confirm it appears in `runLogs` for the right
   date with sane miles/time.
4. Manually log a run for today's date first, then trigger a sync where Strava also
   has an activity for today — confirm the manual entry is NOT overwritten.
5. Let the access token expire (or force it by editing `expires_at` in localStorage
   to the past) and confirm `ensureStravaAccessToken` transparently refreshes it.
6. Confirm none of this appears or errors on the GitHub Pages deploy.

## Last steps (once the two blockers above are cleared)
Bump the build stamp again if any further code changes are made. Commit, confirm a
clean `git log --oneline --graph`, push, confirm `git log --oneline origin/master -3`
shows it landed. Update this file's summary with real test results from an actual
Strava account, replacing "none of it has been seen in a browser" above.
