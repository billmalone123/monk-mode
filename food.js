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

section('2b. Carb and fat targets: default, override, bars, and Settings');
reset(); boot(); setFood({}, {});
eq('carb target defaults to 350 when unset', ctx.foodCarbTarget(), 350);
eq('fat target defaults to 90 when unset', ctx.foodFatTarget(), 90);
setFood({}, { carbTarget: 275, fatTarget: 70 });
eq('an explicit carb target overrides the default', ctx.foodCarbTarget(), 275);
eq('an explicit fat target overrides the default', ctx.foodFatTarget(), 70);

// renderFoodTotals: carbs/fat bars show even before cal/protein are set,
// since they always have a target — unlike cal/protein, which show the
// "set your targets" prompt instead of a bar until the user picks one.
reset(); boot(); setFood({});
ctx.renderFoodTotals();
var totalsHtml = ctx.document.getElementById('foodTotals')._html || '';
ok('cal/protein show the setup prompt before targets are set', /Set your daily calories and protein to start/.test(totalsHtml));
ok('but Carbs already renders as a bar, not a bare hint', /<span>Carbs<\/span>/.test(totalsHtml));
ok('and so does Fat', /<span>Fat<\/span>/.test(totalsHtml));
ok('the old bare "Carbs Xg · Fat Yg" hint line is gone', !/Carbs \d+g/.test(totalsHtml));

// Once cal/protein are set, all four bars render together, same style.
setFood({}, { cal: 3300, protein: 200 });
ctx.foodLogs[day(0)] = [{ id: 'z', time: '08:00', name: 'Meal', items: [item('X', 100, 500, 40, 60, 20)], source: 'text' }];
ctx.renderFoodTotals();
totalsHtml = ctx.document.getElementById('foodTotals')._html || '';
['Calories', 'Protein', 'Carbs', 'Fat'].forEach(function (label) {
  ok(label + ' bar is present', new RegExp('<span>' + label + '</span>').test(totalsHtml));
});
ok('carbs bar shows eaten vs target', totalsHtml.indexOf('60g / 350g') > -1, totalsHtml);
ok('fat bar shows eaten vs target', totalsHtml.indexOf('20g / 90g') > -1, totalsHtml);

// saveFoodTargetsFrom / Settings round trip.
reset(); boot(); ctx.loadFoodData();
ctx.document.getElementById('set-food-cal').value = '3300';
ctx.document.getElementById('set-food-protein').value = '200';
ctx.document.getElementById('set-food-carb').value = '400';
ctx.document.getElementById('set-food-fat').value = '110';
ctx.document.getElementById('set-food-goal').value = '';
ctx.saveFoodTargetsFrom('set-food-cal', 'set-food-protein', 'set-food-goal', 'set-food-carb', 'set-food-fat');
eq('carb target saved', ctx.foodTargets.carbTarget, 400);
eq('fat target saved', ctx.foodTargets.fatTarget, 110);
ctx.loadFoodData();   // reload from storage, as a refresh would
eq('carb target survives a reload', ctx.foodTargets.carbTarget, 400);
eq('fat target survives a reload', ctx.foodTargets.fatTarget, 110);
ctx.fillFoodSettings();
eq('Settings shows the saved carb target', ctx.document.getElementById('set-food-carb').value, '400');
eq('Settings shows the saved fat target', ctx.document.getElementById('set-food-fat').value, '110');
// Clearing the field deletes the key, same as Goal lbs already does — the
// default (350/90) applies again rather than the field showing 0.
ctx.document.getElementById('set-food-carb').value = '';
ctx.document.getElementById('set-food-fat').value = '';
ctx.saveFoodTargetsFrom('set-food-cal', 'set-food-protein', 'set-food-goal', 'set-food-carb', 'set-food-fat');
eq('an emptied carb field deletes the override', 'carbTarget' in ctx.foodTargets, false);
eq('and the default takes over again', ctx.foodCarbTarget(), 350);
ctx.fillFoodSettings();
eq('Settings shows it blank, not 0', ctx.document.getElementById('set-food-carb').value, '');

