/* ausgelagert aus ruhestand/plan-alarm/index.html (CSP: keine Inline-Skripte) */
(function(){var f=document.getElementById('alarm'),pl=document.getElementById('plan');
var q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,'')),pv=q.get('plan')||h.get('plan')||'';
if(pv){try{pv=decodeURIComponent(pv)}catch(e){} if(/^https?:\/\//.test(pv))pl.value=pv;}
function show(id,on){document.getElementById(id).hidden=!on}
f.addEventListener('submit',function(e){e.preventDefault();var em=document.getElementById('email').value.trim(),
topics=[].map.call(f.querySelectorAll('input[name=topic]:checked'),function(i){return i.value}),c=document.getElementById('consent').checked;
var okE=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em);show('email-err',!okE);show('topic-err',!topics.length);show('consent-err',!c);show('bad',false);
if(!okE||!topics.length||!c)return;
var btn=f.querySelector('button');btn.disabled=true;
MT.send('ALERT_ENDPOINT',{email:em,url:pl.value.trim(),topics:topics}).then(function(r){
MT.track('alert_signup',{themen:topics.join(','),demo:!!r.demo});
var ok=document.getElementById('ok');ok.textContent=r.demo?'Demo-Modus: Ihre Angaben sind in Ordnung, wurden aber nicht übertragen und es wird keine E-Mail gesendet.':'Fast geschafft: Wir haben Ihnen eine Bestätigungs-E-Mail geschickt. Bitte klicken Sie darin auf den Link, damit Ihre Anmeldung gilt.';ok.hidden=false;f.hidden=true;
}).catch(function(){btn.disabled=false;show('bad',true)});});})();
