/* MirraTrade – Marktdaten und Strategie-Ergebnisse für /lc002-eti/maerkte-im-minus/.
   Daten kommen ausschließlich aus assets/js/markt-daten.js (window.MT_MARKT); fehlt ein Block, bleibt er verborgen. */
(function () {
  'use strict';
  var D = window.MT_MARKT || {}, MT = window.MT || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function src(q, u) { return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(q) + '</a>' : esc(q); }
  function dt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : esc(iso); }
  function neg(v) { return /^[−-]/.test(String(v)) ? ' class="neg"' : ''; }

  /* Hero-Leiste: aktuelle Indexstände (nur mit Stand und Quelle) */
  var ix = (D.indizes || []).filter(function (r) { return r.name && r.wert && r.quelle; });
  var strip = document.querySelector('[data-markt]');
  function fresh(iso, days) { var t = Date.parse(iso + 'T23:59:59Z'); return !isNaN(t) && (Date.now() - t) / 864e5 <= (days || 3); }
  if (strip && ix.length && D.stand && fresh(D.stand, D.maxAlterTage)) {
    strip.innerHTML = '<p><b>Stand ' + dt(D.stand) + ':</b> ' + ix.slice(0, 3).map(function (r) {
      return esc(r.name) + ' <span' + neg(r.wert) + '>' + esc(r.wert) + '</span> ' + esc(r.zeitraum || '');
    }).join(' · ') + '</p><p class="small">Quellen: ' + ix.slice(0, 3).map(function (r) { return src(r.quelle, r.url); }).join(', ') + '. Indexentwicklung, nicht die Wertentwicklung des LC002 ETI.</p>';
    strip.hidden = false;
  }

  /* Tabelle: Jahre, in denen Aktien und Anleihen gleichzeitig fielen */
  var hist = (D.historie || []).filter(function (r) { return r.jahr && r.quelle; }), tb = document.querySelector('[data-markt-table]');
  if (tb && hist.length) {
    tb.innerHTML = '<div class="tw"><table class="tbl"><caption>Aktien und Anleihen im selben Jahr (Indexentwicklung)</caption><thead><tr><th scope="col">Jahr</th><th scope="col">' + esc(D.aktienIndex || 'Aktien') + '</th><th scope="col">' + esc(D.anleihenIndex || 'Anleihen') + '</th><th scope="col">Quelle</th></tr></thead><tbody>' +
      hist.map(function (r) { return '<tr><th scope="row">' + esc(r.jahr) + '</th><td' + neg(r.aktien) + '>' + esc(r.aktien) + '</td><td' + neg(r.anleihen) + '>' + esc(r.anleihen) + '</td><td>' + src(r.quelle, r.url) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="small">Frühere Entwicklungen von Indizes sind kein verlässlicher Indikator für die Zukunft und keine Wertentwicklung des LC002 ETI.</p>';
    tb.hidden = false;
  } else { [].forEach.call(document.querySelectorAll('.mk-src'), function (e) { e.hidden = true; }); }

  /* Ergebnisse der Strategie: nur mit Zeitraum ≥ 12 Monate, Quelle, Stand und Kostenangabe */
  var S = D.strategie, box = document.querySelector('[data-strategie]');
  if (box && S && S.werte && S.werte.length && S.monate >= 12 && S.quelle && S.stand && typeof S.nachKosten === 'boolean') {
    box.innerHTML = '<h3>Wertentwicklung der Strategie</h3><div class="tw"><table class="tbl"><caption class="sr-only">Wertentwicklung der Strategie</caption><thead><tr><th scope="col">Zeitraum</th><th scope="col">Strategie</th>' + (S.vergleich ? '<th scope="col">' + esc(S.vergleich) + '</th>' : '') + '</tr></thead><tbody>' +
      S.werte.map(function (w) { return '<tr><th scope="row">' + esc(w.periode) + '</th><td' + neg(w.wert) + '>' + esc(w.wert) + '</td>' + (S.vergleich ? '<td' + neg(w.vergleich) + '>' + esc(w.vergleich || '–') + '</td>' : '') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="small">' + esc(S.beschreibung || '') + ' Quelle: ' + src(S.quelle, S.url) + ', Stand ' + dt(S.stand) + '. ' +
      (S.nachKosten ? 'Nach Abzug der laufenden Kosten der Strategie; Kosten Ihrer Bank und Steuern nicht berücksichtigt. ' : 'Vor Abzug von Kosten; Kosten mindern die Wertentwicklung. ') +
      'Frühere Wertentwicklungen sind kein verlässlicher Indikator für künftige Ergebnisse. Das LC002 ETI wurde am 27.05.2026 ausgegeben; seine eigene Wertentwicklung kann abweichen.</p>';
    if (MT.track) MT.track('strategie_view', { monate: S.monate });
  }

  /* Message match: Überschrift passend zum Werbemittel (?utm_content=k1…k4) */
  var H = { k2: 'Märkte rot? Ein Baustein, der anders aufgestellt ist.', k3: 'Welt-ETF im Minus. Und daneben? Ein Baustein, der nicht auf steigende Kurse setzt.' };
  try { var uc = new URLSearchParams(location.search).get('utm_content'), h1 = document.querySelector('h1'); if (h1 && H[uc]) h1.textContent = H[uc]; } catch (e) {}
})();
