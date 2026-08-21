/* Star quest: campaign -- the game.

   Screens: welcome -> map -> region -> quest -> reward, plus collection and
   save. Everything is client-side; content arrives as JSON at boot.

   Her name never lives in this repository. It arrives at runtime through
   ?name= or the welcome input, is kept in its own localStorage key, and is
   deliberately NOT part of the save blob -- so a save code or a save file
   handed to a teacher carries progress and no personal data. */
(function (global) {
  'use strict';

  var el = global.Engine.el;
  var svg = function (n, s) { return global.Icons.svg(n, s); };

  var NAME_KEY = 'star-quest-campaign-name';
  var THEME_KEY = 'star-quest-theme';   /* shared with star-quest on purpose */

  var FACES = ['🦊', '🐢', '🦉', '🐙', '🦕', '🐝', '🐬', '🦜'];

  var CAMPAIGN = null;      /* campaign.json */
  var WEEKS = {};           /* n -> week file */
  var ITEM_INDEX = {};      /* itemId -> {item, week} */
  var app, hud;

  /* ------------------------------------------------------------------ util */
  function name() {
    try { return global.localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }
  function setName(v) {
    try { global.localStorage.setItem(NAME_KEY, v || ''); } catch (e) {}
  }
  function S() { return global.Progress.get(); }

  function rankFor(xp) {
    var ranks = CAMPAIGN.meta.ranks, out = ranks[0];
    for (var i = 0; i < ranks.length; i++) if (xp >= ranks[i][0]) out = ranks[i];
    return out;
  }
  function nextRank(xp) {
    var ranks = CAMPAIGN.meta.ranks;
    for (var i = 0; i < ranks.length; i++) if (xp < ranks[i][0]) return ranks[i];
    return null;
  }
  function regionById(id) {
    return CAMPAIGN.regions.filter(function (r) { return r.id === id; })[0];
  }
  function weekByN(n) {
    return CAMPAIGN.weeks.filter(function (w) { return w.n === n; })[0];
  }
  function questsOfWeek(w) { return w.quests || []; }

  function weekDone(w) {
    var qs = questsOfWeek(w);
    var all = qs.every(function (q) { return global.Progress.hasQuest(q.id); });
    if (w.boss) all = all && !!S().bosses[w.boss.id];
    return all;
  }
  function regionProgress(r) {
    var total = 0, done = 0;
    r.weeks.forEach(function (n) {
      var w = weekByN(n);
      questsOfWeek(w).forEach(function (q) {
        total++; if (global.Progress.hasQuest(q.id)) done++;
      });
      if (w.boss) { total++; if (S().bosses[w.boss.id]) done++; }
    });
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  /* A region opens when the one before it is finished. Week order inside a
     region is free -- the teacher decides what today is. */
  function regionUnlocked(r) {
    if (r.id === 1) return true;
    var prev = regionById(r.id - 1);
    return regionProgress(prev).pct === 100;
  }
  function bossUnlocked(w) {
    return questsOfWeek(w).every(function (q) { return global.Progress.hasQuest(q.id); });
  }

  function setAccent(node, accent) {
    if (accent) node.setAttribute('data-accent', accent);
    else node.removeAttribute('data-accent');
  }

  /* ------------------------------------------------------------------ hud */
  function renderHud() {
    var s = S();
    hud.innerHTML = '';
    var r = rankFor(s.xp), nx = nextRank(s.xp);

    var av = el('div', 'avatar');
    av.textContent = FACES[s.avatar.face % FACES.length];
    hud.appendChild(av);

    var mid = el('div');
    mid.appendChild(el('div', 'who', name() ? name() : 'Star explorer'));
    var rk = el('div', 'rank');
    rk.textContent = r[1] + ' · ' + s.xp + ' XP' +
      (nx ? '  (' + (nx[0] - s.xp) + ' to ' + nx[1] + ')' : '  · top rank');
    mid.appendChild(rk);
    var bar = el('div', 'xpbar');
    var fill = el('i');
    var lo = r[0], hi = nx ? nx[0] : (r[0] || 1);
    fill.style.width = (nx ? Math.max(3, ((s.xp - lo) / (hi - lo)) * 100) : 100) + '%';
    bar.appendChild(fill);
    mid.appendChild(bar);
    hud.appendChild(mid);

    var st = el('div', 'streak');
    st.appendChild(el('b', null, String(s.streak.count)));
    st.appendChild(el('span', null, s.streak.count === 1 ? 'session' : 'sessions in a row'));
    hud.appendChild(st);
  }

  /* --------------------------------------------------------------- screens */
  function show(node) {
    app.innerHTML = '';
    app.appendChild(node);
    global.scrollTo(0, 0);
  }

  /* ---- welcome ---- */
  function screenWelcome() {
    var wrap = el('div');
    setAccent(wrap, 'cyan');
    hud.classList.add('hidden');

    var h = el('h1', null, 'Star quest: the campaign');
    h.style.fontSize = '1.8rem';
    wrap.appendChild(h);
    wrap.appendChild(el('p', 'subprompt',
      'Twelve weeks, five places, one explorer. Everything you earn stays with you the whole way.'));

    var box = el('div', 'week');
    box.appendChild(el('h3', null, 'What shall we call you?'));
    var input = el('input', 'field');
    input.type = 'text';
    input.placeholder = 'Type your name';
    input.value = name();
    input.setAttribute('autocomplete', 'off');
    box.appendChild(input);

    box.appendChild(el('h3', null, 'Pick your explorer'));
    var faces = el('div', 'questrow');
    var chosen = S().avatar.face;
    FACES.forEach(function (f, i) {
      var b = el('button', 'quest');
      b.type = 'button';
      b.style.flex = '0 0 auto';
      b.style.fontSize = '1.8rem';
      b.textContent = f;
      if (i === chosen) b.classList.add('done');
      b.addEventListener('click', function () {
        chosen = i;
        Array.prototype.forEach.call(faces.children, function (c, j) {
          c.classList.toggle('done', j === i);
        });
      });
      faces.appendChild(b);
    });
    box.appendChild(faces);
    wrap.appendChild(box);

    var acts = el('div', 'actions');
    var go = el('button', 'btn wide', 'Open the map');
    go.type = 'button';
    go.addEventListener('click', function () {
      setName(input.value.trim());
      S().avatar.face = chosen;
      global.Progress.save();
      global.Progress.touchSession();
      hud.classList.remove('hidden');
      screenMap();
    });
    acts.appendChild(go);
    wrap.appendChild(acts);

    wrap.appendChild(el('p', 'note',
      'Your name is stored only on this device. It is never sent anywhere and never appears in a save code.'));
    show(wrap);
    input.focus();
  }

  /* ---- map ---- */
  function screenMap() {
    var wrap = el('div');
    hud.classList.remove('hidden');
    renderHud();

    wrap.appendChild(el('h2', null, 'The world map'));
    wrap.appendChild(el('p', 'subprompt', 'Five places, twelve weeks. Finish a place to open the next one.'));

    var map = el('div', 'map');
    CAMPAIGN.regions.forEach(function (r) {
      var open = regionUnlocked(r);
      var p = regionProgress(r);
      var b = el('button', 'region' + (r.accent ? '' : ' summit'));
      b.type = 'button';
      setAccent(b, r.accent);
      if (!open) b.disabled = true;

      b.appendChild(el('div', 'n', String(r.id)));
      var mid = el('div');
      mid.appendChild(el('div', 'name', r.name));
      mid.appendChild(el('div', 'desc', r.desc));
      var pr = el('div', 'prog');
      var pf = el('i');
      pf.style.width = p.pct + '%';
      pr.appendChild(pf);
      mid.appendChild(pr);
      b.appendChild(mid);

      var right = el('div', 'weeks');
      right.innerHTML = (open ? '' : svg('lock', '1rem') + '<br>') +
        'Weeks ' + r.weeks[0] + '–' + r.weeks[r.weeks.length - 1] +
        '<br>' + p.done + '/' + p.total;
      b.appendChild(right);

      if (open) b.addEventListener('click', function () { screenRegion(r.id); });
      map.appendChild(b);
    });
    wrap.appendChild(map);

    /* mystery box + session plan + collection */
    var row = el('div', 'questrow');
    row.style.marginTop = '18px';

    var weak = global.Progress.weakItems(30).filter(function (w) { return ITEM_INDEX[w.id]; });
    var mb = el('button', 'quest');
    mb.type = 'button';
    mb.innerHTML = '<span class="qi">' + svg('star') + '</span>';
    var mbt = el('div');
    mbt.appendChild(el('div', 'qt', 'Mystery box'));
    mbt.appendChild(el('div', 'qs', weak.length >= 4
      ? 'Five items from your own weak spots'
      : 'Play a few quests first'));
    mb.appendChild(mbt);
    if (weak.length < 4) mb.disabled = true;
    else mb.addEventListener('click', function () { startMysteryBox(); });
    row.appendChild(mb);

    var col = el('button', 'quest');
    col.type = 'button';
    col.innerHTML = '<span class="qi">' + svg('card') + '</span>';
    var colt = el('div');
    colt.appendChild(el('div', 'qt', 'Collection'));
    var nc = S().cards.length;
    colt.appendChild(el('div', 'qs', nc + (nc === 1 ? ' card · ' : ' cards · ') +
      Object.keys(S().badges).length + '/' + CAMPAIGN.badges.length + ' badges'));
    col.appendChild(colt);
    col.addEventListener('click', screenCollection);
    row.appendChild(col);

    wrap.appendChild(row);
    wrap.appendChild(sessionPlan());
    show(wrap);
  }

  /* The 2-hour session, chaptered. Teacher-facing: it sits on the map so the
     shape of the lesson is visible without leaving the game. */
  function sessionPlan() {
    var d = el('details');
    d.className = 'week';
    d.style.marginTop = '18px';
    var sum = document.createElement('summary');
    sum.textContent = 'Today’s session — two hours, four attention spans';
    sum.style.cursor = 'pointer';
    sum.style.fontWeight = '500';
    d.appendChild(sum);
    var rows = [
      ['0:00', 'Check-in', 'Open the map, read the streak and last week’s numbers'],
      ['0:05', 'Quest 1', 'This week’s new content'],
      ['0:30', 'Recharge', 'Get up and move. Five minutes, properly away from the screen'],
      ['0:35', 'Quest 2', 'Practice round'],
      ['1:00', 'Mystery box', 'Her own weak items, pulled from the log'],
      ['1:10', 'Recharge', 'Second movement break'],
      ['1:15', 'Quest 3', 'Applied practice, out loud where possible'],
      ['1:45', 'Boss check', 'On a region’s last week only; otherwise a review lap'],
      ['1:55', 'Save', 'Download the save file, or copy the save code']
    ];
    var t = el('div');
    t.style.marginTop = '10px';
    rows.forEach(function (r) {
      var line = el('div');
      line.style.display = 'flex';
      line.style.gap = '12px';
      line.style.padding = '6px 0';
      line.style.borderTop = '1px solid var(--border)';
      var a = el('span', null, r[0]);
      a.style.minWidth = '48px';
      a.style.color = 'var(--muted)';
      var b = el('span', null, r[1]);
      b.style.minWidth = '110px';
      b.style.fontWeight = '500';
      var c = el('span', null, r[2]);
      c.style.color = 'var(--muted)';
      c.style.fontSize = '0.9rem';
      line.appendChild(a); line.appendChild(b); line.appendChild(c);
      t.appendChild(line);
    });
    d.appendChild(t);
    return d;
  }

  /* ---- region ---- */
  function screenRegion(id) {
    var r = regionById(id);
    var wrap = el('div');
    setAccent(wrap, r.accent);
    renderHud();

    var back = el('button', 'btn ghost', '');
    back.type = 'button';
    back.innerHTML = svg('back') + ' The map';
    back.addEventListener('click', screenMap);
    wrap.appendChild(back);

    var head = el('div');
    head.style.margin = '16px 0 4px';
    head.appendChild(el('h2', null, r.name));
    wrap.appendChild(head);
    wrap.appendChild(el('p', 'subprompt', r.entry));

    /* The Discover poster for this region. It is a busy, text-heavy teaching
       sheet, so it is offered as something to open and talk about -- not used
       as backdrop art behind the UI. Removes itself if the image is not
       shipped, so the page never shows a broken frame. */
    if (r.poster) {
      var pd = document.createElement('details');
      pd.className = 'week';
      var psum = document.createElement('summary');
      psum.textContent = 'Open the Discover poster for this region';
      psum.style.cursor = 'pointer';
      psum.style.fontWeight = '500';
      pd.appendChild(psum);
      var pimg = document.createElement('img');
      pimg.alt = 'Oxford Discover poster for ' + r.name;
      pimg.src = 'assets/posters/' + r.poster + '.jpg';
      pimg.style.width = '100%';
      pimg.style.marginTop = '12px';
      pimg.style.borderRadius = 'var(--gm-radius-control)';
      pimg.addEventListener('error', function () { pd.remove(); });
      pd.appendChild(pimg);
      wrap.appendChild(pd);
    }

    var list = el('div', 'weeklist');
    r.weeks.forEach(function (n) {
      var w = weekByN(n);
      var card = el('div', 'week');
      var title = el('h3', null, 'Week ' + w.n + ' — ' + w.title);
      card.appendChild(title);
      card.appendChild(el('div', 'src', w.source));
      if (w.supplement) {
        var sup = el('div', 'src', 'Supplement — the one week in the plan with no page number behind it.');
        sup.style.color = 'var(--muted)';
        card.appendChild(sup);
      }
      if (w.flag) {
        var fl = el('div', 'src', w.flag);
        fl.style.color = 'var(--gm-error)';
        card.appendChild(fl);
      }
      card.appendChild(el('p', 'why', w.why));
      var ket = el('p', 'src', 'KET: ' + w.ket);
      ket.style.marginTop = '6px';
      card.appendChild(ket);

      var row = el('div', 'questrow');
      questsOfWeek(w).forEach(function (q, qi) {
        var done = global.Progress.hasQuest(q.id);
        var b = el('button', 'quest' + (done ? ' done' : ''));
        b.type = 'button';
        b.innerHTML = '<span class="qi">' + svg(domainIcon(q.domain)) + '</span>';
        var t = el('div');
        t.appendChild(el('div', 'qt', q.title));
        var rec = S().quests[q.id];
        t.appendChild(el('div', 'qs', done ? ('done · ' + rec.right + '/' + rec.of) : q.sub));
        b.appendChild(t);
        b.addEventListener('click', function () { startQuest(w, q); });
        row.appendChild(b);
      });

      if (w.boss) {
        var bd = !!S().bosses[w.boss.id];
        var bb = el('button', 'quest boss' + (bd ? ' done' : ''));
        bb.type = 'button';
        bb.innerHTML = '<span class="qi">' + svg('flag') + '</span>';
        var bt = el('div');
        bt.appendChild(el('div', 'qt', 'Boss — ' + w.boss.name));
        var open = bossUnlocked(w);
        bt.appendChild(el('div', 'qs', bd ? ('beaten · ' + S().bosses[w.boss.id].right + '/' + S().bosses[w.boss.id].of)
          : (open ? w.boss.built : 'Finish this week’s quests first')));
        bb.appendChild(bt);
        if (!open) bb.disabled = true;
        else bb.addEventListener('click', function () { startBoss(w); });
        row.appendChild(bb);
      }

      card.appendChild(row);
      list.appendChild(card);
    });
    wrap.appendChild(list);
    show(wrap);
  }

  function domainIcon(d) {
    return ({ listening: 'ear', reading: 'book', vocabulary: 'star', grammar: 'pen',
      spelling: 'pen', mixed: 'map' })[d] || 'star';
  }

  /* ----------------------------------------------------------- quest runner */
  function loadWeekItems(weekN, questId) {
    var wf = WEEKS[weekN];
    if (!wf || !wf.quests || !wf.quests[questId]) return null;
    return wf.quests[questId];
  }

  function startQuest(w, q) {
    var set = loadWeekItems(w.n, q.id);
    if (!set) { toast('That quest has no content file yet.'); return; }
    runSet({
      title: q.title,
      intro: set.intro,
      items: set.items,
      accent: regionById(w.region).accent,
      week: w.n,
      onDone: function (res) {
        var fresh = global.Progress.completeQuest(q.id, res.right, res.items.length, res.secs,
          res.right * CAMPAIGN.meta.xpPerItem);
        checkBadges();
        var card = fresh ? dropCard(w.region) : null;
        screenReward({
          title: q.title, res: res, card: card, fresh: fresh,
          xp: fresh ? res.right * CAMPAIGN.meta.xpPerItem : 0,
          accent: regionById(w.region).accent,
          back: function () { screenRegion(w.region); }
        });
      }
    });
  }

  function startBoss(w) {
    var wf = WEEKS[w.n];
    var boss = wf && wf.boss;
    if (!boss) { toast('That boss has no content file yet.'); return; }

    if (boss.external) { return screenSummit(w, boss); }

    var items = boss.items.slice();
    /* The Spelling Log re-serves her own misses on top of its fixed list. */
    if (boss.dynamic === 'weak') {
      var extra = global.Progress.weakItems(20)
        .filter(function (x) { return ITEM_INDEX[x.id] && x.wrong > 0; })
        .map(function (x) { return ITEM_INDEX[x.id].item; })
        .filter(function (it) { return it.domain === 'spelling'; })
        .slice(0, 3);
      items = items.concat(extra);
    }

    runSet({
      title: w.boss.name,
      intro: boss.intro,
      items: items,
      accent: regionById(w.region).accent,
      week: w.n,
      boss: true,
      onDone: function (res) {
        var won = res.right >= Math.ceil(res.items.length * 0.75);
        var s = S();
        var first = !s.bosses[w.boss.id];
        if (won) {
          s.bosses[w.boss.id] = { right: res.right, of: res.items.length, date: new Date().toISOString().slice(0, 10) };
          if (first) s.xp += CAMPAIGN.meta.bossBonus;
          global.Progress.save();
        }
        if (won && res.right === res.items.length && w.boss.id === 'boss05') global.Progress.awardBadge('log-keeper');
        if (won && w.boss.id === 'boss07' && res.right === res.items.length) global.Progress.awardBadge('sign-reader');
        checkBadges();
        var card = null;
        if (won && w.boss.card) {
          var cid = global.Cards.signature[w.boss.card];
          if (cid && global.Progress.awardCard(cid)) card = cid;
        }
        screenReward({
          title: w.boss.name, res: res, card: card, fresh: won && first,
          xp: (won && first) ? CAMPAIGN.meta.bossBonus : 0,
          accent: regionById(w.region).accent,
          boss: true, won: won,
          back: function () { screenRegion(w.region); }
        });
      }
    });
  }

  function startMysteryBox() {
    var weak = global.Progress.weakItems(30)
      .filter(function (x) { return ITEM_INDEX[x.id]; })
      .slice(0, 5)
      .map(function (x) { return ITEM_INDEX[x.id].item; });
    if (!weak.length) { toast('Nothing in the box yet.'); return; }
    runSet({
      title: 'Mystery box',
      intro: 'Five items from your own history — the ones you got wrong, or the ones that took you longest. Nothing in here is random.',
      items: weak,
      accent: 'yellow',
      week: 0,
      onDone: function (res) {
        S().xp += res.right * 5;
        global.Progress.save();
        checkBadges();
        screenReward({
          title: 'Mystery box', res: res, card: null, fresh: false,
          xp: res.right * 5, accent: 'yellow',
          back: screenMap
        });
      }
    });
  }

  function runSet(opts) {
    var idx = 0, right = 0, t0 = Date.now();
    var results = [];

    function draw() {
      var wrap = el('div');
      setAccent(wrap, opts.accent);
      renderHud();

      var head = el('div', 'playhead');
      var quit = el('button', 'icon-btn');
      quit.type = 'button';
      quit.innerHTML = svg('back');
      quit.setAttribute('aria-label', 'Leave this quest');
      quit.addEventListener('click', function () {
        global.Engine.Speech.stop();
        screenMap();
      });
      head.appendChild(quit);
      var pips = el('div', 'pips');
      opts.items.forEach(function (_, i) {
        var p = el('div', 'pip');
        if (i < results.length) p.classList.add(results[i].correct ? 'on' : 'miss');
        pips.appendChild(p);
      });
      head.appendChild(pips);
      head.appendChild(el('span', 'chip', (idx + 1) + ' / ' + opts.items.length));
      wrap.appendChild(head);

      if (idx === 0 && opts.intro) {
        var intro = el('div', 'fb');
        intro.appendChild(el('div', 'fbt', opts.boss ? 'Boss battle — ' + opts.title : opts.title));
        intro.appendChild(el('div', 'fbw', opts.intro));
        intro.style.marginTop = '0';
        intro.style.marginBottom = '18px';
        wrap.appendChild(intro);
      }

      var stage = el('div');
      wrap.appendChild(stage);
      show(wrap);

      var item = opts.items[idx];
      global.Engine.render(item, stage, function (r) {
        results.push(r);
        if (r.correct) right++;
        var waited = item.gate === 'audio' ? true : undefined;
        global.Progress.recordItem(item.id, r.correct, r.seconds, opts.week, item.domain, waited);
        bumpCounters(item, r);
        global.Progress.save();
        showFeedback(wrap, stage, item, r);
      });
    }

    function showFeedback(wrap, stage, item, r) {
      var fb = el('div', 'fb' + (r.correct ? ' good' : ' alert'));
      fb.appendChild(el('div', 'fbt', r.correct ? 'Yes.' : 'Not this time.'));
      var w = item.teach || (r.correct ? '' : ('The answer was: ' + (item.answer || item.word || '')));
      if (!r.correct && item.teach) w = 'The answer was: ' + (item.answer || item.word || '') + '. ' + item.teach;
      if (w) fb.appendChild(el('div', 'fbw', w));
      wrap.appendChild(fb);

      var acts = el('div', 'actions');
      var next = el('button', 'btn wide', idx + 1 >= opts.items.length ? 'Finish' : 'Next');
      next.type = 'button';
      next.addEventListener('click', function () {
        idx++;
        if (idx >= opts.items.length) {
          opts.onDone({
            right: right,
            items: opts.items,
            results: results,
            secs: Math.round((Date.now() - t0) / 1000)
          });
        } else draw();
      });
      acts.appendChild(next);
      wrap.appendChild(acts);
      next.focus();
    }

    draw();
  }

  /* ------------------------------------------------------------- rewarding */
  function dropCard(regionId) {
    var pool = global.Cards.pool(regionId).filter(function (id) {
      return S().cards.indexOf(id) === -1;
    });
    if (!pool.length) {
      pool = global.Cards.all().filter(function (id) { return S().cards.indexOf(id) === -1; });
    }
    if (!pool.length) return null;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return global.Progress.awardCard(pick) ? pick : null;
  }

  function screenReward(o) {
    var wrap = el('div');
    setAccent(wrap, o.accent);
    renderHud();

    var box = el('div', 'reward');
    var pct = Math.round((o.res.right / o.res.items.length) * 100);
    if (o.boss) {
      box.appendChild(el('div', 'big', o.won ? 'Beaten.' : 'Not yet.'));
      box.appendChild(el('p', 'subprompt', o.won
        ? o.title + ' is done. The way on is open.'
        : 'You need three quarters of it. Have another go whenever you like.'));
    } else {
      box.appendChild(el('div', 'big', o.res.right + ' / ' + o.res.items.length));
      box.appendChild(el('p', 'subprompt', pct + '% · ' + fmtTime(o.res.secs)));
    }
    if (o.xp) box.appendChild(el('p', 'cardname', '+' + o.xp + ' XP'));

    if (o.card) {
      var img = document.createElement('img');
      img.className = 'cardart';
      img.alt = global.Cards.label(o.card);
      img.src = global.Cards.art(o.card);
      img.addEventListener('error', function () {
        var fb = el('div', 'cardart fallback');
        fb.textContent = global.Cards.label(o.card);
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      box.appendChild(el('p', 'subprompt', 'New card'));
      box.appendChild(img);
      box.appendChild(el('div', 'cardname', global.Cards.label(o.card)));
    }
    wrap.appendChild(box);

    /* slow items worth naming, gently */
    var slow = o.res.results.filter(function (r) { return r.seconds > 45; }).length;
    if (slow) {
      var n = el('div', 'fb');
      n.appendChild(el('div', 'fbt', 'Worth knowing'));
      n.appendChild(el('div', 'fbw', slow + (slow === 1 ? ' item' : ' items') +
        ' took over 45 seconds. That is not a problem — it is where the next lesson starts.'));
      wrap.appendChild(n);
    }

    var acts = el('div', 'actions');
    var b = el('button', 'btn wide', 'Back to the map');
    b.type = 'button';
    b.addEventListener('click', screenMap);
    acts.appendChild(b);
    var b2 = el('button', 'btn ghost', 'This region');
    b2.type = 'button';
    b2.addEventListener('click', o.back);
    acts.appendChild(b2);
    wrap.appendChild(acts);
    show(wrap);
  }

  function fmtTime(secs) {
    var m = Math.floor(secs / 60), s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* --------------------------------------------------------------- badges */
  function bumpCounters(item, r) {
    var c = S().counters;
    if (item.gate === 'audio' && item.domain === 'listening') {
      c.gateStreak = r.correct ? (c.gateStreak || 0) + 1 : 0;
    }
    if (item.domain === 'spelling') {
      c.spellStreak = r.correct ? (c.spellStreak || 0) + 1 : 0;
    }
    /* Reading and listening are the two ceilings the diagnostic never found.
       Counted separately, and the badge needs BOTH -- otherwise a single
       listening quest in Week 1 would hand it over on the first day, which
       is not what "broke the ceiling" should mean. */
    if (r.correct && item.level === 3) {
      if (item.domain === 'reading') c.ceilingR = (c.ceilingR || 0) + 1;
      if (item.domain === 'listening') c.ceilingL = (c.ceilingL || 0) + 1;
    }
  }

  function checkBadges() {
    var c = S().counters, got = [];
    if ((c.gateStreak || 0) >= 6 && global.Progress.awardBadge('tense-detective')) got.push('tense-detective');
    if ((c.spellStreak || 0) >= 3 && global.Progress.awardBadge('vowel-hunter')) got.push('vowel-hunter');
    if ((c.ceilingR || 0) >= 4 && (c.ceilingL || 0) >= 4 &&
      global.Progress.awardBadge('ceiling-breaker')) got.push('ceiling-breaker');
    var allDone = CAMPAIGN.weeks.every(function (w) { return weekDone(w); });
    if (allDone && global.Progress.awardBadge('summiteer')) got.push('summiteer');
    if (got.length) toast('New badge: ' + got.map(badgeName).join(', '));
    return got;
  }
  function badgeName(id) {
    var b = CAMPAIGN.badges.filter(function (x) { return x.id === id; })[0];
    return b ? b.name : id;
  }

  /* ----------------------------------------------------------- collection */
  function screenCollection() {
    var wrap = el('div');
    renderHud();
    var back = el('button', 'btn ghost', '');
    back.type = 'button';
    back.innerHTML = svg('back') + ' The map';
    back.addEventListener('click', screenMap);
    wrap.appendChild(back);

    wrap.appendChild(el('h2', null, 'Badges'));
    var bg = el('div', 'badges');
    CAMPAIGN.badges.forEach(function (b) {
      var has = !!S().badges[b.id];
      var n = el('div', 'badge' + (has ? '' : ' locked'));
      setAccent(n, b.accent);
      var i = el('div', 'bi');
      i.textContent = has ? b.icon : '·';
      n.appendChild(i);
      n.appendChild(el('div', 'bn', b.name));
      n.appendChild(el('div', 'bw', has ? ('Earned ' + S().badges[b.id]) : b.why));
      bg.appendChild(n);
    });
    wrap.appendChild(bg);

    var h = el('h2', null, 'Cards');
    h.style.marginTop = '28px';
    wrap.appendChild(h);
    wrap.appendChild(el('p', 'subprompt',
      S().cards.length + ' of ' + global.Cards.count + ' found.'));
    var grid = el('div', 'grid');
    S().cards.slice().reverse().forEach(function (id) {
      var c = el('div', 'collected');
      var img = document.createElement('img');
      img.alt = global.Cards.label(id);
      img.src = global.Cards.art(id);
      img.addEventListener('error', function () {
        var fb = el('div', 'fallback');
        fb.textContent = global.Cards.label(id);
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      c.appendChild(img);
      c.appendChild(el('div', 'cn', global.Cards.label(id)));
      grid.appendChild(c);
    });
    if (!S().cards.length) {
      wrap.appendChild(el('p', 'note', 'Finish a quest to find your first card.'));
    }
    wrap.appendChild(grid);
    show(wrap);
  }

  /* ------------------------------------------------------------- the summit */
  function screenSummit(w, boss) {
    var wrap = el('div');
    renderHud();
    var back = el('button', 'btn ghost', '');
    back.type = 'button';
    back.innerHTML = svg('back') + ' The map';
    back.addEventListener('click', screenMap);
    wrap.appendChild(back);

    var h = el('h2', null, 'The Summit');
    h.style.marginTop = '16px';
    wrap.appendChild(h);
    wrap.appendChild(el('p', 'subprompt', boss.intro));

    var c = boss.compare;
    var card = el('div', 'week');
    card.appendChild(el('h3', null, 'What to beat — ' + c.date));
    card.appendChild(el('div', 'src', c.score + ' · ' + c.percent + '% · ' + c.time));
    c.domains.forEach(function (d) {
      var line = el('div');
      line.style.display = 'flex';
      line.style.justifyContent = 'space-between';
      line.style.gap = '10px';
      line.style.padding = '8px 0';
      line.style.borderTop = '1px solid var(--border)';
      line.appendChild(el('span', null, d.label));
      var rt = el('span', null, d.right + '/' + d.of + ' · ' + d.ceiling +
        (d.capped ? ' (real ceiling)' : ' (never capped)') + ' · ' + d.secs + 's');
      rt.style.color = 'var(--muted)';
      rt.style.fontSize = '0.9rem';
      rt.style.textAlign = 'right';
      line.appendChild(rt);
      card.appendChild(line);
    });
    var watch = el('p', 'why', c.watch);
    watch.style.marginTop = '12px';
    card.appendChild(watch);
    wrap.appendChild(card);

    var acts = el('div', 'actions');
    var go = document.createElement('a');
    go.className = 'btn';
    go.href = boss.external;
    go.target = '_blank';
    go.rel = 'noopener';
    go.textContent = 'Open star quest';
    acts.appendChild(go);

    var done = el('button', 'btn ghost', 'I finished the retake');
    done.type = 'button';
    done.addEventListener('click', function () {
      var s = S();
      if (!s.bosses[w.boss.id]) {
        s.bosses[w.boss.id] = { right: 1, of: 1, date: new Date().toISOString().slice(0, 10) };
        s.xp += CAMPAIGN.meta.bossBonus;
        var cid = global.Cards.signature[w.boss.card];
        if (cid) global.Progress.awardCard(cid);
        global.Progress.save();
      }
      checkBadges();
      screenMap();
    });
    acts.appendChild(done);
    wrap.appendChild(acts);
    show(wrap);
  }

  /* ----------------------------------------------------------------- save */
  function screenSave() {
    var wrap = el('div');
    renderHud();
    var back = el('button', 'btn ghost', '');
    back.type = 'button';
    back.innerHTML = svg('back') + ' The map';
    back.addEventListener('click', screenMap);
    wrap.appendChild(back);

    var h = el('h2', null, 'Saving');
    h.style.margin = '16px 0 4px';
    wrap.appendChild(h);
    wrap.appendChild(el('p', 'subprompt',
      'Your progress saves by itself on this device. These are the two ways to carry it somewhere else.'));

    /* file */
    var f = el('div', 'week');
    f.appendChild(el('h3', null, 'A save file for your teacher'));
    f.appendChild(el('p', 'why',
      'Downloads a small file. Your teacher keeps it and loads it back at the start of the next lesson, so nothing depends on this computer.'));
    var facts = el('div', 'actions');
    var dl = el('button', 'btn', 'Download my save file');
    dl.type = 'button';
    dl.addEventListener('click', function () {
      var n = global.Progress.downloadFile('star-quest-campaign');
      toast('Saved as ' + n);
    });
    facts.appendChild(dl);

    var up = el('button', 'btn ghost', 'Load a save file');
    up.type = 'button';
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'application/json,.json';
    picker.className = 'hidden';
    picker.addEventListener('change', function () {
      if (!picker.files || !picker.files[0]) return;
      global.Progress.readFile(picker.files[0], function (err) {
        if (err) { toast('That file could not be read.'); return; }
        toast('Progress loaded.');
        screenMap();
      });
    });
    up.addEventListener('click', function () { picker.click(); });
    facts.appendChild(up);
    facts.appendChild(picker);
    f.appendChild(facts);
    wrap.appendChild(f);

    /* code */
    var c = el('div', 'week');
    c.appendChild(el('h3', null, 'A save code'));
    c.appendChild(el('p', 'why',
      'A long link that carries the whole campaign inside it. Paste it into any browser to pick up exactly where you left off. It contains no name and never touches a server.'));
    var ta = el('textarea', 'field');
    ta.readOnly = true;
    ta.value = global.Progress.shareUrl();
    c.appendChild(ta);
    var cacts = el('div', 'actions');
    var copy = el('button', 'btn', 'Copy the code');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      ta.select();
      try { document.execCommand('copy'); toast('Copied.'); }
      catch (e) { toast('Select the text and copy it.'); }
    });
    cacts.appendChild(copy);
    c.appendChild(cacts);
    wrap.appendChild(c);

    /* danger */
    var d = el('div', 'week');
    d.appendChild(el('h3', null, 'Start again'));
    d.appendChild(el('p', 'why', 'Clears every quest, badge and card on this device. Download a save file first if you might want it back.'));
    var dacts = el('div', 'actions');
    var rst = el('button', 'btn ghost', 'Clear my progress');
    rst.type = 'button';
    rst.addEventListener('click', function () {
      if (rst.dataset.armed === '1') {
        global.Progress.reset();
        toast('Cleared.');
        screenWelcome();
      } else {
        rst.dataset.armed = '1';
        rst.textContent = 'Really clear everything?';
        rst.style.borderColor = 'var(--gm-error)';
      }
    });
    dacts.appendChild(rst);
    d.appendChild(dacts);
    wrap.appendChild(d);
    show(wrap);
  }

  /* ---------------------------------------------------------------- toast */
  var toastNode = null;
  function toast(msg) {
    if (!toastNode) {
      toastNode = el('div', 'chip');
      toastNode.style.position = 'fixed';
      toastNode.style.left = '50%';
      toastNode.style.bottom = '18px';
      toastNode.style.transform = 'translateX(-50%)';
      toastNode.style.zIndex = '50';
      toastNode.style.background = 'var(--bg)';
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = msg;
    toastNode.classList.remove('hidden');
    clearTimeout(toastNode._t);
    toastNode._t = setTimeout(function () { toastNode.classList.add('hidden'); }, 2600);
  }

  /* ----------------------------------------------------------------- theme */
  function applyTheme(mode) {
    if (mode) document.documentElement.setAttribute('data-theme', mode);
    else document.documentElement.removeAttribute('data-theme');
    var dark = mode === 'dark' ||
      (!mode && global.matchMedia('(prefers-color-scheme: dark)').matches);
    var btn = document.getElementById('themeBtn');
    if (btn) {
      btn.innerHTML = svg(dark ? 'sun' : 'moon');
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  /* ------------------------------------------------------------------ boot */
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.json();
    });
  }

  function indexItems() {
    Object.keys(WEEKS).forEach(function (n) {
      var wf = WEEKS[n];
      var take = function (item) { ITEM_INDEX[item.id] = { item: item, week: Number(n) }; };
      Object.keys(wf.quests || {}).forEach(function (qid) {
        (wf.quests[qid].items || []).forEach(take);
      });
      if (wf.boss && wf.boss.items) wf.boss.items.forEach(take);
    });
  }

  function boot() {
    app = document.getElementById('app');
    hud = document.getElementById('hud');

    try { applyTheme(global.localStorage.getItem(THEME_KEY) || null); }
    catch (e) { applyTheme(null); }
    var tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme');
      var next = now === 'dark' ? 'light' : 'dark';
      try { global.localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
    var sb = document.getElementById('saveBtn');
    if (sb) sb.addEventListener('click', screenSave);

    app.innerHTML = '<p class="subprompt">Loading the map…</p>';

    getJSON('content/campaign.json').then(function (c) {
      CAMPAIGN = c;
      var ns = c.weeks.map(function (w) { return w.n; });
      return Promise.all(ns.map(function (n) {
        var f = 'content/week' + (n < 10 ? '0' : '') + n + '.json';
        return getJSON(f).then(function (wf) { WEEKS[n] = wf; })
          .catch(function () { WEEKS[n] = { quests: {} }; });
      }));
    }).then(function () {
      indexItems();
      global.Progress.load();

      /* A save code in the address bar wins over whatever is on the device. */
      var frag = global.Progress.readFragmentSave();
      if (frag) {
        global.Progress.adopt(frag);
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      }

      var qn = new URLSearchParams(location.search).get('name');
      if (qn) setName(qn);

      /* Decide this BEFORE touching the session, which increments the count. */
      var firstRun = !name() && !S().sessions && !S().xp;
      global.Progress.touchSession();

      if (firstRun) screenWelcome();
      else screenMap();
    }).catch(function (err) {
      app.innerHTML = '';
      var e = el('div', 'fb alert');
      e.appendChild(el('div', 'fbt', 'The game could not load its content.'));
      e.appendChild(el('div', 'fbw', String(err && err.message || err) +
        ' — this page fetches JSON, so it needs to be served over http, not opened as a file.'));
      app.appendChild(e);
    });
  }

  global.Campaign = { boot: boot, screenMap: screenMap, screenSave: screenSave, toast: toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
