/* MirraTrade – zentrale Konfiguration.
   Leere Endpunkte = Demo-Modus: Formulare werden geprüft, aber NICHT übertragen.
   Vor dem Livegang ausfüllen (z. B. CRM-Webhook, Formspree, eigene API). */
window.MT_CONFIG = {
  FORM_ENDPOINT: '',   // Rückruf-Formular (POST JSON)
  PLAN_ENDPOINT: '',   // "Plan per E-Mail senden" (POST JSON {email, url, summary})
  ALERT_ENDPOINT: '',  // Plan-Alarm-Anmeldung (POST JSON {email, url, topics})
  CONTACT_PHONE: '[Platzhalter: Telefonnummer]',
  SITE_URL: 'https://mirratrade.com'
};
