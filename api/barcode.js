// Vercel serverless function — nutrition lookup for the barcode scanner.
// No key needed for Open Food Facts, but the endpoint still costs Vercel
// invocations and this repo is public, so it's gated by the same shared
// passcode as api/meal.js (MEAL_PASSCODE). POST only for the same reason as
// the rest of this app's API routes: sw.js only intercepts GET, so nothing
// here ever touches the service worker's cache layer.
//
// { barcode: "012345678901" } -> { name, servingG, cal, protein, carbs, fat }
// Values are per 100g (Open Food Facts' own basis), with servingG: 100 —
// scaleItem() on the client rescales them if the user edits the grams.

var BARCODE_RE = /^\d{6,14}$/;

function num(v) {
  var n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? Math.round(n) : null;
}

//  Pulled out so the stub test can hit it directly, same pattern as
//  parseEstimate() in api/meal.js. Returns null when there isn't enough here
//  to log a meal from — caller turns that into the 404.
function parseProduct(data) {
  if (!data || data.status !== 1 || !data.product) return null;
  var n = data.product.nutriments || {};
  var cal = num(n['energy-kcal_100g']);
  //  Calories is the one field a barcode result is useless without; protein,
  //  carbs and fat are allowed to be individually absent (some products only
  //  carry partial nutriment data) and just come back as 0.
  if (cal === null) return null;
  var name = (data.product.product_name || data.product.generic_name || '').trim() || 'Scanned item';
  return {
    name: name, servingG: 100, cal: cal,
    protein: num(n.proteins_100g) || 0,
    carbs: num(n.carbohydrates_100g) || 0,
    fat: num(n.fat_100g) || 0
  };
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

  var barcode = typeof body.barcode === 'string' ? body.barcode.trim() : '';
  if (!barcode) {
    res.status(400).json({ error: 'Send a barcode' });
    return;
  }
  if (!BARCODE_RE.test(barcode)) {
    res.status(400).json({ error: 'That doesn\'t look like a barcode' });
    return;
  }

  try {
    var r = await fetch('https://world.openfoodfacts.org/api/v0/product/' + encodeURIComponent(barcode) + '.json');
    if (!r.ok) {
      res.status(r.status).json({ error: 'Product lookup failed' });
      return;
    }
    var data = await r.json();
    var parsed = parseProduct(data);
    if (!parsed) {
      res.status(404).json({ error: 'Product not found. Try typing it instead.' });
      return;
    }
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message || 'server error' });
  }
};
module.exports.parseProduct = parseProduct;
