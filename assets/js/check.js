/* H2 – Live-Prüfung "Ist das Wertpapier bei meiner Bank handelbar?" + Bank-Picker-Chips.
   Behauptet nie mehr, als in banks.js steht. */
(function () {
  'use strict';
  var ISIN = 'DE000AMC0D69', WKN = 'AMC0D6';
  var MT = window.MT || {};
  var BANKS = window.MT_BANKS || [];
  var CHIP = {
    ja: ['chip chip--ja', 'Gefunden · Börse Stuttgart'],
    nein: ['chip chip--nein', 'Nicht über Börse Stuttgart'],
    unbekannt: ['chip chip--unb', 'Noch nicht geprüft']
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byId(id) { for (var i = 0; i < BANKS.length; i++) if (BANKS[i].id === id) return BANKS[i]; return null; }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ''); }
  function byText(t) {
    var n = norm(t); if (!n) return null;
    for (var i = 0; i < BANKS.length; i++) if (norm(BANKS[i].name) === n || norm(BANKS[i].id) === n) return BANKS[i];
    return null;
  }
  function chip(state) { var c = CHIP[state] || CHIP.unbekannt; return '<span class="' + c[0] + '">' + c[1] + '</span>'; }
  function source(b) {
    if (!b.quelle) return '';
    return '<p class="src">Quelle: ' + esc(b.quelle) + (b.stand ? ' · Stand: ' + esc(b.stand) : '') + (b.hinweis ? ' · ' + esc(b.hinweis) : '') + '</p>';
  }
  function howto() {
    return '<p><strong>So prüfen und kaufen Sie bei Ihrer Bank:</strong></p><ol>' +
      '<li>Im Depot nach der ISIN <code class="isin">' + ISIN + '</code> oder der WKN <code class="isin">' + WKN + '</code> suchen. ' +
      '<button type="button" class="btn btn--sm" data-copy="' + ISIN + '">Kopieren</button></li>' +
      '<li>Als Handelsplatz „Stuttgart“ (Börse Stuttgart) wählen.</li>' +
      '<li>Eine Limit-Order setzen – mit dem Limit legen Sie den höchsten Preis fest, den Sie zahlen.</li>' +
      '<li>Basisinformationsblatt lesen und die Order prüfen.</li></ol>';
  }

  function init(root) {
    var id = 'chk' + Math.random().toString(36).slice(2, 7);
    var opts = '<option value="">Bitte wählen</option>';
    BANKS.forEach(function (b) { opts += '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>'; });
    opts += '<option value="andere">Andere Bank</option><option value="kein-depot">Noch kein Depot</option>';
    var tag = root.getAttribute('data-heading') || 'h2';
    root.innerHTML =
      '<' + tag + ' id="' + id + '-h">Ist das Wertpapier bei meiner Bank handelbar?</' + tag + '>' +
      '<p class="small" style="margin:0 0 14px">ISIN ' + ISIN + ' · Handelsplatz Börse Stuttgart · Stichprobe, ohne Gewähr.</p>' +
      '<div class="fld" style="max-width:360px"><label for="' + id + '-s">Ihre Bank oder Ihr Broker</label><select class="inp" id="' + id + '-s">' + opts + '</select></div>' +
      '<div class="fld" id="' + id + '-ow" hidden style="max-width:360px"><label for="' + id + '-o">Name Ihrer Bank</label><input class="inp" id="' + id + '-o" type="text" autocomplete="off" maxlength="80"></div>' +
      '<div class="chk-res" id="' + id + '-r" role="status" aria-live="polite"></div>';
    var sel = root.querySelector('select'), ow = root.querySelector('#' + id + '-ow'), oi = root.querySelector('#' + id + '-o'), res = root.querySelector('#' + id + '-r');
    var t = null;

    function show(b, label, state, prefId) {
      var h = '';
      if (state === 'kein-depot') {
        h = '<p>' + '<span class="chip chip--unb">Noch kein Depot</span></p><p>Sie brauchen zuerst ein Wertpapierdepot bei einer Bank oder einem Broker, die den Handelsplatz Börse Stuttgart anbieten. Nicht jede Bank und nicht jede App tut das. Wir erklären Ihnen am Telefon die Schritte.</p>';
      } else if (state === 'ja') {
        h = '<p>' + chip('ja') + ' <strong>' + esc(b.name) + '</strong></p>' + source(b) +
          '<p>Bei dieser Stichprobe war das Wertpapier mit Handelsplatz Stuttgart zu finden. Das ist keine Empfehlung der Bank; maßgeblich ist die Auskunft Ihrer Bank.</p>' + howto();
      } else if (state === 'nein') {
        h = '<p>' + chip('nein') + ' <strong>' + esc(b.name) + '</strong></p>' + source(b) +
          '<p>Nach dieser Quelle gehört die Börse Stuttgart bei dieser Bank nicht zu den angebotenen Handelsplätzen. Angebote ändern sich; maßgeblich ist die Auskunft Ihrer Bank.</p>';
      } else {
        h = '<p>' + chip('unbekannt') + ' <strong>' + esc(label) + '</strong></p>' +
          '<p>Diese Bank haben wir noch nicht geprüft. Ob das Wertpapier dort mit Handelsplatz Stuttgart handelbar ist, sagt Ihnen Ihre Bank oder Ihre App.</p>' + howto();
      }
      if (b && b.slug) h += '<p><a href="/mirratrade-preview/lc002-eti/kaufen/' + esc(b.slug) + '/">Schritt für Schritt bei ' + esc(b.name) + ' →</a></p>';
      if (state !== 'ja') h += '<div class="acts"><button type="button" class="btn" data-help>Wir helfen beim Kauf über Ihre Bank</button></div>';
      res.innerHTML = h;
      if (MT.prefill) MT.prefill.set({ bank: prefId, quelle: 'check' });
      if (MT.track) MT.track('isin_lookup', { bank: prefId, state: state === 'kein-depot' ? 'kein_depot' : state });
      try { document.dispatchEvent(new CustomEvent('mt:prefill')); } catch (e) {}
    }
    function run() {
      var v = sel.value; ow.hidden = v !== 'andere';
      if (!v) { res.innerHTML = ''; return; }
      if (v === 'kein-depot') return show(null, '', 'kein-depot', 'kein-depot');
      if (v === 'andere') {
        var txt = oi.value.trim();
        if (!txt) { res.innerHTML = ''; return; }
        var m = byText(txt);
        if (m) return show(m, m.name, m.stuttgart, m.id);
        return show(null, txt, 'unbekannt', 'andere');
      }
      var b = byId(v); if (b) show(b, b.name, b.stuttgart, b.id);
    }
    sel.addEventListener('change', run);
    oi.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 400); });
    res.addEventListener('click', function (e) {
      if (!e.target.closest('[data-help]')) return;
      var f = document.getElementById('rueckruf');
      if (f) {
        f.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        var first = f.querySelector('button, input[type=tel], input[type=text]'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
      } else location.href = '/mirratrade-preview/registration-form/';
    });
    var p = MT.prefill && MT.prefill.get();
    if (p && p.bank && p.quelle === 'check' && byId(p.bank)) { sel.value = p.bank; }
  }

  /* Bank-Picker: server-seitig gerenderte Chips aus banks.js aktualisieren */
  function picker(root) {
    var lis = root.querySelectorAll('[data-bank]');
    for (var i = 0; i < lis.length; i++) {
      var b = byId(lis[i].getAttribute('data-bank')), c = lis[i].querySelector('[data-chip]');
      if (b && c) { c.className = CHIP[b.stuttgart][0]; c.textContent = CHIP[b.stuttgart][1]; }
    }
  }

  function boot() {
    var a = document.querySelectorAll('[data-check]'), i;
    for (i = 0; i < a.length; i++) init(a[i]);
    var p = document.querySelectorAll('[data-bank-picker]');
    for (i = 0; i < p.length; i++) picker(p[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
