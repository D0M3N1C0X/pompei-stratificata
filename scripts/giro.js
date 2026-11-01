/*
   Il giro di verifica, da lanciare nella pagina aperta con ?debug:

     (0, eval)(await (await fetch('/scripts/giro.js')).text())

   Apre ogni fase, ogni evento dell'eruzione ora per ora, ogni luogo di
   Pompei e di Ercolano, il confronto e le
   due viste «sotto la città», e cerca nel testo visibile i segni di un
   guasto: «undefined», «NaN», segnaposto {nome} non sostituiti, chiavi di
   traduzione rimaste in chiaro, schede vuote. Restituisce quanti luoghi ha
   aperto e l'elenco dei guai (vuoto se va tutto bene).
*/
(() => {
  const P = window.pompei, guai = [];
  const SOSP = /\bundefined\b|\bNaN\b|\[object |\{[a-zA-Z]+\}|\b(ui|luoghi|ercolano|epoche|scena)\.[a-z]+\.[a-z]/;
  const controlla = dove => {
    const m = document.body.innerText.match(SOSP); if(m) guai.push(dove + ': «' + m[0] + '»');
    if(document.getElementById('panel').classList.contains('open'))
      for(const id of ['pTitle','pBody','pSrc']) if(!document.getElementById(id).textContent.trim()) guai.push(dove + ': ' + id + ' vuoto');
  };
  const fatti = { luoghi:0, fasi:0, erc:0 };
  P.vista('pompei');
  for(let i = 0; i < 8; i++){ P.fase(i); controlla('fase ' + (i+1)); fatti.fasi++; }
  // l'eruzione ora per ora, evento per evento
  fatti.eruzione = 0;
  try {
    P.fase(1);
    document.getElementById('eruStart').click();
    document.getElementById('eruPlay').click();               // pausa
    for(const b of document.querySelectorAll('.eruSegno')){
      b.click(); controlla('eruzione ' + b.dataset.id);
      if(!document.getElementById('eruTitolo').textContent.trim()) guai.push('eruzione ' + b.dataset.id + ': titolo vuoto');
      fatti.eruzione++;
    }
    // la stessa ora a Ercolano, e ritorno
    document.getElementById('eruCitta').click();
    if(!document.body.classList.contains('erc-on')) guai.push('eruzione: non va a Ercolano');
    controlla('eruzione a Ercolano');
    if(!/\d/.test(document.getElementById('eruQuota').textContent)) guai.push('eruzione: quota di Ercolano assente');
    document.getElementById('eruCitta').click();
    if(document.body.classList.contains('erc-on')) guai.push('eruzione: non torna a Pompei');
    document.getElementById('eruChiudi').click();
    if(document.body.classList.contains('eru-on')) guai.push('eruzione: non si chiude');
  } catch(e){ guai.push('eruzione: ' + e.message); }
  for(const id of P.luoghi()){ try { P.apri(id); controlla('luogo ' + id); fatti.luoghi++; } catch(e){ guai.push('luogo ' + id + ': ' + e.message); } }
  document.getElementById('pClose').click();
  try { P.vista('confronto'); controlla('confronto'); } catch(e){ guai.push('confronto: ' + e.message); }
  try {
    P.vista('ercolano'); controlla('ercolano');
    for(const p of P.ercolano.luoghi){ P.ercolano.apri(p.id); controlla('erc ' + p.id); fatti.erc++; }
    document.getElementById('pClose').click();
    document.getElementById('ercBuried').click(); controlla('erc sotto');
    document.getElementById('ercSottoVasca').click(); controlla('erc vasca');
    document.getElementById('ercBuried').click();
  } catch(e){ guai.push('ercolano: ' + e.message); }
  // in classe: tutte le tappe del percorso lungo, alla lavagna e da studente
  fatti.classe = 0;
  try {
    P.vista('pompei');
    for(const modo of ['btnLavagna', 'btnStudente']){
      document.getElementById(modo).click();
      document.querySelector('#clPercorsi [data-percorso="completo"]').click();
      for(let i = 0; i < 30 && !document.getElementById('clNext').disabled; i++){
        controlla('classe ' + document.getElementById('clPos').textContent);
        if(!document.querySelector('.clQ')?.textContent.trim()) guai.push('classe: domanda vuota a ' + document.getElementById('clPos').textContent);
        fatti.classe++;
        document.getElementById('clNext').click();
      }
      controlla('classe ultima tappa'); fatti.classe++;
    }
    document.getElementById('clEsci').click();
    if(document.body.classList.contains('classe-on')) guai.push('classe: non si esce');
  } catch(e){ guai.push('classe: ' + e.message); }
  P.vista('pompei');
  return { lang: document.documentElement.lang, fatti, guai };
})()
