/* =====================================================================
   LA PIOGGIA

   Gocce come brevi tratti che cadono in una scatola attorno a chi guarda
   (72 × 32 × 72 m) e la seguono; il vento le inclina. Cadono a circa
   9 m/s, la velocità di una goccia di pioggia media. Quando piovesse lo
   decide chi la usa: nei progetti della collana è [disegno].

   creaPioggia(n, { metri }) — metri: quanti metri vale un'unità della
   scena (4 a Pompei e Ercolano).
   ===================================================================== */
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three';

export function creaPioggia(n = 4000, { metri = 4 } = {}){
  const L = 72 / metri, H = 32 / metri, cade = 9 / metri, lungo = 0.88 / metri;
  const pos = new Float32Array(n * 6), base = new Float32Array(n * 3);
  for(let i = 0; i < n; i++){
    base[i*3] = (Math.random() - 0.5) * L;
    base[i*3 + 1] = Math.random() * H;
    base[i*3 + 2] = (Math.random() - 0.5) * L;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  const linee = new LineSegments(g, new LineBasicMaterial({ color: 0xd2d9e0, transparent: true, opacity: 0, depthWrite: false }));
  linee.frustumCulled = false;
  linee.visible = false;
  let forza = 0, t = 0;
  const vento = [0.35, 0.12];                               // lo spostamento per unità di caduta
  return {
    mesh: linee,
    accendi(f){ forza = f; },
    update(dt, camera){
      // si accende e si spegne piano, in un paio di secondi
      const k = linee.material.opacity + (0.5 * forza - linee.material.opacity) * Math.min(1, dt * 1.5);
      linee.material.opacity = k;
      linee.visible = k > 0.01;
      if(!linee.visible) return;
      t += dt;
      const cx = camera.position.x, cy = camera.position.y - 8 / metri, cz = camera.position.z;
      for(let i = 0; i < n; i++){
        // la quota scende col tempo e ricomincia in cima: nessuno stato per goccia
        let y = base[i*3 + 1] - (t * cade) % H;
        if(y < 0) y += H;
        // la scatola segue chi guarda, ma le gocce restano ferme nel mondo
        let x = base[i*3] + vento[0] * (H - y), z = base[i*3 + 2] + vento[1] * (H - y);
        x = ((x - cx) % L + L * 1.5) % L - L / 2 + cx;
        z = ((z - cz) % L + L * 1.5) % L - L / 2 + cz;
        const j = i * 6;
        pos[j] = x; pos[j + 1] = cy + y; pos[j + 2] = z;
        pos[j + 3] = x - vento[0] * lungo; pos[j + 4] = cy + y + lungo; pos[j + 5] = z - vento[1] * lungo;
      }
      g.attributes.position.needsUpdate = true;
    }
  };
}
