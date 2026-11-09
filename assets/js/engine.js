/**
 * MTEngine - Entnahmeplan-Rechner, reine Rechenlogik (kein DOM, keine Abhaengigkeiten).
 *
 * MTEngine.calculate(input) -> Ergebnis. Eingabefelder (identisch zu den URL-Hash-Schluesseln):
 *  kapital            Kapital zu Beginn der Entnahme (EUR)
 *  alter_start        Alter zu Beginn (Jahre)
 *  alter_ende         Planen bis Alter (default 95)
 *  gewinnanteil       Davon unversteuerte Gewinne (%)
 *  rente_netto        Gesetzliche Rente netto/Monat (heutiger Wert, EUR)
 *  rente_ab_alter     Rente ab Alter
 *  rentenanpassung    Rentenerhoehung p.a. (%)
 *  sonstige_einkuenfte Sonstige Einkuenfte netto/Monat (EUR, konstant)
 *  methode            'bedarf' (Luecke decken) | 'fest' | 'prozent' | 'verzehr' | 'ertraege'
 *  ausgaben           Ausgaben/Monat (heutiges Geld), fuer 'bedarf'
 *  fest_betrag        Betrag/Monat, fuer 'fest';  fest_index: mit Inflation erhoehen (bool)
 *  prozent            Prozent vom Depot p.a., fuer 'prozent'
 *  alter_bis          Kapital aufbrauchen bis Alter, fuer 'verzehr'
 *  rendite_niedrig / rendite_hoch  Wertentwicklung p.a. (%, vor Kosten; leer/null = Fall entfaellt)
 *  inflation          Inflation p.a. (%, default 2)
 *  crash              Stresstest: Wertverlust zu Beginn (%, 30 = -30 %; 0 = kein Crash)
 *  crash_jahre        Rueckgang verteilt auf 1-5 Jahre;  erholung_jahre: Erholung danach (0 = keine)
 *  reserve_jahre      Liquiditaetsreserve in Jahren (Entnahmen)
 *  steuer_an          Steuer auf Ertraege einrechnen (bool);  zusammen: zusammen veranlagt (bool)
 *  teilfreistellung   Depot ueberwiegend Aktienfonds (bool, 30 % TF)
 *  kirchensteuer      0 | 8 | 9 (%)
 *  kv_status          'kvdr' | 'freiwillig' | 'privat';  kinderlos (bool, nur freiwillig)
 *  kosten             Laufende Produktkosten (% p.a.);  depotgebuehr (EUR p.a.);  kaufkosten (% des Startkapitals)
 *  modus              'standard' | 'avd' (Altersvorsorgedepot: Startalter >= 65, Kostendeckel-Hinweis 1,0 %)
 *  land               'DE' | 'AT' (KESt 27,5 %) | 'OTHER' (steuer_andere = Pauschalsatz %, vereinfacht)
 *  reserve_art        'cash' (reserve_zins % p.a., kein Stress) | 'gold' (gold_rendite % p.a., kein Stress)
 *
 * Ergebnis: { cases:[{key,label,years:[{age,depotStart,withdrawal,fromReserve,tax,kv,costs,depotEnd,reserveEnd,totalToday}],
 *   reichweiteAge, restToday, taxesToday, kvToday, costsToday, reichweiteOhneKosten, reichweiteDiffJahre, verzehrJahresbetrag}],
 *   primary, totalCostsToday, reichweiteOhneKosten, reichweiteMitKosten, avdCostCap, reserveOverProtection,
 *   reserveStart, nonDeNote, warning, warnings, input }
 * reichweiteAge: Alter (mit Nachkommastellen) bei dem Depot+Reserve nicht mehr reicht, null = reicht bis Horizont.
 * Jahreswerte in nominalen Euro; totalToday = (Depot+Reserve) am Jahresende in heutigem Geld; *Today = in heutigem Geld.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    kapital: 250000, alter_start: 65, alter_ende: 95, gewinnanteil: 0,
    rente_netto: 0, rente_ab_alter: 67, rentenanpassung: 0, sonstige_einkuenfte: 0,
    methode: 'bedarf', ausgaben: 2500, fest_betrag: 1000, fest_index: true, prozent: 4, alter_bis: 90,
    rendite_niedrig: 2, rendite_hoch: 5, inflation: 2,
    crash: 30, crash_jahre: 1, erholung_jahre: 3, reserve_jahre: 0,
    steuer_an: true, zusammen: false, teilfreistellung: false, kirchensteuer: 0,
    kv_status: 'kvdr', kinderlos: false,
    kosten: 0, depotgebuehr: 0, kaufkosten: 0,
    modus: 'standard', land: 'DE', steuer_andere: 25,
    reserve_art: 'cash', reserve_zins: 0, gold_rendite: 0
  };
  var KEYS = { // Reihenfolge = Reihenfolge im URL-Hash; n=Zahl, b=Bool, s=String
    kapital: 'n', alter_start: 'n', alter_ende: 'n', rente_netto: 'n', rente_ab_alter: 'n', rentenanpassung: 'n',
    sonstige_einkuenfte: 'n', ausgaben: 'n', fest_betrag: 'n', prozent: 'n', alter_bis: 'n', inflation: 'n',
    crash: 'n', crash_jahre: 'n', erholung_jahre: 'n', reserve_jahre: 'n', gewinnanteil: 'n', fest_index: 'b',
    steuer_an: 'b', zusammen: 'b', teilfreistellung: 'b', kinderlos: 'b', methode: 's', kirchensteuer: 'n',
    kv_status: 's', kosten: 'n', depotgebuehr: 'n', kaufkosten: 'n', modus: 's', land: 's', steuer_andere: 'n',
    reserve_art: 's', reserve_zins: 'n', gold_rendite: 'n', rendite_niedrig: 'n', rendite_hoch: 'n'
  };
  var BBG_YEAR = 5812.5 * 12, KV_RATE = 0.14 + 0.029 + 0.036, KV_CHILDLESS = 0.006;

  /* ---------- Zahlen ---------- */
  function parseNum(s) {
    if (typeof s === 'number') return s;
    s = String(s == null ? '' : s).replace(/[\s €]|EUR|USD|CHF/gi, '').replace(/^\+/, '');
    if (!s) return NaN;
    var c = s.indexOf(','), d = s.indexOf('.');
    if (c >= 0 && d >= 0) {
      if (c > d) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    } else if (c >= 0) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
  }
  function fmtNum(n) {
    n = Math.round(n * 10000) / 10000;
    var neg = n < 0, p = String(Math.abs(n)).split('.');
    var i = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + i + (p[1] ? ',' + p[1] : '');
  }
  function isBlank(v) { return v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v)); }
  function N(v, d) { if (isBlank(v)) return d; var n = parseNum(v); return isFinite(n) ? n : d; }
  function B(v) { return v === true || v === 1 || v === '1' || v === 'true'; }

  /* ---------- Zustand (URL-Hash) ---------- */
  function encodeState(obj) {
    var out = [];
    Object.keys(KEYS).forEach(function (k) {
      var v = obj && obj[k];
      if (isBlank(v)) return;
      var t = KEYS[k];
      if (t === 'b') out.push(k + '=' + (B(v) ? 1 : 0));
      else if (t === 'n') { var n = parseNum(v); if (isFinite(n)) out.push(k + '=' + fmtNum(n)); }
      else out.push(k + '=' + encodeURIComponent(String(v)));
    });
    return out.join('&');
  }
  function decodeState(str) {
    var o = {};
    str = String(str || '').replace(/^#/, '');
    if (!str) return o;
    str.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 1) return;
      var k = kv.slice(0, i), raw = kv.slice(i + 1), t = KEYS[k];
      if (!t) return;
      try { raw = decodeURIComponent(raw); } catch (e) { return; }
      if (raw === '') return;
      if (t === 'b') o[k] = B(raw);
      else if (t === 'n') { var n = parseNum(raw); if (isFinite(n)) o[k] = n; }
      else o[k] = raw;
    });
    return o;
  }

  /* ---------- CSV-Import ---------- */
  function splitLine(line, d) {
    var r = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === d && !q) { r.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    r.push(cur.trim());
    return r;
  }
  function parseDepotCsv(text) {
    var res = { total: 0, positions: [] };
    var lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return res;
    var cnt = function (l, ch) { return l.split(ch).length - 1; };
    var probe = lines.slice(0, 8).join('\n');
    var delim = ';', best = cnt(probe, ';');
    [['\t', cnt(probe, '\t')], [',', cnt(probe, ',')]].forEach(function (p) { if (p[1] > best * (p[0] === ',' ? 2 : 1)) { best = p[1]; delim = p[0]; } });
    var rows = lines.map(function (l) { return splitLine(l, delim); });
    var ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
    var score = function (h) {
      h = h.toLowerCase();
      if (/einstand|kaufwert|anschaff|buchwert|stück|stueck|anzahl|kurs$|währung|waehrung/.test(h)) return 0;
      if (/kurswert|marktwert/.test(h)) return /eur|€/.test(h) ? 6 : 5;
      if (/value/.test(h)) return 4;
      if (/wert/.test(h)) return 3;
      if (/betrag/.test(h)) return 2;
      return 0;
    };
    var hi = -1, vc = -1;
    for (var r = 0; r < rows.length && hi < 0; r++) {
      var bs = 0;
      rows[r].forEach(function (h, c) { var s = score(h); if (s > bs) { bs = s; vc = c; } });
      if (bs) hi = r;
    }
    var nc = -1, ic = -1;
    if (hi >= 0) rows[hi].forEach(function (h, c) {
      var l = h.toLowerCase();
      if (nc < 0 && /^(name|bezeichnung|wertpapier|titel|produkt|fonds|security|description)/.test(l)) nc = c;
      if (ic < 0 && /isin/.test(l)) ic = c;
    });
    for (var j = hi + 1; j < rows.length; j++) {
      var row = rows[j], val = NaN, isin = '';
      row.forEach(function (c) { var u = c.toUpperCase(); if (!isin && ISIN.test(u)) isin = u; });
      if (hi >= 0) val = parseNum(row[vc]);
      else for (var k = row.length - 1; k >= 0 && !(val > 0); k--) val = parseNum(row[k]);
      if (!isFinite(val) || val <= 0) continue;
      var name = nc >= 0 ? row[nc] : (row.filter(function (c) { return c && !ISIN.test(c.toUpperCase()) && isNaN(parseNum(c)); })[0] || '');
      if (/^(summe|gesamt|total)/i.test(name || row[0])) continue;
      res.positions.push({ name: name, isin: ic >= 0 && ISIN.test((row[ic] || '').toUpperCase()) ? row[ic].toUpperCase() : isin, value: val });
      res.total += val;
    }
    res.total = Math.round(res.total * 100) / 100;
    return res;
  }

  /* ---------- Kern ---------- */
  function normalize(inp) {
    var p = {}, w = [];
    inp = inp || {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var d = DEFAULTS[k], v = Object.prototype.hasOwnProperty.call(inp, k) ? inp[k] : d;
      if (typeof d === 'boolean') p[k] = B(v);
      else if (typeof d === 'string') p[k] = isBlank(v) ? d : String(v);
      else if (k === 'rendite_niedrig' || k === 'rendite_hoch') p[k] = isBlank(v) ? null : N(v, null);
      else p[k] = N(v, d);
    });
    if (p.modus === 'avd' && p.alter_start < 65) { p.alter_start = 65; w.push('Altersvorsorgedepot: Auszahlungsplan beginnt fruehestens mit 65, Startalter auf 65 gesetzt.'); }
    p.alter_start = Math.round(p.alter_start);
    p.alter_ende = Math.max(p.alter_start + 1, Math.round(p.alter_ende));
    p.N = p.alter_ende - p.alter_start;
    p.crash = Math.abs(p.crash);
    p.crash_jahre = Math.min(5, Math.max(1, Math.round(p.crash_jahre)));
    p.erholung_jahre = Math.max(0, Math.round(p.erholung_jahre));
    p.kirchensteuer = p.kirchensteuer > 0 ? p.kirchensteuer : 0;
    p.gewinnanteil = Math.min(100, Math.max(0, p.gewinnanteil));
    p.land = (p.land || 'DE').toUpperCase();
    if (p.land !== 'AT' && p.land !== 'OTHER') p.land = 'DE';
    return { p: p, warnings: w };
  }

  function pathFn(kind, p, rl) { // jaehrliche Brutto-Rendite (Dezimal) je Jahr t
    if (kind === 'ohne') return function () { return 0; };
    if (kind === 'niedrig') return function () { return p.rendite_niedrig / 100; };
    if (kind === 'hoch') return function () { return p.rendite_hoch / 100; };
    var c = p.crash / 100, n = p.crash_jahre, k = p.erholung_jahre, l = rl / 100;
    var down = c > 0 ? Math.pow(1 - c, 1 / n) - 1 : l;
    var up = k > 0 && c > 0 ? Math.pow(Math.pow(1 + l, n + k) / (1 - c), 1 / k) - 1 : l;
    return function (t) { return c <= 0 ? l : t < n ? down : t < n + k ? up : l; };
  }

  function sim(p, rateAt, x, withCosts, goldFlag) {
    var NY = p.N, infl = p.inflation / 100, K = p.kapital;
    var cPct = withCosts ? p.kosten / 100 : 0, feeY = withCosts ? p.depotgebuehr : 0, entry = withCosts ? K * p.kaufkosten / 100 : 0;
    var kk = p.kirchensteuer / 100, de = p.land === 'DE';
    var rule = p.methode, gs = p.gewinnanteil / 100;
    var rr = p.reserve_art === 'gold' ? p.gold_rendite : p.reserve_zins, rf = Math.pow(1 + rr / 100, 1 / 12);

    function need(t, depot) {
      var inf = Math.pow(1 + infl, t);
      if (rule === 'fest') return p.fest_betrag * 12 * (p.fest_index ? inf : 1);
      if (rule === 'prozent') return p.prozent / 100 * depot;
      if (rule === 'verzehr') return x * inf;
      if (rule === 'ertraege') return 0;
      var age = p.alter_start + t;
      var R = age >= p.rente_ab_alter ? p.rente_netto * 12 * Math.pow(1 + p.rentenanpassung / 100, t) : 0;
      return Math.max(0, p.ausgaben * 12 * inf - R - p.sonstige_einkuenfte * 12);
    }
    var e0 = rule === 'ertraege' ? K * Math.max(0, rateAt(0) - cPct) : need(0, K);
    var reserve = p.reserve_jahre > 0 ? Math.min(K, p.reserve_jahre * e0) : 0;
    var reserveStart = reserve;
    var depot = Math.max(0, K - reserve - entry);
    var basis = depot * (1 - gs), lv = 0, P = 1, peak = 1, failed = false, reich = null;
    var years = [], tot = { tax: 0, kv: 0, costs: 0 };

    for (var t = 0; t < NY; t++) {
      var age = p.alter_start + t, ry = rateAt(t);
      var base = 1 + ry - cPct;
      var fG = Math.pow(1 + ry, 1 / 12), fN = base > 0 ? Math.pow(base, 1 / 12) : 0;
      var depotStart = depot, gy = 0, wTot = 0, fromRes = 0, costsY = t === 0 ? entry : 0;
      var sell = function (a) {
        if (a <= 0 || depot <= 0) return 0;
        var g = a * (depot - basis) / depot;
        basis -= a - g; depot -= a;
        return g;
      };
      if (!failed && t > 0 && p.reserve_jahre > 0 && P >= peak * (1 - 1e-9)) {
        var a = Math.min(depot, p.reserve_jahre * (rule === 'ertraege' ? 0 : need(t, depot)) - reserve);
        if (a > 0) { gy += sell(a); reserve += a; }
      }
      var E = need(t, depot);
      for (var m = 0; m < 12; m++) {
        if (!failed) {
          var e = rule === 'ertraege' ? Math.max(0, depot * (fN - 1)) : E / 12;
          var dd = P < peak * (1 - 1e-9) && reserve > 0, fr, fd;
          if (dd) { fr = Math.min(reserve, e); fd = Math.min(depot, e - fr); }
          else { fd = Math.min(depot, e); fr = Math.min(reserve, e - fd); }
          if (fr + fd < e - 0.005) { failed = true; reich = age + (m + (e > 0 ? (fr + fd) / e : 0)) / 12; }
          gy += sell(fd); reserve -= fr; wTot += fr + fd; fromRes += fr;
        }
        costsY += depot * (fG - fN);
        depot *= fN; reserve *= rf; P *= fG; if (P > peak) peak = P;
      }
      // Steuern, Beitraege, Depotgebuehr zum Jahresende
      if (gy < 0) lv += -gy;
      var net = 0;
      if (gy > 0) { var use = Math.min(lv, gy); lv -= use; net = gy - use; }
      var tax = 0, kv = 0;
      if (p.steuer_an) {
        if (de) {
          var tf = p.teilfreistellung ? 0.3 : 0, eT = Math.max(0, net * (1 - tf) - (p.zusammen ? 2000 : 1000));
          var abg = eT / (4 + kk); tax = abg + abg * kk + abg * 0.055;
        } else tax = net * (p.land === 'AT' ? 0.275 : p.steuer_andere / 100);
      }
      if (de && p.kv_status === 'freiwillig') kv = Math.min(Math.max(0, gy), BBG_YEAR) * (KV_RATE + (p.kinderlos ? KV_CHILDLESS : 0));
      var fee = Math.min(feeY, depot);
      var due = tax + kv + fee, pay = Math.min(depot, due), short = due - pay;
      if (depot > 0) basis *= (depot - pay) / depot;
      depot -= pay;
      var rp = Math.min(reserve, short); reserve -= rp; short -= rp;
      if (short > 0.5 && !failed) { failed = true; reich = age + 1; }
      costsY += fee;
      var d = Math.pow(1 + infl, t);
      tot.tax += tax / d; tot.kv += kv / d; tot.costs += costsY / d;
      years.push({ age: age, depotStart: depotStart, withdrawal: wTot, fromReserve: fromRes, tax: tax, kv: kv, costs: costsY,
        depotEnd: depot, reserveEnd: reserve, totalToday: (depot + reserve) / (d * (1 + infl)) });
    }
    return { years: years, reichweite: reich, rest: (depot + reserve) / Math.pow(1 + infl, NY), tot: tot, reserveStart: reserveStart };
  }

  function solveVerzehr(p, rateAt) {
    var target = Math.min(Math.max(p.alter_bis, p.alter_start + 1), p.alter_ende);
    var reach = function (x) { var r = sim(p, rateAt, x, true).reichweite; return r === null ? Infinity : r; };
    var lo = 0, hi = Math.max(1000, p.kapital);
    while (reach(hi) >= target && hi < 1e12) hi *= 2;
    for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (reach(mid) >= target) lo = mid; else hi = mid; }
    return lo;
  }

  function calculate(input) {
    var nz = normalize(input), p = nz.p, warnings = nz.warnings.slice();
    var rl = p.rendite_niedrig === null ? 0 : p.rendite_niedrig;
    var defs = [['ohne', 'Ohne Wertentwicklung']];
    if (p.rendite_niedrig !== null) defs.push(['niedrig', 'Niedrige Wertentwicklung']);
    if (p.rendite_hoch !== null) defs.push(['hoch', 'Hohe Wertentwicklung']);
    defs.push(['stress', 'Stresstest']);
    var endAge = p.alter_ende;
    var cases = defs.map(function (d) {
      var f = pathFn(d[0], p, rl), x = 0;
      if (p.methode === 'verzehr') x = solveVerzehr(p, f);
      var a = sim(p, f, x, true), b = sim(p, f, x, false);
      var ra = a.reichweite, rb = b.reichweite;
      return { key: d[0], label: d[1], years: a.years, reichweiteAge: ra, restToday: a.rest,
        taxesToday: a.tot.tax, kvToday: a.tot.kv, costsToday: a.tot.costs,
        reichweiteOhneKosten: rb, reichweiteDiffJahre: (rb === null ? endAge : rb) - (ra === null ? endAge : ra),
        restOhneKostenToday: b.rest, verzehrJahresbetrag: p.methode === 'verzehr' ? x : null, reserveStart: a.reserveStart };
    });
    var primary = cases.filter(function (c) { return c.key === 'niedrig'; })[0] || cases[0];
    var rs = cases[0].reserveStart;
    if (p.land !== 'DE') warnings.push('Steuer und Beitraege fuer dieses Land nur vereinfacht angenommen.');
    return {
      cases: cases, primary: primary.key, totalCostsToday: primary.costsToday,
      reichweiteOhneKosten: primary.reichweiteOhneKosten, reichweiteMitKosten: primary.reichweiteAge,
      avdCostCap: p.modus === 'avd' ? 1.0 : null,
      reserveOverProtection: p.reserve_art === 'cash' && rs > 100000, reserveStart: rs,
      nonDeNote: p.land !== 'DE', warning: warnings.join(' '), warnings: warnings, input: p
    };
  }

  var api = { calculate: calculate, defaults: DEFAULTS, encodeState: encodeState, decodeState: decodeState, parseDepotCsv: parseDepotCsv, parseNum: parseNum, formatNum: fmtNum };
  root.MTEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
