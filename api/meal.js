// Vercel serverless function — the server-side half of the photo food log.
// Exists so ANTHROPIC_API_KEY never sits in index.html (this repo is public
// on GitHub — anything in the client-side script is visible to anyone).
// Set ANTHROPIC_API_KEY and MEAL_PASSCODE as env vars in the Vercel project
// settings, not in this file and not in index.html. MEAL_MODEL is optional.
//
// One action, POST, JSON in / JSON out:
//   { image, mediaType, note } -> { items, assumptions, confidence }
//   image is optional base64 (no data: prefix), note is optional text, at
//   least one of the two is required. The photo is never stored — it goes to
//   the model and is dropped with the request.
//
// Every call costs real API money and the repo is public, so the endpoint is
// gated by a shared passcode in the x-rtw-pass header. POST only for the same
// reason as api/strava.js: sw.js only intercepts GET, so nothing here ever
// touches the service worker's cache layer.

var MAX_IMAGE_B64 = 1.5 * 1024 * 1024;

var SYSTEM_PROMPT = [
  'You are estimating nutrition for a food log. Return ONLY JSON, no prose, no code fences.',
  'Shape: { "items": [ { "name": string, "grams": number, "cal": number, "protein": number, "carbs": number, "fat": number } ], "assumptions": [string], "confidence": "low"|"medium"|"high" }. Numbers are numbers, rounded to whole.',
  "If the user's note gives weights or quantities, those override anything estimated from the photo.",
  'Always account for likely hidden calories (cooking oil, butter, dressings, sauces) and list each one as its own item and in "assumptions", so the user can delete it if wrong.',
  'If the photo is not food, return { "items": [], "assumptions": ["No food found"], "confidence": "low" }.'
].join('\n');

function num(v) {
  var n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) && n > 0 ? Math.round(n) : 0;
}

//  Pulled out so the stub test can hit it directly. Returns null when the
//  text is not the shape we asked for.
function parseEstimate(text) {
  if (typeof text !== 'string') return null;
  var t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  var data;
  try { data = JSON.parse(t); } catch (e) { return null; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null;
  var items = data.items.filter(function(it) {
    return it && typeof it.name === 'string' && it.name.trim();
  }).map(function(it) {
    return { name: it.name.trim(), grams: num(it.grams), cal: num(it.cal),
             protein: num(it.protein), carbs: num(it.carbs), fat: num(it.fat) };
  });
  var assumptions = Array.isArray(data.assumptions)
    ? data.assumptions.filter(function(a) { return typeof a === 'string' && a.trim(); })
    : [];
  var confidence = ['low', 'medium', 'high'].indexOf(data.confidence) > -1 ? data.confidence : 'low';
  return { items: items, assumptions: assumptions, confidence: confidence };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  var pass = process.env.MEAL_PASSCODE;
  var given = req.headers && (req.headers['x-rtw-pass'] || req.headers['X-Rtw-Pass']);
  if (!pass || !given || given !== pass) {
    res.status(401).json({ error: 'Wrong or missing passcode' });
    return;
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var image = typeof body.image === 'string' ? body.image : '';
  var note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!image && !note) {
    res.status(400).json({ error: 'Send a photo or a note' });
    return;
  }
  if (image.length > MAX_IMAGE_B64) {
    res.status(413).json({ error: 'Photo too large' });
    return;
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on the server' });
    return;
  }

  var content = [];
  if (image) {
    var mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].indexOf(body.mediaType) > -1
      ? body.mediaType : 'image/jpeg';
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } });
  }
  content.push({ type: 'text', text: note ? 'Note: ' + note : 'Estimate this meal.' });

  try {
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.MEAL_MODEL || 'claude-sonnet-5',
        max_tokens: 1000,
        //  Adaptive thinking is on by default for this model and would spend
        //  from the same 1000 tokens the JSON needs; this is a lookup, not a
        //  reasoning task.
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: content }]
      })
    });
    var data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: (data && data.error && data.error.message) || 'estimate request failed' });
      return;
    }
    var text = (data.content || []).filter(function(b) { return b.type === 'text'; })
      .map(function(b) { return b.text; }).join('');
    var parsed = parseEstimate(text);
    if (!parsed) {
      res.status(502).json({ error: 'Could not read the estimate. Try again or add a note.' });
      return;
    }
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message || 'server error' });
  }
};
module.exports.parseEstimate = parseEstimate;
