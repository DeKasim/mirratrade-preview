/* ausgelagert aus ruhestand/rente-im-ausland/index.html (CSP: keine Inline-Skripte) */
(function(){var K='mt_ausland_checks',boxes=[].slice.call(document.querySelectorAll('#checks input')),st={};
try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
function upd(){var n=boxes.filter(function(b){return b.checked}).length;document.getElementById('prog').style.width=(100*n/boxes.length)+'%';document.getElementById('progtxt').textContent=n+' von '+boxes.length+' geklärt'}
function save(){var o={};boxes.forEach(function(b){if(b.checked)o[b.dataset.id]=1});try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}}
boxes.forEach(function(b){b.checked=!!st[b.dataset.id];b.addEventListener('change',function(){save();upd()})});
document.getElementById('reset').addEventListener('click',function(){boxes.forEach(function(b){b.checked=false});save();upd()});upd();
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-land]');if(!a)return;var l=a.getAttribute('data-land');if(window.MT){MT.track('country_mode',{land:l});MT.prefill.set({land:l,quelle:'rente-im-ausland'})}});})();
