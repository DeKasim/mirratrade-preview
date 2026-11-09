/* MirraTrade – Entnahmeplan-Rechner: Oberfläche. Rechnet mit window.MTEngine, Zustand im URL-Hash. Läuft vollständig im Browser. */
(function () {
  'use strict';
  var E = window.MTEngine, f = document.getElementById('rform');
  if (!E || !f) return;
  var MT = window.MT || {};
  var track = MT.track || function () {};
  var $ = function (id) { return document.getElementById(id); };
  var NUM = ['kapital', 'alter_start', 'alter_ende', 'gewinnanteil', 'rente_netto', 'rente_ab_alter', 'rentenanpassung', 'sonstige_einkuenfte',
    'ausgaben', 'fest_betrag', 'prozent', 'alter_bis', 'rendite_niedrig', 'rendite_hoch', 'inflation', 'crash', 'crash_jahre', 'erholung_jahre',
    'reserve_jahre', 'kosten', 'depotgebuehr', 'kaufkosten', 'steuer_andere', 'reserve_zins', 'gold_rendite', 'kirchensteuer'];
  var CHK = ['fest_index', 'steuer_an', 'zusammen', 'teilfreistellung', 'kinderlos'];
  var STR = ['methode', 'kv_status', 'modus', 'land', 'reserve_art'];
  var HASH_DEF = { kosten: 0, depotgebuehr: 0, kaufkosten: 0, modus: 'standard', land: 'DE', steuer_andere: 25, reserve_art: 'cash', reserve_zins: 0, gold_rendite: 0 };
  var COL = { ohne: '#5b6470', niedrig: '#8d45b3', hoch: '#0f766e', stress: '#c2410c' };
  var DASH = { ohne: '6 4', niedrig: '', hoch: '2 3', stress: '10 3 2 3' };
  var SHORT = { ohne: 'Ohne', niedrig: 'Niedrig', hoch: 'Hoch', stress: 'Stresstest' };
  var nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var res = null, st = null, hashTimer = null, ran = false, costTracked = false, curAge = null, lastHash = '';

  function eur(n) { return nf.format(Math.round(n)).replace('-', '−') + ' €'; }
  function pc(n, d) { return n.toLocaleString('de-DE', { maximumFractionDigits: d == null ? 2 : d }).replace('-', '−') + ' %'; }
  function yrs(x) { return Math.floor(Math.round(x * 10) / 10 + 1e-9); }
  function dec1(x) { return x.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  /* ---------- Zustand ---------- */
  function read() {
    var s = {};
    NUM.forEach(function (k) { var v = E.parseNum(f.elements[k].value); s[k] = isNaN(v) ? null : v; });
    CHK.forEach(function (k) { s[k] = f.elements[k].checked; });
    STR.forEach(function (k) { s[k] = f.elements[k].value; });
    return s;
  }
  function write(o) {
    Object.keys(o).forEach(function (k) {
      var el = f.elements[k], v = o[k];
      if (!el || v === null || v === undefined) return;
      if (CHK.indexOf(k) >= 0) el.checked = !!v;
      else if (NUM.indexOf(k) >= 0) el.value = k === 'kirchensteuer' ? String(v) : E.formatNum(v);
      else el.value = String(v);
    });
  }
  function hashOf(s) {
    var o = {};
    Object.keys(s).forEach(function (k) { o[k] = s[k]; });
    Object.keys(HASH_DEF).forEach(function (k) { if (o[k] === HASH_DEF[k]) delete o[k]; });
    return E.encodeState(o);
  }
  function flushHash() {
    clearTimeout(hashTimer);
    var h = hashOf(read());
    lastHash = '#' + h;
    try { history.replaceState(null, '', location.pathname + location.search + lastHash); } catch (e) { location.hash = h; }
  }
  function schedHash() { clearTimeout(hashTimer); hashTimer = setTimeout(flushHash, 150); }

  /* ---------- Sichtbarkeit ---------- */
  function show(id, on) { var el = $(id); if (el) el.hidden = !on; }
  function nondeText(s) {
    if (s.land === 'AT') return 'Österreich: Kapitalerträge werden pauschal mit 27,5 % KESt auf den Ertragsanteil jeder Entnahme belastet, ohne Freibetrag und Teilfreistellung. Deutsche Kranken- und Pflegeversicherungsbeiträge auf Kapitalerträge entfallen. Das ist eine Vereinfachung, keine österreichische Steuerrechnung.';
    return 'Anderes Land: Ihr Pauschalsatz von ' + pc(s.steuer_andere == null ? 25 : s.steuer_andere) + ' wird auf den Ertragsanteil jeder Entnahme angewendet, ohne Freibetrag und Teilfreistellung und ohne deutsche Kranken- und Pflegeversicherung auf Kapitalerträge. Doppelbesteuerungsabkommen und Wegzugsbesteuerung sind nicht abgebildet.';
  }
  function vis(s) {
    [].forEach.call(f.querySelectorAll('.rule-f'), function (d) { d.classList.toggle('on', d.getAttribute('data-rule') === s.methode); });
    show('avd-note', s.modus === 'avd');
    show('f-rzins', s.reserve_art !== 'gold'); show('f-gold', s.reserve_art === 'gold');
    var nd = s.land !== 'DE';
    show('nonde', nd); show('f-andere', s.land === 'OTHER'); show('de-only', !nd);
    if (nd) $('nonde-txt').textContent = nondeText(s);
    show('f-kinderlos', s.kv_status === 'freiwillig');
  }

  /* ---------- Rechnen ---------- */
  function compute() {
    var s = read();
    vis(s);
    if (!(s.kapital > 0) || s.alter_start === null || s.alter_start < 18) {
      $('r-msg').innerHTML = '<p class="note note--warn">Bitte tragen Sie ein Kapital über 0 € und das Alter zu Beginn der Entnahme ein.</p>';
      return;
    }
    $('r-msg').innerHTML = '';
    try { res = E.calculate(s); } catch (e) { $('r-msg').innerHTML = '<p class="note note--warn">Mit diesen Eingaben ist keine Berechnung möglich.</p>'; return; }
    st = s;
    render();
    if (!ran) { ran = true; track('calc_run'); }
  }

  function caseLabel(c, p) {
    if (c.key === 'ohne') return 'Ohne Wertentwicklung (0 %)';
    if (c.key === 'niedrig') return 'Niedrige Wertentwicklung (' + pc(p.rendite_niedrig) + ')';
    if (c.key === 'hoch') return 'Hohe Wertentwicklung (' + pc(p.rendite_hoch) + ')';
    return 'Stresstest: Einbruch zu Beginn';
  }
  function headline(c, p) {
    if (c.reichweiteAge === null) return 'Das Kapital reicht bis zum Planungsende mit ' + p.alter_ende + ' Jahren.';
    return 'Das Kapital reicht bis zum Alter von ' + yrs(c.reichweiteAge) + ' Jahren.';
  }
  function render() {
    var p = res.input, h = '', live = [];
    res.cases.forEach(function (c) {
      var w = c.years.length ? c.years[0].withdrawal / 12 : 0, rows = '';
      rows += '<div><dt>Kapital mit ' + p.alter_ende + ' Jahren</dt><dd>' + eur(c.restToday) + '</dd></div>';
      if (c.taxesToday > 0.5) rows += '<div><dt>Steuer insgesamt</dt><dd>' + eur(c.taxesToday) + '</dd></div>';
      if (c.kvToday > 0.5) rows += '<div><dt>Kranken- und Pflegeversicherung</dt><dd>' + eur(c.kvToday) + '</dd></div>';
      if (c.costsToday > 0.5) rows += '<div><dt>Kosten insgesamt</dt><dd>' + eur(c.costsToday) + '</dd></div>';
      h += '<article class="case" style="--c:' + COL[c.key] + '"><h3>' + caseLabel(c, p) + (c.key === 'stress' ? ' <span class="tag">' + (p.crash > 0 ? '−' + pc(p.crash, 1).replace(' %', ' %') : 'ohne Einbruch') + '</span>' : '') + '</h3>' +
        '<p class="head">' + headline(c, p) + '</p>' +
        '<p class="mo">Entnahme im ersten Jahr: rund <b>' + eur(w) + '</b> im Monat, in heutigem Geld.</p>' +
        '<dl class="sums">' + rows + '</dl></article>';
      live.push(SHORT[c.key] + ' bis ' + (c.reichweiteAge === null ? p.alter_ende + '+' : yrs(c.reichweiteAge)));
    });
    $('r-cases').innerHTML = h;
    var lb = $('livebar');
    lb.hidden = false;
    lb.innerHTML = '<span><b>Ergebnis:</b> ' + live.join(' · ') + '</span> <a href="#results">Zum Ergebnis</a>';
    renderNotes(); renderCosts(); renderActions(); renderChart(); renderSelect(); renderTable();
  }

  function renderNotes() {
    var p = res.input, n = [];
    if (p.rendite_niedrig === null && p.rendite_hoch === null)
      n.push('Noch keine Annahme zur Wertentwicklung eingetragen. Zu sehen ist nur der Fall ohne Wertentwicklung: So lange reicht das Geld, wenn es weder wächst noch schrumpft. Das ist eine Bezugsgröße, keine Untergrenze – Verluste würden die Zeit verkürzen. Tragen Sie eine niedrige und eine hohe Annahme ein, um die Spanne und den Stresstest zu sehen.');
    if (p.land === 'DE' && p.kv_status === 'kvdr') n.push('Als Pflichtversicherte in der KVdR zahlen Sie im Modell keine Beiträge auf Kapitalerträge.');
    n.push('Der Stresstest rechnet mit dem eingestellten Rückgang zu Beginn und einer Erholung auf den Pfad Ihrer niedrigen Annahme (ohne Annahme: 0 %). Was er kürzer reicht als die niedrige Annahme, kostet allein die Reihenfolge der Jahre: Im Tief wurde verkauft.');
    n.push('„In heutigem Geld“ heißt: um die angenommene Inflation bereinigt, damit Sie die Beträge mit heutigen Preisen vergleichen können.');
    var h = '<div class="notes">' + n.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>';
    res.warnings.forEach(function (w) {
      if (/Altersvorsorgedepot/.test(w)) h += '<p class="note note--warn">Altersvorsorgedepot: Der Auszahlplan beginnt frühestens mit 65 Jahren; das Startalter wurde auf 65 gesetzt.</p>';
      else if (!/nur vereinfacht/.test(w)) h += '<p class="note note--warn">' + w + '</p>';
    });
    if (res.nonDeNote) h += '<div class="callout callout--warn"><p><b>Vereinfachte Annahme zum steuerlichen Wohnsitz.</b> ' + nondeText(st) + ' <a href="/mirratrade-preview/ruhestand/rente-im-ausland/">Mehr zu Rente im Ausland</a></p></div>';
    if (res.reserveOverProtection) h += '<p class="note">Einlagensicherung gilt bis 100.000 € je Bank und Person. Ihre Reserve (' + eur(res.reserveStart) + ') liegt darüber – prüfen Sie, wie sie auf Banken verteilt ist. <a href="/mirratrade-preview/ruhestand/liquiditaetsreserve/">Mehr zur Reserve</a></p>';
    else if (p.reserve_jahre > 0 && p.reserve_art === 'gold') h += '<p class="note">Die Reserve liegt im Modell als Gold mit gleichbleibender Wertentwicklung (' + pc(p.gold_rendite) + ' pro Jahr) und bekommt keinen eigenen Einbruch. <a href="/mirratrade-preview/ruhestand/liquiditaetsreserve/">Mehr zur Reserve</a></p>';
    $('r-notes').innerHTML = h;
  }

  function renderCosts() {
    var p = res.input, parts = [];
    if (p.kosten > 0) parts.push('Produktkosten ' + pc(p.kosten) + ' p. a.');
    if (p.depotgebuehr > 0) parts.push('Depotgebühr ' + eur(p.depotgebuehr) + ' p. a.');
    if (p.kaufkosten > 0) parts.push('Kaufkosten ' + pc(p.kaufkosten));
    var has = parts.length > 0, c = res.cases.filter(function (x) { return x.key === 'niedrig'; })[0], lbl = '‹niedrig›';
    if (!c) { c = res.cases[0]; lbl = '‹ohne Wertentwicklung›'; }
    var t = '<b>Kosten berücksichtigt:</b> ' + (has ? parts.join(', ') : 'keine eingetragen');
    if (has) {
      var d = c.reichweiteDiffJahre;
      t += ' · verkürzen die Reichweite im Fall ' + lbl + ' um ' + (d < 0.05 ? 'weniger als 0,1 Jahre' : dec1(d) + ' Jahre');
      if (res.totalCostsToday > 0.5) t += ' · Kosten insgesamt ' + eur(res.totalCostsToday) + ' in heutigem Geld';
    }
    var h = '<div class="costline"><p>' + t + '</p>';
    if (res.avdCostCap) {
      var w = Math.min(p.kosten, 2) / 2 * 100;
      h += '<div class="capbar" role="img" aria-label="Ihre Produktkosten ' + pc(p.kosten) + ', Kostendeckel Standarddepot ' + dec1(res.avdCostCap) + '\u00a0%' + '"><i style="width:' + w + '%"></i><b style="left:50%"></b></div>' +
        '<p class="small muted">Ihre laufenden Produktkosten ' + pc(p.kosten) + ' · gestrichelt: Kostendeckel Standarddepot ' + dec1(res.avdCostCap) + '\u00a0%' + ' (Referenz, vorgesehen ab 1.1.2027)</p>';
    }
    $('r-costs').innerHTML = h + '</div>';
  }

  function renderActions() {
    $('actions').hidden = false;
    var band = MT.amountBand ? MT.amountBand(st.kapital) : '';
    $('a-talk').href = '/mirratrade-preview/registration-form/?betrag=' + encodeURIComponent(band) + '&quelle=rechner';
  }

  /* ---------- Diagramm ---------- */
  function series() {
    var p = res.input;
    return res.cases.map(function (c) {
      var k0 = c.years[0].depotStart + (res.reserveStart || 0), v = [k0];
      c.years.forEach(function (y) { v.push(y.totalToday); });
      return { key: c.key, label: SHORT[c.key], v: v };
    });
  }
  function fmtAxis(v) {
    if (v >= 1e6) return (v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mio. €';
    if (v >= 1000) return (v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Tsd. €';
    return Math.round(v) + ' €';
  }
  function renderChart() {
    var p = res.input, S = series(), box = $('r-chart');
    var W = Math.max(300, box.clientWidth || 720), H = W < 520 ? 290 : 340;
    var m = { l: W < 520 ? 68 : 72, r: 14, t: 12, b: 38 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var mx = 0; S.forEach(function (s) { s.v.forEach(function (x) { if (x > mx) mx = x; }); });
    var raw = (mx || 1) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = mag;
    [1, 2, 2.5, 5, 10].some(function (q) { step = q * mag; return step >= raw; });
    var top = step * 4, a0 = p.alter_start, a1 = p.alter_ende;
    var X = function (a) { return m.l + (a - a0) / (a1 - a0) * iw; }, Y = function (v) { return m.t + ih - v / top * ih; };
    var g = '';
    for (var i = 0; i <= 4; i++) {
      var yy = Y(step * i);
      g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '" class="gl"/><text x="' + (m.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end" class="tx">' + fmtAxis(step * i) + '</text>';
    }
    var tk = a1 - a0 > 40 ? 10 : 5;
    for (var a = Math.ceil(a0 / tk) * tk; a <= a1; a += tk)
      g += '<text x="' + X(a) + '" y="' + (H - 18) + '" text-anchor="middle" class="tx">' + a + '</text>';
    g += '<text x="' + (m.l + iw / 2) + '" y="' + (H - 3) + '" text-anchor="middle" class="tx">Alter</text>';
    S.forEach(function (s) {
      var d = s.v.map(function (v, j) { return (j ? 'L' : 'M') + X(a0 + j).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
      g += '<path d="' + d + '" fill="none" stroke="' + COL[s.key] + '" stroke-width="2.4"' + (DASH[s.key] ? ' stroke-dasharray="' + DASH[s.key] + '"' : '') + ' stroke-linejoin="round"/>';
    });
    g += '<g id="cur" style="display:none"><line y1="' + m.t + '" y2="' + (m.t + ih) + '" class="cl"/>' + S.map(function (s) { return '<circle r="4" fill="#fff" stroke="' + COL[s.key] + '" stroke-width="2" data-k="' + s.key + '"/>'; }).join('') + '</g>';
    var leg = '<ul class="legend">' + S.map(function (s) { return '<li><svg width="30" height="8" aria-hidden="true"><line x1="0" x2="30" y1="4" y2="4" stroke="' + COL[s.key] + '" stroke-width="2.4"' + (DASH[s.key] ? ' stroke-dasharray="' + DASH[s.key] + '"' : '') + '/></svg>' + caseLabel({ key: s.key }, p) + '</li>'; }).join('') + '</ul>';
    var sumTxt = S.map(function (s) { return s.label + ': Kapital mit ' + a1 + ' Jahren ' + eur(s.v[s.v.length - 1]); }).join('; ');
    box.innerHTML = leg + '<div class="plot"><svg id="svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" tabindex="0" role="img" aria-label="Kapital nach Alter in heutigem Geld. ' + sumTxt + '. Mit den Pfeiltasten durch die Jahre gehen.">' + g + '</svg><div class="tip" id="tip" hidden aria-live="polite"></div></div>';
    var svg = $('svg');
    function cur(a, px) {
      a = Math.max(a0, Math.min(a1, a)); curAge = a;
      var x = X(a), c = $('cur'), tip = $('tip');
      c.style.display='';
      c.querySelector('line').setAttribute('x1', x); c.querySelector('line').setAttribute('x2', x);
      var h = '<b>Alter ' + a + '</b>';
      S.forEach(function (s) {
        var v = s.v[a - a0], el = c.querySelector('circle[data-k="' + s.key + '"]');
        el.setAttribute('cx', x); el.setAttribute('cy', Y(v));
        h += '<span><i style="background:' + COL[s.key] + '"></i>' + s.label + ' ' + eur(v) + '</span>';
      });
      tip.innerHTML = h; tip.hidden = false;
      tip.style.left = (x < W / 2 ? x + 12 : Math.max(0, x - tip.offsetWidth - 12)) + 'px';
    }
    function at(e) { var r = svg.getBoundingClientRect(); cur(Math.round(a0 + (e.clientX - r.left - m.l) / iw * (a1 - a0))); }
    svg.addEventListener('pointermove', at); svg.addEventListener('pointerdown', at);
    svg.addEventListener('pointerleave', function () { $('cur').style.display = 'none'; $('tip').hidden = true; });
    svg.addEventListener('keydown', function (e) {
      var k = e.key, a = curAge === null ? a0 : curAge;
      if (k === 'ArrowRight') a++; else if (k === 'ArrowLeft') a--; else if (k === 'Home') a = a0; else if (k === 'End') a = a1; else return;
      e.preventDefault(); cur(a);
    });
  }

  /* ---------- Tabelle ---------- */
  function renderSelect() {
    var sel = $('tab-fall'), old = sel.value;
    sel.innerHTML = res.cases.map(function (c) { return '<option value="' + c.key + '">' + caseLabel(c, res.input) + '</option>'; }).join('');
    if (old && res.cases.some(function (c) { return c.key === old; })) sel.value = old;
  }
  function rate(key, t, p) {
    var l = (p.rendite_niedrig === null ? 0 : p.rendite_niedrig) / 100;
    if (key === 'ohne') return 0;
    if (key === 'niedrig') return p.rendite_niedrig / 100;
    if (key === 'hoch') return p.rendite_hoch / 100;
    var c = p.crash / 100, n = p.crash_jahre, k = p.erholung_jahre;
    if (c <= 0) return l;
    if (t < n) return Math.pow(1 - c, 1 / n) - 1;
    if (t < n + k) return Math.pow(Math.pow(1 + l, n + k) / (1 - c), 1 / k) - 1;
    return l;
  }
  function renderTable() {
    var p = res.input, key = $('tab-fall').value, c = res.cases.filter(function (x) { return x.key === key; })[0] || res.cases[0];
    var infl = p.inflation / 100, showCost = p.kosten > 0 || p.depotgebuehr > 0 || p.kaufkosten > 0;
    var h = '<table class="ledger"><thead><tr><th class="num">Alter</th><th class="num">Kapital zu Jahresbeginn</th><th class="num">Wertentwicklung' + (showCost ? ' vor Kosten' : '') + '</th><th class="num">Entnahme</th><th class="num">Steuer</th><th class="num">Kranken- und Pflegeversicherung</th>' +
      (showCost ? '<th class="num">Kosten</th>' : '') + '<th class="num">Rente und sonstige Einkünfte</th><th class="num">Ausgaben</th><th class="num">Kapital zum Jahresende</th></tr></thead><tbody>';
    c.years.forEach(function (y, t) {
      var d = Math.pow(1 + infl, t), begin = t === 0 ? y.depotStart + (res.reserveStart || 0) : c.years[t - 1].totalToday;
      var inc = (y.age >= p.rente_ab_alter ? p.rente_netto * 12 * Math.pow(1 + p.rentenanpassung / 100, t) : 0) + p.sonstige_einkuenfte * 12;
      h += '<tr><td class="num">' + y.age + '</td><td class="num">' + eur(begin) + '</td><td class="num">' + pc(rate(c.key, t, p) * 100, 1) + '</td><td class="num">' + eur(y.withdrawal / d) + '</td><td class="num">' + eur(y.tax / d) + '</td><td class="num">' + eur(y.kv / d) + '</td>' +
        (showCost ? '<td class="num">' + eur(y.costs / d) + '</td>' : '') + '<td class="num">' + eur(inc / d) + '</td><td class="num">' + (p.methode === 'bedarf' ? eur(p.ausgaben * 12) : '–') + '</td><td class="num">' + eur(y.totalToday) + '</td></tr>';
    });
    $('r-table').innerHTML = h + '</tbody></table>';
  }

  /* ---------- Plan sichern ---------- */
  function msg(t, bad) { var m = $('act-msg'); m.textContent = t; m.hidden = !t; m.className = 'form-msg small' + (bad ? ' err' : ''); }
  function summary() {
    return res.cases.map(function (c) { return SHORT[c.key] + ': ' + (c.reichweiteAge === null ? 'bis ' + res.input.alter_ende + '+' : 'bis ' + yrs(c.reichweiteAge)); }).join(', ') + ' (Kapital ' + eur(st.kapital) + ', Start mit ' + res.input.alter_start + ' Jahren)';
  }
  function printSum() {
    var p = res.input, s = st, r = [
      ['Kapital zu Beginn', eur(s.kapital)], ['Alter zu Beginn / Planen bis', p.alter_start + ' / ' + p.alter_ende + ' Jahre'],
      ['Unversteuerte Gewinne', pc(p.gewinnanteil)], ['Rente netto im Monat (heutiger Wert)', eur(p.rente_netto) + ' ab ' + p.rente_ab_alter + ' Jahren, Erhöhung ' + pc(p.rentenanpassung) + ' pro Jahr'],
      ['Sonstige Einkünfte im Monat', eur(p.sonstige_einkuenfte)],
      ['Entnahme', { bedarf: 'Lücke decken, Ausgaben ' + eur(p.ausgaben) + ' im Monat', fest: 'Fester Betrag ' + eur(p.fest_betrag) + ' im Monat' + (p.fest_index ? ', mit Inflation' : ''), prozent: pc(p.prozent) + ' vom Depot pro Jahr', verzehr: 'Kapitalverzehr bis ' + p.alter_bis + ' Jahre', ertraege: 'Nur Erträge' }[p.methode]],
      ['Wertentwicklung niedrig / hoch (vor Kosten)', (p.rendite_niedrig === null ? '–' : pc(p.rendite_niedrig)) + ' / ' + (p.rendite_hoch === null ? '–' : pc(p.rendite_hoch))],
      ['Inflation', pc(p.inflation)], ['Stresstest', '−' + pc(p.crash, 1) + ' auf ' + p.crash_jahre + ' Jahr(e), Erholung ' + p.erholung_jahre + ' Jahre'],
      ['Liquiditätsreserve', p.reserve_jahre + ' Jahre, ' + (p.reserve_art === 'gold' ? 'Gold' : 'Tagesgeld/Festgeld')],
      ['Kosten', pc(p.kosten) + ' p. a., Depotgebühr ' + eur(p.depotgebuehr) + ', Kaufkosten ' + pc(p.kaufkosten)],
      ['Modus / Wohnsitz', (p.modus === 'avd' ? 'Altersvorsorgedepot' : 'Standard') + ' / ' + { DE: 'Deutschland', AT: 'Österreich', OTHER: 'anderes Land (' + pc(p.steuer_andere) + ' pauschal)' }[p.land]]
    ];
    if (p.land === 'DE') r.push(['Steuer', (p.steuer_an ? 'ja' : 'nein') + (p.zusammen ? ', zusammen veranlagt' : '') + (p.teilfreistellung ? ', Aktienfonds' : '') + ', Kirchensteuer ' + p.kirchensteuer + ' %'], ['Krankenversicherung', { kvdr: 'KVdR', freiwillig: 'freiwillig gesetzlich', privat: 'privat' }[p.kv_status]]);
    $('print-sum').innerHTML = '<h3>Eingaben</h3><dl>' + r.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl><p class="small">Stand: ' + new Date().toLocaleDateString('de-DE') + ' · ' + location.href + '</p>';
  }
  $('a-pdf').addEventListener('click', function () { flushHash(); printSum(); track('plan_saved', { via: 'pdf' }); window.print(); });
  $('a-copy').addEventListener('click', function () {
    flushHash();
    var done = function (ok) { msg(ok ? 'Link kopiert. Er enthält alle Eingaben dieses Plans.' : 'Kopieren nicht möglich. Bitte kopieren Sie die Adresse aus der Adresszeile.', !ok); };
    track('plan_saved', { via: 'link' });
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  $('a-mail').addEventListener('click', function () { var m = $('mailform'); m.hidden = !m.hidden; if (!m.hidden) $('mail-in').focus(); });
  $('mailform').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('mail-in').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg('Bitte geben Sie eine gültige E-Mail-Adresse ein.', true); $('mail-in').focus(); return; }
    flushHash();
    track('plan_emailed');
    (MT.send ? MT.send('PLAN_ENDPOINT', { email: em, url: location.href, summary: summary() }) : Promise.resolve({ demo: true })).then(function (r) {
      msg(r && r.demo ? 'Demo-Modus: Der Versand ist noch nicht eingerichtet. Ihre Adresse wurde nicht übertragen.' : 'Danke. Der Link zu Ihrem Plan ist unterwegs.');
    }, function () { msg('Der Versand ist fehlgeschlagen. Bitte versuchen Sie es später erneut oder kopieren Sie den Link.', true); });
  });
  $('a-talk').addEventListener('click', function () {
    var band = MT.amountBand ? MT.amountBand(st.kapital) : '';
    if (MT.prefill) MT.prefill.set({ betrag: band, quelle: 'rechner' });
    flushHash();
  });

  /* ---------- CSV-Import ---------- */
  $('csv-file').addEventListener('change', function () {
    var file = this.files && this.files[0], out = $('csv-msg');
    if (!file) return;
    file.arrayBuffer().then(function (buf) {
      var text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder('windows-1252').decode(buf); }
      var r = E.parseDepotCsv(text);
      if (!r.positions.length || !(r.total > 0)) { out.textContent = 'In dieser Datei wurde keine Spalte mit Marktwerten erkannt. Tragen Sie das Kapital bitte von Hand ein.'; out.className = 'hint err'; return; }
      f.elements.kapital.value = E.formatNum(Math.round(r.total));
      out.className = 'hint';
      out.textContent = r.positions.length + ' Positionen gelesen, Summe ' + eur(r.total) + ' als Kapital eingetragen. Bitte prüfen Sie die Summe. Die Datei bleibt auf Ihrem Gerät.';
      track('csv_import', { positions: r.positions.length });
      compute(); schedHash();
    }, function () { out.textContent = 'Die Datei konnte nicht gelesen werden.'; out.className = 'hint err'; });
    this.value = '';
  });

  /* ---------- Bankauswahl ---------- */
  var banks = window.MT_BANKS;
  if (banks && banks.length) {
    var bs = $('bank');
    banks.forEach(function (b) { var o = document.createElement('option'); o.value = b.id; o.textContent = b.name; bs.appendChild(o); });
    $('bank-wrap').hidden = false;
    bs.addEventListener('change', function () {
      var b = banks.filter(function (x) { return x.id === bs.value; })[0], hint = $('depotgebuehr-hint');
      if (b && b.depotgebuehr !== null && b.depotgebuehr !== undefined) {
        f.elements.depotgebuehr.value = E.formatNum(b.depotgebuehr);
        hint.textContent = 'Wert laut Bankenliste' + (b.stand ? ' (Stand ' + b.stand + ')' : '') + '. Bitte mit dem Preisverzeichnis Ihrer Bank abgleichen.';
        compute(); schedHash();
      } else hint.textContent = 'Preisverzeichnis Ihrer Bank prüfen.';
    });
  }

  /* ---------- Ereignisse ---------- */
  f.addEventListener('input', function () { compute(); schedHash(); });
  f.addEventListener('change', function (e) {
    var el = e.target, n = el.name, s = read(), v;
    if (el.type === 'text' && NUM.indexOf(n) >= 0) { v = E.parseNum(el.value); if (!isNaN(v)) el.value = E.formatNum(v); }
    if (s.modus === 'avd' && s.alter_start !== null && s.alter_start < 65) { f.elements.alter_start.value = '65'; compute(); }
    if (n === 'modus' && el.value === 'avd') track('avd_mode');
    if (n === 'land') track('country_mode', { land: el.value });
    if (n === 'reserve_jahre' || n === 'reserve_art') track('reserve_set', { jahre: s.reserve_jahre, art: s.reserve_art });
    if (!costTracked && (n === 'kosten' || n === 'depotgebuehr' || n === 'kaufkosten') && s[n] > 0) { costTracked = true; track('cost_entered', { feld: n }); }
    schedHash();
  });
  f.addEventListener('submit', function (e) { e.preventDefault(); });
  $('tab-fall').addEventListener('change', function () { if (res) renderTable(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (res) renderChart(); }, 150); });
  window.addEventListener('hashchange', function () {
    if (location.hash === lastHash) return;
    write(E.decodeState(location.hash)); lastHash = location.hash; compute();
  });
  window.addEventListener('beforeprint', function () { if (res) { printSum(); } });

  /* ---------- Start ---------- */
  lastHash = location.hash;
  write(E.decodeState(location.hash));
  compute();
})();
