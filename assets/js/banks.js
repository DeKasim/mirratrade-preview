/* Bankdaten – einzige Quelle der Wahrheit für Prüfung (check.js), Bankseiten und Formular.
   NUR geprüfte Angaben eintragen. Alles andere bleibt 'unbekannt'. depotgebuehr: null = unbekannt. */
(function () {
  'use strict';
  var M = 'Manuelle Prüfung MirraTrade', S = '22.10.2026';
  function ja(id, name, land, slug, hinweis) {
    return { id: id, name: name, land: land, stuttgart: 'ja', quelle: M, stand: S, hinweis: hinweis || '', depotgebuehr: null, slug: slug };
  }
  function unb(id, name) {
    return { id: id, name: name, land: 'DE', stuttgart: 'unbekannt', quelle: '', stand: '', hinweis: '', depotgebuehr: null, slug: null };
  }
  window.MT_BANKS = [
    ja('comdirect', 'comdirect', 'DE', 'comdirect'),
    ja('consorsbank', 'Consorsbank', 'DE', 'consorsbank'),
    ja('maxblue', 'maxblue / Deutsche Bank', 'DE', 'maxblue'),
    ja('interactive-brokers', 'Interactive Brokers', 'DE', 'interactive-brokers', 'Gefunden in der Trader Workstation.'),
    ja('bank-austria', 'Bank Austria', 'AT', 'bank-austria'),
    unb('sparkasse', 'Sparkasse'),
    unb('volks-raiffeisenbank', 'Volks- oder Raiffeisenbank'),
    unb('dkb', 'DKB'),
    unb('flatex', 'flatex'),
    unb('ing', 'ING'),
    { id: 'trade-republic', name: 'Trade Republic', land: 'DE', stuttgart: 'nein', quelle: 'Finanzfluss', stand: '2026', hinweis: 'Handelsplatz laut Finanzfluss-Vergleich: LS Exchange', depotgebuehr: null, slug: null },
    { id: 'scalable-capital', name: 'Scalable Capital', land: 'DE', stuttgart: 'nein', quelle: 'Finanzfluss', stand: '2026', hinweis: 'Handelsplätze laut Finanzfluss-Vergleich: gettex, Xetra', depotgebuehr: null, slug: null }
  ];
})();
