/* Star quest: campaign -- item engine.

   Renders one item at a time and reports the result. Deliberately shares the
   item vocabulary of star-quest (domain / level / kind / answer) so content can
   move between the assessment and the campaign without translation.

   The one genuinely new mechanic lives here: `gate: "audio"`. Answer buttons
   stay disabled until the clip has finished AND a short settle time has passed.
   That is the direct fix for the diagnostic's real finding -- 0:09 a question
   in listening, and the one miss being the item built to punish answering on
   the first content word. The rule is enforced by the UI, not by asking a
   7-year-old to be patient. */
(function (global) {
  'use strict';

  var SETTLE_MS = 700;          /* after audio ends, before answers unlock */

  /* ---------- speech ---------- */
  var Speech = (function () {
    var synth = global.speechSynthesis || null;
    var voice = null;
    function pick() {
      if (!synth) return null;
      var vs = synth.getVoices() || [];
      if (!vs.length) return null;
      var pref = ['en-GB', 'en_GB', 'en-AU', 'en-US'];
      for (var p = 0; p < pref.length; p++) {
        for (var i = 0; i < vs.length; i++) {
          if ((vs[i].lang || '').replace('_', '-').indexOf(pref[p]) === 0) return vs[i];
        }
      }
      for (var j = 0; j < vs.length; j++) if ((vs[j].lang || '').indexOf('en') === 0) return vs[j];
      return vs[0];
    }
    if (synth && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', function () { voice = pick(); });
    }
    /* A device can expose speechSynthesis and still have no voices at all
       (headless Chrome, some locked-down tablets). Waiting on an utterance
       that will never speak would leave her staring at disabled buttons, so
       treat "no voices" as no speech and fall back to timed reading. */
    function usable() {
      if (!synth) return false;
      if (!voice) voice = pick();
      return !!voice;
    }
    function readingTime(text) {
      var words = String(text).split(/\s+/).length;
      return Math.max(2200, words * 380);
    }
    return {
      available: usable,
      say: function (text, onEnd) {
        if (!usable()) { setTimeout(onEnd, readingTime(text)); return; }
        try {
          synth.cancel();
          var u = new global.SpeechSynthesisUtterance(text);
          if (voice) u.voice = voice;
          u.rate = 0.9; u.pitch = 1.0; u.lang = (voice && voice.lang) || 'en-GB';
          var done = false;
          function finish() { if (!done) { done = true; onEnd(); } }
          u.onend = finish;
          u.onerror = finish;
          /* Chrome occasionally drops onend; belt and braces. */
          setTimeout(finish, readingTime(text) * 1.8);
          synth.speak(u);
        } catch (e) { setTimeout(onEnd, readingTime(text)); }
      },
      stop: function () { try { if (synth) synth.cancel(); } catch (e) {} }
    };
  })();

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function shuffle(a, rnd) {
    var arr = a.slice(), r = rnd || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function cardTile(id, captionText) {
    var wrapEl = document.createDocumentFragment();
    var img = document.createElement('img');
    img.alt = '';
    img.src = global.Cards.art(id);
    img.addEventListener('error', function () {
      var fb = el('div', 'fallback', global.Cards.label(id) || '?');
      if (img.parentNode) img.parentNode.replaceChild(fb, img);
    });
    wrapEl.appendChild(img);
    if (captionText != null) wrapEl.appendChild(el('div', 'cap', captionText));
    return wrapEl;
  }

  /* ---------- the renderer ---------- */
  /* render(item, host, done) -> done({correct:Bool, given:String, seconds:Number}) */
  function render(item, host, done) {
    host.innerHTML = '';
    var started = Date.now();
    var answered = false;

    function finish(correct, given) {
      if (answered) return;
      answered = true;
      Speech.stop();
      done({
        correct: !!correct,
        given: given == null ? '' : String(given),
        seconds: Math.round((Date.now() - started) / 100) / 10
      });
    }

    /* prompt block */
    if (item.passage) {
      var pass = el('div', 'fb');
      pass.appendChild(el('div', 'fbt', 'Read this'));
      pass.appendChild(el('div', 'fbw', item.passage));
      pass.style.marginTop = '0';
      pass.style.marginBottom = '18px';
      host.appendChild(pass);
    }
    if (item.prompt && !item.hidePrompt) host.appendChild(el('p', 'prompt', item.prompt));
    if (item.subprompt) host.appendChild(el('p', 'subprompt', item.subprompt));

    var lockables = [];
    var gated = item.gate === 'audio' && !!item.say;

    /* audio gate */
    if (gated) {
      var gate = el('div', 'gate');
      var gt = el('div', 'gt');
      gt.appendChild(el('span', null, 'Listen all the way to the end.'));
      gate.appendChild(gt);
      var meter = el('div', 'gmeter');
      var fill = el('i');
      meter.appendChild(fill);
      gate.appendChild(meter);
      var hint = el('div', 'ghint', 'The answers wake up when the clip finishes.');
      gate.appendChild(hint);
      host.appendChild(gate);

      var replay = el('button', 'btn ghost', 'Play again');
      replay.type = 'button';
      /* Locked during the first play. Otherwise tapping it cancels the running
         utterance, whose onend is what opens the gate -- so the gate would
         spring open early, which is the exact thing this item exists to stop. */
      replay.disabled = true;

      var t0 = Date.now();
      var expected = Math.max(2200, item.say.split(/\s+/).length * 380);
      var tick = setInterval(function () {
        var pct = Math.min(97, ((Date.now() - t0) / expected) * 100);
        fill.style.width = pct + '%';
      }, 80);

      var openGate = function () {
        clearInterval(tick);
        fill.style.width = '100%';
        setTimeout(function () {
          gate.classList.add('open');
          gt.textContent = 'Now you can answer.';
          hint.textContent = 'Good waiting.';
          lockables.forEach(function (b) { b.disabled = false; });
          replay.disabled = false;
        }, SETTLE_MS);
      };

      replay.addEventListener('click', function () {
        replay.disabled = true;
        Speech.say(item.say, function () { replay.disabled = false; });
      });

      Speech.say(item.say, openGate);
      host.appendChild(replay);
      if (!Speech.available() && item.sayText !== false) {
        /* No voice on this device: show the script so the item still works,
           but keep the gate timing so the habit is still trained. */
        gate.appendChild(el('div', 'ghint', '“' + item.say + '”'));
      }
    } else if (item.say) {
      var playBtn = el('button', 'btn ghost', 'Play the sound');
      playBtn.type = 'button';
      playBtn.addEventListener('click', function () {
        playBtn.disabled = true;
        Speech.say(item.say, function () { playBtn.disabled = false; });
      });
      host.appendChild(playBtn);
      Speech.say(item.say, function () {});
    }

    var kind = item.kind || 'choice';

    /* ---- choice / pic-choice ---- */
    if (kind === 'choice' || kind === 'pic-choice') {
      var isPic = kind === 'pic-choice';
      var box = el('div', 'opts' + (isPic ? ' pics' : (item.options.length <= 4 ? ' two' : '')));
      var order = item.shuffle === false ? item.options.slice() : shuffle(item.options);
      order.forEach(function (optText, idx) {
        var b = el('button', 'opt' + (isPic ? ' pic' : ''));
        b.type = 'button';
        if (isPic) {
          var cardId = (item.cards && item.cards[item.options.indexOf(optText)]) || null;
          if (cardId) b.appendChild(cardTile(cardId, optText));
          else b.appendChild(el('div', 'cap', optText));
        } else {
          b.appendChild(el('span', 'k', String.fromCharCode(65 + idx)));
          b.appendChild(el('span', null, optText));
        }
        if (gated) b.disabled = true;
        lockables.push(b);
        b.addEventListener('click', function () {
          if (answered) return;
          var ok = optText === item.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) {
            Array.prototype.forEach.call(box.children, function (c, i) {
              if (order[i] === item.answer) c.classList.add('right');
            });
          }
          lockables.forEach(function (x) { x.disabled = true; });
          finish(ok, optText);
        });
        box.appendChild(b);
      });
      host.appendChild(box);
      return;
    }

    /* ---- build: tap word tiles into order ---- */
    if (kind === 'build') {
      var line = el('div', 'slotline');
      var ph = el('span', 'ph', 'Tap the words in order.');
      line.appendChild(ph);
      host.appendChild(line);

      var bank = el('div', 'tiles');
      host.appendChild(bank);
      var chosen = [];
      var target = item.answer.split(' ');

      function redraw() {
        line.innerHTML = '';
        if (!chosen.length) { line.appendChild(ph); }
        chosen.forEach(function (w, i) {
          var s = el('button', 'slot', w);
          s.type = 'button';
          s.addEventListener('click', function () {
            if (answered) return;
            chosen.splice(i, 1);
            bankBtns[w].shift().disabled = false;
            redraw();
          });
          line.appendChild(s);
        });
        check.disabled = chosen.length !== target.length;
      }

      var bankBtns = {};
      shuffle(item.tiles).forEach(function (w) {
        var t = el('button', 'tile', w);
        t.type = 'button';
        (bankBtns[w] = bankBtns[w] || []).push(t);
        t.addEventListener('click', function () {
          if (answered || t.disabled) return;
          t.disabled = true;
          chosen.push(w);
          redraw();
        });
        bank.appendChild(t);
      });
      /* keep a stable pop order per word */
      Object.keys(bankBtns).forEach(function (w) { bankBtns[w] = bankBtns[w].slice(); });

      var check = el('button', 'btn', 'Check my sentence');
      check.type = 'button';
      check.disabled = true;
      check.addEventListener('click', function () {
        var given = chosen.join(' ');
        finish(given === item.answer, given);
      });
      var acts = el('div', 'actions');
      acts.appendChild(check);
      host.appendChild(acts);
      redraw();
      return;
    }

    /* ---- spell: first letter given, tap letters (KET R&W Part 6 convention) ---- */
    if (kind === 'spell') {
      var word = item.word;
      var given = word.charAt(0);
      var need = word.slice(1).split('');

      var sline = el('div', 'slotline');
      host.appendChild(sline);
      var sbank = el('div', 'tiles');
      host.appendChild(sbank);
      var picked = [];

      function sredraw() {
        sline.innerHTML = '';
        var g = el('span', 'slot given', given);
        sline.appendChild(g);
        picked.forEach(function (ch, i) {
          var s = el('button', 'slot', ch);
          s.type = 'button';
          s.addEventListener('click', function () {
            if (answered) return;
            picked.splice(i, 1);
            letterBtns[ch].shift().disabled = false;
            sredraw();
          });
          sline.appendChild(s);
        });
        scheck.disabled = picked.length === 0;
      }

      var letterBtns = {};
      var poolLetters = item.pool ? item.pool.split('') : need.slice();
      shuffle(poolLetters).forEach(function (ch) {
        var t = el('button', 'tile', ch);
        t.type = 'button';
        (letterBtns[ch] = letterBtns[ch] || []).push(t);
        t.addEventListener('click', function () {
          if (answered || t.disabled) return;
          t.disabled = true;
          picked.push(ch);
          sredraw();
        });
        sbank.appendChild(t);
      });

      var scheck = el('button', 'btn', 'Check my spelling');
      scheck.type = 'button';
      scheck.disabled = true;
      scheck.addEventListener('click', function () {
        var built = given + picked.join('');
        finish(built === word, built);
      });
      var sacts = el('div', 'actions');
      sacts.appendChild(scheck);
      host.appendChild(sacts);
      sredraw();
      return;
    }

    /* ---- sort: drop each phrase into one of two buckets ---- */
    if (kind === 'sort') {
      var bwrap = el('div', 'buckets');
      var drops = [];
      item.buckets.forEach(function (name) {
        var b = el('div', 'bucket');
        b.appendChild(el('h4', null, name));
        var d = el('div', 'drop');
        b.appendChild(d);
        drops.push(d);
        bwrap.appendChild(b);
      });
      host.appendChild(bwrap);

      var current = 0;
      var wrongCount = 0;
      var phrase = el('p', 'prompt');
      host.appendChild(phrase);
      var pick = el('div', 'opts two');
      host.appendChild(pick);

      function step() {
        if (current >= item.items.length) {
          finish(wrongCount === 0, (item.items.length - wrongCount) + '/' + item.items.length);
          return;
        }
        var pair = item.items[current];
        phrase.textContent = '“' + pair[0] + '”';
        pick.innerHTML = '';
        item.buckets.forEach(function (name, bi) {
          var b = el('button', 'opt');
          b.type = 'button';
          b.appendChild(el('span', null, name));
          b.addEventListener('click', function () {
            if (answered) return;
            var ok = bi === pair[1];
            if (!ok) wrongCount++;
            var chip = el('span', null, pair[0]);
            drops[pair[1]].appendChild(chip);
            if (!ok) chip.style.outline = '2px solid var(--gm-error)';
            current++;
            step();
          });
          pick.appendChild(b);
        });
      }
      step();
      return;
    }

    /* ---- match: notices / speakers against a list ---- */
    if (kind === 'match') {
      var mi = 0, mwrong = 0;
      var mprompt = el('p', 'prompt');
      host.appendChild(mprompt);
      var mgate = null;
      var mopts = el('div', 'opts');
      host.appendChild(mopts);

      function mstep() {
        if (mi >= item.items.length) {
          finish(mwrong === 0, (item.items.length - mwrong) + '/' + item.items.length);
          return;
        }
        var row = item.items[mi];
        mprompt.textContent = row[0];
        mopts.innerHTML = '';
        item.options.forEach(function (o, idx) {
          var b = el('button', 'opt');
          b.type = 'button';
          b.appendChild(el('span', 'k', String.fromCharCode(65 + idx)));
          b.appendChild(el('span', null, o));
          b.addEventListener('click', function () {
            if (answered) return;
            if (o !== row[1]) mwrong++;
            mi++;
            mstep();
          });
          mopts.appendChild(b);
        });
      }
      mstep();
      return;
    }

    host.appendChild(el('p', 'subprompt', 'Unknown item kind: ' + kind));
    finish(false, '');
  }

  global.Engine = { render: render, Speech: Speech, shuffle: shuffle, el: el, cardTile: cardTile };
})(window);
