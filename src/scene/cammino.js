/* =====================================================================
   CAMMINO — «tocca dove vuoi andare».

   Su iPhone e iPad la levetta chiedeva di imparare un comando da gioco.
   Adesso si tocca la strada e ci si va a piedi: questo modulo trova il
   percorso sulla griglia dei muri che la scena già usa per le collisioni,
   aggirando gli angoli, e lo restituisce come pochi punti da seguire.

   - A* su celle quadrate, otto direzioni, senza tagliare gli spigoli;
   - si cerca solo in un riquadro attorno a partenza e arrivo (più un
     margine), così il calcolo resta sotto qualche decina di millisecondi;
   - se il punto toccato non è raggiungibile (dentro una casa chiusa, sul
     deposito) si va alla cella raggiungibile più vicina al punto toccato;
   - il percorso a gradini si tende come un filo: si tengono solo i punti
     dai quali il successivo non è in vista.

   Nessuna dipendenza: lo usano sia Pompei (app.js) sia Ercolano.
   ===================================================================== */

export function trovaPercorso({ libero, da, a, passo, margine = 12, maxNodi = 600000 }){
  const x0 = Math.min(da[0], a[0]) - margine, z0 = Math.min(da[1], a[1]) - margine;
  const nx = Math.ceil((Math.max(da[0], a[0]) + margine - x0) / passo);
  const nz = Math.ceil((Math.max(da[1], a[1]) + margine - z0) / passo);
  const N = nx * nz;
  const cx = i => x0 + (i + 0.5) * passo, cz = j => z0 + (j + 0.5) * passo;
  const cella = (x, z) => [Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / passo))),
                           Math.min(nz - 1, Math.max(0, Math.floor((z - z0) / passo)))];

  // libero/occupato si chiede alla scena una volta per cella: 0 non visto
  const stato = new Uint8Array(N);
  const ok = k => {
    if(stato[k] === 0) stato[k] = libero(cx(k % nx), cz((k / nx) | 0)) ? 1 : 2;
    return stato[k] === 1;
  };

  const [si, sj] = cella(da[0], da[1]), [gi, gj] = cella(a[0], a[1]);
  const S = sj * nx + si, G = gj * nx + gi;
  const g = new Float32Array(N).fill(Infinity), da_ = new Int32Array(N).fill(-1);
  const chiuso = new Uint8Array(N);
  const h = k => { const dx = Math.abs(k % nx - gi), dz = Math.abs(((k / nx) | 0) - gj);
                   return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };

  // coda con priorità: un mucchio binario su due array
  const heapK = new Int32Array(N), heapF = new Float32Array(N); let n = 0;
  const push = (k, f) => {
    let i = n++;
    while(i > 0){ const p = (i - 1) >> 1; if(heapF[p] <= f) break; heapK[i] = heapK[p]; heapF[i] = heapF[p]; i = p; }
    heapK[i] = k; heapF[i] = f;
  };
  const pop = () => {
    const top = heapK[0], k = heapK[--n], f = heapF[n]; let i = 0;
    for(;;){
      let c = 2 * i + 1; if(c >= n) break;
      if(c + 1 < n && heapF[c + 1] < heapF[c]) c++;
      if(heapF[c] >= f) break;
      heapK[i] = heapK[c]; heapF[i] = heapF[c]; i = c;
    }
    heapK[i] = k; heapF[i] = f; return top;
  };

  g[S] = 0; push(S, h(S));
  let meglio = S, hMeglio = h(S), visti = 0;
  const DIR = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.4142],[1,-1,1.4142],[-1,1,1.4142],[-1,-1,1.4142]];
  while(n > 0 && visti < maxNodi){
    const k = pop();
    if(chiuso[k]) continue;
    chiuso[k] = 1; visti++;
    const hk = h(k);
    if(hk < hMeglio){ hMeglio = hk; meglio = k; }
    if(k === G) break;
    const i = k % nx, j = (k / nx) | 0;
    for(const [di, dj, c] of DIR){
      const a2 = i + di, b2 = j + dj;
      if(a2 < 0 || b2 < 0 || a2 >= nx || b2 >= nz) continue;
      const q = b2 * nx + a2;
      if(chiuso[q] || !ok(q)) continue;
      // in diagonale solo se sono liberi anche i due lati: niente spigoli tagliati
      if(di && dj && (!ok(j * nx + a2) || !ok(b2 * nx + i))) continue;
      const ng = g[k] + c;
      if(ng < g[q]){ g[q] = ng; da_[q] = k; push(q, ng + h(q)); }
    }
  }
  if(meglio === S) return null;

  // la catena di celle, dalla partenza all'arrivo
  const celle = [];
  for(let k = meglio; k !== -1; k = da_[k]) celle.push(k);
  celle.reverse();
  const punti = celle.map(k => [cx(k % nx), cz((k / nx) | 0)]);
  if(meglio === G && libero(a[0], a[1])) punti[punti.length - 1] = [a[0], a[1]];

  // il filo teso: dalla posizione vera, salta ai punti ancora in vista
  // in vista = libero lungo il segmento e lungo due segmenti paralleli a
  // mezza cella di distanza: così il filo non rade gli spigoli dei muri
  const vede = (p, q) => {
    const dx = q[0] - p[0], dz = q[1] - p[1], d = Math.hypot(dx, dz);
    if(d < 1e-6) return true;
    const ox = -dz / d * passo * 0.5, oz = dx / d * passo * 0.5;
    const m = Math.ceil(d / (passo * 0.25));
    for(let s = 1; s < m; s++){
      const t = s / m, x = p[0] + dx * t, z = p[1] + dz * t;
      if(!libero(x, z) || !libero(x + ox, z + oz) || !libero(x - ox, z - oz)) return false;
    }
    return true;
  };
  const filo = [];
  let cur = [da[0], da[1]], i = 0;
  while(i < punti.length - 1){
    let j = punti.length - 1;
    while(j > i + 1 && !vede(cur, punti[j])) j--;
    filo.push(punti[j]); cur = punti[j]; i = j;
  }
  if(!filo.length) filo.push(punti[punti.length - 1]);
  return filo;
}

/* Il segno sul suolo dove si sta andando: un anello che pulsa piano. */
export function creaSegno({ RingGeometry, MeshBasicMaterial, Mesh, colore, raggio = 0.18 }){
  const m = new Mesh(new RingGeometry(raggio * 0.62, raggio, 32),
    new MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.85, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  m.visible = false;
  return m;
}

/* Segue un percorso: restituisce la velocità desiderata (unità/s) verso il
   prossimo punto, o null quando si è arrivati. */
export function seguiPercorso(p, x, z, velocita){
  while(p.punti.length){
    const [tx, tz] = p.punti[0];
    const d = Math.hypot(tx - x, tz - z);
    const ultimo = p.punti.length === 1;
    if(d < (ultimo ? 0.06 : 0.14)){ p.punti.shift(); continue; }
    // all'ultimo punto si rallenta, invece di fermarsi di colpo
    const v = ultimo ? Math.min(velocita, d * 2.2 + 0.05) : velocita;
    return [(tx - x) / d * v, (tz - z) / d * v];
  }
  return null;
}
