import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { POPULATIONS } from '../data/populations.js';
import { PLACES } from '../data/places.js';
import { mescolaFigure, ORA } from './figure.js';

const WALK = { value:0 };
// Figure, passi e velocità qui sotto sono scritti in metri; il modello misura
// in unità da 4 m (l'occhio di chi cammina sta a 0,45 = 1,8 m). Fino all'8
// ottobre 2026 la conversione mancava: gli abitanti erano alti 6,75 m e
// camminavano a 3,4–5,5 m/s. Ogni misura in metri passa da qui.
const METRO = 0.25;
const COLORS = {
  skin:0xb88763, hair:0x392b22, sandals:0x514436,
  trousers:0x6f6255, sleeve:0x88735d, bird:0x737a77,
  beak:0x997848, wing:0x4e5958, dog:0x8b6546
};
const SHAPES = {
  sphere: new SphereGeometry(1, 8, 6),
  cylinder: new CylinderGeometry(1, 1, 1, 7),
  cone: new ConeGeometry(1, 1, 6),
  box: new BoxGeometry(1, 1, 1)
};
const TEMP = new Object3D();
const MODEL = new Matrix4();

function rgb(hex){
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

function piece(geometry, position, scale, color, swing=0, pivot=[0,0,0], axis=[1,0,0]){
  const result = geometry.toNonIndexed();
  result.deleteAttribute('uv');
  MODEL.compose(
    new Vector3(position[0],position[1],position[2]),
    TEMP.quaternion.set(0,0,0,1),
    new Vector3(scale[0],scale[1],scale[2])
  );
  result.applyMatrix4(MODEL);
  const count = result.attributes.position.count;
  const c = rgb(color), colors = new Float32Array(count*3);
  const pivots = new Float32Array(count*3), axes = new Float32Array(count*3);
  const swings = new Float32Array(count);
  for(let i=0;i<count;i++){
    colors[i*3]=c[0]; colors[i*3+1]=c[1]; colors[i*3+2]=c[2];
    pivots[i*3]=pivot[0]; pivots[i*3+1]=pivot[1]; pivots[i*3+2]=pivot[2];
    axes[i*3]=axis[0]; axes[i*3+1]=axis[1]; axes[i*3+2]=axis[2];
    swings[i]=swing;
  }
  result.setAttribute('color', new BufferAttribute(colors,3));
  result.setAttribute('aPivot', new BufferAttribute(pivots,3));
  result.setAttribute('aAxis', new BufferAttribute(axes,3));
  result.setAttribute('aSwing', new BufferAttribute(swings,1));
  return result;
}

function merge(pieces){
  const geometry = mergeGeometries(pieces, false);
  pieces.forEach(g => g.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}

function humanGeometry(style, clothing){
  const parts = [];
  const longCoat = style==='cloak' || style==='coat';
  const modern = style==='modern';
  const hem = modern ? 0.76 : (longCoat ? 0.28 : 0.52);
  const height = 1.40-hem;
  const tunic = style==='work' ? 0x887254 : clothing;
  parts.push(piece(new CylinderGeometry(0.19,0.26,height,10), [0,(1.40+hem)/2,0], [1,1,1], tunic));
  parts.push(piece(new CylinderGeometry(0.045,0.052,0.10,8), [0,1.39,0], [1,1,1], COLORS.skin));
  parts.push(piece(SHAPES.sphere, [0,1.555,0], [0.088,0.118,0.086], COLORS.skin));
  parts.push(piece(SHAPES.sphere, [0,1.63,0.003], [0.091,0.058,0.089], COLORS.hair));
  if(modern){
    parts.push(piece(SHAPES.sphere, [0,1.687,0], [0.108,0.027,0.103], 0xb6a17c));
  }
  for(const side of [-1,1]){
    const hip=side*0.105;
    const legPivot=[hip,0.89,0];
    parts.push(piece(new CylinderGeometry(0.064,0.049,0.85,8), [hip,0.45,0], [1,1,1], modern ? COLORS.trousers : COLORS.skin, side, legPivot));
    parts.push(piece(SHAPES.box, [hip,0.036,0.045], [0.12,0.055,0.24], COLORS.sandals));
    const armPivot=[side*0.22,1.36,0];
    parts.push(piece(new CylinderGeometry(0.054,0.066,0.47,8), [side*0.265,1.11,0], [1,1,1], COLORS.sleeve, -side*0.72, armPivot));
    parts.push(piece(SHAPES.sphere, [side*0.28,0.84,0], [0.052,0.06,0.05], COLORS.skin));
  }
  return merge(parts);
}

function dogGeometry(){
  const parts=[
    piece(SHAPES.sphere,[0,0.34,0.025],[0.14,0.115,0.25],COLORS.dog),
    piece(SHAPES.sphere,[0,0.39,-0.205],[0.092,0.092,0.105],COLORS.dog),
    piece(SHAPES.sphere,[0,0.345,-0.295],[0.067,0.046,0.09],0xb59a79),
    piece(SHAPES.sphere,[-0.057,0.438,-0.225],[0.028,0.052,0.04],COLORS.dog),
    piece(SHAPES.sphere,[0.057,0.438,-0.225],[0.028,0.052,0.04],COLORS.dog)
  ];
  for(const x of [-0.082,0.082]) for(const z of [-0.145,0.165]){
    const side = x<0 ? -1 : 1;
    const gait = side*(z<0 ? -1 : 1)*0.8;
    parts.push(piece(new CylinderGeometry(0.034,0.027,0.29,6),[x,0.15,z],[1,1,1],COLORS.dog,gait,[x,0.285,z]));
  }
  parts.push(piece(SHAPES.cone,[0,0.43,0.235],[0.035,0.14,0.035],COLORS.dog,0.3,[0,0.38,0.20]));
  return merge(parts);
}

function pigeonGeometry(){
  const beak = new ConeGeometry(0.012,0.034,5);
  beak.rotateX(-Math.PI/2);
  const parts=[
    piece(SHAPES.sphere,[0,0.09,0],[0.06,0.07,0.115],COLORS.bird),
    piece(SHAPES.sphere,[0,0.14,-0.105],[0.042,0.043,0.045],COLORS.bird),
    piece(beak,[0,0.135,-0.15],[1,1,1],COLORS.beak)
  ];
  for(const side of [-1,1])
    parts.push(piece(SHAPES.sphere,[side*0.09,0.105,0],[0.14,0.018,0.115],COLORS.wing,side*1.2,[side*0.035,0.11,0],[0,0,1]));
  return merge(parts);
}

function animatedMaterial(color=0xffffff){
  const material = new MeshStandardMaterial({
    color, vertexColors:true, roughness:0.91, metalness:0,
    onBeforeCompile(shader){
      shader.uniforms.uWalkTime = WALK;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nattribute vec3 aPivot;\nattribute vec3 aAxis;\nattribute float aSwing;\nattribute float instancePhase;\nattribute float instanceStrideFrequency;\nattribute float instanceWalkBlend;\nuniform float uWalkTime;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat walkAngle = sin(uWalkTime * instanceStrideFrequency + instancePhase) * aSwing * 0.42 * instanceWalkBlend;\nvec3 walkAxis = normalize(aAxis);\nvec3 walkLocal = transformed - aPivot;\nfloat walkC = cos(walkAngle);\nfloat walkS = sin(walkAngle);\ntransformed = aPivot + walkLocal * walkC + cross(walkAxis, walkLocal) * walkS + walkAxis * dot(walkAxis, walkLocal) * (1.0 - walkC);'
      );
    }
  });
  material.customProgramCacheKey = () => 'pompeii-crowd-gait-v3';
  return material;
}

const HUMAN_MATERIAL = animatedMaterial();
const DOG_MATERIAL = animatedMaterial();
const BIRD_MATERIAL = animatedMaterial();

function seeded(seed){
  let state = seed >>> 0;
  return () => (state = (state*1664525 + 1013904223) >>> 0) / 4294967296;
}

function routeTable(streets){
  return (streets || []).filter(s => s.a && s.b).map((street,index) => {
    const dx=street.b[0]-street.a[0], dz=street.b[1]-street.a[1];
    return { a:street.a, b:street.b, length:Math.hypot(dx,dz), dx, dz, width:street.w || 2.2,
             marciapiede:street.mw || 0.25, cordolo:street.hh || 0, index };
  }).filter(r => r.length > 1);
}

const ACTIVITY_PLACE_IDS = new Set([
  'casa-giardino','foro','anfiteatro','palestra','horrea','mosaici',
  'quadriportico','basilica','canale','porta-ercolano','giulia-felice'
]);
function activitySites(epoch, routes){
  if(!routes.length) return [];
  return PLACES.filter(p => ACTIVITY_PLACE_IDS.has(p.id) && p.from<=epoch && p.to>=epoch)
    .map(place => {
      let best=null;
      for(const route of routes){
        const t=Math.max(0,Math.min(1,
          ((place.x-route.a[0])*route.dx+(place.z-route.a[1])*route.dz)/(route.length*route.length)));
        const x=route.a[0]+route.dx*t, z=route.a[1]+route.dz*t;
        const distanceSquared=(place.x-x)**2+(place.z-z)**2;
        if(!best || distanceSquared<best.distanceSquared)
          best={placeId:place.id,route,distance:t*route.length,distanceSquared};
      }
      return best;
    })
    .filter(site => site && site.distanceSquared<=18*18);
}

function makeAgents(count, species, routes, random, flow, sites=[]){
  if(!routes.length || count<=0) return [];
  const weights=routes.map(r=>r.length), total=weights.reduce((a,b)=>a+b,0);
  return Array.from({length:count},(_,index)=>{
    const siteChance=flow==='out' || species==='birds' ? 0 : species==='dogs' ? 0.16 : 0.12;
    const site=sites.length && random()<siteChance ? sites[Math.floor(random()*sites.length)] : null;
    let route=site?.route;
    if(!route){
      let pick=random()*total;
      route=routes[0];
      for(let i=0;i<routes.length;i++){
        pick-=weights[i];
        if(pick<=0){ route=routes[i]; break; }
      }
    }
    const wanderRadius=site ? 3.5+random()*5.5 : 0;
    const lowDistance=site ? Math.max(0,site.distance-wanderRadius) : 0;
    const highDistance=site ? Math.min(route.length,site.distance+wanderRadius) : route.length;
    const initialDistance=site
      ? Math.max(lowDistance,Math.min(highDistance,site.distance+(random()-0.5)*wanderRadius))
      : random()*route.length*(flow==='out'?1:2);
    // metri al secondo: chi passeggia va a 0,9–1,4 m/s
    const speedMetres=species==='people' ? 0.86+random()*0.52 :
      species==='dogs' ? 0.65+random()*0.90 : 2.2+random()*1.8;
    const speed=speedMetres*METRO;
    const stride=species==='people' ? 0.72 : species==='dogs' ? 0.50 : 0.46;
    // Le soste sono regia scenica, non tempi storici misurati; nell'eruzione
    // il flusso in uscita resta continuo.
    const pauseChance=flow==='out' || species==='birds' ? 0 : species==='dogs' ? 0.38 : 0.22;
    const idle=!!site || random()<pauseChance;
    const pauseDuration=site ? 8+random()*14 : 2.0+random()*4.5;
    const walkDuration=site ? 6+random()*14 : species==='dogs' ? 4+random()*10 : 7+random()*22;
    return {
      route, speed, speedMetres,
      strideFrequency:species==='birds' ? 27+random()*8 : speedMetres/stride*Math.PI*2,
      phase:random()*Math.PI*2,
      distance:initialDistance,
      initialDistance,
      exited:false,
      scale:METRO*(species==='people' ? 0.92+random()*0.16 : species==='dogs' ? 0.88+random()*0.24 : 0.86+random()*0.28),
      offset:species==='birds' ? METRO*(1.0+random()*1.8) : 0,
      // le persone sui marciapiedi, un lato o l'altro; cani e piccioni in
      // carreggiata, al livello del basolato
      inStrada:species!=='people',
      laneOffset:species==='people'
        ? (random()<0.5 ? -1 : 1)*(route.width/2 + route.marciapiede*(0.3+random()*0.4))
        : (random()-0.5)*route.width*0.7,
      pauseChance, idle, pauseDuration, walkDuration,
      stateRemaining:idle && site ? pauseDuration : random()*(idle ? pauseDuration : walkDuration),
      walkBlend:idle ? 0 : 1,
      activityPlace:site?.placeId || null,
      activityRange:site ? { low:lowDistance, high:highDistance } : null,
      hover:species==='birds',
      index
    };
  });
}

function populationMesh(geometry, material, agents, name){
  const model = geometry.clone();
  const phases = new Float32Array(agents.length);
  const strideFrequencies = new Float32Array(agents.length);
  const walkBlends = new Float32Array(agents.length);
  agents.forEach((actor,i) => {
    phases[i]=actor.phase;
    strideFrequencies[i]=actor.strideFrequency;
    walkBlends[i]=actor.walkBlend;
  });
  model.setAttribute('instancePhase', new InstancedBufferAttribute(phases,1));
  model.setAttribute('instanceStrideFrequency', new InstancedBufferAttribute(strideFrequencies,1));
  const walkBlendAttribute = new InstancedBufferAttribute(walkBlends,1);
  walkBlendAttribute.setUsage(DynamicDrawUsage);
  model.setAttribute('instanceWalkBlend', walkBlendAttribute);
  const mesh = new InstancedMesh(model,material,Math.max(1,agents.length));
  mesh.name=name;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.castShadow=false;
  mesh.receiveShadow=false;
  mesh.frustumCulled=false;
  mesh.count=agents.length;
  return mesh;
}

function updateMesh(mesh, agents, count, delta, flow, suolo=0){
  mesh.count=count;
  const walkBlends=mesh.geometry.getAttribute('instanceWalkBlend');
  let walkBlendDirty=false;
  for(let i=0;i<count;i++){
    const actor=agents[i], route=actor.route;
    if(flow==='out' && actor.exited){
      TEMP.position.set(route.b[0],actor.offset,route.b[1]);
      TEMP.rotation.set(0,0,0);
      TEMP.scale.setScalar(0);
      TEMP.updateMatrix();
      mesh.setMatrixAt(i,TEMP.matrix);
      continue;
    }
    if(actor.pauseChance>0 && flow!=='out'){
      actor.stateRemaining-=delta;
      if(actor.stateRemaining<=0){
        actor.idle=!actor.idle;
        actor.stateRemaining=actor.idle ? actor.pauseDuration : actor.walkDuration;
      }
      const target=actor.idle ? 0 : 1;
      const blend=actor.walkBlend+(target-actor.walkBlend)*Math.min(1,delta*3.5);
      if(Math.abs(blend-actor.walkBlend)>0.001){
        actor.walkBlend=blend;
        walkBlends.array[i]=blend;
        walkBlendDirty=true;
      }
    }
    const cycle=flow==='out' ? route.length : route.length*2;
    actor.distance+=actor.speed*delta*actor.walkBlend;
    if(flow==='out' && actor.distance>=route.length){
      actor.exited=true;
      TEMP.position.set(route.b[0],actor.offset,route.b[1]);
      TEMP.rotation.set(0,0,0);
      TEMP.scale.setScalar(0);
      TEMP.updateMatrix();
      mesh.setMatrixAt(i,TEMP.matrix);
      continue;
    }
    actor.distance%=cycle;
    let reverse=flow!=='out' && actor.distance>route.length;
    let d=reverse ? cycle-actor.distance : actor.distance;
    if(actor.activityRange && flow!=='out'){
      const {low,high}=actor.activityRange;
      if(!reverse && d>=high){ actor.distance=cycle-high; reverse=true; d=high; }
      else if(reverse && d<=low){ actor.distance=low; reverse=false; d=low; }
    }
    const t=route.length ? d/route.length : 0;
    const direction=reverse ? -1 : 1;
    TEMP.position.set(
      route.a[0]+route.dx*t-route.dz/route.length*actor.laneOffset,
      (actor.inStrada ? Math.max(-route.cordolo, suolo) : Math.max(0, suolo))+actor.offset+(actor.hover ? Math.abs(Math.sin(WALK.value*3.2+actor.phase))*0.018*METRO : 0),
      route.a[1]+route.dz*t+route.dx/route.length*actor.laneOffset
    );
    // i manichini guardano verso −Z, le figure di Blender verso +Z: per
    // loro mezzo giro in più, o camminerebbero all'indietro (misurato)
    TEMP.rotation.set(0,Math.atan2(-direction*route.dx,-direction*route.dz)+(mesh.userData.fronte||0),0);
    TEMP.scale.setScalar(actor.scale);
    TEMP.updateMatrix();
    mesh.setMatrixAt(i,TEMP.matrix);
  }
  if(count) mesh.instanceMatrix.needsUpdate=true;
  if(walkBlendDirty) walkBlends.needsUpdate=true;
}

export function createInhabitants({ streets=[] }={}){
  const group = new Group();
  group.name='popolazioni-per-epoca';
  const routes=routeTable(streets), entries=[];
  const geometries=new Map();
  const sharedDog=dogGeometry(), sharedBird=pigeonGeometry();
  const populationGroups=[];

  for(const profile of POPULATIONS){
    const random=seeded(0x51f15e + profile.epoch*997);
    const sites=activitySites(profile.epoch,routes);
    const people=makeAgents(profile.people,'people',routes,random,profile.flow,sites);
    const dogs=makeAgents(profile.dogs,'dogs',routes,random,profile.flow,sites);
    const birds=makeAgents(profile.pigeons,'birds',routes,random,profile.flow,sites);
    const epochGroup=new Group();
    epochGroup.name=profile.name;
    epochGroup.visible=profile.epoch===0;
    const key=profile.style+':'+profile.cloth;
    if(!geometries.has(key)) geometries.set(key,humanGeometry(profile.style,profile.cloth));
    const human=populationMesh(geometries.get(key),HUMAN_MATERIAL,people,'persone-'+profile.name);
    const dogMesh=populationMesh(sharedDog,DOG_MATERIAL,dogs,'cani-'+profile.name);
    const birdMesh=populationMesh(sharedBird,BIRD_MATERIAL,birds,'piccioni-'+profile.name);
    epochGroup.add(human,dogMesh,birdMesh);
    group.add(epochGroup);
    populationGroups.push({ profile, group:epochGroup, people, dogs, birds, human, dogMesh, birdMesh });
  }
  return {
    group,
    epoch:0,
    density:1,
    setEpoch(index){
      this.epoch=index;
      populationGroups.forEach(item => {
        item.group.visible=item.profile.epoch===index;
        if(item.group.visible && item.profile.flow==='out'){
          for(const actors of [item.people,item.dogs,item.birds])
            actors.forEach(actor => {
              actor.exited=false;
              actor.distance=actor.initialDistance;
            });
        }
      });
    },
    // Le figure di Blender prendono il posto dei manichini nelle fasi in cui
    // l'abito è documentato: il 79, l'eruzione e i recuperi del I–III secolo,
    // che vestono allo stesso modo, e oggi. Ai recuperi lavorano uomini: niente donne
    // né cittadini col pallio [scelta di regia]. Le altre fasi tengono i
    // manichini finché le loro vesti non hanno una fonte, e la differenza si
    // vede: è la regola del progetto, realismo solo dove è documentato.
    usaFigure(fig){
      // fase → serie di figure, e se serve quali ruoli. La fase 8 è oggi:
      // turisti, archeologi e operai (strumenti/blender/figure_oggi.py)
      const FASI = {
        0:{ serie:'romane' }, 1:{ serie:'romane' },
        2:{ serie:'romane', ruoli:['popolano','servo','ragazzo'] },
        7:{ serie:'oggi' }
      };
      for(const item of populationGroups){
        if(!(item.profile.epoch in FASI)) continue;
        const { serie, ruoli } = FASI[item.profile.epoch];
        const varianti = fig.varianti.filter(v => v.serie === serie && (!ruoli || ruoli.includes(v.ruolo)));
        if(!varianti.length) continue;
        const random = seeded(0xf16 + item.profile.epoch*31);
        const gruppi = varianti.map(() => []);
        item.people.forEach(a => gruppi[Math.floor(random()*varianti.length)].push(a));
        item.figure = varianti.map((v,i) => {
          const agents = gruppi[i];
          const mesh = mescolaFigure(v, agents.length);
          mesh.userData.fronte = Math.PI;
          const g = mesh.geometry;
          agents.forEach((a,j) => {
            g.getAttribute('instancePhase').array[j] = a.phase/(Math.PI*2);
            // il passo registrato va a 1,1 m/s: lo si accelera o rallenta
            // con la persona, così i piedi non scivolano
            g.getAttribute('instanceRate').array[j] = a.speedMetres/fig.velocitaPasso;
            g.getAttribute('instanceWalkBlend').array[j] = a.walkBlend;
          });
          item.group.add(mesh);
          return { mesh, agents };
        }).filter(x => x.agents.length);
        item.human.visible = false;
      }
    },
    setDensity(value){
      this.density=Math.max(0,Math.min(1,value));
    },
    update(time,delta,suolo=0){
      if(!group.visible) return;
      WALK.value=time;
      const active=populationGroups[this.epoch];
      if(!active || !active.group.visible) return;
      const count=(agents)=>Math.floor(agents.length*this.density);
      ORA.value=time;
      if(active.figure)
        for(const part of active.figure) updateMesh(part.mesh,part.agents,count(part.agents),delta,active.profile.flow,suolo);
      else updateMesh(active.human,active.people,count(active.people),delta,active.profile.flow,suolo);
      updateMesh(active.dogMesh,active.dogs,count(active.dogs),delta,active.profile.flow,suolo);
      updateMesh(active.birdMesh,active.birds,count(active.birds),delta,active.profile.flow,suolo);
    }
  };
}
