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
