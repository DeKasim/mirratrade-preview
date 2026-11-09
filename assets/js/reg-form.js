/* MirraTrade – Kontaktformular /registration-form/ mit Vorbelegung (H3) aus Rechner, URL und Prefill-Speicher. */
(function () {
  'use strict';
  var MT = window.MT || {};
  var f = document.getElementById('reg'); if (!f) return;
  var q = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) {}
  var pf = (MT.prefill && MT.prefill.get()) || {};
  var quelle = q.quelle || pf.quelle || '';

  /* Betrag: Zahl (250000), Band des Rechners ("über 100.000 €") oder Option des Formulars → Option */
  function toOption(v) {
    if (!v) return '';
    v = String(v);
    if (/mehr als|über/i.test(v)) return 'Mehr als 100.000 €';
    var nums = v.replace(/\./g, '').match(/\d+/g); if (!nums) return '';
    var n = +nums[nums.length - 1];
    if (n <= 25000) return '10.000 €';
    if (n <= 75000) return '50.000 €';
    if (n <= 100000) return '100.000 €';
    return 'Mehr als 100.000 €';
  }
  var amt = toOption(q.betrag || q.kapital || pf.betrag), filled = [];
  if (amt) {
    var r = f.querySelector('input[name=betrag][value="' + amt + '"]');
    if (r) { r.checked = true; document.getElementById('r-amt-tag').hidden = false; filled.push('betrag'); }
  }
  var land = (q.land || pf.land || '').toUpperCase();
  var ccMap = { DE: '+49', AT: '+43', CH: '+41', BE: '+32', NL: '+31', LU: '+352', ES: '+34', IT: '+39', PT: '+351' };
  if (land && ccMap[land]) { f.elements.vorwahl.value = ccMap[land]; filled.push('land'); }
  else if (land === 'OTHER') { f.elements.vorwahl.value = ''; filled.push('land'); }
  if (filled.length && MT.track) MT.track('form_prefilled', { fields: filled.join(','), quelle: quelle });
  f.addEventListener('change', function (e) { if (e.target.name === 'betrag') document.getElementById('r-amt-tag').hidden = true; });

  var ctx = document.getElementById('reg-ctx');
  if (quelle === 'rechner') { ctx.textContent = 'Sie kommen aus dem Entnahmeplan-Rechner. Ihre Rechnung bleibt auf Ihrem Gerät – übernommen wird nur der ungefähre Betrag.'; ctx.hidden = false; }

  function show(id, bad) { document.getElementById(id).hidden = !bad; return bad; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (f.elements.firma.value) return; /* Honeypot */
    var name = f.elements.name.value.trim(), tel = f.elements.telefon.value.trim(), mail = f.elements.email.value.trim();
    var bad = false;
    bad = show('r-name-e', name.length < 2) || bad;
    bad = show('r-tel-e', tel.replace(/\D/g, '').length < 6) || bad;
    bad = show('r-mail-e', !!mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) || bad;
    bad = show('r-cons-e', !f.elements.consent.checked) || bad;
    if (bad) { var first = f.querySelector('.err:not([hidden])'); if (first) first.previousElementSibling && first.parentNode.querySelector('input,select') && first.parentNode.querySelector('input,select').focus(); return; }
    var b = f.querySelector('input[name=betrag]:checked');
    var payload = { type: 'kontakt', name: name, telefon: (f.elements.vorwahl.value + ' ' + tel).trim(), email: mail, betrag: b ? b.value : '', quelle: quelle, page: location.pathname, consent: true, ts: new Date().toISOString() };
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    var done = document.getElementById('reg-done');
    (MT.send ? MT.send('FORM_ENDPOINT', payload) : Promise.resolve({ demo: true })).then(function (res) {
      if (MT.track) MT.track('form_submit', { type: 'kontakt', betrag: payload.betrag, quelle: quelle, prefilled: filled.length > 0 });
      f.hidden = true; done.hidden = false; done.className = 'done';
      done.innerHTML = res && res.demo
        ? '<strong>Formular geprüft.</strong>Demo-Modus: Ihre Angaben wurden NICHT übertragen – für diese Website ist noch kein Empfangsendpunkt eingerichtet.'
        : '<strong>Vielen Dank!</strong>Ihre Anfrage ist angekommen. Einer unserer Experten meldet sich bei Ihnen.';
      done.setAttribute('tabindex', '-1'); done.focus();
    }).catch(function () {
      btn.disabled = false;
      done.hidden = false; done.className = 'note note--warn';
      done.textContent = 'Das Senden hat nicht geklappt. Bitte versuchen Sie es später erneut.';
    });
  });
})();
