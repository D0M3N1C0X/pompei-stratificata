/* =====================================================================
   IL MARE

   Davanti alla spiaggia di Ercolano nel 79: fino a oggi una lastra opaca
   e ferma, larga quanto la città. Qui un piano che arriva all'orizzonte,
   con un'onda lunga che lo solleva appena, l'increspatura che scorre (una
   normal map fatta nel codice) e il sole che ci luccica sopra; lungo la
   battigia una riga di schiuma che va e viene.

   La linea di costa resta quella della scena (ercolano-pianta.js); onde,
   colore e schiuma sono [disegno].
   ===================================================================== */
import {
  CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, RepeatWrapping, Vector2
} from 'three';

// una normal map da un campo di onde: somme di seni periodici sulla tessera
function increspatura(N = 256){
  const h = new Float32Array(N * N);
  const onde = [[3, 1, 0.5], [1, 4, 0.35], [5, -2, 0.22], [-7, 3, 0.14], [9, 8, 0.08], [-13, 5, 0.05]];
  for(let j = 0; j < N; j++) for(let i = 0; i < N; i++){
    let v = 0;
    for(const [a, b, amp] of onde) v += amp * Math.sin(2 * Math.PI * (a * i + b * j) / N + a * 0.7);
    h[j * N + i] = v;
  }
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  for(let j = 0; j < N; j++) for(let i = 0; i < N; i++){
    const dx = h[j * N + (i + 1) % N] - h[j * N + (i + N - 1) % N];
    const dz = h[((j + 1) % N) * N + i] - h[((j + N - 1) % N) * N + i];
    const nx = -dx * 2.2, nz = -dz * 2.2, ny = 1, l = Math.hypot(nx, ny, nz);
    const k = (j * N + i) * 4;
    img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (nz / l * 0.5 + 0.5) * 255;
    img.data[k + 2] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

function schiuma(){
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  for(let i = 0; i < 900; i++){
    const x = Math.random() * 256, y = Math.random() * 32, r = 0.6 + Math.random() * 1.8;
    g.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * Math.random() * (1 - Math.abs(y - 16) / 16)})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  return t;
}

// riva: z della battigia (in unità), y: quota del mare
export function creaMare({ riva, y, x0 = -85, x1 = 85 }){
  const W = 1400, D = 700;
  const geo = new PlaneGeometry(W, D, 280, 140);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, riva + D / 2);
  const normali = increspatura();
  normali.repeat.set(W / 9, D / 9);
  const mat = new MeshStandardMaterial({
    color: new Color(0x2e5866), roughness: 0.22, metalness: 0.0,
    normalMap: normali, normalScale: new Vector2(0.55, 0.55)
  });
  const tempo = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTempoMare = tempo;
    sh.vertexShader = 'uniform float uTempoMare;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      // l'onda lunga che viene dal largo, più bassa vicino alla riva
      float riva = clamp( ( position.z - ${riva.toFixed(3)} ) / 6.0, 0.0, 1.0 );
      transformed.y += riva * ( 0.035 * sin( position.z * 0.55 - uTempoMare * 1.1 )
                              + 0.018 * sin( position.x * 0.31 + position.z * 0.2 - uTempoMare * 0.7 ) );`);
  };
  mat.customProgramCacheKey = () => 'mare';
  const mare = new Mesh(geo, mat);
  mare.position.y = y;
  mare.receiveShadow = true;

  const sch = schiuma();
  sch.repeat.set((x1 - x0) / 3, 1);
  const riga = new Mesh(new PlaneGeometry(x1 - x0, 0.7), new MeshBasicMaterial({
    map: sch, transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide }));
  riga.rotation.x = -Math.PI / 2;
  riga.position.set((x0 + x1) / 2, y + 0.02, riva + 0.25);

  return {
    meshes: [mare, riga],
    update(t){
      tempo.value = t;
      normali.offset.set(t * 0.012, t * 0.02);
      // la schiuma sale e si ritira con l'onda, ogni 6 s circa
      const f = 0.5 + 0.5 * Math.sin(t * 1.05);
      riga.position.z = riva + 0.12 + 0.35 * f;
      riga.material.opacity = 0.35 + 0.45 * (1 - f);
      sch.offset.x = t * 0.01;
    }
  };
}
