import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry
} from 'three';

// Forme leggere, scalate sulla scena (1 unità = 4 m). I corpi restano
// volutamente sobri: colori e abiti sono una ricostruzione interpretativa.
const SPHERE = new SphereGeometry(1, 10, 8);
const LIMB = new CylinderGeometry(0.72, 1, 1, 8);
const TUNIC = new CylinderGeometry(0.72, 1, 1, 10);
const BEAK = new ConeGeometry(1, 1, 5);

const MAT = {
  skin: new MeshStandardMaterial({ color:0xb88763, roughness:0.88 }),
  hair: new MeshStandardMaterial({ color:0x392b22, roughness:0.94 }),
  cloth: [
    0xc8b48d, 0x9d624b, 0x76817a, 0xb28b4d, 0xaaa397, 0x596b72
  ].map(color => new MeshStandardMaterial({ color, roughness:0.96 })),
  sandal: new MeshStandardMaterial({ color:0x584536, roughness:0.92 }),
  dog: [0x8b6546, 0x4f443b, 0xc1ad8e].map(color => new MeshStandardMaterial({ color, roughness:0.94 })),
  pigeon: new MeshStandardMaterial({ color:0x737a77, roughness:0.88 }),
  wing: new MeshStandardMaterial({ color:0x4e5958, roughness:0.9 }),
  beak: new MeshStandardMaterial({ color:0x997848, roughness:0.86 })
};

function part(parent, material, position, scale, geometry=SPHERE){
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function person(clothIndex, phase){
  const root = new Group();
  const body = new Group(); root.add(body);
  const tunic = part(body, MAT.cloth[clothIndex], [0,0.255,0], [0.070,0.205,0.052], TUNIC);
  part(body, MAT.skin, [0,0.405,0], [0.043,0.046,0.040]);
  part(body, MAT.hair, [0,0.434,0.003], [0.044,0.024,0.042]);

  const legs = [], arms = [];
  for(const side of [-1,1]){
    const leg = new Group(); leg.position.set(side*0.030,0.155,0); body.add(leg);
    part(leg, MAT.skin, [0,-0.057,0], [0.014,0.070,0.015], LIMB);
    part(leg, MAT.sandal, [0,-0.126,-0.015], [0.020,0.012,0.034]);
    legs.push(leg);

    const arm = new Group(); arm.position.set(side*0.068,0.329,0); body.add(arm);
    part(arm, MAT.skin, [0,-0.057,0], [0.013,0.069,0.013], LIMB);
    part(arm, MAT.skin, [0,-0.119,-0.002], [0.013,0.016,0.014]);
    arms.push(arm);
  }
  return {
    root,
    updateWalk(time, moving){
      const gait = moving ? Math.sin(time*5.2 + phase) : 0;
      legs[0].rotation.x = gait*0.48;
      legs[1].rotation.x = -gait*0.48;
      arms[0].rotation.x = -gait*0.34;
      arms[1].rotation.x = gait*0.34;
      body.position.y = moving ? Math.max(0,gait)*0.006 : Math.sin(time*1.1+phase)*0.002;
    }
  };
}

function dog(coatIndex, phase){
  const root = new Group();
  const body = new Group(); root.add(body);
  part(body, MAT.dog[coatIndex], [0,0.105,0.005], [0.055,0.046,0.105]);
  part(body, MAT.dog[coatIndex], [0,0.142,-0.092], [0.038,0.038,0.043]);
  part(body, MAT.dog[coatIndex], [0,0.126,-0.123], [0.023,0.018,0.028]);
  const ears = [];
  for(const side of [-1,1]){
    const ear = part(body, MAT.dog[coatIndex], [side*0.027,0.166,-0.099], [0.012,0.026,0.014], BEAK);
    ear.rotation.z = side*0.28;
    ears.push(ear);
  }
  const legs = [];
  for(const x of [-0.035,0.035]) for(const z of [-0.060,0.064]){
    const leg = new Group(); leg.position.set(x,0.092,z); body.add(leg);
    part(leg, MAT.dog[coatIndex], [0,-0.041,0], [0.012,0.052,0.013], LIMB);
    legs.push(leg);
  }
  const tail = new Group(); tail.position.set(0,0.13,0.101); body.add(tail);
  part(tail, MAT.dog[coatIndex], [0,0.012,0.032], [0.012,0.014,0.050]);
  return {
    root,
    updateWalk(time, moving){
      const swing = moving ? Math.sin(time*5.8+phase)*0.42 : Math.sin(time*1.7+phase)*0.10;
      legs.forEach((leg,i) => { leg.rotation.x = swing * ((i===0 || i===3) ? 1 : -1); });
      tail.rotation.x = Math.sin(time*3.2+phase)*0.26;
      body.position.y = moving ? Math.max(0,swing)*0.004 : 0;
    }
  };
}

function pigeon(phase){
  const root = new Group();
  part(root, MAT.pigeon, [0,0.055,0], [0.025,0.019,0.040]);
  part(root, MAT.pigeon, [0,0.071,-0.030], [0.015,0.015,0.016]);
  part(root, MAT.beak, [0,0.067,-0.050], [0.004,0.004,0.012], BEAK).rotation.x = -Math.PI/2;
  const wings = [];
  for(const side of [-1,1]){
    const wing = part(root, MAT.wing, [side*0.019,0.062,0.005], [0.029,0.006,0.031]);
    wings.push({ mesh:wing, side });
  }
  return {
    root,
    updateWalk(time){
      wings.forEach(({mesh,side}) => { mesh.rotation.z = side*(0.10 + Math.sin(time*8+phase)*0.08); });
      root.position.y = 0.002 + Math.abs(Math.sin(time*2+phase))*0.004;
    }
  };
}

function routeLength(route){
  let length = 0;
  for(let i=1;i<route.length;i++) length += Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]);
  return length;
}

