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

const WALK = { value:0 };
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
    return { a:street.a, b:street.b, length:Math.hypot(dx,dz), dx, dz, width:street.w || 2.2, index };
  }).filter(r => r.length > 1);
}

function makeAgents(count, species, routes, random, flow){
  if(!routes.length || count<=0) return [];
  const weights=routes.map(r=>r.length), total=weights.reduce((a,b)=>a+b,0);
  return Array.from({length:count},(_,index)=>{
    let pick=random()*total, route=routes[0];
    for(let i=0;i<routes.length;i++){
      pick-=weights[i];
      if(pick<=0){ route=routes[i]; break; }
    }
    const initialDistance=random()*route.length*(flow==='out'?1:2);
    const speed=species==='people' ? 0.86+random()*0.52 :
      species==='dogs' ? 0.65+random()*0.90 : 2.2+random()*1.8;
    const stride=species==='people' ? 0.72 : species==='dogs' ? 0.50 : 0.46;
    // Le soste sono regia scenica, non tempi storici misurati; nell'eruzione
    // il flusso in uscita resta continuo.
    const pauseChance=flow==='out' || species==='birds' ? 0 : species==='dogs' ? 0.38 : 0.22;
    const idle=random()<pauseChance;
    const pauseDuration=2.0+random()*4.5;
    const walkDuration=species==='dogs' ? 4+random()*10 : 7+random()*22;
    return {
      route, speed,
      strideFrequency:species==='birds' ? 27+random()*8 : speed/stride*Math.PI*2,
      phase:random()*Math.PI*2,
      distance:initialDistance,
      initialDistance,
      exited:false,
      scale:species==='people' ? 0.92+random()*0.16 : species==='dogs' ? 0.88+random()*0.24 : 0.86+random()*0.28,
      offset:species==='birds' ? 1.0+random()*1.8 : 0,
      laneOffset:(random()-0.5)*Math.min(route.width*0.36,0.9),
      pauseChance, idle, pauseDuration, walkDuration,
      stateRemaining:random()*(idle ? pauseDuration : walkDuration),
      walkBlend:idle ? 0 : 1,
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

function updateMesh(mesh, agents, count, delta, flow){
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
    const reverse=flow!=='out' && actor.distance>route.length;
    const d=reverse ? cycle-actor.distance : actor.distance;
    const t=route.length ? d/route.length : 0;
    const direction=reverse ? -1 : 1;
    TEMP.position.set(
      route.a[0]+route.dx*t-route.dz/route.length*actor.laneOffset,
      actor.offset+(actor.hover ? Math.abs(Math.sin(WALK.value*3.2+actor.phase))*0.018 : 0),
      route.a[1]+route.dz*t+route.dx/route.length*actor.laneOffset
    );
    TEMP.rotation.set(0,Math.atan2(-direction*route.dx,-direction*route.dz),0);
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
    const people=makeAgents(profile.people,'people',routes,random,profile.flow);
    const dogs=makeAgents(profile.dogs,'dogs',routes,random,profile.flow);
    const birds=makeAgents(profile.pigeons,'birds',routes,random,profile.flow);
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
    setDensity(value){
      this.density=Math.max(0,Math.min(1,value));
    },
    update(time,delta){
      if(!group.visible) return;
      WALK.value=time;
      const active=populationGroups[this.epoch];
      if(!active || !active.group.visible) return;
      const count=(agents)=>Math.floor(agents.length*this.density);
      updateMesh(active.human,active.people,count(active.people),delta,active.profile.flow);
      updateMesh(active.dogMesh,active.dogs,count(active.dogs),delta,active.profile.flow);
      updateMesh(active.birdMesh,active.birds,count(active.birds),delta,active.profile.flow);
    }
  };
}
