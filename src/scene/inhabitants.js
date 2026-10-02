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
  const hem = modern ? 0.135 : (longCoat ? 0.09 : 0.105);
  const height = 0.34-hem;
  const tunic = style==='work' ? 0x887254 : clothing;
  parts.push(piece(new CylinderGeometry(0.055,0.075,height,8), [0,hem+height/2,0], [1,1,1], tunic));
  parts.push(piece(SHAPES.sphere, [0,0.414,0], [0.041,0.046,0.039], COLORS.skin));
  parts.push(piece(SHAPES.sphere, [0,0.439,0.003], [0.043,0.022,0.041], COLORS.hair));
  if(modern){
    parts.push(piece(SHAPES.sphere, [0,0.454,0], [0.050,0.014,0.046], 0xb6a17c));
  }
  for(const side of [-1,1]){
    const legPivot=[side*0.028,0.15,0];
    parts.push(piece(new CylinderGeometry(0.012,0.016,0.12,6), [side*0.028,0.09,0], [1,1,1], modern ? COLORS.trousers : COLORS.skin, side, legPivot));
    parts.push(piece(SHAPES.box, [side*0.028,0.018,-0.009], [0.038,0.018,0.057], COLORS.sandals));
    const armPivot=[side*0.066,0.318,0];
    parts.push(piece(new CylinderGeometry(0.011,0.015,0.112,6), [side*0.069,0.262,0], [1,1,1], COLORS.sleeve, -side*0.72, armPivot));
    parts.push(piece(SHAPES.sphere, [side*0.070,0.201,-0.002], [0.012,0.014,0.013], COLORS.skin));
  }
  return merge(parts);
}

function dogGeometry(){
  const parts=[
    piece(SHAPES.sphere,[0,0.105,0.015],[0.056,0.043,0.10],COLORS.dog),
    piece(SHAPES.sphere,[0,0.143,-0.077],[0.037,0.035,0.039],COLORS.dog),
    piece(SHAPES.sphere,[0,0.129,-0.110],[0.023,0.015,0.026],0xb59a79)
  ];
  for(const x of [-0.034,0.034]) for(const z of [-0.055,0.062]){
    const side = x<0 ? -1 : 1;
    const gait = side*(z<0 ? -1 : 1);
    parts.push(piece(new CylinderGeometry(0.009,0.012,0.065,5),[x,0.057,z],[1,1,1],COLORS.dog,gait,[x,0.086,z]));
  }
  parts.push(piece(SHAPES.cone,[0,0.139,0.111],[0.013,0.048,0.013],COLORS.dog,0.3,[0,0.14,0.09]));
  return merge(parts);
}

function pigeonGeometry(){
  const parts=[
    piece(SHAPES.sphere,[0,0.05,0],[0.026,0.018,0.039],COLORS.bird),
    piece(SHAPES.sphere,[0,0.066,-0.030],[0.015,0.014,0.016],COLORS.bird),
    piece(SHAPES.cone,[0,0.064,-0.050],[0.004,0.012,0.004],COLORS.beak)
  ];
  for(const side of [-1,1])
    parts.push(piece(SHAPES.sphere,[side*0.017,0.055,0.002],[0.025,0.005,0.029],COLORS.wing,side*1.7,[side*0.010,0.056,0.004],[0,0,1]));
  return merge(parts);
}

function animatedMaterial(color=0xffffff){
  const material = new MeshStandardMaterial({
    color, vertexColors:true, roughness:0.91, metalness:0,
    onBeforeCompile(shader){
      shader.uniforms.uWalkTime = WALK;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nattribute vec3 aPivot;\nattribute vec3 aAxis;\nattribute float aSwing;\nattribute float instancePhase;\nuniform float uWalkTime;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat walkAngle = sin(uWalkTime * 5.2 + instancePhase) * aSwing * 0.42;\nvec3 walkAxis = normalize(aAxis);\nvec3 walkLocal = transformed - aPivot;\nfloat walkC = cos(walkAngle);\nfloat walkS = sin(walkAngle);\ntransformed = aPivot + walkLocal * walkC + cross(walkAxis, walkLocal) * walkS + walkAxis * dot(walkAxis, walkLocal) * (1.0 - walkC);'
      );
    }
  });
  material.customProgramCacheKey = () => 'pompeii-crowd-gait-v1';
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
    return { a:street.a, b:street.b, length:Math.hypot(dx,dz), dx, dz, index };
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
    return {
      route, speed:species==='people' ? 0.16+random()*0.15 : 0.20+random()*0.20,
      phase:random()*Math.PI*2,
      distance:initialDistance,
      initialDistance,
      exited:false,
      scale:species==='people' ? 0.88+random()*0.24 : 0.84+random()*0.32,
      offset:0.065,
      hover:species==='birds',
      index
    };
  });
}

function populationMesh(geometry, material, agents, name){
  const model = geometry.clone();
  const phases = new Float32Array(agents.length);
  agents.forEach((actor,i) => { phases[i]=actor.phase; });
  model.setAttribute('instancePhase', new InstancedBufferAttribute(phases,1));
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
    const cycle=flow==='out' ? route.length : route.length*2;
    actor.distance+=actor.speed*delta;
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
      route.a[0]+route.dx*t,
      actor.offset+(actor.hover ? Math.abs(Math.sin(WALK.value*3.2+actor.phase))*0.018 : 0),
      route.a[1]+route.dz*t
    );
    TEMP.rotation.set(0,Math.atan2(-direction*route.dx,-direction*route.dz),0);
    TEMP.scale.setScalar(actor.scale);
    TEMP.updateMatrix();
    mesh.setMatrixAt(i,TEMP.matrix);
  }
  if(count) mesh.instanceMatrix.needsUpdate=true;
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
    const dogs=makeAgents(profile.dogs,'dogs',routes,random);
    const birds=makeAgents(profile.pigeons,'birds',routes,random);
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
        if(item.group.visible && item.profile.flow==='out')
          item.people.forEach(actor => {
            actor.exited=false;
            actor.distance=actor.initialDistance;
          });
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
      updateMesh(active.dogMesh,active.dogs,count(active.dogs),delta);
      updateMesh(active.birdMesh,active.birds,count(active.birds),delta);
    }
  };
}
