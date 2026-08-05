// Scratch harness for per-exercise working set counts (2 or 3) and warm-up set
// logging. Boots index.html's real script blocks in a DOM stub.
//
// Shares the stub approach with onb.js/compat.js, with one addition: this one
// resolves [data-*="..."] selectors, because the row-level renders
// (renderWarmupsAndTargets, renderRowStatus, applySetCountUI) reach their
// targets by attribute rather than by id, and stubbing those to null would mean
// asserting against code that never ran.
//
// The load-bearing test here is section 2: an entry holding ONLY s1/s2, exactly
// as every existing user's storage already holds it, must render everywhere with
// no undefined/NaN and no throw. That is the explicit regression check.
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
  return null;
}

var doc = {
  getElementById: function (id) { return els[id] || null; },
  querySelector: function (sel) { return bySelector(sel); },
  querySelectorAll: function () { return []; },
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
try { vm.runInContext(blocks[0], ctx, { filename: 'block1' }); vm.runInContext(blocks[1], ctx, { filename: 'block2' }); }
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
// Type into a row's inputs the way the real handlers see them.
function typeSet(exId, slot, w, r) {
  var wEl = ctx.document.getElementById(slot + 'w-' + exId);
  var rEl = ctx.document.getElementById(slot + 'r-' + exId);
  if (wEl) { wEl.value = w == null ? '' : w; wEl.dataset.dirty = 1; }
  if (rEl) rEl.value = r == null ? '' : r;
}
function typeWarmup(exId, i, w, r) {
  var wEl = ctx.document.getElementById('wu' + i + 'w-' + exId);
  var rEl = ctx.document.getElementById('wu' + i + 'r-' + exId);
  if (wEl) wEl.value = w == null ? '' : w;
  if (rEl) rEl.value = r == null ? '' : r;
}
// An exercise on the generated (shorter-split) path, whose row ids the stub
// registers because renderDaySections builds #altPlan via innerHTML.
function anExercise() { return ev('splitDayExercises(splitDayIds()[0])[0].id'); }

// ─────────────────────────────────────────────────────────────────────────────
section('1. Default is two sets — nothing changes for anyone who does not opt in');
reset();
storage.setItem('monk_lift_days_v1', '4');
boot();
var EX = anExercise();
eq('no stored count reads as 2', ctx.setsFor(EX), 2);
eq('slots are s1/s2 only', ctx.setSlots(EX).join(','), 's1,s2');
eq('no set-count key written just by loading', storage.getItem('monk_setcounts_v1'), null);
eq('row label says 2 sets', ev('liftRowHTML(EX_BY_ID["' + EX + '"])').indexOf('>2 sets ×') > -1, true);
ok('row still renders a third slot in the DOM (hidden, not absent)',
   ev('liftRowHTML(EX_BY_ID["' + EX + '"])').indexOf('id="s3w-' + EX + '"') > -1);
ok('third slot is not marked active',
   ev('liftRowHTML(EX_BY_ID["' + EX + '"])').indexOf('class="lift-row sets-3"') === -1);

section('2. OLD DATA ONLY — an entry with s1/s2 and no s3, as already stored');
reset();
storage.setItem('monk_lift_days_v1', '4');
boot();
EX = anExercise();
// Exactly the shape this app has been writing: no s3 key at all, no warmup store.
var oldEntry = { d: '2026-01-05', week: 0, weight: 185, reps: 5,
                 s1: { w: 185, r: 5 }, s2: { w: 185, r: 4 }, failure: true,
                 variant: ev('activeVariant(EX_BY_ID["' + EX + '"])') };
var oldSessions = {}; oldSessions[EX] = [oldEntry];
storage.setItem('monk_sessions_v1', JSON.stringify(oldSessions));
boot();
ok('old entry has no s3 key at all', !('s3' in ctx.sessions[EX][0]));
noThrow('renderLiftRowState on old data', function () { ctx.renderLiftRowState(ev('EX_BY_ID["' + EX + '"]')); });
noThrow('renderRowStatus on old data', function () { ctx.renderRowStatus(ev('EX_BY_ID["' + EX + '"]')); });
noThrow('renderProgressView on old data', function () { ctx.renderProgressView(); });
noThrow('renderWeekCalendar on old data', function () { ctx.renderWeekCalendar(); });
noThrow('renderRing on old data', function () { if (ctx.renderRing) ctx.renderRing(); });
var statusEl = attrEls['data-status=' + EX];
sane('status chip has no undefined/NaN', statusEl ? statusEl.innerHTML : '');
ok('status chip shows exactly the two sets it has',
   statusEl && statusEl.innerHTML.indexOf('185 × 5 · 185 × 4') > -1, statusEl && statusEl.innerHTML);
eq('normSet on an absent s3 is null', ctx.normSet(oldEntry, oldEntry.s3), null);
eq('setsFor on old data still defaults to 2', ctx.setsFor(EX), 2);
sane('set 1 weight box restored from old entry', ctx.document.getElementById('s1w-' + EX).value);
sane('set 2 weight box restored from old entry', ctx.document.getElementById('s2w-' + EX).value);
eq('third set box left empty by old data', ctx.document.getElementById('s3r-' + EX).value, '');
eq('no warm-up store invented for old data', storage.getItem('monk_warmup_logs_v1'), null);

section('3. setsFor validates rather than trusts');
reset(); boot(); EX = anExercise();
ctx.setCounts[EX] = 4;   // stale / hand-edited
eq('a 4 coerces down to 2', ctx.setsFor(EX), 2);
ctx.setCounts[EX] = '3'; // string from JSON
eq('a string "3" reads as 3', ctx.setsFor(EX), 3);
ctx.setCounts[EX] = null;
eq('null reads as 2', ctx.setsFor(EX), 2);
delete ctx.setCounts[EX];

section('4. Three sets — logging all three, and the top set across all three');
reset();
storage.setItem('monk_lift_days_v1', '4');
boot();
EX = anExercise();
ctx.setExerciseSets(EX, 3);
eq('switched to 3', ctx.setsFor(EX), 3);
eq('slots now include s3', ctx.setSlots(EX).join(','), 's1,s2,s3');
eq('choice persisted', JSON.parse(storage.getItem('monk_setcounts_v1'))[EX], 3);
// Third set is the heaviest, so it must win the best-set comparison.
typeSet(EX, 's1', 135, 8);
typeSet(EX, 's2', 155, 6);
typeSet(EX, 's3', 175, 3);
ctx.autoSaveExercise(EX, false);
var e3 = ctx.sessions[EX][0];
eq('s3 stored', JSON.stringify(e3.s3), JSON.stringify({ w: 175, r: 3 }));
eq('best-set weight came from set 3', e3.weight, 175);
eq('best-set reps came from set 3', e3.reps, 3);
// And when the top set is set 1, three-set logging must not change that.
typeSet(EX, 's1', 200, 5); typeSet(EX, 's2', 150, 5); typeSet(EX, 's3', 150, 5);
ctx.autoSaveExercise(EX, false);
eq('best set still picks set 1 when it is heaviest', ctx.sessions[EX][0].weight, 200);
// Equal weight, more reps later, is a better set.
typeSet(EX, 's1', 180, 5); typeSet(EX, 's2', 180, 6); typeSet(EX, 's3', 180, 9);
ctx.autoSaveExercise(EX, false);
eq('ties on weight break to the higher reps', ctx.sessions[EX][0].reps, 9);

section('5. Three sets survive a reload');
var persisted = storage.getItem('monk_sessions_v1');
ok('sessions written to storage', !!persisted);
ok('s3 present in what was written', persisted.indexOf('"s3"') > -1);
boot();   // fresh load off storage, as a page refresh would
eq('set count survived reload', ctx.setsFor(EX), 3);
eq('s3 survived reload', JSON.stringify(ctx.sessions[EX][0].s3), JSON.stringify({ w: 180, r: 9 }));
eq('third set box repopulated', ctx.document.getElementById('s3r-' + EX).value, '9');
var st5 = attrEls['data-status=' + EX];
ok('status chip shows all three sets', st5 && (st5.innerHTML.match(/180 ×/g) || []).length === 3,
   st5 && st5.innerHTML);

section('6. Switching back down to 2 leaves no orphaned third set');
ctx.setExerciseSets(EX, 2);
eq('back to 2', ctx.setsFor(EX), 2);
var e6 = ctx.sessions[EX][0];
ok('s3 dropped from the stored entry', !('s3' in e6), JSON.stringify(e6));
eq('best set recomputed across the remaining two', e6.reps, 6);
var st6 = attrEls['data-status=' + EX];
ok('status chip shows two sets, not three',
   st6 && (st6.innerHTML.match(/180 ×/g) || []).length === 2, st6 && st6.innerHTML);
eq('set-count key cleaned up rather than storing a default',
   JSON.parse(storage.getItem('monk_setcounts_v1'))[EX], undefined);
noThrow('render after switching down', function () { ctx.renderAllRowStates(); ctx.renderProgressView(); });

section('7. Warm-up logging is stored, and is not working volume');
reset();
storage.setItem('monk_lift_days_v1', '4');
boot();
EX = anExercise();
typeWarmup(EX, 0, 95, 5);
typeWarmup(EX, 1, 135, 3);
ctx.commitWarmups(EX);
var wuRaw = storage.getItem('monk_warmup_logs_v1');
ok('warm-up store written', !!wuRaw);
var wuKey = ev('warmupKey(EX_BY_ID["' + EX + '"])');
eq('first warm-up set stored', JSON.stringify(JSON.parse(wuRaw)[wuKey][0]), JSON.stringify({ w: 95, r: 5 }));
eq('second warm-up set stored', JSON.stringify(JSON.parse(wuRaw)[wuKey][1]), JSON.stringify({ w: 135, r: 3 }));
eq('unused third slot is null', JSON.parse(wuRaw)[wuKey][2], null);
// The whole point: none of this may register as logged work.
eq('no session entry created by warm-ups', storage.getItem('monk_sessions_v1'), null);
eq('sessions object still empty', Object.keys(ctx.sessions).length, 0);
eq('warm-ups did not touch the aims store', storage.getItem('monk_aims_v1'), null);
var progHTML = (els['progressView'] || { innerHTML: '' }).innerHTML;
ok('progress view shows no logged work from warm-ups alone', progHTML.indexOf('95') === -1, progHTML.slice(0, 160));
noThrow('ring renders with warm-ups but no working sets', function () { if (ctx.renderRing) ctx.renderRing(); });

section('8. Warm-up log survives a reload, and clears cleanly');
boot();
eq('warm-up weight repopulated', ctx.document.getElementById('wu0w-' + EX).value, '95');
eq('warm-up reps repopulated', ctx.document.getElementById('wu0r-' + EX).value, '5');
eq('storedWarmups returns the stored pair',
   JSON.stringify(ctx.storedWarmups(ev('EX_BY_ID["' + EX + '"]'))[1]), JSON.stringify({ w: 135, r: 3 }));
typeWarmup(EX, 0, '', ''); typeWarmup(EX, 1, '', '');
ctx.commitWarmups(EX);
eq('cleared back to empty drops the key rather than storing nulls',
   JSON.parse(storage.getItem('monk_warmup_logs_v1'))[wuKey], undefined);
// A warm-up with reps but no weight is still a warm-up.
typeWarmup(EX, 0, '', 10);
ctx.commitWarmups(EX);
eq('reps-only warm-up is kept, weight null',
   JSON.stringify(JSON.parse(storage.getItem('monk_warmup_logs_v1'))[wuKey][0]),
   JSON.stringify({ w: null, r: 10 }));

section('9. Both render paths get three sets — same generator, not a copy');
reset(); boot();
// The 6-day path fills its hand-written .lift-rows hosts from liftRowHTML, and
// the shorter splits build #altPlan from the same function. One generator, so
// three-set capability cannot land on one path and miss the other.
var sixDayEx = ev('EXERCISES.filter(function(e){return e.day==="chest";})[0].id');
var sixHTML = ev('liftRowHTML(EX_BY_ID["' + sixDayEx + '"])');
ok('6-day path row has a third set slot', sixHTML.indexOf('id="s3w-' + sixDayEx + '"') > -1);
ok('6-day path row has the set-count control', sixHTML.indexOf('id="sc3-' + sixDayEx + '"') > -1);
ok('6-day path row has warm-up logging', sixHTML.indexOf('id="wu0w-' + sixDayEx + '"') > -1);
storage.setItem('monk_lift_days_v1', '4'); boot();
var altEx = anExercise();
var altHTML = ev('liftRowHTML(EX_BY_ID["' + altEx + '"])');
ok('shorter-split row has a third set slot', altHTML.indexOf('id="s3w-' + altEx + '"') > -1);
ok('shorter-split row has the set-count control', altHTML.indexOf('id="sc3-' + altEx + '"') > -1);
ok('shorter-split row has warm-up logging', altHTML.indexOf('id="wu0w-' + altEx + '"') > -1);
eq('the 6-day host is filled by the same generator',
   /host\.innerHTML[\s\S]{0,160}liftRowHTML/.test(html), true);

section('10. Backup carries the new stores, and restore tolerates their absence');
reset();
storage.setItem('monk_lift_days_v1', '4');
boot(); EX = anExercise();
ctx.setExerciseSets(EX, 3);
typeWarmup(EX, 0, 95, 5); ctx.commitWarmups(EX);
var exported = null;
ctx.Blob = function (parts) { exported = parts[0]; };
noThrow('exportData runs', function () { ctx.exportData(); });
var backup = JSON.parse(exported);
eq('backup carries set counts', backup.setCounts[EX], 3);
ok('backup carries warm-up logs', !!backup.warmupLogs[ev('warmupKey(EX_BY_ID["' + EX + '"])')]);
// An older backup file predates both keys entirely.
reset(); boot();
var oldBackup = { app: 'monk-mode', sessions: {}, maxes: { squat: 300 }, week: 0 };
noThrow('restoring a backup with neither new key', function () {
  ctx.sessions = oldBackup.sessions || {};
  if (oldBackup.setCounts && typeof oldBackup.setCounts === 'object') ctx.setCounts = oldBackup.setCounts;
  if (oldBackup.warmupLogs && typeof oldBackup.warmupLogs === 'object') ctx.warmupLogs = oldBackup.warmupLogs;
  ctx.renderAllRowStates(); ctx.renderProgressView();
});
eq('older backup leaves everything at the 2-set default', ctx.setsFor(anExercise()), 2);

section('11. Rep-range explanations — one per exercise, rendered on both paths');
var allEx = ev('EXERCISES.map(function(e){return {id:e.id,tag:e.tag,range:e.repRange.join("-"),why:e.repWhy};})');
eq('42 exercises', allEx.length, 42);
eq('every exercise has a repWhy', allEx.filter(function (e) { return !e.why || !String(e.why).trim(); }).length, 0);
var whys = allEx.map(function (e) { return e.why; });
eq('no two exercises share the same sentence', new Set(whys).size, 42);
var wc = whys.map(function (w) { return w.trim().split(/\s+/).length; });
ok('all sentences are one short line (8-16 words)',
   Math.min.apply(null, wc) >= 8 && Math.max.apply(null, wc) <= 16,
   'min ' + Math.min.apply(null, wc) + ', max ' + Math.max.apply(null, wc));
// The isolation tag spans 6-10 through 15-20, so a tag-level template would show
// up as one sentence reused across wildly different ranges. Check the widest case.
var iso = allEx.filter(function (e) { return e.tag === 'isolation'; });
eq('isolation really does span the widest spread', new Set(iso.map(function (e) { return e.range; })).size > 4, true);
eq('isolation sentences are all distinct', new Set(iso.map(function (e) { return e.why; })).size, iso.length);
// Spot checks: the reasoning has to match the movement, not the category.
function whyOf(id) { return (allEx.filter(function (e) { return e.id === id; })[0] || {}).why || ''; }
ok('ab wheel explains low reps at bodyweight', /bodyweight|form breaks/i.test(whyOf('ab-wheel')), whyOf('ab-wheel'));
ok('seated calf names the soleus', /soleus/i.test(whyOf('seated-calf')), whyOf('seated-calf'));
ok('face pulls name the cuff', /cuff|rotator/i.test(whyOf('face-pulls')), whyOf('face-pulls'));
ok('bench explains heavy low reps', /strength|CNS/i.test(whyOf('flat-bb-bench')), whyOf('flat-bb-bench'));
ok('nordic curl explains its eccentric', /eccentric/i.test(whyOf('nordic-curl')), whyOf('nordic-curl'));
// Rendered, not just present in the config — and on both paths, one generator.
storage.clear(); boot();
var sixWhy = ev('liftRowHTML(EX_BY_ID["flat-bb-bench"])');
ok('6-day path renders the caption', sixWhy.indexOf('class="lift-rep-why"') > -1);
ok('6-day path renders that exercise\'s own sentence', sixWhy.indexOf(whyOf('flat-bb-bench')) > -1);
storage.setItem('monk_lift_days_v1', '4'); boot();
var altId = anExercise();
var altWhy = ev('liftRowHTML(EX_BY_ID["' + altId + '"])');
ok('shorter-split path renders the caption', altWhy.indexOf('class="lift-rep-why"') > -1);
ok('shorter-split path renders that exercise\'s own sentence', altWhy.indexOf(whyOf(altId)) > -1);
ok('caption sits under the rep count, above the variant chips',
   altWhy.indexOf('lift-sets-reps') < altWhy.indexOf('lift-rep-why'));
ok('caption is not inside .lift-note',
   altWhy.indexOf('lift-rep-why') < altWhy.indexOf('class="lift-note"'));

section('12. Logging a run for a date outside the plan\'s rolling window');
storage.clear(); boot();
// A date from a week that has fully elapsed. generateRunPlan() rebuilds from
// today, so this date is in no plan.weeks cell anywhere — that is the point.
var past = new Date(); past.setDate(past.getDate() - 26); past.setHours(0, 0, 0, 0);
var pk = ctx.dateKeyOfRun(past);
eq('the date really is outside the rolling plan', (function () {
  try {
    var plan = ctx.generateRunPlan(ctx.readRunInputs(), ctx.startOfToday());
    if (!plan || !plan.weeks) return true;      // no plan at all is still "outside"
    var hit = false;
    plan.weeks.forEach(function (w) {
      w.cells.forEach(function (c) { if (ctx.dateKeyOfRun(c.date) === pk && !c.before && !c.after) hit = true; });
    });
    return !hit;
  } catch (e) { return true; }
})(), true);
// Render the same markup the in-plan cells use, then drive the same handlers.
var fieldsHost = els['runMissedFields'];
fieldsHost.innerHTML = ctx.runLogInputsHTML({ date: past });
ok('missed-run block renders the shared run-log markup', fieldsHost.innerHTML.indexOf('rl-mi-' + pk) > -1);
ok('it wires the shared commit handler, not a new one',
   fieldsHost.innerHTML.indexOf('onRunLogCommit(this.dataset.k)') > -1);
els['rl-mi-' + pk].value = '6.2';
els['rl-tm-' + pk].value = '52:00';
els['rl-fl-' + pk].value = '7';
ctx.onRunLogCommit(pk);
eq('saved into runLogs under the plain date key', ctx.runLogs[pk] ? ctx.runLogs[pk].miles : null, 6.2);
eq('time parsed through the shared clock parser', ctx.runLogs[pk].secs, 3120);
eq('feel saved', ctx.runLogs[pk].feel, 7);
ok('persisted to storage', (storage.getItem('monk_run_logs_v1') || '').indexOf(pk) > -1);
// Reload from storage the way a refresh would.
ctx.loadRunLogs();
eq('survives a reload', ctx.runLogs[pk] ? ctx.runLogs[pk].miles : null, 6.2);
// Summary/mileage code reads runLogs by date range, not from plan.weeks.
var logged = 0;
Object.keys(ctx.runLogs).forEach(function (k) {
  var d = ctx.parseDateKey(k);
  if (d && d >= ctx.addDays(ctx.startOfToday(), -35) && d <= ctx.startOfToday()) logged += (ctx.runLogs[k].miles || 0);
});
eq('a past-week log is picked up by date-range mileage totals', logged, 6.2);
// The future must still be refused.
var future = new Date(); future.setDate(future.getDate() + 3); future.setHours(0, 0, 0, 0);
els['run-missed-date'].value = ctx.dateKeyOfRun(future);
ctx.onMissedDatePick();
eq('a future date renders no inputs', els['runMissedFields'].innerHTML, '');
ok('and says so', (els['runMissedHint'].textContent || '').indexOf('future') > -1, els['runMissedHint'].textContent);
// A date still on the plan must not get a duplicate set of ids.
els['rl-mi-dupe-probe'] = mkEl('rl-mi-dupe-probe', 'input', '');
var todayKeyStr = ctx.dateKeyOfRun(ctx.startOfToday());
els['rl-mi-' + todayKeyStr] = mkEl('rl-mi-' + todayKeyStr, 'input', '');
els['run-missed-date'].value = todayKeyStr;
ctx.onMissedDatePick();
eq('a date already on the schedule is not duplicated', els['runMissedFields'].innerHTML, '');
ok('and points at the existing row',
   (els['runMissedHint'].textContent || '').indexOf('log it there') > -1, els['runMissedHint'].textContent);
delete els['rl-mi-' + todayKeyStr];
// The generator itself must be untouched by all of this.
eq('generateRunPlan still takes today as its start, unmodified',
   /function generateRunPlan\(inp, today\)/.test(html), true);
eq('buildRunWeeks still called with today', /buildRunWeeks\(\s*today\s*,/.test(html) || /buildRunWeeks\(today,/.test(html), true);

section('13. Custom exercises — added to one day, logged, reloaded, removed');
storage.clear();
storage.setItem('monk_lift_days_v1', '4');
boot();
var DAY = ev('splitDayIds()[0]');
var OTHER = ev('splitDayIds()[1]');
var beforeCount = ctx.splitDayExercises(DAY).length;
var otherBefore = ctx.splitDayExercises(OTHER).length;
els['addex-name-' + DAY].value = "Farmer's Carry";
ctx.addCustomExercise(DAY);
var custom = ctx.customEx[DAY][0];
ok('a record was stored', !!(custom && custom.id));
ok('id is collision-safe (slug + timestamp)', /^cx-farmer-s-carry-[a-z0-9]+$/.test(custom.id), custom.id);
eq('appended to that day', ctx.splitDayExercises(DAY).length, beforeCount + 1);
eq('appended at the BOTTOM, not inserted',
   ctx.splitDayExercises(DAY)[beforeCount].id, custom.id);
eq('registered into EX_BY_ID', ev('EX_BY_ID["' + custom.id + '"] ? EX_BY_ID["' + custom.id + '"].name : null'), "Farmer's Carry");
eq('marked custom', ev('!!EX_BY_ID["' + custom.id + '"].custom'), true);
eq('did NOT appear on another day', ctx.splitDayExercises(OTHER).length, otherBefore);
eq('persisted to its own key', JSON.parse(storage.getItem('monk_custom_ex_v1'))[DAY][0].id, custom.id);

// Renders through the same generator, with no maxKey / seedFrom / repWhy.
var cHTML = ev('liftRowHTML(EX_BY_ID["' + custom.id + '"])');
ok('renders through liftRowHTML', cHTML.indexOf('id="row-' + custom.id + '"') > -1);
ok('no repWhy caption for a custom exercise', cHTML.indexOf('lift-rep-why') === -1);
ok('gets a remove button', cHTML.indexOf('removeCustomExercise') > -1);
sane('row markup has no undefined/NaN', cHTML.indexOf('undefined') === -1 && cHTML.indexOf('NaN') === -1 ? 'clean' : cHTML);
ok('no maxKey', ev('EX_BY_ID["' + custom.id + '"].maxKey === undefined'));
ok('no seedFrom', ev('EX_BY_ID["' + custom.id + '"].seedFrom === undefined'));
var tgt = noThrow('getSessionTarget degrades like Ab Wheel does', function () {
  return ev('getSessionTarget(EX_BY_ID["' + custom.id + '"], getHistory("' + custom.id + '"))');
});
ok('falls through to the baseline message', tgt && /baseline/i.test(tgt.msg), tgt && tgt.msg);
noThrow('renderLiftRowState on a custom exercise', function () { ctx.renderLiftRowState(ev('EX_BY_ID["' + custom.id + '"]')); });
noThrow('renderWarmupsAndTargets on a custom exercise', function () { ctx.renderWarmupsAndTargets(ev('EX_BY_ID["' + custom.id + '"]')); });

// Log against it. This only works if EX_BY_ID knows it — autoSaveExercise
// opens with `var ex = EX_BY_ID[exId]; if (!ex) return;`.
typeSet(custom.id, 's1', 95, 10);
typeSet(custom.id, 's2', 95, 9);
ctx.autoSaveExercise(custom.id, false);
eq('a set logged against it saved', ctx.sessions[custom.id] ? ctx.sessions[custom.id][0].weight : null, 95);

// THE test: a completely fresh load, as a page refresh does it. Registration
// at creation alone would pass everything above and fail from here down.
boot();
eq('survives a fresh reload — still on the day', ctx.splitDayExercises(DAY).length, beforeCount + 1);
eq('survives a fresh reload — still in EX_BY_ID',
   ev('EX_BY_ID["' + custom.id + '"] ? EX_BY_ID["' + custom.id + '"].name : null'), "Farmer's Carry");
eq('survives a fresh reload — log still there', ctx.sessions[custom.id][0].weight, 95);
// And still SAVES after that reload, which is the part registration-on-load buys.
typeSet(custom.id, 's1', 115, 8);
typeSet(custom.id, 's2', 115, 8);
ctx.autoSaveExercise(custom.id, false);
eq('still saves further edits after a reload', ctx.sessions[custom.id][0].weight, 115);
eq('and that reached storage', JSON.parse(storage.getItem('monk_sessions_v1'))[custom.id][0].weight, 115);

// A programmed exercise is untouched by any of this.
var prog = ev('splitDayExercises("' + DAY + '")[0].id');
ok('a programmed exercise is not marked custom', ev('!EX_BY_ID["' + prog + '"].custom'));
ok('a programmed exercise has no remove button',
   ev('liftRowHTML(EX_BY_ID["' + prog + '"])').indexOf('removeCustomExercise') === -1);
eq('a programmed exercise keeps its id', prog, ev('splitDayExercises("' + DAY + '")[0].id'));

// Removal takes the log with it, deliberately.
ctx.removeCustomExercise(custom.id, DAY);   // stub confirm() returns true
eq('gone from the day', ctx.splitDayExercises(DAY).length, beforeCount);
eq('gone from EX_BY_ID', ev('EX_BY_ID["' + custom.id + '"] === undefined'), true);
eq('its logged sessions were deleted too', ctx.sessions[custom.id], undefined);
eq('and that deletion reached storage',
   JSON.parse(storage.getItem('monk_sessions_v1'))[custom.id], undefined);
eq('empty day key cleaned up rather than left as []', ctx.customEx[DAY], undefined);
noThrow('renders fine after removal', function () { ctx.renderAllRowStates(); ctx.renderProgressView(); });
// Removal must refuse to touch a programmed exercise.
var progHistBefore = JSON.stringify(ctx.sessions[prog] || null);
ctx.removeCustomExercise(prog, DAY);
eq('removeCustomExercise refuses a programmed exercise',
   ev('EX_BY_ID["' + prog + '"] !== undefined'), true);
eq('and left its history alone', JSON.stringify(ctx.sessions[prog] || null), progHistBefore);

// Both render paths reach the add control through one assembly point.
eq('6-day branch now goes through splitDayExercises',
   /sixDay\s*\?\s*splitDayExercises\(dayId\)/.test(html), true);
ok('add control rendered on the 6-day path', /splitDayExercises\(dayId\)[\s\S]{0,80}addExerciseHTML\(dayId\)/.test(html));
ok('add control rendered on the shorter-split path', /rows \+ addExerciseHTML\(id\)/.test(html));

// The refactor's own regression risk: with no customs, routing the 6-day path
// through splitDayExercises() must return exactly what the inline
// EXERCISES.filter(ex.day === dayId) returned, for all six pool days.
storage.clear(); boot();
var sameForAll = ev('DAY_ORDER.every(function(d){'
  + ' var a = splitDayExercises(d).map(function(e){return e.id;}).join(",");'
  + ' var b = EXERCISES.filter(function(e){return e.day===d;}).map(function(e){return e.id;}).join(",");'
  + ' return a === b && a.length > 0; })');
eq('6-day pool days are byte-identical to the old inline filter', sameForAll, true);

// Backup carries them; an older backup without the key is fine.
storage.clear(); boot();
els['addex-name-' + DAY].value = 'Sled Push';
ctx.addCustomExercise(DAY);
var exported2 = null;
ctx.Blob = function (parts) { exported2 = parts[0]; };
noThrow('exportData runs with a custom exercise', function () { ctx.exportData(); });
ok('backup carries custom exercises', !!JSON.parse(exported2).customEx[DAY]);

section('14. Race setup collapses once answered — and stays collapsed on reload');
storage.clear(); boot();
// First-time path: no raceDate. Must render exactly as it always has.
eq('no raceDate to start', ctx.runPlan.raceDate || '', '');
eq('form expanded on the first-time path', els['runForm']._cls.indexOf('collapsed'), -1);
eq('summary bar hidden when there is nothing to summarise', els['runSetupBar'].style.display, 'none');
eq('summary line empty', els['runSetupSummary'].textContent, '');
eq('it reuses the onboarding "already answered" condition, not a new one',
   /function runSetupIsAnswered\(\)\s*\{\s*return !!\(runPlan && runPlan\.raceDate\);/.test(html), true);
eq('no new storage key was introduced for the collapse',
   /monk_run_setup_collapsed|SETUP_COLLAPSE_KEY/.test(html), false);

// Fill the form in the way the real inputs do.
els['run-race-date'].value = '2026-11-14';
els['run-distance'].value = 'half';
els['run-dpw'].value = '5';
ctx.onRunInput();
eq('race date persisted through the existing path', ctx.runPlan.raceDate, '2026-11-14');
ok('summary reflects the setup immediately',
   (els['runSetupSummary'].textContent || '').indexOf('Half Marathon') > -1, els['runSetupSummary'].textContent);
ok('summary carries the date', /Nov/.test(els['runSetupSummary'].textContent), els['runSetupSummary'].textContent);
ok('summary carries days per week', /5 days\/week/.test(els['runSetupSummary'].textContent), els['runSetupSummary'].textContent);
// Deliberately NOT collapsed mid-edit — snapping shut while someone is still
// filling the form in would fight the edit.
eq('does not snap shut while the form is being filled in', els['runForm']._cls.indexOf('collapsed'), -1);

// THE test: a fresh load off storage, the way a refresh does it.
boot();
eq('raceDate survived the reload', ctx.runPlan.raceDate, '2026-11-14');
ok('collapsed by default on reload', els['runForm']._cls.indexOf('collapsed') > -1, els['runForm'].className);
eq('toggle reads as expandable', els['runSetupToggle'].textContent, '+ Race setup');
eq('summary bar visible now there is something to show', els['runSetupBar'].style.display, '');
ok('summary line rebuilt from storage, not from the session',
   (els['runSetupSummary'].textContent || '').indexOf('Half Marathon') > -1, els['runSetupSummary'].textContent);

// Expanding must not lose or reset anything underneath.
ctx.toggleRunSetup();
eq('expands', els['runForm']._cls.indexOf('collapsed'), -1);
eq('toggle flips label', els['runSetupToggle'].textContent, '− Race setup');
eq('field values intact after expanding', els['run-race-date'].value, '2026-11-14');
eq('distance intact', els['run-distance'].value, 'half');
// Change a field while expanded; it must still autosave the existing way.
els['run-dpw'].value = '4';
ctx.onRunInput();
eq('edit saved through the existing onRunInput path', ctx.runPlan.daysPerWeek, 4);
eq('and reached storage', JSON.parse(storage.getItem('monk_run_plan_v1')).daysPerWeek, 4);
ok('summary updated to match', /4 days\/week/.test(els['runSetupSummary'].textContent), els['runSetupSummary'].textContent);
ctx.toggleRunSetup();
eq('collapses again from the toggle', els['runForm']._cls.indexOf('collapsed') > -1, true);

// Clearing the race date returns to the untouched first-time path.
els['run-race-date'].value = '';
ctx.onRunInput();
ctx.initRunPlan();
eq('back to expanded with no raceDate', els['runForm']._cls.indexOf('collapsed'), -1);
eq('and the bar hides again', els['runSetupBar'].style.display, 'none');

// The DOM order that makes the schedule and missed-run control rise.
var iForm = html.indexOf('id="runForm"');
var iSched = html.indexOf('id="runSchedule"');
var iMissed = html.indexOf('id="runMissed"');
ok('form still precedes the schedule in the DOM', iForm > -1 && iForm < iSched);
ok('schedule still precedes the missed-run control', iSched < iMissed);
eq('collapsing removes the form from layout entirely (display:none, not just hidden)',
   /\.run-form\.collapsed\s*\{\s*display:\s*none;\s*\}/.test(html), true);

section('15. Run time entry — the colon types itself on a numeric keypad');
storage.clear(); boot();
function fc(s) { return ctx.formatClockInput(s); }
// 1-2 digits stay bare minutes, which is the behaviour that already existed.
eq('"" stays empty', fc(''), '');
eq('"5" stays 5 (minutes)', fc('5'), '5');
eq('"45" stays 45 (minutes)', fc('45'), '45');
// 3+ digits gain the colon from the right.
eq('"500" becomes 5:00', fc('500'), '5:00');
eq('"321" becomes 3:21', fc('321'), '3:21');
eq('"3210" becomes 32:10', fc('3210'), '32:10');
eq('"10530" becomes 1:05:30', fc('10530'), '1:05:30');
eq('"123456" becomes 12:34:56', fc('123456'), '12:34:56');
// Non-digits are stripped, so a typed or pasted colon does not double up.
eq('an already-colonned value is stable', fc('32:10'), '32:10');
eq('h:mm:ss is stable', fc('1:05:30'), '1:05:30');
eq('junk is stripped', fc('32m10s'), '32:10');
eq('overlong input is capped at 6 digits', fc('1234567890'), '12:34:56');
// Everything secsToClock emits must round-trip unchanged — it never prints
// more than 59 minutes without also printing hours, so there is no ambiguity.
[59, 600, 1930, 3599, 3600, 6000, 35999].forEach(function (s) {
  var printed = ctx.secsToClock(s);
  eq('round-trips ' + printed, fc(printed), printed);
  eq('and re-parses to ' + s, ctx.clockToSecs(fc(printed)), s);
});
// The bug this fixes: a colon-less 3210 used to mean 3210 MINUTES.
eq('unformatted "3210" really did parse as 3210 minutes', ctx.clockToSecs('3210'), 3210 * 60);
eq('formatted, it is 32 min 10 sec', ctx.clockToSecs(fc('3210')), 32 * 60 + 10);
ok('which is not 53 hours', ctx.clockToSecs(fc('3210')) < 3600, ctx.clockToSecs(fc('3210')));
// Wired into the field, and saving still goes through the shared path.
var k15 = ctx.dateKeyOfRun(ctx.startOfToday());
els['runMissedFields'].innerHTML = ctx.runLogInputsHTML({ date: ctx.startOfToday() });
var markup = els['runMissedFields'].innerHTML;
ok('time field uses the formatting handlers', markup.indexOf('onRunTimeInput(this)') > -1);
ok('time field commits through the formatting handler', markup.indexOf('onRunTimeCommit(this)') > -1);
ok('other fields keep the plain handlers', markup.indexOf('onRunLogEdit(this.dataset.k)') > -1);
var tEl = els['rl-tm-' + k15];
tEl.dataset.k = k15;
tEl.value = '3210';
ctx.onRunTimeInput(tEl);
eq('typing digits leaves a formatted value in the field', tEl.value, '32:10');
els['rl-mi-' + k15].value = '4';
ctx.onRunTimeCommit(tEl);
eq('and it saves as 32 min 10 sec, not 53 hours', ctx.runLogs[k15].secs, 1930);
eq('pace text reads off the corrected time',
   ctx.runLogPaceText(ctx.runLogs[k15]).indexOf('/mi') > -1, true);

section('16. Dead schedule cells get a route into logging');
storage.clear(); boot();
// Build the plan the way the Run tab does and classify every cell of week 0.
var rInp = Object.assign({}, ctx.readRunInputs(), {
  raceDate: '2026-11-14', distance: 'half', level: 'casual',
  daysPerWeek: 5, current: 15, peak: 30, longDow: 5, liftDays: 4, liftRestDow: 6
});
var rPlan = ctx.generateRunPlan(rInp, ctx.startOfToday());
ok('a plan was generated', !!(rPlan && rPlan.weeks && rPlan.weeks.length), rPlan && rPlan.error);
var wk0 = rPlan.weeks[0];
function classify(c) {
  var loggable = !c.before && !c.after && c.miles > 0;      // weekStarted is true for week 0
  var canBackfill = !loggable && !c.after && c.date <= ctx.startOfToday();
  return { loggable: loggable, canBackfill: canBackfill };
}
// The reported failure: an earlier weekday of the CURRENT week is dead because
// the plan starts today, not because the day was unscheduled.
var beforeCells = wk0.cells.filter(function (c) { return c.before; });
ok('the current week really does contain before-today cells', beforeCells.length > 0,
   'today is ' + ctx.dateKeyOfRun(ctx.startOfToday()));
ok('every before-today cell had NO log inputs (the reported bug)',
   beforeCells.every(function (c) { return !classify(c).loggable; }));
ok('and every one of them can now be backfilled',
   beforeCells.every(function (c) { return classify(c).canBackfill; }));
// The design-intent case: scheduled miles of 0 on a day that is not before today.
var unscheduled = wk0.cells.filter(function (c) { return !c.before && !c.after && !(c.miles > 0) && c.date <= ctx.startOfToday(); });
ok('an unscheduled past/today cell is also backfillable',
   unscheduled.every(function (c) { return classify(c).canBackfill && !classify(c).loggable; }));
// Future days stay closed — you cannot log a run you have not done.
var future = wk0.cells.filter(function (c) { return c.date > ctx.startOfToday(); });
ok('future cells offer no backfill',
   future.every(function (c) { return !classify(c).canBackfill; }), future.length + ' future cells');
// A genuinely scheduled, already-happened day keeps its normal inline inputs.
var normal = wk0.cells.filter(function (c) { return classify(c).loggable; });
ok('scheduled run days are still loggable inline', normal.length > 0);
ok('and are NOT given a backfill link instead',
   normal.every(function (c) { return !classify(c).canBackfill; }));

// The link markup, and that it drives the existing control rather than a new one.
var deadCell = beforeCells[0] || unscheduled[0];
var linkHTML = ctx.runBackfillLinkHTML(deadCell);
ok('renders a backfill link', linkHTML.indexOf('run-backfill') > -1);
ok('carries that cell\'s own date', linkHTML.indexOf(ctx.dateKeyOfRun(deadCell.date)) > -1);
ok('calls the shared entry point', linkHTML.indexOf('logRunAnyway(this.dataset.k)') > -1);
ok('stops propagation so it does not toggle the cell', linkHTML.indexOf('event.stopPropagation()') > -1);

// Logging through it must reach the same storage and survive a reload.
var deadKey = ctx.dateKeyOfRun(deadCell.date);
ctx.logRunAnyway(deadKey);
eq('it opened the missed-run control', els['runMissedBody']._cls.indexOf('open') > -1, true);
eq('prefilled with the cell\'s date', els['run-missed-date'].value, deadKey);
ok('and rendered the shared log inputs for it',
   els['runMissedFields'].innerHTML.indexOf('rl-mi-' + deadKey) > -1);
els['rl-mi-' + deadKey].value = '5.5';
els['rl-fl-' + deadKey].value = '8';
ctx.onRunLogCommit(deadKey);
eq('saved into runLogs', ctx.runLogs[deadKey].miles, 5.5);
ok('persisted', (storage.getItem('monk_run_logs_v1') || '').indexOf(deadKey) > -1);
ctx.loadRunLogs();
eq('survives a reload', ctx.runLogs[deadKey].miles, 5.5);
eq('feel survived too', ctx.runLogs[deadKey].feel, 8);
// Once logged, the link says so rather than still offering a blank log.
ok('link now offers to edit rather than create',
   ctx.runBackfillLinkHTML(deadCell).indexOf('edit logged run') > -1);

// The earlier missed-run behaviour (a date fully outside the window) is intact.
var wayBack = new Date(); wayBack.setDate(wayBack.getDate() - 30); wayBack.setHours(0, 0, 0, 0);
var wbKey = ctx.dateKeyOfRun(wayBack);
els['run-missed-date'].value = wbKey;
ctx.onMissedDatePick();
ok('an out-of-window date still renders its own inputs',
   els['runMissedFields'].innerHTML.indexOf('rl-mi-' + wbKey) > -1);
// And the generator was not touched by any of this.
eq('buildRunWeeks still sets before from block.start',
   /before:\s*date < block\.start/.test(html), true);
eq('the loggable gate itself is unchanged',
   /var loggable = !c\.before && !c\.after && c\.miles > 0 && weekStarted;/.test(html), true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
