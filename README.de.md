# MirraTrade – statische Website (Neuaufbau mit Hypothesen)

Reines HTML/CSS/JS: kein Framework, kein Build-Schritt, keine Anfragen an Dritte. Das Repository-Root ist das Web-Root. Jede Seite liefert ihren Inhalt ohne JavaScript; JavaScript ergänzt Rechner, Prüfungen und Formulare.

## Hypothesen und wo sie umgesetzt sind

| Nr. | Hypothese | Umsetzung |
|---|---|---|
| H1 | Kosten im Plan statt Eigenrechnung, Weg zur Anfrage | Rechner: Gruppe „Kosten“ (Produktkosten % p. a., Depotgebühr, Kaufkosten), Zeile „verkürzen die Reichweite um X Jahre“; Buttons „Plan besprechen“ → `/registration-form/` mit Betrag |
| H2 | Live-Prüfung „Ist das Wertpapier bei meiner Bank handelbar?“ | `assets/js/check.js` + `assets/js/banks.js` auf allen LC002-Seiten (auf `/lc002-eti/wertpapiersuche/` als Hero-Werkzeug) |
| H3 | Formular-Vorbelegung | `MT.prefill` (sessionStorage), URL-Parameter `?bank=&betrag=&land=&quelle=`; Hinweis „aus Ihrer Prüfung übernommen · ändern“ |
| H4 | Plan sichern | Rechner: „Plan als PDF“ (Druckansicht A4), „Plan per E-Mail“ (`PLAN_ENDPOINT`), „Link kopieren“ (Zustand im URL-Hash) |
| H5 | Altersvorsorgedepot 2027 | `/ruhestand/altersvorsorgedepot/` + Rechner-Modus `#modus=avd` (Start ab 65, Kostendeckel 1,0 % als Referenzlinie) |
| H6 | Rente im Ausland, Routing nach Wohnland | `/ruhestand/rente-im-ausland/`, Rechner `#land=AT|OTHER`; LC002-Formular zeigt bei CH/anderes Land statt Rückruf einen Hinweis + Kontakt für später |
| H7 | Wo liegt die Reserve? | `/ruhestand/liquiditaetsreserve/` + Rechner `reserve_art=cash|gold`, Hinweis Einlagensicherung |
| N1 | Depotauszug (CSV) einlesen | Rechner, lokal im Browser (`MTEngine.parseDepotCsv`) |
| N2 | SEO-Seiten typischer Summen | `/ruhestand/entnahmeplan/{100000,200000,300000,500000}-euro/` – Beispielrechnung live aus `engine.js` |
| N3 | „Bei welcher Bank kaufen?“ | `/lc002-eti/kaufen/` + Seiten für comdirect, Consorsbank, maxblue, Interactive Brokers, Bank Austria |
| N4 | Plan-Alarm | `/ruhestand/plan-alarm/` (`ALERT_ENDPOINT`) |
| N5 | Rechner zum Einbinden | `/embed/rechner/` (iframe-Widget) + Anleitung `/ruhestand/rechner-einbinden/` |

Bestehende Seiten neu aufgebaut: Startseite (Texte 1:1 von der bestehenden Seite, dazu Band „Werkzeuge“), `/ruhestand/`, `/ruhestand/entnahmeplan-rechner/`, `/ruhestand/methodik/`, `/lc002-eti/{wertpapiersuche,langfristig-anlegen,neu}/`, `/registration-form/`. Neu: `/impressum/`, `/datenschutz/` (fehlten bisher), `404.html`, `robots.txt`, `sitemap.xml`.

Analytics-Ereignisse landen in `window.dataLayer` (z. B. für Google Tag Manager): `calc_run, cost_entered, isin_lookup, form_prefilled, form_step1, form_submit, plan_saved, plan_emailed, country_mode, reserve_set, csv_import, alert_signup, avd_mode, embed_view, copy`.

## Rechner

`assets/js/engine.js` rechnet nach `/ruhestand/methodik/` (Jahresschritte, Steuer, KVdR/freiwillig, Stresstest). Mit den Standardwerten der bisherigen Seite ergibt sich wie dort „Das Kapital reicht bis zum Alter von 82 Jahren.“ (ohne Wertentwicklung und im Stresstest). Der Zustand steht im bisherigen lesbaren URL-Format (`#kapital=250.000&alter_start=65&…`), neue Schlüssel: `kosten, depotgebuehr, kaufkosten, modus, land, steuer_andere, reserve_art, reserve_zins, gold_rendite`.

## Bankdaten

`assets/js/banks.js` ist die einzige Quelle. Eingetragen ist nur Geprüftes: „gefunden“ für die Stichprobe vom 22.10.2026 (comdirect, Consorsbank, maxblue, Interactive Brokers, Bank Austria), „nicht über Börse Stuttgart“ für Trade Republic und Scalable Capital (Handelsplätze laut Finanzfluss), alle anderen „noch nicht geprüft“. Neue Prüfungen dort eintragen (`stuttgart`, `quelle`, `stand`, ggf. `slug` für eine Bankseite).

