// Scratch harness for the food log, bodyweight trend and /api/meal.js. Boots
// index.html's real script blocks in the same DOM stub as sets.js (copied, not
// shared, same as every other harness here), then drives the pure helpers and
// the backup path directly.
//
// The load-bearing test is section 6: a user with none of the new keys in
// storage, exactly as every existing user's browser is today, must load and
// render the Food tab with no throw and no NaN anywhere.
//
// The last section loads api/meal.js with a fake fetch, so it never spends
// real API money and needs no key.
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync('index.html', 'utf8');

function mkClassList(el) {
  return {
    add: function (c) { if (!el._cls.includes(c)) el._cls.push(c); },
    remove: function (c) { el._cls = el._cls.filter(function (x) { return x !== c; }); },
    contains: function (c) { return el._cls.includes(c); },
    toggle: function (c, on) {
      var has = el._cls.includes(c), want = (on === undefined) ? !has : !!on;
      if (want && !has) el._cls.push(c);
      if (!want && has) this.remove(c);
      return want;
    }
  };
}
function mkEl(id, tag, cls, attrs) {
  var el = { id: id, tagName: (tag || 'div').toUpperCase(), textContent: '', placeholder: '',
             style: {}, dataset: {}, _cls: (cls || '').split(/\s+/).filter(Boolean),
             _attrs: attrs || {}, children: [], _val: '', _html: '' };
  Object.defineProperty(el, 'value', {
    get: function () { return el._val; },
    set: function (v) { el._val = (v == null) ? '' : String(v); }
  });
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._html; },
    set: function (v) { el._html = String(v == null ? '' : v); registerIds(el._html); }
  });
  el.classList = mkClassList(el);
  Object.defineProperty(el, 'className', {
    get: function () { return el._cls.join(' '); },
    set: function (v) { el._cls = String(v).split(/\s+/).filter(Boolean); }
  });
  el.appendChild = function (c) { el.children.push(c); return c; };
  el.setAttribute = function () {}; el.removeAttribute = function () {};
  el.getAttribute = function (k) { return el._attrs[k] == null ? null : el._attrs[k]; };
  el.addEventListener = function () {}; el.removeEventListener = function () {};
  el.focus = function () {}; el.blur = function () {}; el.click = function () {};
  el.getBoundingClientRect = function () { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; };
  el.querySelector = function () { return null; }; el.querySelectorAll = function () { return []; };
  el.closest = function () { return null; }; el.scrollIntoView = function () {};
  el.remove = function () {};
  return el;
}

var els = {};
// Elements addressed by attribute rather than id, keyed 'attr=value'.
var attrEls = {};
var ATTR_HOOKS = ['data-rows', 'data-warmups', 'data-targets', 'data-status', 'data-setslabel', 'data-setrow'];
function registerIds(markup) {
  var r = /<(\w+)([^>]*)>/g, mm;
  while ((mm = r.exec(markup))) {
    var tag = mm[1], attrs = mm[2];
    var c = attrs.match(/\bclass="([^"]*)"/);
    var cls = c ? c[1] : '';
    var idm = attrs.match(/\bid="([^"]+)"/);
    var el = null;
    if (idm && !els[idm[1]]) { el = mkEl(idm[1], tag, cls, {}); els[idm[1]] = el; }
    else if (idm) el = els[idm[1]];
    ATTR_HOOKS.forEach(function (a) {
      var am = attrs.match(new RegExp('\\b' + a + '="([^"]*)"'));
      if (!am) return;
      var key = a + '=' + am[1];
      if (attrEls[key]) return;
      attrEls[key] = el || mkEl('', tag, cls, {});
    });
  }
}
registerIds(html);
var selRe = /<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g, sm;
while ((sm = selRe.exec(html))) {
  var om = sm[2].match(/value="([^"]*)"/);
  if (els[sm[1]] && om) els[sm[1]].value = om[1];
}