section('2c. Bar color follows percent of target, live, via inline style');
eq('0%: red', ctx.foodBarColor(0).fill, '#E05252');
eq('32%: still red', ctx.foodBarColor(32).fill, '#E05252');
eq('33%: yellow', ctx.foodBarColor(33).fill, '#E0B352');
eq('79%: still yellow', ctx.foodBarColor(79).fill, '#E0B352');
eq('80%: green', ctx.foodBarColor(80).fill, '#52C27A');
eq('99%: still green', ctx.foodBarColor(99).fill, '#52C27A');
eq('100%: bright green', ctx.foodBarColor(100).fill, '#27C46A');
eq('bright green carries a glow flag', ctx.foodBarColor(100).glow, true);
eq('the three lower bands have no glow', ctx.foodBarColor(0).glow || ctx.foodBarColor(33).glow || ctx.foodBarColor(80).glow, false);
// foodBar()'s own pct is capped at 100 for the bar width before it reaches
// here, but the color function is robust to a raw over-100 value too —
// over target must read as "done", never fall back to red.
eq('over target reads as done, not a warning', ctx.foodBarColor(150).fill, '#27C46A');

reset(); boot(); setFood({}, { cal: 1000, protein: 100 });
function barFillStyle(html, label) {
  var m = new RegExp('<span>' + label + '</span><span class="run-field-val">[^<]*</span></div><div class="food-bar-track"><div class="food-bar-fill" style="([^"]*)"').exec(html);
  return m ? m[1] : null;
}
ctx.foodLogs[day(0)] = [{ id: 'a', time: '08:00', name: 'Meal', items: [item('X', 100, 200, 20)], source: 'text' }];   // 20% of 1000/100
ctx.renderFoodTotals();
var html0 = ctx.document.getElementById('foodTotals')._html;
ok('20%: red inline, no class swap needed', /background:#E05252/.test(barFillStyle(html0, 'Calories')));
eq('width matches the real percent', barFillStyle(html0, 'Calories'), 'width:20%;background:#E05252');

ctx.foodLogs[day(0)] = [{ id: 'a', time: '08:00', name: 'Meal', items: [item('X', 100, 850, 85)], source: 'text' }];   // 85%
ctx.renderFoodTotals();
var html85 = ctx.document.getElementById('foodTotals')._html;
ok('85%: green, live after re-logging the same day', /background:#52C27A/.test(barFillStyle(html85, 'Calories')));

ctx.foodLogs[day(0)] = [{ id: 'a', time: '08:00', name: 'Meal', items: [item('X', 100, 1200, 130)], source: 'text' }];   // over target
ctx.renderFoodTotals();
var htmlOver = ctx.document.getElementById('foodTotals')._html;
ok('over target: bright green with a glow, not red', /background:#27C46A;box-shadow:0 0 6px 1px #27C46A/.test(barFillStyle(htmlOver, 'Calories')));
ok('protein over target is bright green too, same rule for all four bars', /background:#27C46A/.test(barFillStyle(htmlOver, 'Protein')));

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
l7[day(0)] = [{ id: 'q', time: '12:00', name: 'Big', items: [item('Steak', 400, 3240, 196, 12, 220)], source: 'photo' }];
var w7 = {}; w7[day(0)] = 186.4;
setFood(l7, { goalWeight: 200 }, w7);
ctx.sessions['flat-bb-bench'] = [{ d: day(0), week: 0, weight: 225, reps: 5 }, { d: day(0), ts: 1, weight: 235, reps: 2, quickLog: true }, { d: day(-7), week: 0, weight: 300, reps: 1 }];
var post = ctx.buildFoodPost(day(0));
ok('day N counts from the first food day', post.indexOf('Day 3. 185 to 200.') === 0, post);
ok('calories with a comma', post.indexOf('Calories: 3,240') > -1, post);
ok('protein', post.indexOf('Protein: 196g') > -1, post);
ok('carbs', post.indexOf('Carbs: 12g') > -1, post);
ok('fat', post.indexOf('Fat: 220g') > -1, post);
eq('macro line order is Calories, Protein, Carbs, Fat',
   post.indexOf('Calories:') < post.indexOf('Protein:') && post.indexOf('Protein:') < post.indexOf('Carbs:') && post.indexOf('Carbs:') < post.indexOf('Fat:'), true);
ok('weight is the 7 day avg', post.indexOf('Weight: 186.4 (7 day avg)') > -1, post);
ok('lifts: top set for that day only', post.indexOf('Lifts: Bench 235x2') > -1, post);
eq('no dashes anywhere', /[-‐-―]/.test(post), false);
var noLift = ctx.buildFoodPost(day(-2));
eq('a line with no data is left out', noLift.indexOf('Lifts'), -1);
eq('and so is weight with no weigh in that week', noLift.indexOf('Weight'), -1);
var emptyDay = ctx.buildFoodPost(day(-1));
eq('a day with nothing logged has no macro lines either', emptyDay.indexOf('Carbs'), -1);
eq('nor calories/protein', emptyDay.indexOf('Calories'), -1);

section('7b. Photo input: library, paste, busy state, passcode in Settings');
ok('Snap meal still opens the camera', /id="foodPhotoInput" accept="image\/\*" capture="environment"/.test(html));
ok('Choose photo has no capture, so iOS offers the library', /id="foodLibInput" accept="image\/\*" style/.test(html));
ok('the note field takes a pasted photo', /id="foodNote"[^>]*onpaste="onFoodPaste\(event\)"/.test(html));
var got = [], realEst = ctx.estimateFoodImage;
ctx.estimateFoodImage = function (f) { got.push(f); };
var prevented = false;
var png = { type: 'image/png', name: 'x.png' };
ctx.onFoodPaste({ clipboardData: { files: [], items: [{ kind: 'file', getAsFile: function () { return png; } }] }, preventDefault: function () { prevented = true; } });
eq('a pasted image is estimated', got[0], png);
eq('and does not also paste into the field', prevented, true);
got = []; prevented = false;
ctx.onFoodPaste({ clipboardData: { files: [], items: [{ kind: 'string' }] }, preventDefault: function () { prevented = true; } });
eq('pasted text is left alone', got.length + (prevented ? 1 : 0), 0);
ctx.onFoodPaste({ clipboardData: { files: [{ type: 'application/pdf' }], items: [] }, preventDefault: function () {} });
eq('a pasted non image is ignored', got.length, 0);
ctx.estimateFoodImage = realEst;
// The old busy state set the label's textContent, which deletes the nested
// file input in a real browser. Only the span may change now.
noThrow('busy on', function () { ctx.setFoodBusy(true); });
eq('the span reads Estimating...', ctx.document.getElementById('foodSnapLabel').textContent, 'Estimating...');
eq('the Snap label itself is not rewritten', ctx.document.getElementById('foodSnapBtn').textContent, '');
eq('both photo inputs are disabled', ctx.document.getElementById('foodPhotoInput').disabled && ctx.document.getElementById('foodLibInput').disabled, true);
ctx.setFoodBusy(false);
eq('and back to Snap meal', ctx.document.getElementById('foodSnapLabel').textContent, 'Snap meal');
ctx.saveMealPass('  pw-123 ');
eq('passcode from Settings is saved trimmed', storage.getItem('monk_meal_pass_v1'), 'pw-123');
ctx.fillFoodSettings();
eq('and shown when Settings opens', ctx.document.getElementById('set-food-pass').value, 'pw-123');
ok('so the first estimate does not prompt', ctx.getMealPass(false) === 'pw-123');
ctx.resetMealPass();
eq('reset clears it', storage.getItem('monk_meal_pass_v1'), null);
eq('and clears the field', ctx.document.getElementById('set-food-pass').value, '');

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
//  One to /api/meal (photo/text estimates), one to /api/barcode (scanner) —
//  no others; both must be POST so sw.js's GET-only cache layer never sees them.
eq('food code makes exactly the two known fetches', fetches.length, 2);
ok('and one is a POST to /api/meal', /fetch\('\/api\/meal', \{\s*method: 'POST'/.test(foodSrc));
ok('and the other is a POST to /api/barcode', /fetch\('\/api\/barcode', \{\s*method: 'POST'/.test(foodSrc));
eq('nothing in the food code path uses any other method', (foodSrc.match(/method: '(GET|PUT|DELETE|PATCH)'/g) || []).length, 0);

// ─────────────────────────────────────────────────────────────────────────────
function flush(n) {
  var p = Promise.resolve();
  for (var i = 0; i < n; i++) p = p.then(function () { return Promise.resolve(); });
  return p;
}

section('7c. Type it: a real submit button, Estimating state, and the meal name');
ok('the input has its own clearly labeled submit button, not Type it/Submit/Send',
   /id="foodTypeBtn" onclick="onFoodTypeIt\(\)">Estimate</.test(html));
eq('the old ambiguous label is gone', /id="foodTypeBtn"[^>]*>Type it</.test(html), false);
ok('it sits right after the note input, not up with the photo buttons',
   html.indexOf('id="foodNote"') < html.indexOf('id="foodTypeBtn"')
   && html.indexOf('id="foodTypeBtn"') - html.indexOf('id="foodNote"') < 400);

reset(); boot(); ctx.loadFoodData();
storage.setItem('monk_meal_pass_v1', 'pw');
var calls = [];
ctx.fetch = function (url, init) {
  calls.push({ url: url, body: JSON.parse(init.body) });
  return Promise.resolve({ status: 200, ok: true, json: function () {
    return Promise.resolve({ items: [{ name: 'Whey shake', grams: 300, cal: 240, protein: 48, carbs: 6, fat: 3 }], assumptions: [], confidence: 'medium' });
  } });
};
ctx.document.getElementById('foodNote').value = '2 scoops whey protein with water';
ctx.onFoodTypeIt();
eq('button reads Estimating... while the request is out', ctx.document.getElementById('foodTypeBtn').textContent, 'Estimating...');
eq('and is disabled', ctx.document.getElementById('foodTypeBtn').disabled, true);
var p7c = flush(8).then(function () {
  eq('exactly one request goes out', calls.length, 1);
  eq('no image key is sent for a text-only submission', 'image' in calls[0].body, false);
  eq('the note is sent', calls[0].body.note, '2 scoops whey protein with water');
  eq('button is back to Estimate once done', ctx.document.getElementById('foodTypeBtn').textContent, 'Estimate');
  ok('a draft with editable rows opened', !!ctx.foodDraft && Array.isArray(ctx.foodDraft.meal.items));
  eq('the row came from the estimate', ctx.foodDraft.meal.items[0].name, 'Whey shake');
  eq('Meal Name pre-populates from what was typed, not the item name',
     ctx.foodDraft.meal.name, '2 scoops whey protein with water');
  noThrow('renderFoodDraft does not throw for a text-only submission', function () { ctx.renderFoodDraft(); });
  var host = ctx.document.getElementById('foodDraft');
  ok('the review screen is showing', host.style.display !== 'none');
  ok('with a Meal name field carrying the typed text',
     (host._html || '').indexOf('value="2 scoops whey protein with water"') > -1);
  ok('save and discard controls are present', /Save meal/.test(host._html) && /Discard/.test(host._html));
  ctx.discardFoodDraft();

  // A note long enough to need truncation.
  var long = 'Grilled chicken breast, about eight ounces, with two cups of steamed broccoli and a cup of brown rice, olive oil drizzled on top';
  ctx.document.getElementById('foodNote').value = long;
  ctx.fetch = function (url, init) {
    return Promise.resolve({ status: 200, ok: true, json: function () {
      return Promise.resolve({ items: [{ name: 'Chicken breast', grams: 220, cal: 360, protein: 62 }, { name: 'Rice', grams: 200, cal: 260, protein: 5 }], assumptions: [], confidence: 'medium' });
    } });
  };
  ctx.onFoodTypeIt();
  return flush(8).then(function () {
    ok('a long note is truncated to fit', ctx.foodDraft.meal.name.length <= 60);
    ok('truncation ends with an ellipsis, not a chopped word', /\u2026$/.test(ctx.foodDraft.meal.name));
    ok('and still reads as the start of what was typed', long.indexOf(ctx.foodDraft.meal.name.replace(/\u2026$/, '').trim()) === 0);
    ctx.discardFoodDraft();
  });
});

section('9b. Scan barcode: markup, camera lifecycle, and the review screen');
ok('three capture buttons: Snap meal, Scan barcode, Choose photo',
   /id="foodSnapBtn"/.test(html) && /id="foodBarcodeBtn" onclick="onScanBarcode\(\)">Scan barcode</.test(html) && /id="foodLibBtn"/.test(html));
ok('the viewfinder is hidden by default in the markup', /id="barcodeWrap" class="food-barcode-wrap" style="display:none"/.test(html));
ok('it has a live video element and a Cancel button', /id="barcodeVideo"/.test(html) && /onclick="cancelBarcodeScan\(\)">Cancel</.test(html));
ok('the native detector only asks for EAN-13/UPC-A/UPC-E', /formats: \['ean_13', 'upc_a', 'upc_e'\]/.test(html));
ok('quagga, when needed, loads only the pinned build from cdnjs',
   html.indexOf("'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'") > -1);
eq('no other external script is loaded for scanning', (html.match(/createElement\('script'\)/g) || []).length, 1);

var p9b = p7c.then(function () {
  // ── Happy path: a code is found, the lookup succeeds, the camera is
  // already stopped by the time the review screen for it opens. ──────────
  reset(); boot(); ctx.loadFoodData();
  storage.setItem('monk_meal_pass_v1', 'pw');
  var streams = [];
  function makeStream() {
    var track = { stopped: false, stop: function () { track.stopped = true; } };
    var s = { getTracks: function () { return [track]; } };
    streams.push({ stream: s, track: track });
    return s;
  }
  var getUserMediaCalls = 0;
  ctx.navigator.mediaDevices = { getUserMedia: function () { getUserMediaCalls++; return Promise.resolve(makeStream()); } };
  var video = ctx.document.getElementById('barcodeVideo');
  video.play = function () { return Promise.resolve(); };
  video.pause = function () {};
  ctx.BarcodeDetector = function () { this.detect = function () { return Promise.resolve([{ rawValue: '049000028911' }]); }; };
  var apiCalls = [];
  ctx.fetch = function (url, init) {
    apiCalls.push({ url: url, body: JSON.parse(init.body) });
    return Promise.resolve({ status: 200, ok: true, json: function () {
      return Promise.resolve({ name: 'Peanut Butter', servingG: 100, cal: 588, protein: 25, carbs: 20, fat: 50 });
    } });
  };
  ctx.onScanBarcode();
  eq('the viewfinder opens right away, before the camera prompt even resolves',
     ctx.document.getElementById('barcodeWrap').style.display, '');
  return flush(10).then(function () {
    eq('exactly one lookup call goes out', apiCalls.length, 1);
    ok('it is a POST to /api/barcode', /fetch\('\/api\/barcode', \{\s*method: 'POST'/.test(foodSrc));
    eq('the scanned code is sent', apiCalls[0].body.barcode, '049000028911');
    ok('the camera is stopped once a code is found, before the review screen opens',
       streams[0].track.stopped);
    eq('the viewfinder is hidden again', ctx.document.getElementById('barcodeWrap').style.display, 'none');
    ok('a draft opened with one prefilled item', !!ctx.foodDraft && ctx.foodDraft.meal.items.length === 1);
    eq('item name from the label', ctx.foodDraft.meal.items[0].name, 'Peanut Butter');
    eq('item calories from the label', ctx.foodDraft.meal.items[0].cal, 588);
    eq('serving grams default to 100', ctx.foodDraft.meal.items[0].grams, 100);
    eq('source is barcode', ctx.foodDraft.meal.source, 'barcode');
    eq('no confidence field — this came off the label, not a guess', ctx.foodDraft.meal.confidence, undefined);
    noThrow('renderFoodDraft does not throw', function () { ctx.renderFoodDraft(); });
    var host = ctx.document.getElementById('foodDraft');
    eq('and the review screen renders with no Confidence line', /Confidence:/.test(host._html || ''), false);
    ok('save and discard controls are present, same as any other estimate',
       /Save meal/.test(host._html) && /Discard/.test(host._html));
    // The prefilled row still goes through the same scaleItem path as any
    // other item — editing grams must rescale it, not just overwrite them.
    ctx.foodEditItem(0, 'grams', '50');
    eq('grams edit rescales calories (588 at 100g -> 294 at 50g)', ctx.foodDraft.meal.items[0].cal, 294);
    ctx.discardFoodDraft();

    // ── Not found: the error shows inline, and the viewfinder reopens on
    // its own so the user can try again without a second tap. ──────────────
    reset(); boot(); ctx.loadFoodData();
    storage.setItem('monk_meal_pass_v1', 'pw');
    streams = [];
    getUserMediaCalls = 0;
    ctx.navigator.mediaDevices = { getUserMedia: function () { getUserMediaCalls++; return Promise.resolve(makeStream()); } };
    var video2 = ctx.document.getElementById('barcodeVideo');
    video2.play = function () { return Promise.resolve(); };
    video2.pause = function () {};
    var detectCalls = 0;
    //  Only the very first detect() across this whole scan finds a code —
    //  the reopened scanner's own detect() calls come back empty, so the
    //  test settles instead of cycling forever through 404s.
    ctx.BarcodeDetector = function () { this.detect = function () {
      detectCalls++;
      return Promise.resolve(detectCalls === 1 ? [{ rawValue: '000000000000' }] : []);
    }; };
    ctx.fetch = function () {
      return Promise.resolve({ status: 404, ok: false, json: function () {
        return Promise.resolve({ error: 'Product not found. Try typing it instead.' });
      } });
    };
    ctx.onScanBarcode();
    return flush(14).then(function () {
      eq('the camera reopens once on its own after a 404', getUserMediaCalls, 2);
      ok('the first stream (that found the bad code) is stopped', streams[0].track.stopped);
      ok('the reopened stream is still live, waiting for another attempt', !streams[1].track.stopped);
      eq('the not-found message shows inline', ctx.document.getElementById('foodAddMsg').textContent,
         'Product not found. Try typing it instead.');
      eq('no draft opens for a failed lookup', ctx.foodDraft, null);

      // ── Cancel and tab-change both stop a still-open camera. ────────────
      ctx.cancelBarcodeScan();
      ok('Cancel stops the reopened stream too', streams[1].track.stopped);
      eq('and hides the viewfinder', ctx.document.getElementById('barcodeWrap').style.display, 'none');

      streams = []; getUserMediaCalls = 0; detectCalls = -99;   // detect() always returns [] from here on
      ctx.onScanBarcode();
      return flush(6).then(function () {
        ok('camera is open before leaving the Food tab', getUserMediaCalls === 1 && !streams[0].track.stopped);
        noThrow('switching tabs away from Food does not throw', function () { ctx.goTab('training'); });
        ok('leaving the Food tab stops a still-running camera', streams[0].track.stopped);
        ctx.goTab('food');
      });
    });
  });
});

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
//  Chained after p7c (not a fresh Promise.resolve()) so section 7c's async
//  assertions are guaranteed to finish, and this file's final tally/exit
//  covers both sections, before this one's own process.exit runs.
p9b
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
    section('10. /api/barcode.js with a fake fetch');
    var barcodePath = require('path').resolve('api/barcode.js');
    function runBarcode(opts) {
      process.env.MEAL_PASSCODE = 'pw';
      var calls = [];
      global.fetch = function (url, init) {
        calls.push({ url: url, init: init });
        return Promise.resolve({
          ok: opts.offStatus == null || opts.offStatus < 400, status: opts.offStatus || 200,
          json: function () { return Promise.resolve(opts.offData); }
        });
      };
      delete require.cache[barcodePath];
      var handler = require(barcodePath);
      var out = { status: 0, body: null, calls: calls };
      var res = { status: function (s) { out.status = s; return res; }, json: function (b) { out.body = b; return res; } };
      var req = { method: opts.method || 'POST', headers: opts.headers || { 'x-rtw-pass': 'pw' }, body: opts.body };
      return handler(req, res).then(function () { return out; });
    }
    var validOFF = {
      status: 1,
      product: { product_name: 'Peanut Butter', nutriments: { 'energy-kcal_100g': 588, proteins_100g: 25, carbohydrates_100g: 20, fat_100g: 50 } }
    };
    return Promise.resolve()
      .then(function () { return runBarcode({ headers: {}, body: { barcode: '012345678901' } }); })
      .then(function (o) { eq('no passcode: 401', o.status, 401); eq('and no lookup call', o.calls.length, 0); })
      .then(function () { return runBarcode({ method: 'GET', body: {} }); })
      .then(function (o) { eq('GET: 405', o.status, 405); })
      .then(function () { return runBarcode({ body: {} }); })
      .then(function (o) { eq('no barcode: 400', o.status, 400); })
      .then(function () { return runBarcode({ body: { barcode: 'abc' } }); })
      .then(function (o) { eq('non numeric barcode: 400', o.status, 400); })
      .then(function () { return runBarcode({ body: { barcode: '012345678901' }, offData: validOFF }); })
      .then(function (o) {
        eq('valid product: 200', o.status, 200);
        eq('parsed output shape', JSON.stringify(o.body), JSON.stringify({ name: 'Peanut Butter', servingG: 100, cal: 588, protein: 25, carbs: 20, fat: 50 }));
        eq('calls Open Food Facts with the barcode in the path', o.calls[0].url, 'https://world.openfoodfacts.org/api/v0/product/012345678901.json');
        eq('no init/body on a GET to Open Food Facts', o.calls[0].init, undefined);
      })
      .then(function () { return runBarcode({ body: { barcode: '000000000000' }, offData: { status: 0 } }); })
      .then(function (o) {
        eq('product not found: 404', o.status, 404);
        eq('with the friendly message', o.body.error, 'Product not found. Try typing it instead.');
      })
      .then(function () { return runBarcode({ body: { barcode: '000000000001' }, offData: { status: 1, product: { product_name: 'Mystery Item', nutriments: {} } } }); })
      .then(function (o) {
        eq('found but no usable nutriments: 404 too', o.status, 404);
        eq('same friendly message', o.body.error, 'Product not found. Try typing it instead.');
      })
      .then(function () { return runBarcode({ body: { barcode: '000000000002' }, offData: { status: 1, product: { nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5 } } } }); })
      .then(function (o) {
        eq('a product missing product_name falls back to a name', o.body.name, 'Scanned item');
        eq('carbs/fat individually absent default to 0, not a 404', o.body.carbs, 0);
        eq('protein present is kept', o.body.protein, 5);
      });
  })
  .then(function () {
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  })
  .catch(function (e) { console.log('meal stub threw: ' + e.stack); process.exit(1); });
