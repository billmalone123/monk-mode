// Scratch harness for the onboarding work: loads index.html's main script block
// into a stubbed DOM built from the file's own markup, then drives the maxes
// estimate toggle and the run-setup step the way a user would.
//
// The element registry is built by scanning index.html for id="..." — so if a
// test references an id the markup does not actually have, it fails loudly
// rather than silently passing against an invented element.
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync('index.html', 'utf8');

// ── stub DOM ──────────────────────────────────────────────────────────────
function mkClassList(el) {
  return {
    add: function (c) { if (!el._cls.includes(c)) el._cls.push(c); },
    remove: function (c) { el._cls = el._cls.filter(function (x) { return x !== c; }); },
    contains: function (c) { return el._cls.includes(c); },
    toggle: function (c, on) {
      var has = el._cls.includes(c);
      var want = (on === undefined) ? !has : !!on;
      if (want && !has) el._cls.push(c);
      if (!want && has) this.remove(c);
      return want;
    }
  };
}
function mkEl(id, tag, cls) {
  var el = { id: id, tagName: (tag || 'div').toUpperCase(), textContent: '', innerHTML: '',
             style: {}, dataset: {}, _cls: (cls || '').split(/\s+/).filter(Boolean), children: [], _val: '' };
  // A real input coerces whatever you assign to a string; the stub must too,
  // or code that assigns a number would read back a number here and not in a browser.
  Object.defineProperty(el, 'value', {
    get: function () { return el._val; },
    set: function (v) { el._val = (v == null) ? '' : String(v); }
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
  el.closest = function () { return null; };
  el.scrollIntoView = function () {};
  return el;
}

var els = {};
// Every id in the document, with its tag and class list.
var tagRe = /<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g, tm;
while ((tm = tagRe.exec(html))) {
  var tag = tm[1], attrs = tm[2], id = tm[3];
  if (els[id]) continue;
  var cm = attrs.match(/\bclass="([^"]*)"/);
  els[id] = mkEl(id, tag, cm ? cm[1] : '');
}
// Selects default to their first option, as a real select does.
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
  addEventListener: function (t, fn) { (doc._ls[t] = doc._ls[t] || []).push(fn); },
  removeEventListener: function () {},
  _ls: {},
  body: mkEl('body', 'body', ''),
  documentElement: mkEl('html', 'html', ''),
  readyState: 'complete'
};
doc.body.classList = mkClassList(doc.body);

// ── stub storage ──────────────────────────────────────────────────────────
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

var timers = [];
var ctx = {
  document: doc,
  localStorage: storage,
  // No serviceWorker key at all — the app gates on `'serviceWorker' in navigator`,
  // so setting it to undefined would still pass that check.
  navigator: { storage: {}, userAgent: 'node' },
  location: { href: 'http://localhost/', reload: function () {} },
  console: console,
  setTimeout: function (fn, ms) { timers.push(fn); return timers.length; },
  clearTimeout: function () {},
  setInterval: function () { return 0; },
  clearInterval: function () {},
  requestAnimationFrame: function (fn) { return 0; },
  cancelAnimationFrame: function () {},
  indexedDB: undefined,
  matchMedia: function () { return { matches: false, addListener: function () {}, addEventListener: function () {} }; },
  scrollTo: function () {},
  alert: function () {}, confirm: function () { return true; },
  Date: Date, Math: Math, JSON: JSON, parseInt: parseInt, parseFloat: parseFloat,
  isNaN: isNaN, Object: Object, Array: Array, String: String, Number: Number,
  Promise: Promise, Error: Error, RegExp: RegExp, Map: Map, Set: Set
};
function NoopObserver() {}
NoopObserver.prototype.observe = function () {};
NoopObserver.prototype.unobserve = function () {};
NoopObserver.prototype.disconnect = function () {};
ctx.IntersectionObserver = NoopObserver;
ctx.MutationObserver = NoopObserver;
ctx.ResizeObserver = NoopObserver;
ctx.addEventListener = function (t, fn) { (ctx._ls[t] = ctx._ls[t] || []).push(fn); };
ctx.removeEventListener = function () {};
ctx._ls = {};
ctx.window = ctx;
ctx.self = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

// ── load the app's main script block ──────────────────────────────────────
var blocks = [];
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, m;
while ((m = re.exec(html))) blocks.push(m[1]);
if (blocks.length !== 2) { console.log('expected 2 script blocks, found ' + blocks.length); process.exit(1); }
try { vm.runInContext(blocks[0], ctx, { filename: 'block1' }); }
catch (e) { console.log('block 1 threw while loading: ' + e.stack); process.exit(1); }
try { vm.runInContext(blocks[1], ctx, { filename: 'block2' }); }
catch (e) { console.log('block 2 threw while loading: ' + e.stack); process.exit(1); }

