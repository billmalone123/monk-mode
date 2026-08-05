var currentTrainWeek=0; function isDeloadWeek(wk){return (wk%4)===3;} function idbSet(){} var userMaxes={}, sessions={}; var runLogs={}; var liftDaysPerWeek=6;
//     RUNNING PLAN GENERATOR — race date and current volume in, a week-by-week
  //     schedule out. Same shape as the lifting side: the config below is the
  //     whole plan, the inputs persist (localStorage + the IndexedDB mirror),
  //     and the schedule itself is derived on every render, never stored. When
  //     the lifting plan is active the two merge into one week — a lift and a
  //     run can share a day, two hard stimuli never can.
  const RUNPLAN_KEY = 'monk_run_plan_v1';
  const RUN_DOWS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const RUN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  //  longCeil caps the long run; taperMin/Max set the wind-down by distance
  const RACE_DISTANCES = {
    '5k':       { label:'5K',             pace:'goal 5K pace',       miles:3.1,  longCeil:8,  taperMin:1, taperMax:1, capKey:'short' },
    '10k':      { label:'10K',            pace:'goal 10K pace',      miles:6.2,  longCeil:10, taperMin:1, taperMax:1, capKey:'short' },
    'half':     { label:'half marathon',  pace:'goal HM pace',       miles:13.1, longCeil:12, taperMin:1, taperMax:2, capKey:'half'  },
    'marathon': { label:'marathon',       pace:'goal marathon pace', miles:26.2, longCeil:20, taperMin:2, taperMax:3, capKey:'full'  }
  };

  //  ramp = week-over-week ceiling, first = the opening jump off current volume,
  //  cutEvery spaces the down weeks, tempo gates formal threshold work
  const RUN_LEVELS = {
    'new':         { label:'New to running',            ramp:0.15, first:0.10, cutEvery:3, tempo:false },
    'casual':      { label:'Casual / returning',        ramp:0.15, first:0.13, cutEvery:4, tempo:true  },
    'competitive': { label:'Competitive / experienced', ramp:0.25, first:0.20, cutEvery:4, tempo:true  }
  };

  //  Suggested peak mileage — slider defaults, not hard limits
  const RUN_PEAK_CAPS = {
    'new':         { short:[15,20], half:[20,25], full:null     },
    'casual':      { short:[20,30], half:[25,35], full:[35,45]  },
    'competitive': { short:[30,45], half:[35,50], full:[50,70]  }
  };

  //  Weekday slots, 0 = Mon. Keyed by long-run day, then days per week. Tempo
  //  sits early in the week so it never lands next to the long run.
  const RUN_TEMPLATES = {
    5: { 3: {0:'easy',2:'tempo',5:'long'},
         4: {0:'easy',1:'tempo',3:'easy',5:'long'},
         5: {0:'easy',1:'tempo',3:'easy',5:'long',6:'recovery'},
         6: {0:'easy',1:'tempo',2:'easy',3:'easy',5:'long',6:'recovery'} },
    6: { 3: {1:'easy',3:'tempo',6:'long'},
         4: {0:'easy',2:'tempo',4:'easy',6:'long'},
         5: {0:'easy',1:'easy',2:'tempo',4:'easy',6:'long'},
         6: {0:'easy',1:'easy',2:'tempo',3:'easy',4:'easy',6:'long'} }
  };

  var runPlan = {};
  function loadRunPlan() {
    try { runPlan = JSON.parse(localStorage.getItem(RUNPLAN_KEY)) || {}; } catch(e) { runPlan = {}; }
  }
  function persistRunPlan() {
    try { localStorage.setItem(RUNPLAN_KEY, JSON.stringify(runPlan)); } catch(e) {}
    idbSet('runPlan', runPlan);   // durable mirror, same as sessions and maxes
  }

  //     RUN LOGS — what actually happened, keyed by date. The plan is what you
  //     meant to do; this is what you did, and next week's target reads off it.
  //     { 'YYYY-MM-DD': { miles, secs, hr, feel } } — every field nullable but
  //     miles, so a feel-only entry is valid and still counts toward the average.
  const RUN_LOG_KEY = 'monk_run_logs_v1';
  var runLogs = {};
  function loadRunLogs() {
    try { runLogs = JSON.parse(localStorage.getItem(RUN_LOG_KEY)) || {}; } catch(e) { runLogs = {}; }
  }
  function persistRunLogs() {
    try { localStorage.setItem(RUN_LOG_KEY, JSON.stringify(runLogs)); } catch(e) {}
    idbSet('runLogs', runLogs);
  }

  //     DATE HELPERS — everything local-midnight so a date input never slips a
  //     day across a timezone boundary
  function parseDateKey(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfToday() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
  function mondayIndex(d) { return (d.getDay() + 6) % 7; }   // 0 = Mon … 6 = Sun
  function fmtRunDate(d) { return RUN_DOWS[mondayIndex(d)] + ' ' + RUN_MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtMiles(n) { return (Math.round(n * 10) / 10).toString(); }

  //     WEEK BLOCKS — a mid-week start becomes a short Week 0 restart that does
  //     not count toward the main progression
  function buildRunWeeks(today, race) {
    var blocks = [];
    var cursor = today;
    var mi = mondayIndex(today);
    if (mi !== 0) {
      var sunday = addDays(today, 6 - mi);
      blocks.push({ idx: 0, start: today, end: sunday > race ? race : sunday, partial: true });
      cursor = addDays(sunday, 1);
    }
    var n = 1;
    while (cursor <= race) {
      var end = addDays(cursor, 6);
      if (end >= race) { blocks.push({ idx: n, start: cursor, end: race, raceWeek: true }); break; }
      blocks.push({ idx: n, start: cursor, end: end });
      cursor = addDays(cursor, 7);
      n++;
    }
    return blocks;
  }

  //     WEEKLY MILEAGE CURVE — geometric climb from the opening week to peak,
  //     with a cutback every cutEvery build weeks. A cutback drops ~20% and does
  //     not consume a level, so the week after it repeats the level before it.
  //     Never a cutback the week immediately before taper.
  function runMileageCurve(baseline, peakTarget, buildCount, level) {
    var cuts = [];
    for (var i = level.cutEvery; i < buildCount; i += level.cutEvery) cuts.push(i);
    var levels = Math.max(2, buildCount - 2 * cuts.length);
    var first = Math.max(Math.round(baseline * (1 + level.first)), baseline + 1);
    var peak = Math.max(peakTarget, first);
    var ratio = Math.pow(peak / first, 1 / (levels - 1));
    var capped = false;
    if (ratio > 1 + level.ramp) {
      ratio = 1 + level.ramp;
      peak = Math.round(first * Math.pow(ratio, levels - 1));
      capped = true;
    }
    //  Clamp the rounded levels, not the ideal curve: rounding 16.1 down and
    //  18.5 up turns a legal 15% ratio into an 18% jump on the page.
    var lv = [first];
    for (var q = 1; q < levels; q++) {
      var ideal = (q === levels - 1) ? peak : Math.round(first * Math.pow(ratio, q));
      var step = Math.max(lv[q - 1] + 1, Math.floor(lv[q - 1] * (1 + level.ramp)));
      lv.push(Math.min(ideal, step));
    }
    if (lv[levels - 1] < peak) capped = true;
    peak = lv[levels - 1];
    function levelMiles(p) { return lv[Math.min(p, levels - 1)]; }
    var series = [], p = 0, lastClimb = first;
    for (var w = 1; w <= buildCount; w++) {
      if (cuts.indexOf(w) !== -1) {
        series.push({ week: w, miles: Math.round(lastClimb * 0.80), phase: 'Cutback' });
        p = Math.max(0, p - 1);
      } else {
        lastClimb = levelMiles(p);
        series.push({ week: w, miles: lastClimb, phase: w === buildCount ? 'Peak' : 'Build' });
        p++;
      }
    }
    return { series: series, peak: peak, first: first, capped: capped, requested: peakTarget };
  }

  //     WEEKLY SPLIT — long run takes about a third, tempo a fifth, the recovery
  //     run stays short, and whatever is left goes to the easy days front-loaded
  function runDistribute(miles, weekNo, cfg, isPeak) {
    var longSlot = null, tempoSlot = null, recSlot = null, easySlots = [];
    cfg.slots.forEach(function(s) {
      if (s.type === 'long') longSlot = s;
      else if (s.type === 'tempo') tempoSlot = s;
      else if (s.type === 'recovery') recSlot = s;
      else easySlots.push(s);
    });
    // The run-day count is fixed for the whole plan, so a week can never carry
    // less than its slots can express: a 3-mile long run plus 2 miles each. A
    // target under that floor gets raised rather than shaved into token runs.
    var minWeek = 3 + 2 * Math.max(0, cfg.slots.length - 1);
    if (miles < minWeek) miles = minWeek;
    var others = Math.max(1, cfg.slots.length - 1);
    var long = isPeak
      ? Math.min(cfg.dist.longCeil, miles - 2 * others)
      : Math.min(cfg.dist.longCeil, Math.round(miles / 3));
    if (long < 3) long = Math.min(3, miles);
    var out = {};
    var left = miles - long;
    if (recSlot) {
      var recCap = Math.min(6, Math.max(2, Math.round(cfg.peak * 0.10)));
      out[recSlot.dow] = Math.min(recCap, 2 + Math.floor(weekNo / 3));
      left -= out[recSlot.dow];
    }
    if (tempoSlot) {
      var tempoCap = Math.max(4, Math.round(cfg.peak * 0.19));
      out[tempoSlot.dow] = Math.max(2, Math.min(tempoCap, Math.round(miles * 0.21)));
      left -= out[tempoSlot.dow];
    }
    var n = easySlots.length;
    if (n) {
      var need = n * 2;                        // never program a sub-2-mile easy run
      if (left < need) { long -= (need - left); left = need; }
      // An easy day never outgrows the long run — that is what the long run is
      var easyCap = Math.max(3, Math.round(cfg.dist.longCeil * 0.75));
      if (left > easyCap * n) { long += left - easyCap * n; left = easyCap * n; }
      var base = Math.floor(left / n), extra = left - base * n;
      easySlots.forEach(function(s, i) { out[s.dow] = base + (i < extra ? 1 : 0); });
    }
    if (longSlot) out[longSlot.dow] = Math.max(3, long);
    // The Total column has to be the truth: park any rounding residual on the
    // long run while it stays legal, otherwise on the first easy day.
    var sum = 0;
    Object.keys(out).forEach(function(k) { sum += out[k]; });
    var resid = miles - sum;
    if (resid !== 0 && longSlot) {
      var adj = out[longSlot.dow] + resid;
      if (adj >= 3 && adj <= cfg.dist.longCeil) { out[longSlot.dow] = adj; resid = 0; }
    }
    if (resid !== 0 && easySlots.length) {
      var first = easySlots[0].dow;
      if (out[first] + resid >= 2) { out[first] += resid; resid = 0; }
    }
    return out;
  }

  //     PACE — Riegel equivalency, because half and full equivalents do not
  //     scale linearly off a 5K time
  const RUN_PR_DISTS = { '5k':3.1, '5000':3.1, '10k':6.2, '10000':6.2, 'half':13.1, 'hm':13.1, 'marathon':26.2, 'full':26.2, 'mile':1.0, '1mile':1.0 };
  function parsePR(str) {
    if (!str) return null;
    var s = String(str).toLowerCase().trim();
    if (!s || s.indexOf('no pr') !== -1) return null;
    var t = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!t) return null;
    var secs = t[3] ? (+t[1] * 3600 + +t[2] * 60 + +t[3]) : (+t[1] * 60 + +t[2]);
    var miles = null;
    Object.keys(RUN_PR_DISTS).forEach(function(k) {
      if (miles === null && s.indexOf(k) !== -1) miles = RUN_PR_DISTS[k];
    });
    if (miles === null) { var m = s.match(/(\d+(?:\.\d+)?)\s*(?:mi|mile)/); if (m) miles = parseFloat(m[1]); }
    if (miles === null || !secs) return null;
    return { seconds: secs, miles: miles };
  }
  function riegel(pr, targetMiles) { return pr.seconds * Math.pow(targetMiles / pr.miles, 1.06); }
  function fmtPace(secsPerMile) {
    var s = Math.round(secsPerMile);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function runPaceZones(pr, dist) {
    if (!pr) return null;
    var goal = riegel(pr, dist.miles) / dist.miles;
    var fiveK = riegel(pr, 3.1) / 3.1;
    var half = riegel(pr, 13.1) / 13.1;
    var tempo = (dist.capKey === 'short') ? fiveK + 30 : half;
    return {
      goal:  fmtPace(goal) + ' /mi',
      easy:  fmtPace(goal + 60) + '–' + fmtPace(goal + 90) + ' /mi',
      tempo: fmtPace(tempo - 5) + '–' + fmtPace(tempo + 5) + ' /mi'
    };
  }

  //     RUN/WALK — a true beginner starts on intervals, not mileage
  function runWalkText(minutes, weekNo) {
    var r, w;
    if (weekNo <= 2)      { r = 1; w = 2; }
    else if (weekNo <= 4) { r = 2; w = 2; }
    else if (weekNo <= 6) { r = 3; w = 1; }
    else return Math.round(minutes) + ' min easy, continuous';
    var reps = Math.max(4, Math.round(minutes / (r + w)));
    return 'run ' + r + ' / walk ' + w + ' × ' + reps;
  }

  //     LOG STATS FOR A WEEK — totals and the feel average across whatever was
  //     actually entered. Partial logging is expected: three of four runs blank
  //     still yields a usable average from the one that was filled in.
  function runWeekLogStats(block) {
    if (!block) return null;
    var entries = 0, miles = 0, feelSum = 0, feelN = 0;
    Object.keys(runLogs).forEach(function(k) {
      var d = parseDateKey(k);
      if (!d || d < block.start || d > block.end) return;
      var e = runLogs[k];
      if (!e) return;
      var m = parseFloat(e.miles), f = parseFloat(e.feel);
      var hasM = !isNaN(m) && m > 0, hasF = !isNaN(f) && f > 0;
      if (!hasM && !hasF) return;
      entries++;
      if (hasM) miles += m;
      if (hasF) { feelSum += f; feelN++; }
    });
    if (!entries) return null;
    return { entries: entries, miles: miles, feelCount: feelN,
             avgFeel: feelN ? (feelSum / feelN) : null };
  }

  //     PLAN BUILDER — pure: inputs plus today in, a plan object out
  function generateRunPlan(inp, today) {
    var dist = RACE_DISTANCES[inp.distance];
    var level = RUN_LEVELS[inp.level];
    var race = parseDateKey(inp.raceDate);
    if (!dist || !level || !race) return null;
    if (dayDiff(today, race) < 7) return { error: 'That race is under a week out — there is no block left to build. Pick a later date.' };

    var blocks = buildRunWeeks(today, race);
    var week0 = (blocks[0] && blocks[0].partial) ? blocks[0] : null;
    var main = blocks.filter(function(b) { return !b.partial; });
    if (!main.length) return { error: 'That race is under a week out — there is no block left to build. Pick a later date.' };
    var taperWeeks = main.length >= 10 ? dist.taperMax : dist.taperMin;
    if (taperWeeks >= main.length) taperWeeks = Math.max(1, main.length - 1);
    var buildCount = main.length - taperWeeks;

    var runWalk = inp.current <= 0;
    var baseline = runWalk ? 6 : inp.current;
    var curve = runMileageCurve(baseline, inp.peak, buildCount, level);

    //  A week can only carry as many runs as it has miles for. Six days on
    //  twelve miles is six token runs, not six sessions — so the day count is
    //  capped by the opening week's volume, once, for the whole plan.
    var effDays = Math.max(3, Math.min(inp.daysPerWeek, Math.floor(curve.first / 2.5)));
    var tpl = RUN_TEMPLATES[inp.longDow][effDays];
    var slots = [];
    Object.keys(tpl).forEach(function(k) {
      var type = tpl[k];
      if (type === 'tempo' && !level.tempo) type = 'easy';   // no threshold work without a base
      slots.push({ dow: +k, type: type });
    });
    slots.sort(function(a, b) { return a.dow - b.dow; });

    //  A day structure has a ceiling of its own: the long run plus the other
    //  days at three quarters of it. Asking 3 days a week to carry 40 miles
    //  means one of them stops being a training run. Peak yields, not the
    //  user's schedule.
    var structuralMax = dist.longCeil + (slots.length - 1) * Math.max(3, Math.round(dist.longCeil * 0.75));
    if (curve.peak > structuralMax) {
      var wanted = curve.requested;
      curve = runMileageCurve(baseline, structuralMax, buildCount, level);
      curve.capped = true;
      curve.requested = wanted;
      curve.structural = effDays;
    }

    var typeOf = {};
    slots.forEach(function(s) { typeOf[s.dow] = s.type; });
    var cfg = { dist: dist, level: level, peak: curve.peak, slots: slots, longDow: inp.longDow, daysPerWeek: effDays };

    //  Lift days: the long run day stays lift-free unless the user insists, and
    //  the days with no run are ranked first so heavy lower body lands there
    var liftSet = {}, liftCount = 0;
    if (inp.liftDays > 0) {
      var rank = { 'undefined': 0, 'recovery': 1, 'easy': 2, 'tempo': 3, 'long': 4 };
      var cand = [];
      for (var d = 0; d < 7; d++) {
        if (d === inp.liftRestDow) continue;
        if (d === inp.longDow && !inp.liftOnLongRun) continue;
        cand.push(d);
      }
      cand.sort(function(a, b) { return (rank[typeOf[a]] || 0) - (rank[typeOf[b]] || 0) || a - b; });
      cand.slice(0, inp.liftDays).forEach(function(x) { liftSet[x] = true; liftCount++; });
    }

    //  WEEKLY ADAPTATION — the plan proposes, last week's logged feel disposes.
    //  Feel 7+ advances as planned, 4–6.9 holds at what was actually run, under
    //  4 steps back 12.5% off it. Missing data never adapts: no logs, or logs
    //  with no distance, and the original number stands. This moves the weekly
    //  target only — dates, taper length and race day are already fixed above.
    var adapt = {};
    var dists = {};
    curve.series.forEach(function(s) {
      var prevBlock = (s.week === 1) ? week0 : main[s.week - 2];
      var st = runWeekLogStats(prevBlock);
      var miles = s.miles, reason = null;
      if (st && st.avgFeel != null && st.miles > 0) {
        var avg = st.avgFeel.toFixed(1);
        var want = (st.avgFeel < 4) ? Math.round(st.miles * 0.875)
                 : (st.avgFeel < 7) ? Math.round(st.miles) : null;
        if (want != null) {
          // The week still cannot go below what its run days can carry, so the
          // note has to quote the number actually scheduled, not the one asked
          // for — otherwise it claims a total the table does not show.
          var floorMi = 3 + 2 * Math.max(0, slots.length - 1);
          miles = Math.max(floorMi, want);
          reason = (st.avgFeel < 4 ? 'Adjusted to ' : 'Held at ') + miles
            + 'mi, last week averaged ' + avg + '/10'
            + (miles > want ? ' (floor for ' + slots.length + ' run days)' : '');
        }
      }
      adapt[s.week] = { miles: miles, planned: s.miles, reason: reason };
      dists[s.week] = runDistribute(miles, s.week, cfg, s.phase === 'Peak');
    });
    var longDow = inp.longDow;
    var firstEasyDow = null;
    slots.forEach(function(s) { if (firstEasyDow === null && s.type === 'easy') firstEasyDow = s.dow; });
    var tempoDow = null;
    slots.forEach(function(s) { if (s.type === 'tempo') tempoDow = s.dow; });
    //  A race close enough that there is no build phase left still gets a taper
    var peakWeek = curve.series.length ? curve.series[curve.series.length - 1] : null;
    var peakMap = peakWeek ? dists[peakWeek.week] : null;
    var peakEasy = (peakMap && firstEasyDow !== null && peakMap[firstEasyDow])
      ? peakMap[firstEasyDow] : Math.max(2, Math.round(baseline / Math.max(1, slots.length)));
    var peakTempo = (peakMap && tempoDow !== null && peakMap[tempoDow]) ? peakMap[tempoDow] : peakEasy;

    //  Race-pace dress rehearsal on the last two long runs
    var raceTail = {};
    if (buildCount >= 2) { raceTail[buildCount] = 2; raceTail[buildCount - 1] = 1; }
    else if (buildCount === 1) { raceTail[1] = 2; }

    var weeks = [];

    function blankCells(block) {
      var cells = [];
      for (var d = 0; d < 7; d++) {
        var date = addDays(block.start, d - mondayIndex(block.start));
        cells.push({ dow: d, date: date, miles: 0, lift: false,
          before: date < block.start, after: date > block.end });
      }
      return cells;
    }

    //  The lifting program deloads every 4th training week. Running week N maps
    //  onto the lifting week the user is on now plus N-1. Where a lift deload
    //  meets a running cutback both simply apply — no compensating logic.
    function liftWeekFor(n) { return currentTrainWeek + Math.max(0, n - 1); }

    //  WEEK 0 — a restart week, all easy, no tempo, reduced long run. Runs fill
    //  from the earliest day available, skipping every other one.
    if (week0) {
      var w1 = dists[1] || {};
      var easyMiles = (firstEasyDow !== null && w1[firstEasyDow]) ? w1[firstEasyDow] : Math.max(2, peakEasy);
      var w1Long = w1[longDow] || Math.max(3, Math.round(baseline / 3));
      var startDow = mondayIndex(week0.start);
      var avail = [];
      for (var a = startDow; a <= mondayIndex(week0.end); a++) avail.push(a);
      var anchors = [];
      if (avail.indexOf(longDow) !== -1) anchors.push(longDow);
      var recDow = null;
      slots.forEach(function(s) { if (s.type === 'recovery') recDow = s.dow; });
      if (recDow !== null && avail.indexOf(recDow) !== -1) anchors.push(recDow);
      var target = Math.max(1, Math.round(effDays * avail.length / 7));
      var free = avail.filter(function(x) { return anchors.indexOf(x) === -1; });
      var picks = [];
      for (var j = 0; j < free.length && picks.length < target - anchors.length; j += 2) picks.push(free[j]);
      for (var k2 = 0; k2 < free.length && picks.length < target - anchors.length; k2++) {
        if (picks.indexOf(free[k2]) === -1) picks.push(free[k2]);
      }
      picks.sort(function(a, b) { return a - b; });
      var stridesDow = picks.length ? picks[picks.length - 1] : null;
      var cells0 = blankCells(week0);
      var total0 = 0;
      cells0.forEach(function(c) {
        if (c.before || c.after) return;
        c.lift = !!liftSet[c.dow];
        if (c.dow === longDow && anchors.indexOf(longDow) !== -1) {
          c.type = 'long'; c.miles = Math.max(3, Math.round(w1Long * 0.85));
        } else if (c.dow === recDow && anchors.indexOf(recDow) !== -1) {
          c.type = 'easy'; c.miles = easyMiles;
        } else if (picks.indexOf(c.dow) !== -1) {
          c.type = 'easy'; c.miles = easyMiles; c.strides = (c.dow === stridesDow);
        }
        total0 += c.miles;
      });
      weeks.push({ num: 0, phase: 'Restart', block: week0, cells: cells0, miles: total0,
        liftDeload: liftCount > 0 && isDeloadWeek(currentTrainWeek) });
    }

    //  BUILD WEEKS
    curve.series.forEach(function(s) {
      var block = main[s.week - 1];
      var dmap = dists[s.week];
      var cells = blankCells(block);
      var total = 0;
      cells.forEach(function(c) {
        c.lift = !!liftSet[c.dow];
        c.type = typeOf[c.dow];
        c.miles = dmap[c.dow] || 0;
        if (c.type === 'long' && raceTail[s.week]) c.tail = raceTail[s.week];
        if (c.type === 'tempo' && s.week === 1) c.firstTempo = true;
        if (c.type === 'easy' && !level.tempo && c.dow === firstEasyDow) c.strides = true;
        total += c.miles;
      });
      weeks.push({ num: s.week, phase: s.phase, block: block, cells: cells, miles: total,
        planned: adapt[s.week].planned, adaptReason: adapt[s.week].reason,
        liftDeload: liftCount > 0 && isDeloadWeek(liftWeekFor(s.week)) });
    });

    //  TAPER — the weeks before race week come off peak; race week itself is
    //  scripted: shakeout two days out, full rest the day before, race day.
    var taperFactors = [0.75, 0.60, 0.50];
    for (var t = 0; t < taperWeeks; t++) {
      var wNum = buildCount + 1 + t;
      var block2 = main[wNum - 1];
      var isRaceWeek = (t === taperWeeks - 1);
      var cells2 = blankCells(block2);
      var total2 = 0;
      if (!isRaceWeek) {
        var tMiles = Math.round(curve.peak * (taperFactors[t] || 0.5));
        var tmap = runDistribute(tMiles, wNum, cfg, false);
        cells2.forEach(function(c) {
          c.lift = !!liftSet[c.dow];
          c.type = typeOf[c.dow];
          c.miles = tmap[c.dow] || 0;
          total2 += c.miles;
        });
      } else {
        var raceDow = mondayIndex(race);
        var stridesDow2 = null;
        cells2.forEach(function(c) {
          if (c.after) return;
          c.lift = !!liftSet[c.dow];
          if (c.dow === raceDow) { c.race = true; c.miles = dist.miles; c.lift = false; return; }
          if (c.dow === raceDow - 1) { c.fullRest = true; c.lift = false; return; }
          if (c.dow === raceDow - 2) { c.shakeout = true; c.type = 'easy'; c.miles = 2; c.lift = false; return; }
          var slotType = typeOf[c.dow];
          if (!slotType || slotType === 'long') return;
          c.type = 'easy';
          if (slotType === 'tempo') { c.miles = Math.max(2, Math.round(peakTempo * 0.50)); stridesDow2 = c.dow; }
          else { c.miles = Math.max(2, Math.round(peakEasy * 0.65)); }
        });
        cells2.forEach(function(c) {
          if (c.dow === stridesDow2) c.strides = true;
          total2 += c.miles;
        });
      }
      weeks.push({ num: wNum, phase: isRaceWeek ? 'Taper + Race' : 'Taper', block: block2,
        cells: cells2, miles: total2,
        liftDeload: liftCount > 0 && isDeloadWeek(liftWeekFor(wNum)) });
    }

    //  FLAGS — surfaced above the table, never buried in the copy
    var flags = [];
    if (curve.capped && curve.structural) {
      flags.push('<strong>Peak capped at ' + curve.peak + ' mi.</strong> ' + curve.structural
        + ' run days cannot carry ' + curve.requested + ' mi without one of them becoming a second long run. '
        + 'This plan builds to ' + curve.peak + ' mi instead — add a run day to go higher.');
    } else if (curve.capped) {
      flags.push('<strong>Peak capped at ' + curve.peak + ' mi.</strong> Your ' + curve.requested
        + ' mi target needs a bigger week-over-week jump than the '
        + Math.round(level.ramp * 100) + '% ramp rule allows in ' + buildCount
        + ' build weeks. This plan builds to ' + curve.peak + ' mi instead — move the race back or start earlier to reach ' + curve.requested + '.');
    }
    if (baseline > 0 && curve.peak / baseline > 3 && main.length < 10) {
      flags.push('<strong>Injury risk.</strong> ' + baseline + ' mi to ' + curve.peak + ' mi is more than a 3× jump in '
        + main.length + ' weeks. It is programmed as asked, but this is the shape that produces stress fractures and tendon problems. Consider a lower peak or a later race.');
    }
    if (inp.liftDays >= 5 && curve.peak >= 25) {
      flags.push('<strong>Lifting and running are both near max.</strong> ' + inp.liftDays + ' lift days against a '
        + curve.peak + ' mi peak. Drop lower body volume — not upper — through the peak and taper weeks. Legs cannot recover from both.');
    }
    if (inp.liftDays > liftCount && inp.liftDays > 0) {
      flags.push('<strong>' + liftCount + ' lift days scheduled, not ' + inp.liftDays + '.</strong> Your long run day stays lift-free so nothing heavy lands on the same legs. Upper body only if you insist on lifting that day.');
    }
    if (effDays < inp.daysPerWeek) {
      flags.push('<strong>' + effDays + ' run days, not ' + inp.daysPerWeek + '.</strong> At ' + curve.first
        + ' mi in the opening week, ' + inp.daysPerWeek + ' days means runs too short to be worth changing for. '
        + 'The day count rises on its own once volume supports it — raise current mileage or the peak target to unlock more.');
    }
    if (buildCount < 1) {
      flags.push('<strong>No build phase left.</strong> There is only time to taper and race. Nothing below builds fitness — it keeps you fresh for race day, which is the only useful thing to do this close in.');
    }
    if (inp.level === 'new' && inp.distance === 'marathon') {
      flags.push('<strong>A marathon is not a first race.</strong> Build a longer base and race a half first. The plan below is generated as asked, but the mileage a new runner needs for 26.2 is not something this block can safely produce.');
    }
    if (runWalk) {
      flags.push('<strong>Run/walk progression.</strong> Current mileage is 0, so this starts on timed run/walk intervals and moves to continuous running around week 7. Miles are approximate at about 11 min/mi.');
    }
    if (!parsePR(inp.pr)) {
      flags.push('<strong>No PR given — effort zones only.</strong> Run a time trial in week 2 or 3 (a hard 1 or 2 miles) and enter the result above to unlock real pace numbers. Guessing a pace and presenting it as fact is worse than no number.');
    }

    return {
      weeks: weeks, flags: flags, dist: dist, level: level, curve: curve,
      paces: runPaceZones(parsePR(inp.pr), dist), runWalk: runWalk,
      buildCount: buildCount, taperWeeks: taperWeeks, totalWeeks: main.length,
      liftCount: liftCount, race: race
    };
  }

  //     CELL TEXT — the schedule reads the way it would be written on paper.
  //     The run half is split out so the combined calendar can show the run on
  //     its own line under the lift session without the "Lift + " prefix.
  function runCellBody(c, plan) {
    if (c.race) return 'RACE: ' + plan.dist.label;
    if (c.shakeout) return '2mi easy shakeout';
    if (!(c.miles > 0)) return '';
    var m = fmtMiles(c.miles);
    if (plan.runWalk && c.type !== 'long') return runWalkText(c.miles * 11, c.week || 1);
    if (c.type === 'long') return m + 'mi long, ' + (c.tail ? 'last ' + c.tail + 'mi at ' + plan.dist.pace : 'easy');
    if (c.type === 'tempo') return m + 'mi tempo' + (c.firstTempo ? ' (1 to 2mi at tempo effort)' : '');
    return m + 'mi easy' + (c.strides ? ', strides' : '');
  }

  function runCellText(c, plan) {
    if (c.before) return '(already past)';
    if (c.after)  return '(' + fmtRunDate(c.date) + ': full rest/recovery, outside this block)';
    if (c.race)   return 'RACE: ' + plan.dist.label;
    if (c.fullRest) return 'Full rest, no lift no run';
    if (c.shakeout) return '2mi easy shakeout, no lift';
    var body = runCellBody(c, plan);
    if (c.lift) return body ? 'Lift + ' + body : 'Lift only';
    return body || '—';
  }

  //     LOG INPUTS — only on run days that have already happened. You cannot
  //     log a run you have not done, and hiding them forward keeps the grid
  //     readable. Same markup shape as the lift side's inline log rows.
  function runLogInputsHTML(c) {
    var k = dateKeyOfRun(c.date);
    var e = runLogs[k] || {};
    var mi = (e.miles != null && e.miles !== '') ? e.miles : '';
    var tm = e.secs ? secsToClock(e.secs) : '';
    var hr = (e.hr != null && e.hr !== '') ? e.hr : '';
    var fl = (e.feel != null && e.feel !== '') ? e.feel : '';
    var on = (mi !== '' || tm !== '' || hr !== '' || fl !== '');
    function inp(id, label, val, extra) {
      return '<div class="run-log-group"><span class="run-log-label">' + label + '</span>'
        + '<input class="run-log-input' + (val !== '' ? ' logged' : '') + '" id="rl-' + id + '-' + k
        + '" data-k="' + k + '" value="' + val + '" ' + extra
        + ' oninput="onRunLogEdit(this.dataset.k)"></div>';
    }
    return '<div class="run-log" onclick="event.stopPropagation()">'
      + '<div class="run-log-row">'
      + inp('mi', 'Miles', mi, 'type="number" step="0.1" min="0" inputmode="decimal"')
      + inp('tm', 'Time', tm, 'type="text" inputmode="numeric" placeholder="32:10"')
      + '</div>'
      + '<div class="run-log-row">'
      + inp('hr', 'Avg HR', hr, 'type="number" min="0" inputmode="numeric"')
      + inp('fl', 'Feel 1–10', fl, 'type="number" min="1" max="10" inputmode="numeric"')
      + '</div>'
      + '<div class="run-log-pace' + (on ? ' on' : '') + '" id="rlp-' + k + '">'
      + runLogPaceText(e) + '</div></div>';
  }

  function runLogPaceText(e) {
    var m = parseFloat(e && e.miles), s = parseFloat(e && e.secs);
    if (!isNaN(m) && m > 0 && !isNaN(s) && s > 0) return fmtPace(s / m) + ' /mi';
    var f = parseFloat(e && e.feel);
    if (!isNaN(f) && f > 0) return 'felt ' + f + '/10 · 1 rough, 10 great';
    return '1 rough · 10 great';
  }

  
module.exports={generateRunPlan:generateRunPlan,runCellText:runCellText,fmtRunDate:fmtRunDate,fmtMiles:fmtMiles};
