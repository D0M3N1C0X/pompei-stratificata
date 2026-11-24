/* =====================================================================
   LE LUCERNE

   Di sera, una lucerna accesa nei punti che passa chi la usa (a Pompei e
   a Ercolano davanti alle botteghe): la fiamma, l'alone attorno e la pozza
   di luce calda sul selciato. Dove e quante sono è una scelta di chi la
   usa, da dichiarare come [regia].

   Niente luci vere: con centinaia di punti costerebbero troppo. La fiamma
   è un punto luminoso, l'alone uno sprite additivo, la pozza un disco
   additivo steso sul suolo. Tutto sale con `notte(f)`, da 0 a 1.
   ===================================================================== */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group,
  InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Points, PointsMaterial, SRGBColorSpace
} from 'three';

function alone(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,230,180,1)');
  r.addColorStop(0.25, 'rgba(255,190,110,0.55)');
  r.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

// punti: [{ x, z, nx, nz }] — il piede della facciata e la normale verso la via
// metri: quanti metri vale un'unità della scena (4 a Pompei e Ercolano);
// altezza e fuori in metri
export function creaLucerne(punti, { metri = 4, altezza = 1.8, fuori = 0.24 } = {}){
  altezza /= metri; fuori /= metri;
  const u = 4 / metri;                                   // le misure sotto sono pensate a 4 m per unità
  const group = new Group(); group.name = 'lucerne';
  const tex = alone();
  const pos = new Float32Array(punti.length * 3);
  punti.forEach((p, i) => {
    pos[i*3] = p.x + p.nx * fuori; pos[i*3 + 1] = altezza; pos[i*3 + 2] = p.z + p.nz * fuori;
  });
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(pos, 3));
  // la fiamma e l'alone: due nuvole di punti sugli stessi posti
  const fiamma = new Points(g, new PointsMaterial({ color: 0xffe2a8, size: 0.05 * u, sizeAttenuation: true,
    map: tex, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }));
  const luce = new Points(g, new PointsMaterial({ color: 0xffb060, size: 0.9 * u, sizeAttenuation: true,
    map: tex, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: true }));
  // la pozza sul selciato, davanti alla bottega
  const disco = new PlaneGeometry(1, 1); disco.rotateX(-Math.PI / 2);
  const pozza = new InstancedMesh(disco, new MeshBasicMaterial({ color: new Color(0xffa860), map: tex,
    transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: true,
    polygonOffset: true, polygonOffsetFactor: -2 }), punti.length);
  const M = new Matrix4();
  punti.forEach((p, i) => {
    M.makeScale(1.15 * u, 1, 1.15 * u).setPosition(p.x + p.nx * 0.35 * u, 0.012 * u, p.z + p.nz * 0.35 * u);
    pozza.setMatrixAt(i, M);
  });
  pozza.instanceMatrix.needsUpdate = true;
  for(const o of [fiamma, luce, pozza]){ o.frustumCulled = false; o.renderOrder = 5; group.add(o); }
  group.visible = false;
  return {
    group,
    notte(f, tempo = 0){
      group.visible = f > 0.02;
      if(!group.visible) return;
      const t = 0.92 + 0.08 * Math.sin(tempo * 9.3) * Math.sin(tempo * 5.1);
      fiamma.material.opacity = f;
      luce.material.opacity = 0.45 * f * t;
      pozza.material.opacity = 0.26 * f * t;
    }
  };
}
