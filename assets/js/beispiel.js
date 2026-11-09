/* MirraTrade – Beispielrechnungen (/mirratrade-preview/ruhestand/entnahmeplan/<betrag>-euro/).
   Liest Eingabewerte aus data-Attributen von #bsp (data-kapital, data-alter-start, … → Feld alter_start),
   ruft MTEngine.calculate auf und füllt #bsp-body. Ohne engine.js/JS bleibt der Hinweis #bsp-nojs sichtbar. */
(function () {
  'use strict';
  var root = document.getElementById('bsp');
  if (!root) return;
  var nojs = document.getElementById('bsp-nojs');
  var wrap = document.getElementById('bsp-result');
  var body = document.getElementById('bsp-body');

  function fail(msg) {
    if (nojs) { nojs.textContent = msg; nojs.style.display = 'block'; }
    if (wrap) wrap.hidden = true;
  }
  function readInput() {
    var o = {};
    Array.prototype.forEach.call(root.attributes, function (a) {
      if (a.name.indexOf('data-') !== 0) return;
      var k = a.name.slice(5).replace(/-/g, '_'), v = a.value;
      if (v === 'true') o[k] = true;
      else if (v === 'false') o[k] = false;
      else if (/^-?\d+([.,]\d+)?$/.test(v)) o[k] = parseFloat(v.replace(',', '.'));
      else o[k] = v;
    });
    return o;
  }
  var eur = function (n) { return (window.MT && MT.fmtEur) ? MT.fmtEur(Math.round(n / 10) * 10) : Math.round(n).toLocaleString('de-DE') + ' €'; };
  function td(txt, cls) { var c = document.createElement('td'); c.textContent = txt; if (cls) c.className = cls; return c; }

  function run() {
    if (!window.MTEngine || typeof MTEngine.calculate !== 'function') {
      fail('Die Beispielrechnung konnte nicht geladen werden (Rechenmodul fehlt). Sie können die Zahlen trotzdem im Rechner nachvollziehen: Button „Mit eigenen Zahlen rechnen“.');
      return;
    }
    var inp = readInput(), res;
    try { res = MTEngine.calculate(inp); } catch (e) { fail('Die Beispielrechnung konnte nicht berechnet werden. Bitte nutzen Sie den Rechner direkt.'); return; }
    var end = inp.alter_ende || 95;
    body.textContent = '';
    res.cases.forEach(function (c) {
      var tr = document.createElement('tr');
      if (c.key === 'niedrig') tr.className = 'hl';
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = c.label; tr.appendChild(th);
      var reicht = c.reichweiteAge === null ? 'bis ' + end + ' und darüber hinaus' : 'bis ca. ' + Math.floor(c.reichweiteAge) + ' Jahre';
      tr.appendChild(td(reicht));
      tr.appendChild(td(eur(c.restToday), 'num'));
      tr.appendChild(td(eur(c.taxesToday), 'num'));
      body.appendChild(tr);
    });
    var p = res.cases.filter(function (c) { return c.key === 'niedrig'; })[0] || res.cases[0];
    var sum = document.getElementById('bsp-summary');
    if (sum && p.years && p.years[0]) {
      sum.textContent = 'Im ersten Jahr kommen in dieser Rechnung rund ' + eur(p.years[0].withdrawal / 12) + ' im Monat aus dem Kapital (heutiges Geld, vor Steuer auf Erträge). ' +
        (p.reichweiteAge === null ? 'Bei der niedrigen Annahme reicht das Kapital bis Alter ' + end + '.' : 'Bei der niedrigen Annahme reicht das Kapital bis etwa Alter ' + Math.floor(p.reichweiteAge) + '.');
    }
    var st = document.getElementById('bsp-warn');
    if (st && res.warning) st.textContent = res.warning;
    if (nojs) nojs.style.display = 'none';
    if (wrap) wrap.hidden = false;
    if (window.MT) MT.track('calc_run', { quelle: 'beispiel', kapital: inp.kapital });
    var btn = document.getElementById('bsp-open');
    if (btn && MTEngine.encodeState) btn.href = '/mirratrade-preview/ruhestand/entnahmeplan-rechner/#' + MTEngine.encodeState(inp);
  }
  if (window.MTEngine) run(); else window.addEventListener('load', run);
})();
