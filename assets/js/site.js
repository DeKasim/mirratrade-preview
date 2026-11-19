/* MirraTrade – gemeinsame Helfer: Analytics-Events, Prefill-Speicher, Kopier-Buttons, Formular-Versand. */
(function () {
  'use strict';
  var MT = window.MT = window.MT || {};
  window.dataLayer = window.dataLayer || [];

  MT.track = function (event, props) {
    var o = { event: event };
    if (props) for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) o[k] = props[k];
    o.page = location.pathname;
    window.dataLayer.push(o);
  };

  var KEY = 'mt_prefill';
  MT.prefill = {
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
    },
    set: function (patch) {
      try {
        var cur = MT.prefill.get();
        for (var k in patch) if (patch[k] !== undefined && patch[k] !== null && patch[k] !== '') cur[k] = patch[k];
        sessionStorage.setItem(KEY, JSON.stringify(cur));
      } catch (e) { /* privater Modus: ohne Speicher weiter */ }
    }
  };

  /* Herkunft der Sitzung (first touch): UTM, Klick-IDs, Einstiegsseite, externer Referrer.
     Bleibt nur in diesem Tab (sessionStorage) und geht erst mit dem Formular an MirraTrade. */
  (function () {
    var cur = MT.prefill.get(); if (cur.attr) return;
    var a = { landing: location.pathname };
    try {
      var u = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'msclkid'].forEach(function (k) { var v = u.get(k); if (v) a[k] = v.slice(0, 200); });
    } catch (e) {}
    try { if (document.referrer && new URL(document.referrer).host !== location.host) a.referrer = document.referrer.slice(0, 300); } catch (e) {}
    MT.prefill.set({ attr: a });
  })();

  /* Kontext einer Anfrage für das CRM: was die Person auf der Seite getan hat,
     plus ein Gesprächseinstieg für den Rückruf (statt „Ich bin von MirraTrade“). */
  MT.leadContext = function (lead) {
    lead = lead || {};
    var pf = MT.prefill.get(), attr = pf.attr || {}, c = {};
    for (var k in attr) if (Object.prototype.hasOwnProperty.call(attr, k)) c[k] = attr[k];
    c.check_state = pf.check_state || '';
    c.check_bank = pf.check_bank || '';
    var bank = c.check_bank || lead.bank || '';
    var o;
    if (c.check_state === 'ja') o = 'Sie haben auf unserer Seite geprüft, ob das LC002 ETI bei ' + bank + ' handelbar ist – laut unserer Stichprobe ja. Gibt es Fragen zum Kauf dort?';
    else if (c.check_state === 'nein') o = 'Sie haben auf unserer Seite geprüft, ob das LC002 ETI bei ' + bank + ' handelbar ist – dort ist die Börse Stuttgart laut unserer Quelle nicht im Angebot. Sie wollten Hilfe beim Kauf über Ihre Bank.';
    else if (c.check_state === 'unbekannt') o = 'Sie haben auf unserer Seite nach ' + (bank || 'Ihrer Bank') + ' gesucht; diese Bank haben wir noch nicht geprüft. Sie wollten wissen, ob der Kauf dort möglich ist.';
    else if (c.check_state === 'kein_depot') o = 'Sie haben angegeben, noch kein Depot zu haben. Sie wollten wissen, wie man das LC002 ETI kaufen kann.';
    else if (lead.quelle === 'rechner' || pf.quelle === 'rechner') o = 'Sie haben auf unserer Seite den Entnahmeplan-Rechner genutzt' + (lead.betrag ? ' (Betrag: ' + lead.betrag + ')' : '') + ' und um ein Gespräch zu Ihrem Plan gebeten.';
    else o = 'Sie haben auf unserer Seite ' + location.pathname + ' um einen Rückruf gebeten' + (lead.thema && lead.thema.length ? ' – Thema: ' + lead.thema.join(', ') : '') + '.';
    c.opener = o;
    c.page_title = document.title.slice(0, 160);
    c.variant = (document.body && document.body.getAttribute('data-variant')) || '';
    return c;
  };

  /* Betrag (Zahl in €) → Band des Rückruf-Formulars */
  MT.amountBand = function (eur) {
    if (!(eur > 0)) return '';
    if (eur <= 5000) return 'bis 5.000 €';
    if (eur <= 25000) return '5.000–25.000 €';
    if (eur <= 50000) return '25.000–50.000 €';
    if (eur <= 100000) return '50.000–100.000 €';
    return 'über 100.000 €';
  };

  /* POST JSON an konfigurierten Endpunkt; ohne Endpunkt: Demo-Modus */
  MT.send = function (endpointKey, payload) {
    var url = (window.MT_CONFIG || {})[endpointKey];
    if (!url) {
      console.warn('[MirraTrade] Demo-Modus: ' + endpointKey + ' nicht konfiguriert – Daten wurden nicht übertragen.', payload);
      return Promise.resolve({ demo: true });
    }
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return { demo: false }; });
  };

  MT.fmtEur = function (n, dec) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 }).format(n || 0);
  };

  /* Kopier-Buttons: <button data-copy="DE000AMC0D69"> */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    var txt = b.getAttribute('data-copy');
    var done = function () {
      var old = b.textContent; b.textContent = 'Kopiert';
      setTimeout(function () { b.textContent = old; }, 1400);
      MT.track('copy', { value: txt });
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else { var t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); done(); }
  });
})();
