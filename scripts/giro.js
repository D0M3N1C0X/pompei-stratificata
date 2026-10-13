/*
   Il giro di verifica, da lanciare nella pagina aperta con ?debug:

     (0, eval)(await (await fetch('/scripts/giro.js')).text())

   Apre ogni fase, ogni luogo di Pompei e di Ercolano, il confronto e le
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
  P.vista('pompei');
  return { lang: document.documentElement.lang, fatti, guai };
})()