function putOnRoute(agent, route, distance){
  const length = routeLength(route);
  const closed = route.length > 2 && route[0][0]===route.at(-1)[0] && route[0][1]===route.at(-1)[1];
  let d, direction = 1;
  if(closed) d = ((distance % length) + length) % length;
  else {
    const cycle = length*2;
    d = ((distance % cycle) + cycle) % cycle;
    if(d > length){ d = cycle-d; direction = -1; }
  }
  for(let i=1;i<route.length;i++){
    const [x0,z0] = route[i-1], [x1,z1] = route[i];
    const segment = Math.hypot(x1-x0,z1-z0);
    if(d <= segment || i===route.length-1){
      const t = segment ? d/segment : 0;
      agent.root.position.x = x0 + (x1-x0)*t;
      agent.root.position.z = z0 + (z1-z0)*t;
      agent.root.rotation.y = Math.atan2(-direction*(x1-x0), -direction*(z1-z0));
      return;
    }
    d -= segment;
  }
}

export function createInhabitants(){
  const group = new Group();
  group.name = 'vita-quotidiana-79';
  group.visible = false;
  const walkers = [];
  const people = [
    { route:[[-72,17],[-72,33]], speed:0.22 },
    { route:[[-67,13],[-57,13]], speed:0.24 },
    { route:[[-41,-30],[-29,-30]], speed:0.19 },
    { route:[[72,22],[72,38]], speed:0.20 },
    { route:[[-21,-49],[-21,-34]], speed:0.18 },
    { route:[[-94,-52],[-82,-52]], speed:0.21 }
  ];
  people.forEach((spec,i) => {
    const actor = person(i%MAT.cloth.length, i*1.71);
    group.add(actor.root);
    walkers.push({ ...actor, ...spec, phase:i*2.2, distance:i*2.7 });
  });

  const dogs = [
    { route:[[-71,19],[-71,29]], speed:0.14 },
    { route:[[-42,-30],[-31,-30]], speed:0.12 },
    { route:[[74,36],[74,48]], speed:0.13 }
  ];
  dogs.forEach((spec,i) => {
    const actor = dog(i, i*2.6);
    group.add(actor.root);
    walkers.push({ ...actor, ...spec, phase:i*2.6, distance:i*3.1 });
  });

  const flocks = [
    { center:[-71,14], radius:1.1 },
    { center:[-35,-30], radius:1.25 },
    { center:[72,30], radius:1.0 }
  ];
  flocks.forEach((flock,f) => {
    for(let i=0;i<3;i++){
      const phase = f*2.4 + i*2.1;
      const actor = pigeon(phase);
      group.add(actor.root);
      const a = phase;
      const route = [0,1,2,3,4].map(k => [
        flock.center[0]+Math.cos(a + k*Math.PI/2)*flock.radius,
        flock.center[1]+Math.sin(a + k*Math.PI/2)*flock.radius
      ]);
      walkers.push({ ...actor, route, speed:0.065, phase, distance:i*0.8 });
    }
  });

  return {
    group,
    update(time, delta){
      if(!group.visible) return;
      for(const actor of walkers){
        actor.distance += actor.speed*delta;
        putOnRoute(actor, actor.route, actor.distance);
        actor.updateWalk(time, actor.speed > 0.08);
      }
    }
  };
}