## Deployment

- **Netlify:** Repo verbinden, Publish directory `.`, kein Build-Befehl (steht in `netlify.toml`).
- **Cloudflare Pages:** Framework „None“, Build-Befehl leer, Output-Verzeichnis `/`. `_headers` wird gelesen.
- **Vercel:** Framework „Other“, kein Build. `vercel.json` setzt `cleanUrls`, `trailingSlash` und die Header.
- **GitHub Pages:** Branch ausliefern; `.nojekyll` ist vorhanden. Eigene Header sind dort nicht möglich.
- **Eigener Server (nginx/Apache):** Dateien ins Web-Root, `404.html` als Fehlerseite, Header aus `_headers` übernehmen.

Caching und Sicherheit: HTML wird immer revalidiert; `assets/css/*` ein Jahr unveränderlich, `assets/js/*` 5 Minuten (+ stale-while-revalidate). CSS/JS sind per `?v=20261107` versioniert – nach Änderungen in allen HTML-Dateien hochzählen (`config.js` ist absichtlich unversioniert). Content-Security-Policy: nur `'self'`, keine Inline-Skripte (ein Hash für die Zeile `document.documentElement.className+=' js'`), `connect-src https:` für die Endpunkte – nach Festlegung der Endpunkte auf deren Domain einschränken. Nur `/embed/*` darf auf fremden Seiten eingebettet werden. Die Regeln in `_headers` überschneiden sich bewusst nicht, weil Netlify gleichnamige Header zusammenführt.

Geschwindigkeit: alle Seiten 2,5–50 KB HTML (gzip etwa 1–12 KB), CSS je Seite ≤ 25 KB, keine Bilder außer Logo/Favicon (SVG), Schrift per `preload` und `font-display: swap`. Lokal laden alle Seiten in 30–110 ms.

## Vor dem Livegang auszufüllen

1. `assets/js/config.js`: `FORM_ENDPOINT`, `PLAN_ENDPOINT`, `ALERT_ENDPOINT` (POST JSON), `CONTACT_PHONE`. Leer = Demo-Modus: Formulare werden geprüft, aber nicht übertragen, und sagen das deutlich.
2. Ordner `assets/cdn/` (Schrift `fonts/tildasans/TildaSans-VF.woff2`) vom bisherigen Server in dieses Repo kopieren. Ohne ihn greift die Ersatzschrift.
3. `assets/mirratrade.svg` durch die Originaldatei des Logos ersetzen (derzeit Nachbildung).
4. Impressum und Datenschutz ausfüllen und juristisch prüfen; danach Entwurfshinweis und `noindex` entfernen.
5. Links zu Basisinformationsblatt, Endgültigen Bedingungen und Basisprospekt eintragen (`[Platzhalter: Link zum BIB]`, `[Platzhalter: Links vom Kunden]`).
6. Telefonnummer / Kontaktweg für Besucher ohne JavaScript.
7. Offene Prüfpunkte auf den Ruhestand-Seiten (`[Platzhalter: prüfen]`): Zulassung der Produkte zum Start des Altersvorsorgedepots, einzelne Länderzahlen, Goldpreis-Schwankung.

Alle offenen Stellen: `grep -rn "Platzhalter" --include=*.html .`

## Prüfung

Lokal getestet mit Playwright/Chromium (Desktop 1366 px und Mobil 390 px): alle 27 Seiten ohne JavaScript-Fehler, ohne defekte interne Links, ohne horizontales Scrollen, ohne externe Anfragen, unter der Content-Security-Policy aus `_headers`. Formulare (Prüfung → Vorbelegung → Absenden im Demo-Modus, Ausland-Weiche), Rechner (Hash, Modi, Grafik) und Widget (iframe) wurden durchgeklickt.

---

## Кратко по-русски

Статический сайт mirratrade.com без сборки и внешних запросов; корень репозитория = корень веб-сервера. Перенесены и переделаны под гипотезы все существующие страницы (главная — тексты клиента 1:1 + блок инструментов; калькулятор — с затратами, режимом Altersvorsorgedepot, страной, резервом, импортом CSV, PDF/e-mail/ссылкой и переходом в заявку; три лендинга LC002 — с живой проверкой банка и формой с предзаполнением и маршрутизацией по стране; форма регистрации — с предзаполнением суммы из калькулятора). Новые страницы: Altersvorsorgedepot, пенсия за рубежом, резерв, 4 SEO-страницы сумм, Plan-Alarm, виджет и инструкция к нему, «В каком банке купить» + 5 страниц банков, Impressum/Datenschutz (черновики), 404.

Деплой: Netlify / Cloudflare Pages / Vercel / GitHub Pages / свой сервер — публиковать корень `.`, без build-команды.

Перед запуском: заполнить эндпоинты в `assets/js/config.js` (пусто = демо-режим), скопировать `assets/cdn/` (шрифт) со старого сервера, заменить логотип оригиналом, заполнить Impressum/Datenschutz, вставить ссылки на BIB и проспект, указать телефон. Все места — поиском по «Platzhalter».
