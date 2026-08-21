// Vercel serverless function — the server-side half of the Strava integration.
// Exists so STRAVA_CLIENT_SECRET never sits in index.html (this repo is public
// on GitHub — anything in the client-side script is visible to anyone).
// Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET as env vars in the Vercel
// project settings, not in this file and not in index.html.
//
// Three actions, all POST, all JSON in / JSON out:
//   exchange   { code }                 -> token set, from the OAuth redirect
//   refresh    { refresh_token }        -> fresh token set, access token expired
//   activities { access_token, after }  -> recent Strava activities (fetched
//                                          server-side so the browser never
//                                          has to deal with Strava's CORS story)
//
// Everything here is POST, on purpose: the app's service worker (sw.js) only
// intercepts GET requests, so routing every Strava call through POST means
// none of this ever touches the SW cache layer. That layer has caused real
// data-loss bugs in this app before (see PROMPT_running_generator.md) — safer
// to stay out of its way entirely than to add cache-bypass rules to it.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var clientId = process.env.STRAVA_CLIENT_ID;
  var clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not set on the server' });
    return;
  }

  try {
    if (body.action === 'exchange') {
      if (!body.code) { res.status(400).json({ error: 'missing code' }); return; }
      var r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: body.code,
          grant_type: 'authorization_code'
        })
      });
      var data = await r.json();
      if (!r.ok) { res.status(r.status).json({ error: data.message || 'strava exchange failed' }); return; }
      res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        athlete_id: data.athlete && data.athlete.id
      });
      return;
    }

    if (body.action === 'refresh') {
      if (!body.refresh_token) { res.status(400).json({ error: 'missing refresh_token' }); return; }
      var r2 = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: body.refresh_token,
          grant_type: 'refresh_token'
        })
      });
      var data2 = await r2.json();
      if (!r2.ok) { res.status(r2.status).json({ error: data2.message || 'strava refresh failed' }); return; }
      res.status(200).json({
        access_token: data2.access_token,
        refresh_token: data2.refresh_token,
        expires_at: data2.expires_at
      });
      return;
    }

    if (body.action === 'activities') {
      if (!body.access_token) { res.status(400).json({ error: 'missing access_token' }); return; }
      var after = body.after || 0;
      var r3 = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?after=' + encodeURIComponent(after) + '&per_page=50',
        { headers: { Authorization: 'Bearer ' + body.access_token } }
      );
      var data3 = await r3.json();
      if (!r3.ok) { res.status(r3.status).json({ error: (data3 && data3.message) || 'strava activities fetch failed' }); return; }
      res.status(200).json({ activities: data3 });
      return;
    }

    res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'server error' });
  }
};
