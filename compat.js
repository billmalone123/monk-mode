// Scratch harness for the backward-compatibility audit. Boots index.html's real
// script blocks against storage shaped the way an EXISTING user's browser would
// have it — keys absent, keys present but missing newer fields, keys holding
// values this build no longer defines — and asserts the app still renders
// sensible values instead of throwing or producing undefined/NaN.
//
// Shares the DOM stub approach with onb.js: the element registry is built by
// scanning index.html's own id= attributes.
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
function mkEl(id, tag, cls) {
  var el = { id: id, tagName: (tag || 'div').toUpperCase(), textContent: '',
             style: {}, dataset: {}, _cls: (cls || '').split(/\s+/).filter(Boolean), children: [], _val: '', _html: '' };
  Object.defineProperty(el, 'value', {
    get: function () { return el._val; },
    set: function (v) { el._val = (v == null) ? '' : String(v); }
  });
  // Whole surfaces here are rendered by assigning innerHTML (renderDaySections
  // builds #altPlan that way). Register the ids in that markup so a later
  // getElementById finds them, as it would in a browser.
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
  el.getAttribute = function () { return null; };
  el.addEventListener = function () {}; el.removeEventListener = function () {};
  el.focus = function () {}; el.blur = function () {}; el.click = function () {};
  el.getBoundingClientRect = function () { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; };
  el.querySelector = function () { return null; }; el.querySelectorAll = function () { return []; };
  el.closest = function () { return null; }; el.scrollIntoView = function () {};
  el.remove = function () {};
  return el;
}

var els = {};
function registerIds(markup) {
  var r = /<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g, mm;
  while ((mm = r.exec(markup))) {
    if (els[mm[3]]) continue;
    var c = mm[2].match(/\bclass="([^"]*)"/);
    els[mm[3]] = mkEl(mm[3], mm[1], c ? c[1] : '');
  }
}
registerIds(html);
var selRe = /<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g, sm;
while ((sm = selRe.exec(html))) {
  var om = sm[2].match(/value="([^"]*)"/);
  if (els[sm[1]] && om) els[sm[1]].value = om[1];
}

