/* =====================================================================
   GLI ANNUNCI PER I LETTORI DI SCHERMO

   Una regione aria-live, invisibile, in cui si scrive che cosa è appena
   cambiato (una fase, un luogo, una scena): i lettori di schermo lo
   leggono senza spostare il fuoco. Se l'elemento non c'è, lo crea.
   Lo stesso testo ripetuto si rilegge: prima si svuota, poi si scrive.
   ===================================================================== */

export function creaAnnunci(id = 'annuncio'){
  let el = document.getElementById(id);
  if(!el){
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    // nascosto alla vista, non ai lettori di schermo
    Object.assign(el.style, { position:'absolute', width:'1px', height:'1px', padding:'0', margin:'-1px',
      overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:'0' });
    document.body.appendChild(el);
  }
  let attesa = null;
  return function annuncia(testo){
    clearTimeout(attesa);
    el.textContent = '';
    attesa = setTimeout(() => { el.textContent = testo; }, 30);
  };
}
