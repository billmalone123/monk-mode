// Vercel serverless function — nutrition lookup for the barcode scanner.
// Tries Open Food Facts first (no key needed), then USDA FoodData Central
// (DEMO_KEY — fine for this volume; swap for a free personal key at
// api.data.gov if that ever gets rate limited) if OFF doesn't have it. The
// endpoint still costs Vercel invocations and this repo is public, so it's
// gated by the same shared passcode as api/meal.js (MEAL_PASSCODE). POST
// only for the same reason as the rest of this app's API routes: sw.js only
// intercepts GET, so nothing here ever touches the service worker's cache
// layer.
//
// { barcode: "012345678901" } -> { name, servingG, cal, protein, carbs, fat }
// Values are per 100g (both sources' own basis), with servingG: 100 —
// scaleItem() on the client rescales them if the user edits the grams.

var BARCODE_RE = /^\d{6,14}$/;
var USDA_API_KEY = 'DEMO_KEY';

function num(v) {
  var n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? Math.round(n) : null;
}

//  Pulled out so the stub test can hit it directly, same pattern as
//  parseEstimate() in api/meal.js. Returns null when there isn't enough here
//  to log a meal from — caller falls back to USDA, then to the 404.
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

//  USDA's foodNutrients is a flat list of { nutrientName, unitName, value }
//  rather than OFF's named fields — Energy appears twice (kJ and KCAL), so
//  the unit has to be checked too, not just the name.
function pickNutrient(foodNutrients, name, unit) {
  var hit = (foodNutrients || []).filter(function(n) {
    return n && n.nutrientName === name && (!unit || n.unitName === unit);
  })[0];
  return hit ? num(hit.value) : null;
}
function parseUsdaProduct(data) {
  if (!data || !Array.isArray(data.foods) || !data.foods.length) return null;
  var food = data.foods[0];
  var fn = food.foodNutrients || [];
  var cal = pickNutrient(fn, 'Energy', 'KCAL');
  if (cal === null) return null;
  var name = (food.description || '').trim() || 'Scanned item';
  return {
    name: name, servingG: 100, cal: cal,
    protein: pickNutrient(fn, 'Protein') || 0,
    carbs: pickNutrient(fn, 'Carbohydrate, by difference') || 0,
    fat: pickNutrient(fn, 'Total lipid (fat)') || 0
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
    var offParsed = null;
    try {
      var r = await fetch('https://world.openfoodfacts.org/api/v0/product/' + encodeURIComponent(barcode) + '.json');
      if (r.ok) offParsed = parseProduct(await r.json());
    } catch (e) { /* OFF unreachable — fall through to USDA below */ }
    if (offParsed) {
      res.status(200).json(offParsed);
      return;
    }

    //  OFF doesn't have it (not found, missing nutriments, or the request
    //  itself failed) — try USDA before giving up.
    var usdaParsed = null;
    try {
      var r2 = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?query='
        + encodeURIComponent(barcode) + '&api_key=' + USDA_API_KEY);
      if (r2.ok) usdaParsed = parseUsdaProduct(await r2.json());
    } catch (e) { /* USDA unreachable too — final error below */ }
    if (usdaParsed) {
      res.status(200).json(usdaParsed);
      return;
    }

    res.status(404).json({ error: 'Product not found. Try typing what you ate instead.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'server error' });
  }
};
module.exports.parseProduct = parseProduct;
module.exports.parseUsdaProduct = parseUsdaProduct;
