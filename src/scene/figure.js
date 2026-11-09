import {
  AnimationMixer,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DataUtils,
  DynamicDrawUsage,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  NearestFilter,
  RGBAFormat,
  Vector3
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ROMANE from '../assets/figure/romane.json';
import OGGI from '../assets/figure/oggi.json';
import BORBONICI from '../assets/figure/borbonici.json';
import TARDOANTICHI from '../assets/figure/tardoantichi.json';
import CIVITA from '../assets/figure/civita.json';
import CANALE from '../assets/figure/canale.json';
import OPERAI1958 from '../assets/figure/operai1958.json';
import movimentiUrl from '../assets/figure/movimenti.glb?url';
import ANIMALI from '../assets/figure/animali.json';

/* =====================================================================
   LE FIGURE DEL 79

   Dodici corpi MakeHuman vestiti alla romana in Blender
   (strumenti/blender/figure_romane.py) e due movimenti del database CMU
   (strumenti/blender/movimenti_ridotti.py). Le fonti delle vesti stanno
   nello script; qui c'è solo la tecnica.

   Trecento figure con scheletro, ognuna con il suo mixer, sarebbero
   troppe per un telefono. Allora il movimento si calcola una volta sola,
   all'avvio: per ogni figura si posa lo scheletro fotogramma per
   fotogramma, si leggono le posizioni dei vertici e si scrivono in una
   texture. Poi tutte le figure di una variante si disegnano in un colpo
   (InstancedMesh), e il vertex shader legge dalla texture la posa del
   fotogramma giusto. Il file non pesa un byte in più: la texture nasce
   nel browser.
   ===================================================================== */

const FILE = import.meta.glob(['../assets/figure/cane-*.glb', '../assets/figure/piccione.glb', '../assets/figure/romana-*.glb', '../assets/figure/oggi-*.glb', '../assets/figure/borb-*.glb',
  '../assets/figure/tard-*.glb', '../assets/figure/civ-*.glb', '../assets/figure/can-*.glb', '../assets/figure/mai-*.glb'], { eager:true, query:'?url', import:'default' });
// le serie: chi veste come, e da quale script di Blender viene
const SERIE = [
  { nome:'romane', elenco:ROMANE },   // strumenti/blender/figure_romane.py — il 79
  { nome:'oggi',   elenco:OGGI },     // strumenti/blender/figure_oggi.py — il cantiere aperto
  { nome:'borbonici', elenco:BORBONICI }, // strumenti/blender/figure_borbonici.py — lo scavo 1748–1763
  // strumenti/blender/figure_fasi.py (28/10/2026): le fasi che avevano i manichini
  { nome:'tardoantichi', elenco:TARDOANTICHI },  // la rioccupazione, IV–V secolo
  { nome:'civita', elenco:CIVITA },              // la collina coltivata, XV–XVI secolo
  { nome:'canale', elenco:CANALE },              // gli scavatori di Fontana, 1592–1600
  { nome:'operai1958', elenco:OPERAI1958 }       // gli operai di Maiuri a Ercolano
];

const PASSO_F = 20;      // fotogrammi del passo (clip di circa 1 s)
const SOSTA_F = 24;      // fotogrammi della sosta (clip di circa 5 s)
// facoltativi (movimenti_ridotti.py gesto=… corsa=…): se il file non li ha,
// il gesto usa la sosta e la corsa usa il passo
const GESTO_F = 24;      // il gesto al bancone o alla fontana
const CORSA_F = 16;      // la corsa di chi fugge
const LARGO = 1024;      // larghezza delle texture dei vertici

export const ORA = { value:0 };   // il tempo, condiviso da tutti i materiali

export async function caricaFigure(){
  const loader = new GLTFLoader();
  const mov = await loader.loadAsync(movimentiUrl);
  const clip = Object.fromEntries(mov.animations.map(c => [c.name, c]));
  const anche0 = altezzaAnche(mov.scene);
  const varianti = [];
  for(const serie of SERIE) for(const info of serie.elenco){
    const url = FILE[`../assets/figure/${info.file}`];
    if(!url) continue;
    const gltf = await loader.loadAsync(url);
    const v = prepara(gltf.scene, info, clip, altezzaAnche(gltf.scene) / anche0);
    v.serie = serie.nome;
    varianti.push(v);
    await new Promise(r => setTimeout(r, 0));   // lascia respirare il primo disegno
  }
  return { varianti, passo: clip.cammina2.duration, sosta: clip.fermo.duration, velocitaPasso: 1.104 };
}

/* Gli animali (strumenti/blender/animali.py): un cane in tre mantelli e un
   piccione, ciascuno con il suo scheletro e i suoi due movimenti, «passo» e
   «sosta». Stessa tecnica delle figure: le pose si scrivono in una texture
   all'avvio e tutti gli animali di una variante si disegnano in un colpo.
   velocitaPasso: a quale velocità, in m/s, il passo registrato non scivola
   (il cane trotta; il piccione batte le ali qualunque sia la velocità). */
const VELOCITA_ANIMALI = { cane:1.25, piccione:3.0 };
export async function caricaAnimali(){
  const loader = new GLTFLoader();
  const varianti = [];
  for(const info of ANIMALI){
    const url = FILE[`../assets/figure/${info.file}`];
    if(!url) continue;
    const gltf = await loader.loadAsync(url);
    const clip = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
    if(!clip.passo || !clip.sosta) continue;
    const v = prepara(gltf.scene, info, clip, 1, ['passo', 'sosta']);
    v.specie = info.specie;
    v.velocitaPasso = VELOCITA_ANIMALI[info.specie] || 1;
    varianti.push(v);
    await new Promise(r => setTimeout(r, 0));
  }
  return varianti;
}

function altezzaAnche(radice){
  let y = 0.874;
  radice.traverse(o => { if(o.name === 'Hips') y = o.position.y; });
  return y;
}

// nomi: i due movimenti da usare, il passo e la sosta (le figure umane li
// prendono da movimenti.glb, gli animali dal proprio file)
function prepara(radice, info, clip, k, nomi = ['cammina2', 'fermo', 'gesto', 'corsa']){
  // le anche: la traslazione registrata vale per lo scheletro di riferimento
  const scala = c => {
    // clone() non copia i valori, li condivide: senza slice() la correzione
    // di ogni figura si sommava a quelle delle precedenti, e le anche
    // scendevano di variante in variante piegando le ginocchia
    const copia = c.clone();
    // Del movimento servono le rotazioni, non le lunghezze delle ossa: le
    // traslazioni di ogni osso sono quelle dello scheletro di riferimento,
    // un adulto, e un ragazzo ne usciva alto 1,65 m con i piedi sottoterra.
    // Resta solo la posizione delle anche, riscalata qui sotto.
    copia.tracks = copia.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'Hips.position');
    for(const t of copia.tracks) if(t.name === 'Hips.position'){
      t.values = t.values.slice();
      for(let i = 0; i < t.values.length; i++) t.values[i] *= k;
    }
    return copia;
  };
  const passo = scala(clip[nomi[0]]), sosta = scala(clip[nomi[1]]);
  const gesto = nomi[2] && clip[nomi[2]] ? scala(clip[nomi[2]]) : null;
  const corsa = nomi[3] && clip[nomi[3]] ? scala(clip[nomi[3]]) : null;
  // la velocità a cui la corsa registrata non scivola: dalle anche
  let velocitaCorsa = 0;
  if(corsa){
    const t = corsa.tracks.find(t => t.name === 'Hips.position'), v = t && t.values;
    if(v && v.length >= 6) velocitaCorsa = Math.hypot(v[v.length-3] - v[0], v[v.length-1] - v[2]) / corsa.duration;
  }

  const pezzi = [], materiali = [];
  radice.traverse(o => {
    if(!o.isSkinnedMesh) return;
    const m = o.material;
    if(m.transparent){ m.transparent = false; m.depthWrite = true; m.alphaTest = /low-poly/.test(m.name) ? 0 : 0.5; }
    if(m.name === 'pelle') m.color.setRGB(...(info.pelle || [0.8, 0.62, 0.48]));
    if(/short|braid|ponytail|bob|long|eyebrow/i.test(m.name) && info.colore_capelli)
      m.color.setRGB(...info.colore_capelli.map(c => Math.min(1, c * 2.4)));
    pezzi.push(o); materiali.push(m);
  });
  radice.updateMatrixWorld(true);

  // una geometria sola, un gruppo per materiale
  const geos = pezzi.map(p => {
    const g = new BufferGeometry();
    g.setAttribute('position', p.geometry.attributes.position.clone());
    g.setAttribute('normal', p.geometry.attributes.normal.clone());
    const uv = p.geometry.attributes.uv;
    g.setAttribute('uv', uv ? uv.clone() : new BufferAttribute(new Float32Array(p.geometry.attributes.position.count * 2), 2));
    if(p.geometry.index) g.setIndex(p.geometry.index.clone());
    return g;
  });
  const geometria = mergeGeometries(geos, true);
  const V = geometria.attributes.position.count;
  // dove sta ogni movimento nella texture: passo, sosta, poi gesto e corsa se ci sono
  const BASE_G = PASSO_F + SOSTA_F, BASE_C = BASE_G + (gesto ? GESTO_F : 0);
  const F = BASE_C + (corsa ? CORSA_F : 0);
  const righe = Math.ceil(V * F / LARGO);
  const pos = new Uint16Array(LARGO * righe * 4);
  const nor = new Uint8Array(LARGO * righe * 4);

  // si posa lo scheletro e si legge ogni vertice, già deformato
  const mixer = new AnimationMixer(radice);
  const tmp = new BufferGeometry();
  tmp.setIndex(geometria.index);
  const buf = new Float32Array(V * 3);
  tmp.setAttribute('position', new BufferAttribute(buf, 3));
  const v = new Vector3();
  const posa = (c, t, f) => {
    mixer.stopAllAction();
    const a = mixer.clipAction(c); a.play(); mixer.setTime(t);
    radice.updateMatrixWorld(true);
    let i = 0;
    for(const p of pezzi){
      p.skeleton.update();
      const n = p.geometry.attributes.position.count;
      for(let j = 0; j < n; j++, i++){
        p.getVertexPosition(j, v); v.applyMatrix4(p.matrixWorld);
        buf[i*3] = v.x; buf[i*3+1] = v.y; buf[i*3+2] = v.z;
      }
    }
    tmp.attributes.position.needsUpdate = true;
    tmp.computeVertexNormals();
    const nn = tmp.attributes.normal.array;
    for(let j = 0; j < V; j++){
      const o = (f * V + j) * 4;
      pos[o]   = DataUtils.toHalfFloat(buf[j*3]);
      pos[o+1] = DataUtils.toHalfFloat(buf[j*3+1]);
      pos[o+2] = DataUtils.toHalfFloat(buf[j*3+2]);
      nor[o]   = Math.round((nn[j*3]   * 0.5 + 0.5) * 255);
      nor[o+1] = Math.round((nn[j*3+1] * 0.5 + 0.5) * 255);
      nor[o+2] = Math.round((nn[j*3+2] * 0.5 + 0.5) * 255);
    }
  };
  for(let f = 0; f < PASSO_F; f++) posa(passo, passo.duration * f / PASSO_F, f);
  for(let f = 0; f < SOSTA_F; f++) posa(sosta, sosta.duration * f / SOSTA_F, PASSO_F + f);
  if(gesto) for(let f = 0; f < GESTO_F; f++) posa(gesto, gesto.duration * f / GESTO_F, BASE_G + f);
  if(corsa) for(let f = 0; f < CORSA_F; f++) posa(corsa, corsa.duration * f / CORSA_F, BASE_C + f);
  mixer.stopAllAction();
  tmp.dispose();

  const texPos = new DataTexture(pos, LARGO, righe, RGBAFormat, HalfFloatType);
  const texNor = new DataTexture(nor, LARGO, righe, RGBAFormat);
  for(const t of [texPos, texNor]){ t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }

  // per ?debug: quanto è alta la figura nella prima posa del passo e della sosta
  const altezze = [0, PASSO_F].map(f => {
    let y = -1e9, b = 1e9;
    for(let j = 0; j < V; j++){ const q = DataUtils.fromHalfFloat(pos[(f*V + j)*4 + 1]); y = Math.max(y, q); b = Math.min(b, q); }
    return [+b.toFixed(3), +y.toFixed(3)];
  });
  altezze.push(+k.toFixed(3));
  let riposo = -1e9; const pp = geometria.attributes.position.array;
  for(let j = 1; j < pp.length; j += 3) riposo = Math.max(riposo, pp[j]);
  return {
    info, geometria, V, altezze, riposo: +riposo.toFixed(3),
    gesto: !!gesto, corsa: !!corsa,
    materiali: materiali.map(m => conPose(m.clone(), texPos, texNor, V, passo.duration, sosta.duration, {
      baseG: gesto ? BASE_G : PASSO_F, nG: gesto ? GESTO_F : SOSTA_F, durG: gesto ? gesto.duration : sosta.duration,
      baseC: corsa ? BASE_C : 0, nC: corsa ? CORSA_F : PASSO_F, durC: corsa ? corsa.duration : passo.duration,
      // la corsa a passo costante: rate × rapC = velocità / velocità della corsa
      rapC: corsa && velocitaCorsa > 0.5 ? 1.104 / velocitaCorsa : 1
    })),
    ruolo: info.ruolo
  };
}

