/* =====================================================================
   LE STANZE DI UNA PIANTA

   Dai muri di una pianta (rettangoli in metri, origine a nord-ovest, come
   in src/data/pompei-interni.json) ricava le stanze: gli spazi liberi
   separati dai muri, con le porte chiuse.

   Come: la pianta diventa una griglia di 25 cm; i muri si ingrossano di
   1 m per lato, così le porte fino a 2 m si chiudono e ogni stanza resta un
   pezzo solo; i pezzi si numerano e poi si riallargano sulle celle libere
   fino ai muri veri. Un'apertura più larga di 2 m unisce due spazi in uno
   (a Ercolano e a Pompei succede fra atrio e peristilio).

   È geometria della pianta, niente di più: dice quanto è grande uno
   spazio, non che cosa era. L'uso che se ne fa (quali spazi coprire) è
   dichiarato dove lo si usa.
   ===================================================================== */

export function stanze(muri, dim, cella = 0.25, chiudi = 4){
  const W = Math.round(dim[0] / cella), D = Math.round(dim[1] / cella), N = W * D;
  const muro = new Uint8Array(N);
  for(const [a, b, e, f] of muri)
    for(let j = Math.max(0, Math.round(b / cella)); j < Math.min(D, Math.round(f / cella)); j++)
      for(let i = Math.max(0, Math.round(a / cella)); i < Math.min(W, Math.round(e / cella)); i++)
        muro[j * W + i] = 1;
  const vicini = (p, fn) => {
    const i = p % W;
    if(i > 0) fn(p - 1);
    if(i < W - 1) fn(p + 1);
    if(p >= W) fn(p - W);
    if(p < N - W) fn(p + W);
  };
  // distanza dal muro più vicino, in celle (passi di griglia)
  const dist = new Uint16Array(N).fill(65535);
  let coda = [];
  for(let p = 0; p < N; p++) if(muro[p]){ dist[p] = 0; coda.push(p); }
  for(let k = 0; k < coda.length; k++){
    const p = coda[k];
    vicini(p, q => { if(dist[q] > dist[p] + 1){ dist[q] = dist[p] + 1; coda.push(q); } });
  }
  // i nuclei delle stanze: le celle lontane dai muri più di `chiudi`
  const lab = new Int32Array(N).fill(-1);
  let n = 0;
  for(let p = 0; p < N; p++){
    if(dist[p] <= chiudi || lab[p] >= 0) continue;
    lab[p] = n; coda = [p];
    for(let k = 0; k < coda.length; k++)
      vicini(coda[k], q => { if(dist[q] > chiudi && lab[q] < 0){ lab[q] = n; coda.push(q); } });
    n++;
  }
  // ogni nucleo si riallarga sulle celle libere, fino ai muri
  coda = [];
  for(let p = 0; p < N; p++) if(lab[p] >= 0) coda.push(p);
  for(let k = 0; k < coda.length; k++){
    const p = coda[k];
    vicini(p, q => { if(!muro[q] && lab[q] < 0){ lab[q] = lab[p]; coda.push(q); } });
  }
  const area = new Float64Array(n);
  for(let p = 0; p < N; p++) if(lab[p] >= 0) area[lab[p]] += cella * cella;
  return { W, D, cella, muro, lab, n, area };
}

/* Le celle scelte come rettangoli in metri [x0, z0, x1, z1]: prima le file
   orizzontali, poi le file uguali una sotto l'altra si uniscono. */
export function rettangoli(W, D, cella, scelta){
  const aperti = new Map(), fuori = [];
  for(let j = 0; j <= D; j++){
    const file = [];
    if(j < D){
      let i = 0;
      while(i < W){
        if(!scelta(j * W + i)){ i++; continue; }
        const i0 = i;
        while(i < W && scelta(j * W + i)) i++;
        file.push(i0 + ',' + i);
      }
    }
    const ora = new Set(file);
    for(const [k, r] of aperti) if(!ora.has(k)){ fuori.push(r); aperti.delete(k); }
    for(const k of file){
      if(aperti.has(k)){ aperti.get(k)[3] = (j + 1) * cella; continue; }
      const [i0, i1] = k.split(',').map(Number);
      aperti.set(k, [i0 * cella, j * cella, i1 * cella, (j + 1) * cella]);
    }
  }
  return fuori;
}

/* L'atrio attorno a un impluvio: la stanza che contiene la vasca, con le
   porte chiuse quanto basta perché sia una stanza sola. Si prova a chiudere
   le aperture fino a 2, 3, 4 e 5 m (chiudi 4, 6, 8, 10 celle) e si tiene la
   prima stanza sotto `max` m²: fra atrio e peristilio o tablino le aperture
   sono larghe, e con le porte normali i due spazi restavano uno. Restituisce
   la maschera delle celle dell'atrio sulla griglia di stanze(..., 4). */
export function atrio(muri, dim, vasca, max = 250, cella = 0.25){
  const [a, b, e, f] = vasca;
  for(const chiudi of [4, 6, 8, 10]){
    const s = stanze(muri, dim, cella, chiudi);
    const i = Math.round((a + e) / 2 / cella), j = Math.round((b + f) / 2 / cella);
    const l = s.lab[j * s.W + i];
    if(l < 0 || s.area[l] > max) continue;
    const maschera = new Uint8Array(s.W * s.D);
    for(let p = 0; p < maschera.length; p++) if(s.lab[p] === l) maschera[p] = 1;
    return { maschera, area: s.area[l], chiudi };
  }
  return null;
}