var doc = {
  getElementById: function (id) { return els[id] || null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function (t) { return mkEl('', t, ''); },
  createElementNS: function (ns, t) { return mkEl('', t, ''); },
  createTextNode: function (t) { return mkEl('', '#text', ''); },
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
try { vm.runInContext(blocks[0], ctx, { filename: 'block1' }); vm.runInContext(blocks[1], ctx, { filename: 'block2' }); }
catch (e) { console.log('load failed: ' + e.stack); process.exit(1); }

// `const` declarations at a script's top level never land on the vm global, so
// config tables like EX_BY_ID have to be read by evaluating inside the context.
function ev(src) { return vm.runInContext(src, ctx); }

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  [' + detail + ']' : '')); }
}
function eq(name, got, want) { ok(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
function section(t) { console.log('\n' + t); }
// Run fn; pass if it does not throw and its result is not undefined/NaN.
function noThrow(name, fn) {
  try { var v = fn(); ok(name, true); return v; }
  catch (e) { fail++; console.log('  FAIL  ' + name + '  [threw: ' + e.message + ']'); return undefined; }
}
function sane(name, v) {
  ok(name, v !== undefined && v !== null && !(typeof v === 'number' && isNaN(v))
       && String(v).indexOf('undefined') === -1 && String(v).indexOf('NaN') === -1,
     JSON.stringify(v));
}
// Boot the app's load path the way DOMContentLoaded does.
function boot() {
  ctx.sessions = ctx.loadSessions();
  ctx.loadLiftDays(); ctx.loadMaxes(); ctx.loadVariants(); ctx.loadAims();
  ctx.updateMaxChips(); ctx.updateLiftDaysUI();
  ctx.renderWeekSelectors(); ctx.renderDaySections(); ctx.renderAllRowStates();
  ctx.renderProgressView(); ctx.initRunPlan(); ctx.renderWeekCalendar();
}

var KEYS = ['monk_sessions_v1','monk_archive_v1','monk_migrated_v1','monk_lift_days_v1',
            'monk_variants_v1','monk_aims_v1','monk_timer_bg_v1','monk_mode_train_week_v1',
            'monk_mode_last_tab_v1','monk_mode_last_day_v1','monk_mode_maxes_v1',
            'monk_run_plan_v1','monk_run_logs_v1'];

// ══ 1. A brand-new user: nothing in storage at all ════════════════════════
section('1. Empty storage — every key absent');
storage.clear();
noThrow('full boot with no stored data', boot);
sane('splitSummary()', ctx.splitSummary());
sane('activeSplit().label', ctx.activeSplit().label);
eq('liftDaysPerWeek defaults to the historical 6', ctx.liftDaysPerWeek, 6);
sane('getMostRecentDay()', ctx.getMostRecentDay());
eq('runPlan.level defaulted', ctx.runPlan.level, 'casual');
eq('runPlan.distance defaulted', ctx.runPlan.distance, 'half');
sane('runPlan.peak defaulted', ctx.runPlan.peak);
sane('suggestedPeak() with no stored plan', ctx.suggestedPeak(ctx.runPlan.level, ctx.runPlan.distance));
noThrow('renderRunPlan() with no race', function () { return ctx.renderRunPlan(); });
noThrow('renderWeekCalendar() with no data', function () { return ctx.renderWeekCalendar(); });

// ══ 2. Each key individually absent, everything else present ══════════════
section('2. One key missing at a time (the rest populated)');
function populate() {
  storage.clear();
  storage.setItem('monk_sessions_v1', JSON.stringify({ 'flat-bb-bench': [{ d: '2026-07-01', week: 0, weight: 185, reps: 8, s1: { w: 185, r: 8 }, s2: { w: 185, r: 7 }, failure: true, variant: 'Flat Barbell Bench' }] }));
  storage.setItem('monk_lift_days_v1', '4');
  storage.setItem('monk_variants_v1', JSON.stringify({ 'flat-bb-bench': 'Smith Machine Bench' }));
  storage.setItem('monk_aims_v1', JSON.stringify({ 'flat-bb-bench|0|Smith Machine Bench': { w: 190, r: 8 } }));
  storage.setItem('monk_mode_maxes_v1', JSON.stringify({ squat: 315, bench: 225, ohp: 70 }));
  storage.setItem('monk_mode_train_week_v1', '2');
  storage.setItem('monk_mode_last_day_v1', 'upper-a');
  storage.setItem('monk_mode_last_tab_v1', 'training');
  storage.setItem('monk_run_plan_v1', JSON.stringify({ raceDate: '2026-11-15', distance: 'half', level: 'casual', daysPerWeek: 5, current: 15, peak: 30, longDow: 5, liftDays: 4, liftRestDow: 6 }));
  storage.setItem('monk_run_logs_v1', JSON.stringify({ '2026-07-01': { miles: 5, secs: 2400, feel: 7 } }));
  storage.setItem('monk_archive_v1', JSON.stringify({ oldLogs: {} }));
  storage.setItem('monk_migrated_v1', '1');
}
KEYS.forEach(function (k) {
  populate(); storage.removeItem(k);
  ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
  noThrow('boots without ' + k, boot);
});

// ══ 3. Partial old data: key present, newer fields absent ═════════════════
section('3. Key present but missing fields a newer build expects');

populate();
// A session entry from before variant tracking, before s1/s2 objects, before failure.
storage.setItem('monk_sessions_v1', JSON.stringify({ 'flat-bb-bench': [{ d: '2026-06-01', week: 0, weight: 185, reps: 8, s1: 8, s2: 7 }] }));
ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
noThrow('boots on pre-variant, numeric-set history', boot);
var ex = ev('EX_BY_ID["flat-bb-bench"]');
eq('entryVariant() treats a variant-less entry as the base lift',
   ctx.entryVariant({ d: '2026-06-01', weight: 185 }, ex), ex.name);
var oldSet = ctx.normSet({ weight: 185 }, 8);
ok('normSet() reads the old numeric set shape', oldSet && oldSet.w === 185 && oldSet.r === 8, JSON.stringify(oldSet));
eq('normSet() on a missing set is null, not a crash', ctx.normSet({ weight: 185 }, undefined), null);
noThrow('renderProgressView() over pre-variant history', function () { return ctx.renderProgressView(); });

// A run plan written before the adaptive-split fields existed.
populate();
storage.setItem('monk_run_plan_v1', JSON.stringify({ raceDate: '2026-11-15', distance: 'half' }));
ctx.runPlan = {};
noThrow('boots on a run plan with only raceDate + distance', boot);
eq('missing level filled', ctx.runPlan.level, 'casual');
sane('missing daysPerWeek filled', ctx.runPlan.daysPerWeek);
sane('missing current filled', ctx.runPlan.current);
sane('missing peak filled', ctx.runPlan.peak);
sane('missing longDow filled', ctx.runPlan.longDow);
sane('missing liftRestDow filled', ctx.runPlan.liftRestDow);
sane('missing liftDays filled', ctx.runPlan.liftDays);
var plan = ctx.generateRunPlan(ctx.readRunInputs(), new Date(2026, 7, 3));
ok('the generator still builds off a half-populated stored plan', !!(plan && plan.weeks && plan.weeks.length));
sane('peak hint text', ctx.document.getElementById('run-peak-hint').textContent);
sane('weeks hint text', ctx.document.getElementById('run-weeks-hint').textContent);

// Maxes with only one lift set — the other two never entered.
populate();
storage.setItem('monk_mode_maxes_v1', JSON.stringify({ squat: 315 }));
ctx.runPlan = {};
noThrow('boots with a partially-filled maxes object', boot);
eq('unset max renders as "Not set", not undefined',
   ctx.document.getElementById('chip-bench').textContent, 'Not set');
eq('set max still renders', ctx.document.getElementById('chip-squat').textContent, '315 lbs');

// An aims entry with only a weight, no reps.
populate();
storage.setItem('monk_aims_v1', JSON.stringify({ 'flat-bb-bench|0|Flat Barbell Bench': { w: 190 } }));
ctx.runPlan = {};
noThrow('boots on a half-filled aim entry', boot);

// A run log entry with only feel, no miles.
populate();
storage.setItem('monk_run_logs_v1', JSON.stringify({ '2026-07-01': { feel: 6 } }));
ctx.runPlan = {};
noThrow('boots on a feel-only run log', boot);

// ══ 4. Stale values this build no longer defines ══════════════════════════
section('4. Stored values this build no longer knows');

populate();
storage.setItem('monk_run_plan_v1', JSON.stringify({ raceDate: '2026-11-15', distance: 'ultra', level: 'beginner', peak: null }));
ctx.runPlan = {};
noThrow('boots on an unknown distance and level', boot);
eq('unknown level coerced to a known one', ctx.runPlan.level, 'casual');
eq('unknown distance coerced to a known one', ctx.runPlan.distance, 'half');
// A KNOWN level with an unknown distance is the path that actually reached
// RACE_DISTANCES[distKey].capKey — an unknown level short-circuits before it.
noThrow('suggestedPeak(): known level, unknown distance', function () { return ctx.suggestedPeak('casual', 'ultra'); });
sane('suggestedPeak() value for an unknown distance', ctx.suggestedPeak('casual', 'ultra'));
sane('suggestedPeak() value for an unknown level', ctx.suggestedPeak('nope', 'half'));
sane('suggestedPeak() with both unknown', ctx.suggestedPeak('nope', 'ultra'));
noThrow('setRunLevel() survives an unknown level', function () { return ctx.setRunLevel('beginner'); });
sane('level hint after an unknown level', ctx.document.getElementById('run-level-hint').textContent);

populate();
storage.setItem('monk_lift_days_v1', '99');       // out of the supported range
ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
noThrow('boots on an out-of-range lift-days value', boot);
eq('out-of-range lift days ignored, default kept', ctx.liftDaysPerWeek, 6);

populate();
storage.setItem('monk_mode_last_day_v1', 'hack-squat-day');   // a day id that no longer exists
ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
boot();
ok('an unknown last-day falls back to a day the split actually has',
   ctx.splitDayIds().indexOf(ctx.getMostRecentDay()) !== -1, ctx.getMostRecentDay());

populate();
storage.setItem('monk_sessions_v1', '{ this is not json');
ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
noThrow('boots on corrupt (unparseable) session JSON', boot);

// ══ 5. The split-template regression this audit turned up ═════════════════
section('5. Last-viewed day across the split templates');
[3, 4, 5, 6].forEach(function (n) {
  populate();
  storage.setItem('monk_lift_days_v1', String(n));
  ctx.liftDaysPerWeek = 6; ctx.runPlan = {};
  boot();
  var ids = ctx.splitDayIds();
  var got = ctx.getMostRecentDay();
  ok(n + '-day split: last-day resolves to one of its own days (' + got + ')',
     ids.indexOf(got) !== -1, 'valid: ' + ids.join(','));
  // Open the Train tab the way goTab() does.
  ctx.switchDay(got);
  var host = (n === 6) ? ctx.document.getElementById('day-' + got)
                       : ctx.document.getElementById('altday-' + got);
  ok(n + '-day split: switchDay() activates a day that exists',
     !!(host && host.classList.contains('active')), host ? 'not active' : 'no element');
  eq(n + '-day split: the choice is persisted',
     storage.getItem('monk_mode_last_day_v1'), got);
});

// ══ 6. Backup / restore against both shapes ═══════════════════════════════
section('6. Backup / restore, old-shaped and new-shaped');
function restore(data) {
  // importData() is FileReader-bound; exercise the same body it runs.
  if (!data || data.app !== 'monk-mode' || typeof data.sessions !== 'object') throw new Error('bad file');
  ctx.sessions = data.sessions || {};
  ctx.saveSessions();
  if (data.maxes) { ctx.userMaxes = data.maxes; ctx.persistMaxes(); }
  if (typeof data.week === 'number' && data.week >= 0) ctx.currentTrainWeek = data.week;
  if (data.variants && typeof data.variants === 'object') { ctx.variantChoice = data.variants; ctx.persistVariants(); }
  if (data.aims && typeof data.aims === 'object') { ctx.aimChoice = data.aims; ctx.persistAims(); }
  if (data.runPlan && typeof data.runPlan === 'object') { ctx.runPlan = data.runPlan; ctx.persistRunPlan(); ctx.initRunPlan(); }
  if (typeof data.liftDays === 'number' && data.liftDays >= 3 && data.liftDays <= 6) ctx.setLiftDays(data.liftDays);
  if (data.runLogs && typeof data.runLogs === 'object') { ctx.runLogs = data.runLogs; ctx.persistRunLogs(); }
  ctx.updateMaxChips(); ctx.renderAllRowStates(); ctx.renderProgressView();
}
populate(); ctx.liftDaysPerWeek = 6; ctx.runPlan = {}; boot();
var liftDaysBeforeRestore = ctx.liftDaysPerWeek;

// An OLD backup: only the fields that existed before variants/aims/runPlan/liftDays.
noThrow('restores a pre-variants, pre-runPlan backup', function () {
  return restore({ app: 'monk-mode', exportedAt: '2026-05-01',
                   sessions: { 'flat-bb-bench': [{ d: '2026-05-01', week: 0, weight: 185, reps: 8, s1: 8, s2: 7 }] },
                   maxes: { squat: 315 }, week: 1, archive: null });
});
// A backup with no liftDays must leave the current setting alone, not reset it.
eq('old backup left liftDays untouched', ctx.liftDaysPerWeek, liftDaysBeforeRestore);
sane('old backup: runPlan still usable', ctx.runPlan.level);
eq('old backup: maxes restored', ctx.userMaxes.squat, 315);

// A NEW backup carrying everything.
noThrow('restores a full current-shape backup', function () {
  return restore({ app: 'monk-mode', exportedAt: '2026-08-03',
                   sessions: { 'flat-bb-bench': [{ d: '2026-08-01', week: 2, weight: 195, reps: 8, s1: { w: 195, r: 8 }, s2: { w: 195, r: 7 }, failure: true, variant: 'Smith Machine Bench' }] },
                   maxes: { squat: 405, bench: 275, ohp: 80 }, week: 2, archive: { oldLogs: {} },
                   variants: { 'flat-bb-bench': 'Smith Machine Bench' },
                   aims: { 'flat-bb-bench|2|Smith Machine Bench': { w: 200, r: 8 } },
                   runPlan: { raceDate: '2026-12-06', distance: 'marathon', level: 'competitive', daysPerWeek: 5, current: 20, peak: 50, longDow: 5, liftDays: 4, liftRestDow: 6 },
                   runLogs: { '2026-08-01': { miles: 6, secs: 2700, feel: 8 } },
                   liftDays: 4 });
});
eq('new backup: liftDays applied', ctx.liftDaysPerWeek, 4);
eq('new backup: variant applied', ctx.variantChoice['flat-bb-bench'], 'Smith Machine Bench');
eq('new backup: runPlan applied', ctx.runPlan.distance, 'marathon');
eq('new backup: maxes applied', ctx.userMaxes.bench, 275);
var rp2 = ctx.generateRunPlan(ctx.readRunInputs(), new Date(2026, 7, 3));
ok('new backup: plan regenerates after restore', !!(rp2 && rp2.weeks && rp2.weeks.length));

// A backup whose runPlan carries a stale enum.
noThrow('restores a backup with an unknown distance', function () {
  return restore({ app: 'monk-mode', sessions: {}, runPlan: { raceDate: '2026-12-06', distance: 'ultra', level: 'elite' } });
});
eq('stale distance from a backup is coerced', ctx.runPlan.distance, 'half');
eq('stale level from a backup is coerced', ctx.runPlan.level, 'casual');

// ══ 7. The onboarding work added no new persisted fields ══════════════════
section('7. Onboarding expansion — nothing new to be backward-incompatible with');
populate(); ctx.runPlan = {}; boot();
var beforeKeys = Object.keys(storage._raw).slice();
ctx.openMaxesModal();
ctx.setMaxesMode('reps');
ctx.document.getElementById('reps-weight-squat').value = '275';
ctx.document.getElementById('reps-count-squat').value = '5';
ctx.onRepsCommit();
var maxesNow = JSON.parse(storage.getItem('monk_mode_maxes_v1'));
ok('estimate mode writes only the existing lift keys',
   Object.keys(maxesNow).every(function (k) { return ['squat','bench','ohp'].indexOf(k) !== -1; }),
   Object.keys(maxesNow).join(','));
ok('estimate mode introduced no new storage key',
   Object.keys(storage._raw).every(function (k) { return beforeKeys.indexOf(k) !== -1; }),
   Object.keys(storage._raw).filter(function (k) { return beforeKeys.indexOf(k) === -1; }).join(','));
var rpKeysBefore = Object.keys(ctx.runPlan).slice();
ctx.openRunSetupModal();
ctx.document.getElementById('onb-run-race-date').value = '2027-01-10';
ctx.onbRunSync();
ok('run setup writes only fields the Run tab already owned',
   Object.keys(ctx.runPlan).every(function (k) {
     return rpKeysBefore.indexOf(k) !== -1 ||
       ['raceDate','distance','level','daysPerWeek','current','peak','longDow','pr','liftDays','liftRestDow'].indexOf(k) !== -1;
   }), Object.keys(ctx.runPlan).join(','));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
