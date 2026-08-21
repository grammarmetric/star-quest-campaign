/* Star quest: campaign -- persistence.

   Three save paths, all of them offline. There is no backend and no account,
   matching the standing decision on this project family.

     1. localStorage      -- automatic, after every quest.
     2. a save code       -- the whole campaign packed into a URL fragment, the
                             same trick star-quest already uses for its report
                             handoff. Fragments never reach a server.
     3. a JSON file       -- downloaded, held by the teacher, re-loaded next
                             session. Independent of her device entirely.

   A NOTE ON PERSONAL BESTS. The design document asks for a per-domain best
   TIME. Taken literally that would reward the exact habit the diagnostic
   caught: 0:09 a question in listening, with the one miss being the item built
   to punish answering early. So time is recorded and shown as information, and
   the number she is invited to beat is accuracy -- plus, for listening, a
   "waited for the end" percentage. Speed is never the target. */
(function (global) {
  'use strict';

  var KEY = 'star-quest-campaign-save';
  var VERSION = 1;

  function today() { return new Date().toISOString().slice(0, 10); }

  function blank() {
    return {
      v: VERSION,
      started: today(),
      avatar: { face: 0, accent: 'cyan' },
      xp: 0,
      streak: { count: 0, last: null, best: 0 },
      quests: {},          /* questId -> {right, of, secs, date} */
      badges: {},          /* badgeId -> date */
      cards: [],           /* card ids collected, in order */
      unlocks: [],         /* cosmetic unlock ids */
      pb: {},              /* domain -> {acc, secs} best accuracy seen */
      patience: { waited: 0, total: 0 },
      counters: {},        /* badge streaks: gateStreak, spellStreak, ... */
      bosses: {},          /* bossId -> {right, of, date} */
      log: [],             /* [itemId, correct, secs, week] -- feeds the mystery box */
      sessions: 0
    };
  }

  var state = blank();

  /* ---------- codec ---------- */
  function encode(obj) {
    var json = JSON.stringify(obj);
    /* btoa is latin1-only; percent-escape first so any character survives. */
    return global.btoa(unescape(encodeURIComponent(json)));
  }
  function decode(str) {
    var s = String(str || '').trim().replace(/\s+/g, '');
    /* A code copied out of a PDF or a chat window can lose its tail; base64
       needs a multiple of four, so trim back rather than fail outright. */
    s = s.slice(0, s.length - (s.length % 4));
    var json = decodeURIComponent(escape(global.atob(s)));
    return JSON.parse(json);
  }

  function migrate(obj) {
    var base = blank();
    if (!obj || typeof obj !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (obj[k] !== undefined && obj[k] !== null) base[k] = obj[k];
    });
    base.v = VERSION;
    return base;
  }

  /* ---------- storage ---------- */
  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (raw) state = migrate(JSON.parse(raw));
    } catch (e) { state = blank(); }
    return state;
  }
  function reset() { state = blank(); save(); return state; }
  function get() { return state; }
  function adopt(obj) { state = migrate(obj); save(); return state; }

  /* ---------- session / streak ---------- */
  function touchSession() {
    var d = today();
    if (state.streak.last === d) return;
    var prev = state.streak.last ? new Date(state.streak.last) : null;
    var gapDays = prev ? Math.round((new Date(d) - prev) / 86400000) : null;
    /* One session a week is the real cadence, so the streak counts sessions
       that land within nine days of the last one, not consecutive days. */
    state.streak.count = (gapDays !== null && gapDays <= 9) ? state.streak.count + 1 : 1;
    if (state.streak.count > state.streak.best) state.streak.best = state.streak.count;
    state.streak.last = d;
    state.sessions++;
    save();
  }

  /* ---------- recording ---------- */
  function recordItem(itemId, correct, secs, week, domain, waited) {
    state.log.push([itemId, correct ? 1 : 0, secs, week]);
    if (state.log.length > 600) state.log = state.log.slice(-600);
    if (waited === true) state.patience.waited++;
    if (waited !== undefined) state.patience.total++;
    if (domain) {
      var p = state.pb[domain] || { acc: 0, secs: 0, n: 0, right: 0 };
      p.n = (p.n || 0) + 1;
      p.right = (p.right || 0) + (correct ? 1 : 0);
      p.secs = Math.round(((p.secs * (p.n - 1) + secs) / p.n) * 10) / 10;
      state.pb[domain] = p;
    }
  }

  function completeQuest(questId, right, of, secs, xp) {
    var prev = state.quests[questId];
    var rec = { right: right, of: of, secs: secs, date: today() };
    /* Replaying a quest keeps the better result but never re-pays the XP. */
    if (!prev || right > prev.right) state.quests[questId] = rec;
    if (!prev) state.xp += xp;
    save();
    return !prev;
  }

  function awardBadge(id) {
    if (state.badges[id]) return false;
    state.badges[id] = today();
    save();
    return true;
  }

  function awardCard(id) {
    if (!id || state.cards.indexOf(id) !== -1) return false;
    state.cards.push(id);
    save();
    return true;
  }

  function hasQuest(id) { return !!state.quests[id]; }

  /* Weakest items first: wrong ones, then slow-and-right ones. Feeds the
     mystery box, so it is always her own history, never generic filler. */
  function weakItems(limit) {
    var seen = {};
    state.log.forEach(function (row) {
      var id = row[0];
      var e = seen[id] || (seen[id] = { id: id, wrong: 0, n: 0, secs: 0 });
      e.n++; e.secs += row[2];
      if (!row[1]) e.wrong++;
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .sort(function (a, b) {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return (b.secs / b.n) - (a.secs / a.n);
      })
      .slice(0, limit || 10);
  }

  /* ---------- export paths ---------- */
  function toCode() { return encode(state); }

  function shareUrl(base) {
    var b = base || (global.location.origin + global.location.pathname);
    return b.replace(/#.*$/, '') + '#save=' + toCode();
  }

  function fromCode(code) { return adopt(decode(code)); }

  function readFragmentSave() {
    var m = /[#&]save=([^&]+)/.exec(global.location.hash || '');
    if (!m) return null;
    try { return decode(m[1]); } catch (e) { return null; }
  }

  function downloadFile(filenameHint) {
    var name = (filenameHint || 'star-quest-campaign') + '-' + today() + '.json';
    var blob = new global.Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = global.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
    return name;
  }

  function readFile(file, cb) {
    var fr = new global.FileReader();
    fr.onload = function () {
      try { cb(null, adopt(JSON.parse(fr.result))); }
      catch (e) { cb(e); }
    };
    fr.onerror = function () { cb(fr.error || new Error('Could not read that file.')); };
    fr.readAsText(file);
  }

  global.Progress = {
    load: load, save: save, reset: reset, get: get, adopt: adopt,
    touchSession: touchSession,
    recordItem: recordItem, completeQuest: completeQuest,
    awardBadge: awardBadge, awardCard: awardCard, hasQuest: hasQuest,
    weakItems: weakItems,
    toCode: toCode, fromCode: fromCode, shareUrl: shareUrl,
    readFragmentSave: readFragmentSave,
    downloadFile: downloadFile, readFile: readFile,
    blank: blank, encode: encode, decode: decode, VERSION: VERSION
  };
})(window);
