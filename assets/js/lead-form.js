/* 2-stufiges Rückruf-Formular (Client-Texte) mit H3-Prefill und H6-Routing (Ausland).
   Root: <div data-lead-form [data-mode="short"] [data-bank="comdirect"]>. Demo-Modus ohne FORM_ENDPOINT. */
(function () {
  'use strict';
  var MT = window.MT || {};
  var BANKS = window.MT_BANKS || [];
  var LANDS = [['DE', 'Deutschland'], ['AT', 'Österreich'], ['CH', 'Schweiz'], ['OTHER', 'Anderes Land']];
  var BANDS = ['bis 5.000 €', '5.000–25.000 €', '25.000–100.000 €', 'über 100.000 €', 'möchte ich nicht sagen'];
  var CALL = 'Ich willige ein, dass mich MirraTrade, der Betreiber dieser Seite, unter dieser Nummer anruft – zum LUMEROOS CAPITAL LC002 ETI und zum Kauf über meine Bank. Nur für diese Anfrage, jederzeit widerrufbar, auch im Gespräch.';
  var DATA = 'Ich willige ein, dass MirraTrade meine Angaben zur Bearbeitung dieser Anfrage verwendet (Anruf, auf Wunsch E-Mail). Die Einwilligung in den Anruf wird mit Zeitpunkt als Nachweis gespeichert. Widerruf jederzeit, auch im Gespräch.';
  var LATER = 'Ich willige ein, dass MirraTrade meine Angaben zur Bearbeitung dieser Anfrage verwendet und mich später über diese Kontaktdaten kontaktiert. Widerruf jederzeit.';
  var n = 0;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ''); }
  function landName(c) { for (var i = 0; i < LANDS.length; i++) if (LANDS[i][0] === c) return LANDS[i][1]; return ''; }
  function normLand(v) {
    v = String(v || '').toUpperCase();
    if (v === 'DE' || v === 'AT' || v === 'CH') return v;
    if (v === 'OTHER' || v === 'ANDERE' || v === 'ANDERES') return 'OTHER';
    return '';
  }
  function normBank(v) {
    var k = norm(v); if (!k) return '';
    if (k === 'andere' || k === 'anderebank') return 'andere';
    if (k === 'keindepot' || k === 'nochkeindepot') return 'kein-depot';
    for (var i = 0; i < BANKS.length; i++) if (norm(BANKS[i].id) === k || norm(BANKS[i].name) === k) return BANKS[i].id;
    return '';
  }
  function normBand(v) {
    if (v === undefined || v === null || v === '') return '';
    var num = typeof v === 'number' ? v : (/^[\d.]+$/.test(String(v)) ? parseFloat(String(v).replace(/\./g, '')) : NaN);
    if (!isNaN(num)) v = MT.amountBand ? MT.amountBand(num) : '';
    if (v === '25.000–50.000 €' || v === '50.000–100.000 €') v = '25.000–100.000 €';
    return BANDS.indexOf(v) >= 0 ? v : '';
  }
  function urlParams() {
    var o = {}; try { var u = new URLSearchParams(location.search); o.bank = u.get('bank'); o.betrag = u.get('betrag'); o.land = u.get('land'); } catch (e) {}
    return o;
  }
  function radios(name, list, checked) {
    return list.map(function (it) {
      return '<label><input type="radio" name="' + name + '" value="' + esc(it[0]) + '"' + (it[0] === checked ? ' checked' : '') + '><span>' + esc(it[1]) + '</span></label>';
    }).join('');
  }
  function tagHtml(f) { return '<span class="tag" data-tag="' + f + '" hidden>aus Ihrer Prüfung übernommen · <button type="button" data-change="' + f + '">ändern</button></span>'; }

  function init(root) {
    var uid = 'lf' + (++n), short = root.getAttribute('data-mode') === 'short', preset = root.getAttribute('data-bank') || '';
    var pf = MT.prefill ? MT.prefill.get() : {}, up = urlParams();
    var st = {
      land: normLand(up.land) || normLand(pf.land),
      bank: normBank(preset) || normBank(up.bank) || normBank(pf.bank),
      band: normBand(up.betrag) || normBand(pf.betrag),
      from: {}, dirty: {}
    };
    var h = root.getAttribute('data-heading') || 'h3';
    var bankOpts = '<option value="">Bitte wählen</option>' + BANKS.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>'; }).join('') + '<option value="andere">Andere Bank</option><option value="kein-depot">Noch kein Depot</option>';

    var step1 = short ? '' :
      '<div data-s="1"><p class="stp">Erster Schritt</p><' + h + '>Wo wohnen Sie?</' + h + '>' +
      '<p class="small">Diese Frage ist keine Prüfung, ob das Wertpapier zu Ihnen passt – sie entscheidet nur, welches Formular Sie sehen.</p>' +
      '<div class="seg" role="group" aria-label="Wohnland">' + LANDS.map(function (l) { return '<button type="button" class="btn btn--ghost" data-land="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div></div>';

    var more = short ? '' :
      '<details><summary>Weitere Angaben (optional)</summary>' +
      '<div class="fld"><label for="' + uid + '-mail">E-Mail (freiwillig)</label><input class="inp" id="' + uid + '-mail" name="email" type="email" autocomplete="email"></div>' +
      '<fieldset><legend>Wann erreichen wir Sie am besten? (freiwillig)</legend><div class="seg">' + radios('zeit', [['', 'Keine Vorgabe'], ['Vormittags', 'Vormittags'], ['Nachmittags', 'Nachmittags'], ['Abends', 'Abends']], '') + '</div></fieldset>' +
      '<fieldset><legend>Worum soll es im Gespräch gehen? (freiwillig)</legend>' +
      ['Das Wertpapier LC002 ETI', 'Der Kauf über meine Bank', 'Die Unterlagen (Basisinformationsblatt, Basisprospekt)'].map(function (t) { return '<label class="ck"><input type="checkbox" name="thema" value="' + esc(t) + '"><span>' + esc(t) + '</span></label>'; }).join('') + '</fieldset></details>';

    var depotBank = short ? '' :
      '<fieldset><legend>Haben Sie ein Wertpapierdepot? (freiwillig)</legend><div class="seg">' + radios('depot', [['bank', 'Ja, bei einer Bank oder einem Broker'], ['app', 'Ja, in einer Trading-App'], ['nein', 'Nein, noch nicht']], '') + '</div></fieldset>' +
      '<div class="fld"><label for="' + uid + '-bank">Ihre Bank oder Ihr Broker (freiwillig)' + tagHtml('bank') + '</label><select class="inp" id="' + uid + '-bank" name="bank" style="max-width:360px">' + bankOpts + '</select></div>' +
      '<fieldset><legend>Ungefährer Betrag (freiwillig)' + tagHtml('band') + '</legend><div class="seg">' + radios('betrag', BANDS.map(function (b) { return [b, b]; }), '') + '</div></fieldset>';

    var emailShort = short ? '<div class="fld"><label for="' + uid + '-mail">Ihre E-Mail-Adresse (freiwillig)</label><input class="inp" id="' + uid + '-mail" name="email" type="email" autocomplete="email"></div>' : '';

    root.innerHTML = '<div class="lf">' + step1 +
      '<div data-s="2" hidden><form novalidate>' +
      (short ? '' : '<p class="stp">Zweiter Schritt</p><' + h + '>Fragen zum Wertpapier oder zum Kauf über Ihre Bank? Wir rufen Sie an.</' + h + '>' +
        '<p class="small">Am Telefon beantworten wir Ihre Fragen zum Wertpapier und zu den Schritten bei Ihrer Bank – auf Grundlage von Basisinformationsblatt und Basisprospekt. Keine Anlageberatung: Ob Sie kaufen und ob es zu Ihnen passt, entscheiden Sie selbst oder mit Ihrer Bank.</p>' +
        '<p class="small">Wohnland: <strong data-landname></strong>' + tagHtml('land') + ' <button type="button" class="btn btn--sm" data-back>Land ändern</button></p>') +
      '<div class="fld"><label for="' + uid + '-name">' + (short ? 'Ihr Name' : 'Name') + ' *</label><input class="inp" id="' + uid + '-name" name="name" autocomplete="name" required></div>' +
      '<div class="fld"><label for="' + uid + '-tel">' + (short ? 'Ihre Telefonnummer' : 'Telefonnummer für den Rückruf') + ' *</label><input class="inp" id="' + uid + '-tel" name="telefon" type="tel" autocomplete="tel" inputmode="tel" required></div>' +
      '<fieldset><legend>Land der Telefonnummer</legend><div class="seg">' + radios('tland', LANDS, st.land || 'DE') + '</div></fieldset>' +
      emailShort + depotBank + more +
      '<div class="hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="ck"><input type="checkbox" name="c_call" required><span>' + CALL + ' *</span></label>' +
      '<label class="ck"><input type="checkbox" name="c_data" required><span>' + DATA + ' *</span></label>' +
      '<div class="err" role="alert" data-err></div>' +
      '<button type="submit" class="btn">Rückruf anfordern</button>' +
      '<p class="small" style="margin-top:12px">Kein Kauf über diese Seite oder am Telefon – gekauft wird nur über Ihre Bank. Ihre Angaben geben wir nicht an Werbenetzwerke weiter.</p></form></div>' +
      '<div data-s="aus" hidden class="aus" style="padding-left:18px"><p class="stp">Hinweis</p><' + h + '>Diese Werbemitteilung richtet sich nur an Anleger in Deutschland und Österreich</' + h + '>' +
      '<p>Das Wertpapier wird nur Anlegern in Deutschland und Österreich angeboten. Für Anleger in der Schweiz und in anderen Ländern ist die Seite nicht bestimmt; kein Angebot an US-Personen. Einen Rückruf zum LC002 ETI bieten wir deshalb nicht an.</p>' +
      '<ul><li><a href="/mirratrade-preview/ruhestand/rente-im-ausland/">Ruhestand im Ausland: Was passiert mit dem Depot?</a></li><li><a href="/mirratrade-preview/ruhestand/entnahmeplan-rechner/#land=OTHER">Entnahmeplan-Rechner mit Wohnland „Anderes Land“</a></li></ul>' +
      '<details><summary>Kontakt für später (optional)</summary><form novalidate data-aus>' +
      '<div class="fld"><label for="' + uid + '-an">Name *</label><input class="inp" id="' + uid + '-an" name="name" autocomplete="name"></div>' +
      '<div class="fld"><label for="' + uid + '-ak">E-Mail oder Telefonnummer *</label><input class="inp" id="' + uid + '-ak" name="kontakt" autocomplete="email"></div>' +
      '<div class="hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="ck"><input type="checkbox" name="c_later"><span>' + LATER + ' *</span></label>' +
      '<div class="err" role="alert" data-err></div><button type="submit" class="btn">Kontakt speichern</button></form></details>' +
      '<p><button type="button" class="btn btn--sm" data-back>Land ändern</button></p></div>' +
      '<div data-s="ok" hidden role="status"></div></div>';

    var $ = function (s) { return root.querySelector(s); };
    var form = $('[data-s="2"] form'), ausF = $('form[data-aus]');
    var views = { 1: $('[data-s="1"]'), 2: $('[data-s="2"]'), aus: $('[data-s="aus"]'), ok: $('[data-s="ok"]') };
    function view(k) { for (var x in views) if (views[x]) views[x].hidden = x !== String(k); }

    function setTag(f, on) { var t = root.querySelector('[data-tag="' + f + '"]'); if (t) t.hidden = !on; }
    function applyBank(v, fromPrefill) {
      var s = root.querySelector('select[name=bank]'); if (!s || !v) return;
      s.value = v; st.bank = v; if (fromPrefill) { st.from.bank = true; setTag('bank', true); }
    }
    function applyBand(v, fromPrefill) {
      var r = form.querySelector('input[name=betrag][value="' + v + '"]'); if (!r) return;
      r.checked = true; st.band = v; if (fromPrefill) { st.from.band = true; setTag('band', true); }
    }
    function setLand(c, fromPrefill) {
      st.land = c;
      var ln = root.querySelector('[data-landname]'); if (ln) ln.textContent = landName(c);
      var r = form.querySelector('input[name=tland][value="' + c + '"]'); if (r) r.checked = true;
      st.from.land = !!fromPrefill; setTag('land', !!fromPrefill);
    }
    function route(c, fromPrefill) {
      setLand(c, fromPrefill);
      if (c === 'CH' || c === 'OTHER') view('aus'); else view(2);
    }

    /* Prefill anwenden */
    if (st.bank) applyBank(st.bank, !preset);
    if (st.band) applyBand(st.band, true);
    var pfields = [(st.bank && !preset) && 'bank', st.band && 'betrag', st.land && 'land'].filter(Boolean);
    if (pfields.length && MT.track) MT.track('form_prefilled', { fields: pfields.join(','), quelle: pf.quelle || 'url' });
    if (st.land) route(st.land, true); else view(short ? 2 : 1);

    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-land')) {
        var c = b.getAttribute('data-land');
        if (MT.track) MT.track('form_step1', { land: c });
        if (MT.prefill) MT.prefill.set({ land: c });
        route(c, false);
      } else if (b.hasAttribute('data-back')) { view(1); st.land = ''; }
      else if (b.hasAttribute('data-change')) {
        var f = b.getAttribute('data-change'); setTag(f, false);
        if (f === 'land') { view(1); st.land = ''; return; }
        var el = f === 'bank' ? root.querySelector('select[name=bank]') : form.querySelector('input[name=betrag]:checked') || form.querySelector('input[name=betrag]');
        if (el) el.focus();
      }
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'bank') { st.dirty.bank = true; setTag('bank', false); }
      if (t.name === 'betrag') { st.dirty.band = true; setTag('band', false); }
      if (short && t.name === 'tland' && (t.value === 'CH' || t.value === 'OTHER')) { if (MT.track) MT.track('form_step1', { land: t.value }); route(t.value, false); }
    });
    document.addEventListener('mt:prefill', function () {
      var b = normBank((MT.prefill && MT.prefill.get() || {}).bank);
      if (b && !st.dirty.bank && !preset) applyBank(b, true);
    });

    function done(demo, text) {
      views.ok.innerHTML = '<div class="lf-ok">' + text + '</div>' +
        (demo ? '<p class="lf-demo"><strong>Demo-Modus:</strong> Ihre Angaben wurden NICHT übertragen – für diese Website ist noch kein Empfangsendpunkt eingerichtet.</p>' : '');
      view('ok'); if (views.ok.scrollIntoView) views.ok.scrollIntoView({ block: 'nearest' });
    }
    function submit(f, build, okText, evt) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var box = f.querySelector('[data-err]'), btn = f.querySelector('button[type=submit]'), v = build(f);
        box.textContent = '';
        if (v.error) { box.textContent = v.error; return; }
        if (f.elements.website && f.elements.website.value) { done(false, okText); return; } /* Honeypot */
        btn.disabled = true;
        var P = MT.send ? MT.send('FORM_ENDPOINT', v.payload) : Promise.resolve({ demo: true });
        P.then(function (r) {
          var demo = !!(r && r.demo); v.track.demo = demo;
          if (MT.track) MT.track(evt, v.track);
          done(demo, demo ? 'Formular geprüft.' : okText);
        }, function () { btn.disabled = false; box.textContent = 'Die Übermittlung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'; });
      });
    }
    function val(f, k) { var e = f.elements[k]; return e ? String(e.value || '').trim() : ''; }
    function chosen(f, k) { var e = f.querySelector('input[name=' + k + ']:checked'); return e ? e.value : ''; }
    var okCall = 'Danke – Ihre Bitte um Rückruf ist bei MirraTrade angekommen. MirraTrade ruft Sie unter der angegebenen Nummer an. Gekauft wird nur über Ihre Bank.';

    submit(form, function (f) {
      var tel = val(f, 'telefon'), digits = tel.replace(/[\s()\/.\-+]/g, '');
      if (!val(f, 'name')) return { error: 'Bitte geben Sie Ihren Namen an.' };
      if (!/^\d{6,15}$/.test(digits)) return { error: 'Bitte geben Sie eine gültige Telefonnummer an.' };
      var em = val(f, 'email'); if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { error: 'Bitte prüfen Sie die E-Mail-Adresse.' };
      if (!f.elements.c_call.checked || !f.elements.c_data.checked) return { error: 'Bitte stimmen Sie beiden Einwilligungen zu, damit wir Sie anrufen dürfen.' };
      var bank = f.elements.bank ? f.elements.bank.value : (st.bank || ''), betrag = chosen(f, 'betrag');
      var thema = [].map.call(f.querySelectorAll('input[name=thema]:checked'), function (x) { return x.value; });
      return {
        payload: { type: 'rueckruf', land: st.land || 'DE', telefon: tel, telefon_land: chosen(f, 'tland'), name: val(f, 'name'), email: em, zeit: chosen(f, 'zeit'), thema: thema, depot: chosen(f, 'depot'), bank: bank, betrag: betrag, consent_call: true, consent_data: true, consent_text_call: CALL, consent_text_data: DATA, ts: new Date().toISOString(), page: location.pathname, quelle: (MT.prefill && MT.prefill.get().quelle) || '' },
        track: { land: st.land || 'DE', bank: bank, betrag: betrag, prefilled: !!(st.from.bank || st.from.band || st.from.land) }
      };
    }, okCall, 'form_submit');

    submit(ausF, function (f) {
      if (!val(f, 'name')) return { error: 'Bitte geben Sie Ihren Namen an.' };
      var k = val(f, 'kontakt'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k) && !/^\d{6,15}$/.test(k.replace(/[\s()\/.\-+]/g, ''))) return { error: 'Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an.' };
      if (!f.elements.c_later.checked) return { error: 'Bitte stimmen Sie der Einwilligung zu.' };
      return { payload: { type: 'ausland', land: st.land || 'OTHER', name: val(f, 'name'), kontakt: k, consent: true, consent_text: LATER, ts: new Date().toISOString(), page: location.pathname }, track: { land: st.land || 'OTHER', type: 'ausland' } };
    }, 'Danke – wir haben Ihren Kontakt für später notiert.', 'form_submit');
  }

  /* Mini-Faktenbox: erscheint, sobald die Faktenkarte aus dem Bild ist */
  function mini() {
    var card = document.getElementById('fakten'), box = document.getElementById('mini');
    if (!card || !box || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) { box.classList.toggle('on', !en[0].isIntersecting && en[0].boundingClientRect.bottom < 0); }).observe(card);
  }

  function boot() {
    var a = document.querySelectorAll('[data-lead-form]');
    for (var i = 0; i < a.length; i++) init(a[i]);
    mini();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
