/* Marktdaten für /lc002-eti/maerkte-im-minus/ – EINZIGE Stelle für Zahlen auf dieser Seite.
   Jede Zeile braucht Quelle und Stand; ohne Quelle wird sie nicht angezeigt.
   strategie: nur mit geprüften Angaben des Vermögensverwalters (mind. 12 Monate, Quelle, Stand, Kostenangabe). */
window.MT_MARKT = {
  /* Stand 18.11.2026 – Werte aus Recherche (research_notes/Реклама LC002 в падающем рынке/market_data.md),
     vor Livegang an der Primärquelle prüfen. Ein Rebound macht den Hook falsch: täglich aktualisieren. */
  stand: '2026-11-18',
  maxAlterTage: 3,      // ältere Indexwerte blendet die Seite automatisch aus
  indizes: [
    { name: 'DAX', wert: '−3,9 %', zeitraum: 'seit dem Rekordhoch am 12.11.2026 (Schluss 18.11.: 25.736 Punkte)', quelle: 'Macrotrends / Xetra-Schlusskurse', url: 'https://www.macrotrends.net/2595/dax-30-index-germany-historical-chart-data' },
    { name: 'S&P 500', wert: '−6 %', zeitraum: 'unter dem Rekord vom 06.10.2026, fünf Verlusttage in Folge', quelle: 'Motley Fool, 18.11.2026 (»The S&P 500 just ended a run of 155 trading days above its 200-day average«)' }
  ],
  aktienIndex: 'Aktien USA (S&P 500)',
  anleihenIndex: 'Anleihen USA (Bloomberg US Aggregate)',
  historie: [
    /* −19,4 % (S&P 500, Kursindex 2022) aus allgemein bekannten Jahreswerten, nicht aus der Recherche – vor Livegang prüfen */
    { jahr: '2022', aktien: '−19,4 %', anleihen: '−13,1 %', quelle: 'Jahreswerte S&P Dow Jones Indices und Bloomberg; Einordnung CNBC/Callan (erstes Jahr seit 1969 mit Verlusten bei Aktien und Anleihen)', url: 'https://www.cnbc.com/2022/10/03/why-60/40-portfolio-is-on-track-for-its-worst-year-ever-says-cio.html' }
  ],
  strategie: null
  /* Beispielstruktur (vom Kunden auszufüllen):
  strategie: {
    monate: 24, stand: '2026-10-31', quelle: 'LUMEROOS CAPITAL, Factsheet', url: 'https://…', nachKosten: true,
    beschreibung: 'Referenzportfolio der Strategie, monatliche Werte.', vergleich: 'MSCI World (EUR)',
    werte: [ { periode: '2025', wert: '…', vergleich: '…' }, { periode: '01–10/2026', wert: '…', vergleich: '…' } ]
  } */
};
