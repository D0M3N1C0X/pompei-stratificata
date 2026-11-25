/* =====================================================================
   LA RESA CINEMA

   La catena di post-produzione di Firenze 1216 (citta/src/main.js),
   portata qui come opzione: occlusione ambientale GTAO, antialiasing
   SMAA e la resa finale di three.js (OutputPass). È più bella della
   post-produzione scritta a mano (post.js) ma molto più pesante: per
   questo è spenta di serie, si accende dal menu «Altro» e il browser
   la ricorda. Pensata per provarla su un computer o un iPad con una
   scheda video vera; sul processore costa decine di secondi a fotogramma.

   Le misure del GTAO sono quelle di Firenze (1 unità = 1 m) riportate a
   Pompei, dove 1 unità vale 4 m.
   ===================================================================== */
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const METRI = 4;

export function creaCinema(renderer, scene, camera){
  let composer = null;
  const stato = { on: false };

  function costruisci(){
    const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
    composer?.dispose?.();
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, w, h);
    gtao.updateGtaoMaterial({ radius: 0.9 / METRI, distanceExponent: 1.4, thickness: 1.2 / METRI, scale: 1.0, samples: 16 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
    composer.addPass(new SMAAPass(w * pr, h * pr));
  }

  return {
    get on(){ return stato.on; },
    attiva(on){
      stato.on = !!on;
      if(stato.on && !composer) costruisci();
    },
    render(dt){ composer.render(dt); },
    ridimensiona(){ if(composer) costruisci(); }
  };
}
