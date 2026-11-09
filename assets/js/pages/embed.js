/* ausgelagert aus embed/rechner/index.html (CSP: keine Inline-Skripte) */
window.addEventListener('DOMContentLoaded',function(){
  var E=window.MTEngine,MT=window.MT||{},f=document.getElementById('f');
  if(!E)return;
  var K=['kapital','alter_start','rente_netto','ausgaben','rendite_niedrig','rendite_hoch','kosten'];
  var fx={alter_ende:95,rente_ab_alter:65,rentenanpassung:2,inflation:2,methode:'bedarf',kv_status:'kvdr',steuer_an:true};
  var nf=new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}),COL={niedrig:'#8d45b3',ohne:'#5b6470',stress:'#c2410c'},tr=false;
  function eur(n){return nf.format(Math.round(n))+' €'}
  function yrs(x){return Math.floor(Math.round(x*10)/10+1e-9)}
  var h=E.decodeState(location.hash);
  K.forEach(function(k){if(h[k]!==undefined&&h[k]!==null)f.elements[k].value=E.formatNum(h[k])});
  function state(){var s={};K.forEach(function(k){var v=E.parseNum(f.elements[k].value);s[k]=isNaN(v)?null:v});return s}
  function run(){
    var s=state(),o=document.getElementById('out');
    if(!(s.kapital>0)||!(s.alter_start>=18)){o.innerHTML='<p class="msg">Bitte Kapital und Alter eintragen.</p>';return}
    var inp={};Object.keys(fx).forEach(function(k){inp[k]=fx[k]});K.forEach(function(k){inp[k]=s[k]});
    var r=E.calculate(inp),pick=r.cases.filter(function(c){return c.key==='niedrig'||c.key==='ohne'}).slice(-1)[0],st=r.cases.filter(function(c){return c.key==='stress'})[0];
    o.innerHTML=[pick,st].map(function(c){
      var lbl=c.key==='niedrig'?'Niedrig ('+String(s.rendite_niedrig).replace('.',',')+' %)':c.key==='ohne'?'Ohne Wertentwicklung':'Stresstest: Einbruch zu Beginn';
      return '<div class="c" style="--col:'+COL[c.key]+'"><h2>'+lbl+'</h2><p class="h">'+(c.reichweiteAge===null?'Das Kapital reicht bis zum Planungsende (95).':'Das Kapital reicht bis zum Alter von '+yrs(c.reichweiteAge)+' Jahren.')+'</p><p class="m">Entnahme im ersten Jahr: rund '+eur(c.years[0].withdrawal/12)+' im Monat.</p></div>'}).join('');
    document.getElementById('hint').textContent=s.rendite_niedrig===null?'Ohne Annahme zur Wertentwicklung zeigt der Rechner den Fall ohne Wertentwicklung. Tragen Sie eine niedrige Annahme ein, um den Stresstest darauf aufzusetzen.':'';
    var q={};Object.keys(fx).forEach(function(k){q[k]=fx[k]});K.forEach(function(k){q[k]=s[k]});
    if(!(q.kosten>0))delete q.kosten;
    document.getElementById('full').href='https://mirratrade.com/ruhestand/entnahmeplan-rechner/#'+E.encodeState(q);
    if(!tr&&MT.track){tr=true;MT.track('embed_view')}
  }
  f.addEventListener('input',run);
  f.addEventListener('submit',function(e){e.preventDefault()});
  run();
});
