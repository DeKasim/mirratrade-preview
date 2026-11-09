/* ausgelagert aus ruhestand/liquiditaetsreserve/index.html (CSP: keine Inline-Skripte) */
(function(){var y=document.getElementById('yrs'),m=document.getElementById('mon'),g=document.getElementById('go'),o=document.getElementById('out'),p=document.getElementById('prot'),v=document.getElementById('yrsv'),t;
var f=new Intl.NumberFormat('de-DE');
function art(){return document.querySelector('input[name=art]:checked').value}
function upd(){var n=+y.value,mo=Math.max(0,+m.value||0),sum=n*12*mo,a=art();v.textContent=n+(n===1?' Jahr':' Jahre');
o.textContent='Bei '+n+(n===1?' Jahr':' Jahren')+' und '+f.format(mo)+' € im Monat liegen '+f.format(sum)+' € in der Reserve.';
p.textContent=(a==='cash'&&sum>100000)?'Hinweis: Diese Summe liegt über der Einlagensicherung von 100.000 € pro Bank und Person. Verteilen Sie sie gegebenenfalls auf mehrere Banken.':'';
g.href='/mirratrade-preview/ruhestand/entnahmeplan-rechner/#reserve_jahre='+n+'&reserve_art='+a;
clearTimeout(t);t=setTimeout(function(){if(window.MT)MT.track('reserve_set',{jahre:n,art:a})},600)}
y.addEventListener('input',upd);m.addEventListener('input',upd);[].forEach.call(document.querySelectorAll('input[name=art]'),function(r){r.addEventListener('change',upd)});upd();})();
