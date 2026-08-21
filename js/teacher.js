/* Teacher view -- reads a save (file, code, or this device) and reports.

   Deliberately answers the questions the diagnostic raised, not the ones a
   generic dashboard would: did she wait for the end of the clip, which items
   are still costing her time, and which ceilings have actually moved. */
(function (global) {
  'use strict';

  var THEME_KEY = 'star-quest-theme';
  var out, CAMPAIGN = null, WEEKS = {}, INDEX = {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function getJSON(u) {
    return fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(u + ' -> ' + r.status);
      return r.json();
    });
  }

  /* ---------- the report ---------- */
  function report(s) {
    out.innerHTML = '';
    if (!s) {
      var e = el('div', 'fb alert');
      e.appendChild(el('div', 'fbt', 'Nothing to read.'));
      e.appendChild(el('div', 'fbw', 'That code or file could not be understood.'));
      out.appendChild(e);
      return;
    }

    /* headline */
    var head = el('div', 'hud');
    head.style.marginTop = '18px';
    var av = el('div', 'avatar', '★');
    head.appendChild(av);
    var mid = el('div');
    mid.appendChild(el('div', 'who', s.xp + ' XP · ' + s.cards.length + ' cards · ' +
      Object.keys(s.badges).length + ' badges'));
    mid.appendChild(el('div', 'rank', 'Started ' + s.started + ' · ' + s.sessions +
      (s.sessions === 1 ? ' session' : ' sessions') + ' · last ' + (s.streak.last || '—')));
    head.appendChild(mid);
    var st = el('div', 'streak');
    st.appendChild(el('b', null, String(s.streak.count)));
    st.appendChild(el('span', null, 'in a row'));
    head.appendChild(st);
    out.appendChild(head);

    /* the two headline findings */
    out.appendChild(sectionPatience(s));
    out.appendChild(sectionDomains(s));
    out.appendChild(sectionWeeks(s));
    out.appendChild(sectionWeak(s));
    out.appendChild(sectionBadges(s));
  }

  function h2(text, note) {
    var h = el('h2', null, text);
    h.style.margin = '28px 0 6px';
    var wrap = document.createDocumentFragment();
    wrap.appendChild(h);
    if (note) wrap.appendChild(el('p', 'subprompt', note));
    return wrap;
  }

  /* Did she wait? This is the number the whole campaign was built around. */
  function sectionPatience(s) {
    var box = el('div');
    box.appendChild(h2('Did she wait for the end?',
      'Every gated listening item physically locks its answers until the clip finishes. This counts how many she has met.'));
    var card = el('div', 'week');
    var p = s.patience || { waited: 0, total: 0 };
    if (!p.total) {
      card.appendChild(el('p', 'why', 'No gated listening items played yet. Week 1 is where these start.'));
    } else {
      var line = el('p', 'prompt', p.waited + ' of ' + p.total + ' gated items');
      card.appendChild(line);
      card.appendChild(el('p', 'why',
        'On 20 August she averaged nine seconds a question in listening, and the one item she lost was the one built to punish answering early. ' +
        'Every item counted here is one she could not answer early.'));
    }
    var gs = (s.counters && s.counters.gateStreak) || 0;
    card.appendChild(el('p', 'src', 'Current run of correct gated items: ' + gs + ' (six earns Tense Detective)'));
    box.appendChild(card);
    return box;
  }

  function sectionDomains(s) {
    var box = el('div');
    box.appendChild(h2('By skill',
      'Accuracy is the number to beat. Time is shown because it is informative, not because faster is better.'));
    var card = el('div', 'week');
    var base = {
      grammar: { label: 'Grammar', was: '5/5 · A2 Key (real ceiling)', secs: 48 },
      vocabulary: { label: 'Vocabulary', was: '4/5 · A2 Key', secs: 55 },
      reading: { label: 'Reading', was: '4/5 · A1+ (never capped)', secs: 26 },
      listening: { label: 'Listening', was: '4/5 · A1+ (never capped)', secs: 9 },
      spelling: { label: 'Spelling', was: 'the camera item', secs: 120 }
    };
    var any = false;
    Object.keys(base).forEach(function (d) {
      var p = s.pb[d];
      if (!p || !p.n) return;
      any = true;
      var acc = Math.round((p.right / p.n) * 100);
      var row = el('div');
      row.style.padding = '10px 0';
      row.style.borderTop = '1px solid var(--border)';
      var top = el('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.gap = '10px';
      top.appendChild(el('span', null, base[d].label));
      var r = el('span', null, p.right + '/' + p.n + '  ·  ' + acc + '%  ·  ' + p.secs + 's a question');
      r.style.color = 'var(--muted)';
      r.style.fontSize = '0.9rem';
      top.appendChild(r);
      row.appendChild(top);
      var bar = el('div', 'xpbar');
      var f = el('i');
      f.style.width = acc + '%';
      bar.appendChild(f);
      row.appendChild(bar);
      var was = el('div', 'src', '20 Aug: ' + base[d].was + ' · ' + base[d].secs + 's');
      was.style.marginTop = '4px';
      row.appendChild(was);
      card.appendChild(row);
    });
    if (!any) card.appendChild(el('p', 'why', 'No items answered yet.'));
    box.appendChild(card);
    return box;
  }

  function sectionWeeks(s) {
    var box = el('div');
    box.appendChild(h2('The twelve weeks', null));
    if (!CAMPAIGN) { box.appendChild(el('p', 'note', 'Campaign structure still loading.')); return box; }
    CAMPAIGN.regions.forEach(function (r) {
      var card = el('div', 'week');
      if (r.accent) card.setAttribute('data-accent', r.accent);
      card.appendChild(el('h3', null, r.id + '. ' + r.name));
      r.weeks.forEach(function (n) {
        var w = CAMPAIGN.weeks.filter(function (x) { return x.n === n; })[0];
        var line = el('div');
        line.style.display = 'flex';
        line.style.justifyContent = 'space-between';
        line.style.gap = '10px';
        line.style.padding = '8px 0';
        line.style.borderTop = '1px solid var(--border)';
        line.appendChild(el('span', null, 'Week ' + n + ' — ' + w.title));
        var bits = (w.quests || []).map(function (q) {
          var rec = s.quests[q.id];
          return rec ? (rec.right + '/' + rec.of) : '–';
        });
        if (w.boss) bits.push(s.bosses[w.boss.id] ? 'boss ✓' : 'boss –');
        var rr = el('span', null, bits.join('  '));
        rr.style.color = 'var(--muted)';
        rr.style.fontSize = '0.9rem';
        rr.style.whiteSpace = 'nowrap';
        line.appendChild(rr);
        card.appendChild(line);
      });
      box.appendChild(card);
    });
    return box;
  }

  function sectionWeak(s) {
    var box = el('div');
    box.appendChild(h2('What to put in the mystery box',
      'Wrong answers first, then the ones that took longest. This is exactly what the in-game box pulls from.'));
    var card = el('div', 'week');
    var weak = weakFrom(s, 12);
    if (!weak.length) {
      card.appendChild(el('p', 'why', 'Nothing logged yet.'));
    } else {
      weak.forEach(function (x) {
        var it = INDEX[x.id];
        var line = el('div');
        line.style.padding = '8px 0';
        line.style.borderTop = '1px solid var(--border)';
        var t = el('div', null, it ? (it.item.prompt || it.item.word || x.id) : x.id);
        line.appendChild(t);
        var meta = el('div', 'src', x.wrong + ' wrong of ' + x.n + ' · ' +
          (Math.round((x.secs / x.n) * 10) / 10) + 's average' +
          (it ? ' · week ' + it.week + ' · ' + it.item.domain : ''));
        line.appendChild(meta);
        card.appendChild(line);
      });
    }
    box.appendChild(card);
    return box;
  }

  function weakFrom(s, limit) {
    var seen = {};
    (s.log || []).forEach(function (row) {
      var e = seen[row[0]] || (seen[row[0]] = { id: row[0], wrong: 0, n: 0, secs: 0 });
      e.n++; e.secs += row[2];
      if (!row[1]) e.wrong++;
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .filter(function (e) { return e.wrong > 0 || (e.secs / e.n) > 30; })
      .sort(function (a, b) {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return (b.secs / b.n) - (a.secs / a.n);
      }).slice(0, limit || 12);
  }

  function sectionBadges(s) {
    var box = el('div');
    box.appendChild(h2('Badges and cards', null));
    var g = el('div', 'badges');
    (CAMPAIGN ? CAMPAIGN.badges : []).forEach(function (b) {
      var has = !!s.badges[b.id];
      var n = el('div', 'badge' + (has ? '' : ' locked'));
      if (b.accent) n.setAttribute('data-accent', b.accent);
      var i = el('div', 'bi', has ? b.icon : '·');
      n.appendChild(i);
      n.appendChild(el('div', 'bn', b.name));
      n.appendChild(el('div', 'bw', has ? ('Earned ' + s.badges[b.id]) : b.why));
      g.appendChild(n);
    });
    box.appendChild(g);
    var c = el('p', 'note', s.cards.length + ' of ' + global.Cards.count + ' cards found: ' +
      s.cards.map(function (id) { return global.Cards.label(id); }).join(', '));
    box.appendChild(c);
    return box;
  }

  /* ---------- inputs ---------- */
  function fromAnything(text) {
    var t = String(text || '').trim();
    var m = /[#&]save=([^&\s]+)/.exec(t);
    var code = m ? m[1] : t;
    try { return global.Progress.decode(code); } catch (e) { return null; }
  }

  function applyTheme(mode) {
    if (mode) document.documentElement.setAttribute('data-theme', mode);
    else document.documentElement.removeAttribute('data-theme');
    var dark = mode === 'dark' ||
      (!mode && global.matchMedia('(prefers-color-scheme: dark)').matches);
    var b = document.getElementById('themeBtn');
    if (b) {
      b.innerHTML = global.Icons.svg(dark ? 'sun' : 'moon');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function boot() {
    out = document.getElementById('out');

    try { applyTheme(global.localStorage.getItem(THEME_KEY) || null); }
    catch (e) { applyTheme(null); }
    document.getElementById('themeBtn').addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme');
      var next = now === 'dark' ? 'light' : 'dark';
      try { global.localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });

    var picker = document.getElementById('filePicker');
    document.getElementById('openFile').addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () {
      if (!picker.files || !picker.files[0]) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { report(JSON.parse(fr.result)); }
        catch (e) { report(null); }
      };
      fr.readAsText(picker.files[0]);
    });
    document.getElementById('readCode').addEventListener('click', function () {
      report(fromAnything(document.getElementById('codeBox').value));
    });
    document.getElementById('readLocal').addEventListener('click', function () {
      report(global.Progress.load());
    });

    /* a code in this page's own address bar */
    var frag = global.Progress.readFragmentSave();

    getJSON('content/campaign.json').then(function (c) {
      CAMPAIGN = c;
      return Promise.all(c.weeks.map(function (w) {
        var f = 'content/week' + (w.n < 10 ? '0' : '') + w.n + '.json';
        return getJSON(f).then(function (wf) { WEEKS[w.n] = wf; }).catch(function () {});
      }));
    }).then(function () {
      Object.keys(WEEKS).forEach(function (n) {
        var wf = WEEKS[n];
        var take = function (it) { INDEX[it.id] = { item: it, week: Number(n) }; };
        Object.keys(wf.quests || {}).forEach(function (q) { (wf.quests[q].items || []).forEach(take); });
        if (wf.boss && wf.boss.items) wf.boss.items.forEach(take);
      });
      if (frag) report(frag);
    }).catch(function () {
      if (frag) report(frag);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