function bySelector(sel) {
  var m = String(sel).match(/^\[([\w-]+)="([^"]*)"\]$/);
  if (m) return attrEls[m[1] + '=' + m[2]] || null;
  var rl = String(sel).match(/^\.run-log\[data-k="([^"]+)"\]$/);
  if (rl) return runLogRoot(rl[1]);
  return null;
}
// A stand-in for the .run-log container the real save path scopes its reads to.
// runLogInputsHTML now namespaces ids by surface (rl-<scope>-<field>-<date>),
// because the same date renders on the Run tab and the Calendar tab at once, so
// this resolves a field through whichever surface registered it.
function runLogRoot(k) {
  var known = ['run', 'cal', 'missed'];
  function field(f) {
    for (var i = 0; i < known.length; i++) {
      var e = els['rl-' + known[i] + '-' + f + '-' + k];
      if (e) return e;
    }
    return null;
  }
  return {
    dataset: { k: k },
    querySelector: function (sel) {
      var mf = String(sel).match(/\[data-f="([^"]+)"\]/);
      if (mf) return field(mf[1]);
      var mp = String(sel).match(/\[data-pace="([^"]+)"\]/);
      if (mp) {
        var id = 'pace-' + mp[1];
        if (!els[id]) els[id] = mkEl(id, 'div', 'run-log-pace');
        return els[id];
      }
      return null;
    },
    querySelectorAll: function () { return []; }
  };
}

var doc = {
  getElementById: function (id) { return els[id] || null; },
  querySelector: function (sel) { return bySelector(sel); },
  querySelectorAll: function (sel) {
    var rl = String(sel).match(/^\.run-log\[data-k="([^"]+)"\]$/);
    if (rl) return [runLogRoot(rl[1])];
    return [];
  },
  activeElement: null,
  createElement: function (t) { return mkEl('', t, ''); },
  createElementNS: function (ns, t) { return mkEl('', t, ''); },
  createTextNode: function () { return mkEl('', '#text', ''); },
  addEventListener: function () {}, removeEventListener: function () {},
  body: mkEl('body', 'body', ''), documentElement: mkEl('html', 'html', ''),
  readyState: 'complete', hidden: false
};

function mkStorage() {
  var s = {};
  return {
    _raw: s,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; },
    clear: function () { Object.keys(s).forEach(function (k) { delete s[k]; }); }
  };
}
var storage = mkStorage();

function NoopObserver() {}
NoopObserver.prototype.observe = function () {};
NoopObserver.prototype.unobserve = function () {};
NoopObserver.prototype.disconnect = function () {};