// ── assertions ────────────────────────────────────────────────────────────
var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  [' + detail + ']' : '')); }
}
function eq(name, got, want) { ok(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
function el(id) { var e = doc.getElementById(id); if (!e) { fail++; console.log('  FAIL  missing element #' + id); } return e || mkEl(id, 'div', ''); }
function type(id, v) { el(id).value = String(v); }
function section(t) { console.log('\n' + t); }

// The app boots its DOMContentLoaded work itself; run the init the harness needs.
ctx.loadMaxes(); ctx.loadRunPlan(); ctx.loadRunLogs();

// ══ 1. Restored estimate toggle ═══════════════════════════════════════════
section('1. Maxes estimate toggle — Epley');

eq('Epley 275x5  = 320 (rounded to 5)', ctx.epleyEstimate(275, 5), 320);
eq('225x1 = 225 (a single is its own 1RM, not Epley-inflated)', ctx.epleyEstimate(225, 1), 225);
eq('Epley 185x10 = 245', ctx.epleyEstimate(185, 10), 245);
eq('blank weight  -> null', ctx.epleyEstimate('', 5), null);
eq('blank reps    -> null', ctx.epleyEstimate(275, ''), null);
eq('zero reps     -> null', ctx.epleyEstimate(275, 0), null);
eq('31 reps       -> null (out of range)', ctx.epleyEstimate(275, 31), null);
eq('negative wt   -> null', ctx.epleyEstimate(-100, 5), null);

section('2. Toggle wiring against the restored CSS classes');
ctx.openMaxesModal();
eq('opens in 1RM mode', ctx.document.getElementById('maxesModalCard').classList.contains('maxes-mode-reps'), false);
ok('1RM button active', el('mode-btn-1rm').classList.contains('active'));
ok('reps button not active', !el('mode-btn-reps').classList.contains('active'));
ctx.setMaxesMode('reps');
ok('card gets .maxes-mode-reps (the CSS hook that swaps the fields)', el('maxesModalCard').classList.contains('maxes-mode-reps'));
ok('reps button active', el('mode-btn-reps').classList.contains('active'));
ok('1RM button cleared', !el('mode-btn-1rm').classList.contains('active'));
eq('Epley note shown in estimate mode', el('maxes-epley-note').style.display, '');
ctx.setMaxesMode('1rm');
ok('toggling back removes the class', !el('maxesModalCard').classList.contains('maxes-mode-reps'));
eq('Epley note hidden again', el('maxes-epley-note').style.display, 'none');

section('3. Estimate mode displays the number AND saves it');
ctx.openMaxesModal();
ctx.setMaxesMode('reps');
type('reps-weight-squat', 275); type('reps-count-squat', 5);
type('reps-weight-bench', 185); type('reps-count-bench', 8);
ctx.onRepsCommit();
eq('squat estimate displayed', el('est-1rm-squat').textContent, '≈ 320 lbs estimated 1RM');
eq('bench estimate displayed', el('est-1rm-bench').textContent, '≈ 235 lbs estimated 1RM');
eq('estimate mirrored into the 1RM field (one read path)', el('max-squat').value, '320');
eq('userMaxes.squat is the estimate', ctx.userMaxes.squat, 320);
eq('userMaxes.bench is the estimate', ctx.userMaxes.bench, 235);
eq('untouched lift not invented', ctx.userMaxes.ohp, undefined);
var persisted = JSON.parse(storage.getItem('monk_mode_maxes_v1'));
eq('persisted squat (no save button pressed)', persisted.squat, 320);
eq('persisted bench (no save button pressed)', persisted.bench, 235);

section('4. Estimate is what the rest of the app uses as the starting basis');
// renderLiftRowState() reads userMaxes[ex.maxKey] * ex.maxPct for the seed weight.
var seeded = ctx.roundToNearestFive(ctx.userMaxes.squat * 0.6);
eq('a 60%-of-squat accessory seeds off the estimate', seeded, 190);

section('5. Direct entry still behaves exactly as before');
ctx.openMaxesModal();
eq('reopening resets to 1RM mode', el('maxesModalCard').classList.contains('maxes-mode-reps'), false);
eq('reopen shows the stored value', el('max-squat').value, '320');
eq('reps scratch fields cleared on reopen', el('reps-weight-squat').value, '');
eq('estimate label cleared in 1RM mode', el('est-1rm-squat').textContent, '');
type('max-squat', 405); type('max-bench', 275); type('max-ohp', 70);
ctx.onMaxCommit();
eq('direct squat saved', ctx.userMaxes.squat, 405);
eq('direct bench saved', ctx.userMaxes.bench, 275);
eq('direct ohp saved', ctx.userMaxes.ohp, 70);
type('max-ohp', '');
ctx.onMaxCommit();
eq('blanking a field still clears it (unchanged behaviour)', ctx.userMaxes.ohp, undefined);

section('6. Switching to estimate mode does not wipe existing maxes');
ctx.openMaxesModal();
type('max-squat', 405); ctx.onMaxCommit();
ctx.setMaxesMode('reps');           // reps fields are blank
ctx.onRepsCommit();
eq('blank reps leaves the stored max alone', ctx.userMaxes.squat, 405);

// ══ 7. Run-setup onboarding ═══════════════════════════════════════════════
section('7. Run setup writes into the same runPlan the Run tab reads');
storage.clear();
ctx.loadMaxes(); ctx.loadRunPlan(); ctx.loadRunLogs();
ctx.initRunPlan();
ctx.openOnboarding();
eq('step 1 opens first', el('maxesModal').style.display, 'flex');
eq('step label shown during onboarding', el('maxesStepLabel').style.display, '');
ctx.setMaxesMode('reps');
type('reps-weight-squat', 315); type('reps-count-squat', 3);
ctx.onRepsCommit();
ctx.saveMaxes();
eq('step 1 closed', el('maxesModal').style.display, 'none');
eq('step 2 opened after saving step 1', el('runSetupModal').style.display, 'flex');

type('onb-run-race-date', '2026-11-15');
el('onb-run-distance').value = 'marathon';
type('onb-run-dpw', 4);
type('onb-run-pr', '1:42:00 half');
ctx.onbSetRunLevel('competitive');
ctx.onbRunSync();

eq('runPlan.raceDate', ctx.runPlan.raceDate, '2026-11-15');
eq('runPlan.distance', ctx.runPlan.distance, 'marathon');
eq('runPlan.daysPerWeek', ctx.runPlan.daysPerWeek, 4);
eq('runPlan.pr', ctx.runPlan.pr, '1:42:00 half');
eq('runPlan.level', ctx.runPlan.level, 'competitive');
eq('peak pre-filled from suggestedPeak(), not asked',
   ctx.runPlan.peak, ctx.suggestedPeak('competitive', 'marathon'));
ok('current mileage left at its default', ctx.runPlan.current != null && !isNaN(ctx.runPlan.current));

section('8. Onboarding wrote through the Run tab\'s own fields');
eq('Run tab race date field', el('run-race-date').value, '2026-11-15');
eq('Run tab distance field', el('run-distance').value, 'marathon');
eq('Run tab dpw field', el('run-dpw').value, '4');
eq('Run tab PR field', el('run-pr').value, '1:42:00 half');
ok('Run tab level toggle lit', el('run-lvl-competitive').classList.contains('on'));

section('9. Autosaved with no explicit save button');
var rp = JSON.parse(storage.getItem('monk_run_plan_v1'));
eq('persisted raceDate', rp.raceDate, '2026-11-15');
eq('persisted distance', rp.distance, 'marathon');
eq('persisted daysPerWeek', rp.daysPerWeek, 4);
eq('persisted level', rp.level, 'competitive');

section('10. Reload reads back exactly what onboarding stored (no re-ask)');
ctx.runPlan = {};
ctx.loadRunPlan();
ctx.initRunPlan();
eq('raceDate survives reload', ctx.runPlan.raceDate, '2026-11-15');
eq('distance survives reload', ctx.runPlan.distance, 'marathon');
eq('level survives reload', ctx.runPlan.level, 'competitive');
eq('Run tab repopulated from storage', el('run-race-date').value, '2026-11-15');
el('runSetupModal').style.display = 'flex';   // pretend it was reopened
ctx.openRunSetupModal();
eq('step 2 does not re-ask once a race date exists', el('runSetupModal').style.display, 'none');

section('11. The stored plan actually generates');
var plan = ctx.generateRunPlan(ctx.readRunInputs(), new Date(2026, 7, 3));
ok('generator built a plan from the onboarded values', !!(plan && plan.weeks && plan.weeks.length), plan && plan.error);
eq('generator peak matches the pre-filled peak', plan.curve.peak, ctx.runPlan.peak);

section('12. Skip paths leave nothing broken');
storage.clear();
ctx.userMaxes = {}; ctx.runPlan = {};
ctx.loadMaxes(); ctx.loadRunPlan();
ctx.initRunPlan();
ctx.openOnboarding();
ctx.skipMaxes();
eq('skipping step 1 still advances to step 2', el('runSetupModal').style.display, 'flex');
ctx.skipRunSetup();
eq('step 2 closed', el('runSetupModal').style.display, 'none');
// initRunPlan() -> setRunLevel() -> onRunInput() normalises an untouched date
// field to '', so "no race" is falsy rather than strictly undefined.
ok('skipping wrote no race date', !ctx.runPlan.raceDate, JSON.stringify(ctx.runPlan.raceDate));
eq('no maxes invented', Object.keys(ctx.userMaxes).length, 0);
var afterSkip = storage.getItem('monk_run_plan_v1');
ok('run plan storage holds only defaults, no race', !afterSkip || !JSON.parse(afterSkip).raceDate);
var skipPlan = ctx.generateRunPlan(ctx.readRunInputs(), new Date(2026, 7, 3));
ok('Run tab degrades to "needs a date" rather than throwing',
   !skipPlan || !!skipPlan.error || !skipPlan.weeks, skipPlan && skipPlan.error);
ok('renderRunPlan() does not throw with an empty plan',
   (function () { try { ctx.renderRunPlan(); return true; } catch (e) { return 'threw: ' + e.message; } })() === true);
eq('onboarding flag cleared', el('maxesStepLabel').style.display, 'none');

section('13. Opening maxes from the settings button is not an onboarding chain');
ctx.openMaxesModal();
type('max-squat', 315);
ctx.saveMaxes();
eq('no step-2 modal from the settings entry point', el('runSetupModal').style.display, 'none');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