// il materiale della figura, con le pose lette dalla texture
function conPose(m, texPos, texNor, V, durataPasso, durataSosta, extra){
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      uPose: { value:texPos }, uNorm: { value:texNor }, uOra: ORA,
      uV: { value:V }, uLargo: { value:LARGO },
      uPasso: { value:durataPasso }, uSosta: { value:durataSosta },
      uBaseG: { value:extra.baseG }, uNG: { value:extra.nG }, uDurG: { value:extra.durG },
      uBaseC: { value:extra.baseC }, uNC: { value:extra.nC }, uDurC: { value:extra.durC }, uRapC: { value:extra.rapC }
    });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
uniform sampler2D uPose; uniform sampler2D uNorm; uniform float uOra;
uniform float uV; uniform float uLargo; uniform float uPasso; uniform float uSosta;
uniform float uBaseG; uniform float uNG; uniform float uDurG;
uniform float uBaseC; uniform float uNC; uniform float uDurC; uniform float uRapC;
attribute float instancePhase; attribute float instanceRate; attribute float instanceWalkBlend;
attribute float instanceGesto; attribute float instanceCorsa;
vec4 leggi(sampler2D t, float f){
  float i = f * uV + float(gl_VertexID);
  return texelFetch(t, ivec2(int(mod(i, uLargo)), int(floor(i / uLargo))), 0);
}
vec3 posa(sampler2D t, float f0, float n, float base){
  float f = mod(f0, n), a = floor(f), b = mod(a + 1.0, n);
  return mix(leggi(t, base + a).xyz, leggi(t, base + b).xyz, f - a);
}
vec3 figura(sampler2D t){
  vec3 cammina, ferma;
  if(instanceCorsa > 0.5){
    float fc = (uOra * instanceRate * uRapC / uDurC + instancePhase) * uNC;
    cammina = posa(t, fc, uNC, uBaseC);
  } else {
    float fp = (uOra * instanceRate / uPasso + instancePhase) * ${PASSO_F}.0;
    cammina = posa(t, fp, ${PASSO_F}.0, 0.0);
  }
  if(instanceGesto > 0.5){
    float fg = (uOra / uDurG + instancePhase) * uNG;
    ferma = posa(t, fg, uNG, uBaseG);
  } else {
    float fs = (uOra / uSosta + instancePhase) * ${SOSTA_F}.0;
    ferma = posa(t, fs, ${SOSTA_F}.0, ${PASSO_F}.0);
  }
  return mix(ferma, cammina, instanceWalkBlend);
}`);
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
      'vec3 objectNormal = normalize(figura(uNorm) * 2.0 - 1.0);');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = figura(uPose);');
  };
  m.customProgramCacheKey = () => 'pompei-figura-vat-v2';
  return m;
}

// le figure di una variante, tutte in un colpo
export function mescolaFigure(variante, quante){
  const g = variante.geometria.clone();
  g.setAttribute('instancePhase', new InstancedBufferAttribute(new Float32Array(quante), 1));
  g.setAttribute('instanceRate', new InstancedBufferAttribute(new Float32Array(quante), 1));
  const blend = new InstancedBufferAttribute(new Float32Array(quante), 1);
  blend.setUsage(DynamicDrawUsage);
  g.setAttribute('instanceWalkBlend', blend);
  // chi fa il gesto (al bancone, alla fontana) e chi corre (la fuga): 0 o 1
  g.setAttribute('instanceGesto', new InstancedBufferAttribute(new Float32Array(quante), 1));
  g.setAttribute('instanceCorsa', new InstancedBufferAttribute(new Float32Array(quante), 1));
  const mesh = new InstancedMesh(g, variante.materiali, Math.max(1, quante));
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = 'figure-' + variante.info.file;
  return mesh;
}