var ctx = {
  document: doc, localStorage: storage,
  navigator: { storage: {}, userAgent: 'node' },
  location: { href: 'http://localhost/', reload: function () {} },
  console: console,
  setTimeout: function () { return 0; }, clearTimeout: function () {},
  setInterval: function () { return 0; }, clearInterval: function () {},
  requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: function () {},
  IntersectionObserver: NoopObserver, MutationObserver: NoopObserver, ResizeObserver: NoopObserver,
  matchMedia: function () { return { matches: false, addListener: function () {}, addEventListener: function () {} }; },
  scrollTo: function () {}, alert: function () {}, confirm: function () { return true; },
  URL: { createObjectURL: function () { return 'blob:'; }, revokeObjectURL: function () {} },
  Blob: function () {}, FileReader: function () {},
  addEventListener: function () {}, removeEventListener: function () {},
  Date: Date, Math: Math, JSON: JSON, parseInt: parseInt, parseFloat: parseFloat,
  isNaN: isNaN, Object: Object, Array: Array, String: String, Number: Number,
  Promise: Promise, Error: Error, RegExp: RegExp, Map: Map, Set: Set
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

var blocks = [];
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, m;
while ((m = re.exec(html))) blocks.push(m[1]);
try { vm.runInContext(blocks[0], ctx, { filename: 'block1' }); vm.runInContext(blocks[1], ctx, { filename: "block2" }); vm.runInContext(blocks[2], ctx, { filename: "block3" }); }
catch (e) { console.log('load failed: ' + e.stack); process.exit(1); }

function ev(src) { return vm.runInContext(src, ctx); }

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  [' + detail + ']' : '')); }
}
function eq(name, got, want) { ok(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
function section(t) { console.log('\n' + t); }
function noThrow(name, fn) {
  try { var v = fn(); ok(name, true); return v; }
  catch (e) { fail++; console.log('  FAIL  ' + name + '  [threw: ' + e.message + ']'); return undefined; }
}
function sane(name, v) {
  ok(name, v !== undefined && v !== null && !(typeof v === 'number' && isNaN(v))
       && String(v).indexOf('undefined') === -1 && String(v).indexOf('NaN') === -1,
     JSON.stringify(v));
}

function boot() {
  ctx.sessions = ctx.loadSessions();
  ctx.loadLiftDays(); ctx.loadMaxes(); ctx.loadVariants(); ctx.loadAims();
  ctx.loadSetCounts(); ctx.loadWarmupLogs(); ctx.loadCustomExercises();
  ctx.updateMaxChips(); ctx.updateLiftDaysUI();
  ctx.renderWeekSelectors(); ctx.renderDaySections(); ctx.renderAllRowStates();
  ctx.renderProgressView(); ctx.initRunPlan(); ctx.renderWeekCalendar();
}
function reset() { storage.clear(); }

function day(offset) { return ctx.shiftDateKey(ctx.todayKey(), offset); }
function setFood(logs, targets, bw) {
  if (logs) storage.setItem('monk_food_logs_v1', JSON.stringify(logs));
  if (targets) storage.setItem('monk_food_targets_v1', JSON.stringify(targets));
  if (bw) storage.setItem('monk_bodyweight_v1', JSON.stringify(bw));
  ctx.loadFoodData();
}
function item(name, grams, cal, protein, carbs, fat) {
  return { name: name, grams: grams, cal: cal, protein: protein, carbs: carbs || 0, fat: fat || 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. scaleItem');
var chicken = item('Chicken', 200, 330, 62, 0, 7);
var half = ctx.scaleItem(chicken, 100);
eq('halves calories', half.cal, 165);
eq('halves protein', half.protein, 31);
eq('halves fat (rounded)', half.fat, 4);
eq('grams set to the new weight', half.grams, 100);
eq('original untouched', chicken.cal, 330);
var dbl = ctx.scaleItem(chicken, 400);
eq('doubles calories', dbl.cal, 660);
eq('doubles protein', dbl.protein, 124);
var zero = item('Oil', 0, 120, 0, 0, 14);
eq('grams 0: returned unchanged', ctx.scaleItem(zero, 50), zero);
var nul = item('Sauce', null, 80, 1, 6, 5);
eq('grams null: returned unchanged', ctx.scaleItem(nul, 50), nul);
eq('bad new weight: returned unchanged', ctx.scaleItem(chicken, 'abc'), chicken);
eq('scaling to 0 grams zeroes it', ctx.scaleItem(chicken, 0).cal, 0);

section('2. mealTotals and dayTotals');
reset(); boot(); setFood({});
var t0 = ctx.dayTotals(day(0));
eq('zero meals: calories 0', t0.cal, 0);
eq('zero meals: protein 0', t0.protein, 0);
setFood({}); ctx.foodLogs[day(0)] = [{ id: 'a', time: '08:00', name: 'Eggs', items: [item('Eggs', 150, 215, 19, 1, 15)], source: 'text' }];
eq('one meal: calories', ctx.dayTotals(day(0)).cal, 215);
eq('one meal: protein', ctx.dayTotals(day(0)).protein, 19);
ctx.foodLogs[day(0)].push(
  { id: 'b', time: '12:00', name: 'Bowl', items: [item('Rice', 250, 325, 7, 70, 1), item('Chicken', 200, 330, 62, 0, 7), item('Oil', 10, 88, 0, 0, 10)], source: 'photo' },
  { id: 'c', time: '18:00', name: 'Shake', items: [item('Whey', 60, 240, 48, 6, 3)], source: 'repeat' });
var tMany = ctx.dayTotals(day(0));
eq('many meals: calories', tMany.cal, 215 + 325 + 330 + 88 + 240);
eq('many meals: protein', tMany.protein, 19 + 7 + 62 + 0 + 48);
eq('many meals: carbs', tMany.carbs, 1 + 70 + 0 + 0 + 6);
eq('many meals: fat', tMany.fat, 15 + 1 + 7 + 10 + 3);
eq('another day is unaffected', ctx.dayTotals(day(-1)).cal, 0);
eq('an item with junk numbers counts as 0', ctx.mealTotals({ items: [{ name: 'x', cal: 'abc' }, null] }).cal, 0);
eq('a meal with no items is 0', ctx.mealTotals({}).protein, 0);

section('3. weekAvgWeight and weightTrend');
reset(); boot(); setFood(null, null, {});
eq('no data: null', ctx.weekAvgWeight(day(0)), null);
eq('no data: trend null', ctx.weightTrend(day(0)), null);
var bw = {}; bw[day(0)] = 186; bw[day(-3)] = 185; bw[day(-6)] = 184;   // gaps on the other four days
bw[day(-7)] = 190;   // just outside this week
setFood(null, null, bw);
eq('gaps: averages only logged days', ctx.weekAvgWeight(day(0)), 185);
eq('the 8th day back is not in this week', ctx.weekAvgWeight(day(-7)) !== null, true);
var bw2 = {}; bw2[day(0)] = 186.4; bw2[day(-1)] = 186.0; bw2[day(-8)] = 185.0; bw2[day(-10)] = 184.6;
setFood(null, null, bw2);
eq('rounded to one decimal', ctx.weekAvgWeight(day(0)), 186.2);
eq('trend: this week minus last week', ctx.weightTrend(day(0)), 1.4);
eq('trend defaults to today', ctx.weightTrend(), 1.4);
var bw3 = {}; bw3[day(0)] = 186;
setFood(null, null, bw3);
eq('trend with no last week: null', ctx.weightTrend(day(0)), null);

section('4. Backup round trip carries food, targets and bodyweight, never the passcode');
reset(); boot();
var logs = {}; logs[day(0)] = [{ id: 'x1', time: '09:00', name: 'Oats', items: [item('Oats', 80, 300, 10, 54, 6)], source: 'text', confidence: 'high' }];
var weights = {}; weights[day(0)] = 185.6;
setFood(logs, { cal: 3300, protein: 200, goalWeight: 200 }, weights);
storage.setItem('monk_meal_pass_v1', 'SECRET-PASS-123');
var exported = null;
ctx.Blob = function (parts) { exported = parts[0]; };
noThrow('exportData runs', function () { ctx.exportData(); });
var backup = JSON.parse(exported);
eq('backup carries the meal', backup.foodLogs[day(0)][0].name, 'Oats');
eq('backup carries targets', backup.foodTargets.protein, 200);
eq('backup carries bodyweight', backup.bodyweight[day(0)], 185.6);
eq('backup does NOT contain the passcode', exported.indexOf('SECRET-PASS-123'), -1);
eq('backup has no passcode key', /meal_pass|mealPass/.test(exported), false);
// Restore into a clean device through the real importData path.
reset(); boot(); ctx.loadFoodData();
eq('clean device has no food', Object.keys(ctx.foodLogs).length, 0);
ctx.FileReader = function () { var self = this; this.readAsText = function (f) { self.result = f._text; self.onload(); }; };
noThrow('importData runs', function () { ctx.importData({ files: [{ _text: exported }] }); });
ctx.loadFoodData();   // read back from storage, as a reload would
eq('restored meal survives a reload', ctx.foodLogs[day(0)][0].items[0].cal, 300);
eq('restored targets survive a reload', ctx.foodTargets.cal, 3300);
eq('restored bodyweight survives a reload', ctx.bodyweight[day(0)], 185.6);
eq('restore does not bring a passcode', storage.getItem('monk_meal_pass_v1'), null);
// An older backup file predates all three keys.
var older = JSON.stringify({ app: 'monk-mode', sessions: {}, maxes: {}, week: 0 });
noThrow('importing a pre food backup', function () { ctx.importData({ files: [{ _text: older }] }); });
eq('and it leaves the food log where it was', ctx.foodLogs[day(0)][0].name, 'Oats');

section('5. Review before save: nothing is stored until Save');
reset(); boot(); ctx.loadFoodData();
ctx.openFoodDraft({ id: 'd1', time: '12:30', name: 'Chicken + Rice', items: [item('Chicken', 200, 330, 62, 0, 7), item('Rice', 250, 325, 7, 70, 1)], source: 'photo', confidence: 'medium' }, ['Assumed 1 tbsp oil'], null);
eq('draft is not in storage', storage.getItem('monk_food_logs_v1'), null);
ctx.foodEditItem(0, 'grams', '2');     // typing 250 passes through 2 and 25
ctx.foodEditItem(0, 'grams', '25');
ctx.foodEditItem(0, 'grams', '250');
eq('grams scale from the base, not the keystrokes', ev('foodDraft.meal.items[0].cal'), 413);
ctx.foodEditItem(1, 'protein', '9');
eq('typed protein overrides', ev('foodDraft.meal.items[1].protein'), 9);
ctx.foodAddItem();
ctx.foodEditItem(2, 'name', 'Olive oil'); ctx.foodEditItem(2, 'cal', '120');
ctx.foodDeleteItem(1);
eq('delete removes the row', ev('foodDraft.meal.items.length'), 2);
ctx.saveFoodDraft();
var saved = JSON.parse(storage.getItem('monk_food_logs_v1'))[day(0)][0];
eq('save commits to the viewed day', saved.name, 'Chicken + Rice');
eq('saved items', saved.items.map(function (i) { return i.name; }).join(','), 'Chicken,Olive oil');
eq('no stored total on the meal', saved.cal === undefined && saved.total === undefined, true);
eq('day total reads the edited items', ctx.dayTotals(day(0)).cal, 413 + 120);
ctx.openFoodDraft(saved, [], saved.id);
ctx.discardFoodDraft();
eq('discard leaves storage as it was', JSON.parse(storage.getItem('monk_food_logs_v1'))[day(0)].length, 1);
ctx.renderFoodRepeat(); ctx.repeatFoodMeal(0);
eq('repeat adds a copy with no API call', ctx.foodLogs[day(0)].length, 2);
eq('repeat is marked as repeat', ctx.foodLogs[day(0)][1].source, 'repeat');
ok('repeat gets its own id', ctx.foodLogs[day(0)][1].id !== ctx.foodLogs[day(0)][0].id);

section('6. OLD DATA ONLY: none of the new keys in storage');
reset();
noThrow('boots with no food keys', function () { boot(); ctx.loadFoodData(); });
eq('foodLogs is an empty object', JSON.stringify(ctx.foodLogs), '{}');
noThrow('Food tab renders', function () { ctx.renderFoodTab(); });
['foodTotals', 'foodMeals', 'foodRepeat', 'foodWeight', 'foodDateLabel'].forEach(function (id) {
  var el = ctx.document.getElementById(id);
  var txt = el ? (el.innerHTML || el.textContent) : null;
  sane(id + ' has no undefined or NaN', txt);
});
var tt = ctx.dayTotals(ctx.todayKey());
sane('dayTotals calories', tt.cal); sane('dayTotals protein', tt.protein);
eq('goal weight defaults to 200', ctx.foodGoalWeight(), 200);
eq('post text for an empty day is empty', ctx.buildFoodPost(ctx.todayKey()), '');
noThrow('goTab("food") runs', function () { ctx.goTab('food'); });
ok('food is a main tab', ev('MAIN_TABS.indexOf("food") > -1'));
// Junk in storage must not break it either.
storage.setItem('monk_food_logs_v1', '[1,2'); storage.setItem('monk_bodyweight_v1', '"x"');
noThrow('corrupt keys load as empty', function () { ctx.loadFoodData(); ctx.renderFoodTab(); });
eq('corrupt bodyweight becomes {}', JSON.stringify(ctx.bodyweight), '{}');

section('7. Instagram post text');
reset(); boot();
var l7 = {}; l7[day(-2)] = [{ id: 'p', time: '08:00', name: 'Eggs', items: [item('Eggs', 150, 215, 19)], source: 'text' }];
l7[day(0)] = [{ id: 'q', time: '12:00', name: 'Big', items: [item('Steak', 400, 3240, 196)], source: 'photo' }];
var w7 = {}; w7[day(0)] = 186.4;
setFood(l7, { goalWeight: 200 }, w7);
ctx.sessions['flat-bb-bench'] = [{ d: day(0), week: 0, weight: 225, reps: 5 }, { d: day(0), ts: 1, weight: 235, reps: 2, quickLog: true }, { d: day(-7), week: 0, weight: 300, reps: 1 }];
var post = ctx.buildFoodPost(day(0));
ok('day N counts from the first food day', post.indexOf('Day 3. 185 to 200.') === 0, post);
ok('calories with a comma', post.indexOf('Calories: 3,240') > -1, post);
ok('protein', post.indexOf('Protein: 196g') > -1, post);
ok('weight is the 7 day avg', post.indexOf('Weight: 186.4 (7 day avg)') > -1, post);
ok('lifts: top set for that day only', post.indexOf('Lifts: Bench 235x2') > -1, post);
eq('no dashes anywhere', /[-‐-―]/.test(post), false);
var noLift = ctx.buildFoodPost(day(-2));
eq('a line with no data is left out', noLift.indexOf('Lifts'), -1);
eq('and so is weight with no weigh in that week', noLift.indexOf('Weight'), -1);

section('8. Secrets and GET requests');
var repoText = html + fs.readFileSync('sw.js', 'utf8');
eq('no Anthropic key pattern in index.html', /sk-ant-/.test(html), false);
eq('no x-api-key in index.html', /x-api-key/i.test(html), false);
eq('index.html never names ANTHROPIC_API_KEY', html.indexOf('ANTHROPIC_API_KEY'), -1);
eq('api/meal.js reads the key from env only', /apiKey = process\.env\.ANTHROPIC_API_KEY/.test(fs.readFileSync('api/meal.js', 'utf8')), true);
var start = html.indexOf('FOOD LOG — what was eaten'), end = html.indexOf('function fillFoodSettings');
var foodSrc = html.slice(start, end);
ok('found the food code', start > -1 && end > start);
var fetches = foodSrc.match(/fetch\(/g) || [];
eq('food code makes exactly one fetch', fetches.length, 1);
ok('and it is a POST to /api/meal', /fetch\('\/api\/meal', \{\s*method: 'POST'/.test(foodSrc));

// ─────────────────────────────────────────────────────────────────────────────
section('9. /api/meal.js with a fake fetch');
var mealPath = require('path').resolve('api/meal.js');
function runMeal(opts) {
  process.env.MEAL_PASSCODE = 'pw';
  if (opts.noKey) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = 'test-key';
  var calls = [];
  global.fetch = function (url, init) {
    calls.push({ url: url, init: init });
    return Promise.resolve({ ok: true, status: 200, json: function () {
      return Promise.resolve({ content: [{ type: 'text', text: opts.modelText }] });
    } });
  };
  delete require.cache[mealPath];
  var handler = require(mealPath);
  var out = { status: 0, body: null, calls: calls };
  var res = { status: function (s) { out.status = s; return res; }, json: function (b) { out.body = b; return res; } };
  var req = { method: opts.method || 'POST', headers: opts.headers || { 'x-rtw-pass': 'pw' }, body: opts.body };
  return handler(req, res).then(function () { return out; });
}
var good = JSON.stringify({ items: [{ name: 'Rice', grams: '250', cal: 325.4, protein: 7, carbs: 70, fat: 1 }, { name: '', cal: 5 }, { cal: 9 }], assumptions: ['1 tbsp oil'], confidence: 'medium' });
Promise.resolve()
  .then(function () { return runMeal({ headers: {}, body: { note: 'rice' } }); })
  .then(function (o) { eq('no passcode: 401', o.status, 401); eq('and no API call', o.calls.length, 0); })
  .then(function () { return runMeal({ headers: { 'x-rtw-pass': 'nope' }, body: { note: 'rice' } }); })
  .then(function (o) { eq('wrong passcode: 401', o.status, 401); })
  .then(function () { return runMeal({ method: 'GET', body: {} }); })
  .then(function (o) { eq('GET: 405', o.status, 405); })
  .then(function () { return runMeal({ body: {} }); })
  .then(function (o) { eq('no image or note: 400', o.status, 400); })
  .then(function () { return runMeal({ body: { image: new Array(1.5 * 1024 * 1024 + 2).join('A') } }); })
  .then(function (o) { eq('oversize image: 413', o.status, 413); eq('and no API call', o.calls.length, 0); })
  .then(function () { return runMeal({ noKey: true, body: { note: 'rice' } }); })
  .then(function (o) { eq('missing API key: 500', o.status, 500); ok('with a clear message', /ANTHROPIC_API_KEY/.test(o.body.error)); })
  .then(function () { return runMeal({ body: { note: '250g rice', image: 'QUJD', mediaType: 'image/jpeg' }, modelText: '```json\n' + good + '\n```' }); })
  .then(function (o) {
    eq('fenced JSON: 200', o.status, 200);
    eq('numbers coerced and rounded', o.body.items[0].cal, 325);
    eq('string grams coerced', o.body.items[0].grams, 250);
    eq('items with no name dropped', o.body.items.length, 1);
    eq('assumptions passed through', o.body.assumptions[0], '1 tbsp oil');
    eq('confidence passed through', o.body.confidence, 'medium');
    var sent = JSON.parse(o.calls[0].init.body);
    eq('calls the messages API', o.calls[0].url, 'https://api.anthropic.com/v1/messages');
    eq('key from env in the header', o.calls[0].init.headers['x-api-key'], 'test-key');
    eq('model defaults to claude-sonnet-5', sent.model, 'claude-sonnet-5');
    eq('max_tokens 1000', sent.max_tokens, 1000);
    eq('image block sent', sent.messages[0].content[0].type, 'image');
    ok('note sent', /250g rice/.test(sent.messages[0].content[1].text));
  })
  .then(function () { return runMeal({ body: { note: 'rice' }, modelText: good }); })
  .then(function (o) { eq('bare JSON also parses', o.status, 200); })
  .then(function () { return runMeal({ body: { note: 'rice' }, modelText: 'Sure! Here is your estimate: {oops' }); })
  .then(function (o) {
    eq('garbage JSON: 502', o.status, 502);
    eq('with the friendly message', o.body.error, 'Could not read the estimate. Try again or add a note.');
  })
  .then(function () {
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  })
  .catch(function (e) { console.log('meal stub threw: ' + e.stack); process.exit(1); });
