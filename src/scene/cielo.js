/* =====================================================================
   IL CIELO

   Una cupola attorno a chi guarda, al posto dello sfondo a gradiente
   piatto: i due colori di prima (zenit e orizzonte, da paintSky in app.js),
   più quello che un gradiente sullo schermo non sa fare:
   · il sole nella sua direzione vera, con il bagliore attorno;
   · nuvole sparse che passano piano, rade nella bella stagione [disegno];
   · di notte le stelle, fisse sulla cupola [disegno: non è una mappa].

   All'orizzonte, a sud e a sud-est, il profilo dei Monti Lattari, la
   penisola sorrentina che da Pompei chiude la pianura: l'esistenza e la
   direzione sono geografia, la forma è [disegno], come il Vesuvio.

   Niente texture: tutto nello shader, così il file resta autosufficiente.
   ===================================================================== */
import {
  BackSide, BufferAttribute, BufferGeometry, Color, Mesh, MeshLambertMaterial,
  ShaderMaterial, SphereGeometry, Vector3
} from 'three';

const VERT = `
varying vec3 vDir;
void main(){
  vDir = normalize( position );
  vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position = p.xyww;                 // sempre sul fondo della profondità
}`;

const FRAG = `
uniform vec3 uZenit, uOrizzonte, uSole, uSoleCol, uNebbia;
uniform float uNotte, uTempo, uNuvole;
varying vec3 vDir;
float hash( vec2 p ){ return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float noise( vec2 p ){
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), u.x ),
              mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float fbm( vec2 p ){
  float v = 0.0, a = 0.5;
  for( int i = 0; i < 5; i++ ){ v += a * noise( p ); p = p * 2.03 + vec2( 17.0, 9.0 ); a *= 0.5; }
  return v;
}
void main(){
  vec3 d = normalize( vDir );
  float h = d.y;
  // il gradiente di prima, ma per altezza sulla cupola invece che sullo schermo
  vec3 col = mix( uOrizzonte, uZenit, pow( clamp( h, 0.0, 1.0 ), 0.55 ) );
  if( h < 0.0 ) col = uOrizzonte;
  // il sole e il suo bagliore; più largo e caldo quando è basso
  float mu = max( dot( d, uSole ), 0.0 );
  float basso = 1.0 - clamp( uSole.y * 3.0, 0.0, 1.0 );
  // il disco: mezzo grado di diametro, come il vero, con il bordo sfumato
  float disco = smoothstep( 0.99994, 0.99998, mu );
  col += uSoleCol * ( disco * 5.0 + pow( mu, 2400.0 ) * 0.6 + pow( mu, 18.0 ) * ( 0.18 + 0.35 * basso ) ) * ( 1.0 - uNotte );
  // le nuvole: rumore proiettato su un piano alto, sfumato verso l'orizzonte
  if( h > 0.0 ){
    vec2 uv = d.xz / ( h + 0.15 ) * 1.6 + vec2( uTempo * 0.004, uTempo * 0.0015 );
    float n = fbm( uv );
    float c = smoothstep( 1.0 - uNuvole, 1.0 - uNuvole + 0.28, n ) * smoothstep( 0.0, 0.18, h );
    float luce = 0.55 + 0.45 * mu + 0.25 * ( fbm( uv + 0.35 ) - 0.5 );
    vec3 nube = mix( uOrizzonte * 0.9, vec3( 1.0, 0.98, 0.95 ), luce ) * ( 1.0 - 0.82 * uNotte );
    nube += uSoleCol * pow( mu, 6.0 ) * 0.35 * basso * ( 1.0 - uNotte );
    col = mix( col, nube, c * 0.85 );
    // le stelle, dove il cielo è sereno
    vec2 g = d.xz / ( h + 0.25 ) * 140.0;
    vec2 cella = floor( g );
    float s = hash( cella );
    float stella = step( 0.985, s ) * smoothstep( 0.35, 0.0, length( fract( g ) - 0.5 ) );
    col += vec3( stella * ( 0.6 + 0.4 * hash( cella + 3.1 ) ) ) * uNotte * ( 1.0 - c ) * smoothstep( 0.05, 0.3, h );
  }
  // sotto e appena sopra l'orizzonte il colore della nebbia della scena:
  // così il piano lontano e il cielo si saldano senza una striscia chiara
  col = mix( uNebbia, col, smoothstep( -0.01, 0.07, h ) );
  gl_FragColor = vec4( col, 1.0 );
  #include <colorspace_fragment>
}`;

export function creaCielo(){
  const uni = {
    uZenit: { value: new Color(0x4e76a3) }, uOrizzonte: { value: new Color(0xd6d2c3) },
    uSole: { value: new Vector3(0, 1, 0) }, uSoleCol: { value: new Color(0xfff0d8) },
    uNotte: { value: 0 }, uTempo: { value: 0 }, uNuvole: { value: 0.32 }, uNebbia: { value: new Color() }
  };
  const mat = new ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG,
    side: BackSide, depthWrite: false, fog: false });
  const cupola = new Mesh(new SphereGeometry(1000, 48, 24), mat);
  cupola.frustumCulled = false;
  cupola.renderOrder = -10;
  return {
    mesh: cupola, uni,
    // colori in sRGB 0–255, come li calcola paintSky
    colori(hi, lo){
      uni.uZenit.value.setRGB(hi[0]/255, hi[1]/255, hi[2]/255, 'srgb');
      uni.uOrizzonte.value.setRGB(lo[0]/255, lo[1]/255, lo[2]/255, 'srgb');
    },
    sole(el, az){
      const ce = Math.cos(el);
      uni.uSole.value.set(ce * Math.sin(az), Math.sin(el), -ce * Math.cos(az)).normalize();
      // di notte le stelle, al tramonto il passaggio [disegno]
      const deg = el * 180 / Math.PI;
      uni.uNotte.value = Math.min(1, Math.max(0, (-deg - 1) / 9));
    },
    segui(camera, t){ cupola.position.copy(camera.position); uni.uTempo.value = t; }
  };
}

/* I Monti Lattari: una fascia di creste lontane, fra sud-ovest e est
   (in scena: verso +z), a 900 unità (3,6 km: più vicini del vero, perché
   la nebbia e il piano lontano li lascino leggere), alta fino a 70 unità.
   Profilo da somme di seni, sempre lo stesso [disegno]. */
export function creaMonti(colore){
  const R = 900, N = 160, pos = [], idx = [];
  const a0 = Math.PI * 0.08, a1 = Math.PI * 0.92;       // da est a ovest passando per sud
  for(let i = 0; i <= N; i++){
    const a = a0 + (a1 - a0) * i / N;
    const t = i / N;
    const forma = Math.sin(Math.PI * t);                  // le code si abbassano verso il piano
    const h = 70 * Math.pow(forma, 0.6) * (0.62 + 0.22 * Math.sin(a * 9.0 + 1.3) + 0.1 * Math.sin(a * 23.0) + 0.06 * Math.sin(a * 51.0));
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    pos.push(x, -60, z, x, Math.max(0, h), z);
    if(i < N){ const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new Mesh(g, new MeshLambertMaterial({ color: colore, side: 2 }));
  m.frustumCulled = false;
  return m;
}
