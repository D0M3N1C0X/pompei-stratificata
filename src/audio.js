export const AUDIO = (function(){

  let ctx = null, master = null, wet = null, dry = null;
  let ready = false, on = false, epochNow = 0;
  let noiseBuf = null, ksCache = new Map();
  let bedNodes = [];
  let evTimer = null;

  /* ---------------------------------------------------------- utilità */

  function now(){ return ctx.currentTime; }

  function makeNoise(seconds){
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds);
    const b = ctx.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    // rumore bruno: integrazione del bianco, poi normalizzazione
    let last = 0;
    for(let i=0;i<n;i++){
      const w = Math.random()*2 - 1;
      last = (last + 0.02*w) / 1.02;
      d[i] = last * 3.2;
    }
    return b;
  }

  // riverbero a coda esponenziale, generato dal codice
  function makeIR(seconds, decay){
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds);
    const b = ctx.createBuffer(2, n, sr);
    for(let c=0;c<2;c++){
      const d = b.getChannelData(c);
      for(let i=0;i<n;i++){
        const t = i/n;
        d[i] = (Math.random()*2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return b;
  }

  function env(g, t0, a, d, peak, sus, rel, dur){
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0002), t0 + a + d);
    g.gain.setValueAtTime(Math.max(sus, 0.0002), t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
  }

  function noiseSrc(){
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  function rnd(a, b){ return a + Math.random()*(b-a); }

  /* ------------------------------------------------------- strumenti */

  // CETRA — corda pizzicata, algoritmo di Karplus-Strong reso in buffer.
  // Attestazione: SOLO ICONOGRAFICA (affreschi, statuaria). Nessuno
  // strumento a corda sopravvive come reperto da Pompei o Ercolano.
  function ksBuffer(freq, dur, damp){
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr/freq));
    const len = Math.round(sr*dur);
    const b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    const ring = new Float32Array(N);
    // eccitazione filtrata: meno metallica di un rumore bianco puro
    let prev = 0;
    for(let i=0;i<N;i++){
      const w = Math.random()*2 - 1;
      prev = prev*0.4 + w*0.6;
      ring[i] = prev;
    }
    let p = 0;
    for(let i=0;i<len;i++){
      const cur = ring[p];
      const nxt = ring[(p+1) % N];
      ring[p] = (cur + nxt) * 0.5 * damp;
      d[i] = cur;
      p = (p+1) % N;
    }
    // dissolvenza finale per evitare il click
    const fade = Math.min(1200, len);
    for(let i=0;i<fade;i++) d[len-1-i] *= i/fade;
    return b;
  }

  function cetra(freq, when, gain){
    const key = Math.round(freq);
    if(!ksCache.has(key)) ksCache.set(key, ksBuffer(freq, 3.2, 0.9965));
    const s = ctx.createBufferSource();
    s.buffer = ksCache.get(key);
    const g = ctx.createGain();
    g.gain.value = gain;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3200;
    s.connect(f).connect(g); g.connect(dry); g.connect(wet);
    s.start(when);
    s.stop(when + 3.3);
  }

  // TIBIA — ancia doppia. Attestazione: REPERTO. Circa settanta rinvenimenti
  // riferibili a tibiae da Pompei, di cui quindici strumenti completi
  // (Mungari & Wysłucha 2021). Qui: due oscillatori leggermente scordati
  // in un passa-banda, più una componente di soffio.
  function tibia(freq, when, dur, gain){
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq*2.4; bp.Q.value = 1.6;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = freq; o2.frequency.value = freq*1.006;
    const nz = noiseSrc();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = freq*3.2; nf.Q.value = 0.8;
    const ng = ctx.createGain(); ng.gain.value = gain*0.22;
    o1.connect(bp); o2.connect(bp); bp.connect(g);
    nz.connect(nf).connect(ng); ng.connect(g);
    g.connect(dry); g.connect(wet);
    env(g, when, 0.09, 0.18, gain, gain*0.72, 0.35, dur);
    o1.start(when); o2.start(when); nz.start(when);
    const end = when + dur + 0.45;
    o1.stop(end); o2.stop(end); nz.stop(end);
  }

  // CORNU — ottone circolare. Attestazione: REPERTO. Cinque esemplari da
  // Pompei al MANN (Pelosi et al. 2016). Funzione antica di segnale, non
  // di melodia: qui suona una chiamata sola, tenuta.
  function cornu(freq, when, dur, gain){
    const g = ctx.createGain();
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(freq*1.4, when);
    lp.frequency.linearRampToValueAtTime(freq*6, when + 0.35);
    lp.frequency.linearRampToValueAtTime(freq*3, when + dur);
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 4.6; vg.gain.value = freq*0.007;
    vib.connect(vg).connect(o.frequency);
    o.connect(lp).connect(g);
    g.connect(dry); g.connect(wet);
    env(g, when, 0.16, 0.25, gain, gain*0.82, 0.7, dur);
    o.start(when); vib.start(when);
    o.stop(when + dur + 0.9); vib.stop(when + dur + 0.9);
  }

  // CYMBALA — dischi concavi in bronzo. Attestazione: REPERTO. Sei coppie
  // e tre esemplari sciolti dai siti pompeiani (Mungari & Wysłucha 2021).
  // Spettro inarmonico + transiente di rumore.
  function cymbala(when, gain){
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.9);
    const base = rnd(430, 530);
    [1, 1.53, 2.31, 3.07, 4.19, 5.61].forEach((r,i) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = base*r*rnd(0.99,1.01);
      const og = ctx.createGain(); og.gain.value = 1/(i+1.6);
      o.connect(og).connect(g);
      o.start(when); o.stop(when + 2.0);
    });
    const nz = noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain*0.8, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
    nz.connect(hp).connect(ng).connect(g);
    nz.start(when); nz.stop(when + 0.3);
    g.connect(dry); g.connect(wet);
  }

  /* ------------------------------------------- eventi non strumentali */

  function burst(when, dur, type, f, q, gain, sweep){
    const nz = noiseSrc();
    const bq = ctx.createBiquadFilter();
    bq.type = type; bq.frequency.value = f; bq.Q.value = q;
    if(sweep) bq.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    nz.connect(bq).connect(g);
    g.connect(dry); g.connect(wet);
    nz.start(when); nz.stop(when + dur + 0.05);
  }

  function tick_(when, gain){ burst(when, 0.045, 'highpass', 2600, 0.7, gain); }
  function pick_(when, gain){                     // picco o piccone su pietra
    burst(when, 0.09, 'bandpass', rnd(1700,2600), 4, gain);
    burst(when + 0.008, 0.30, 'bandpass', rnd(420,620), 2, gain*0.4);
  }
  function trowel_(when, gain){ burst(when, 0.36, 'bandpass', rnd(900,1500), 1.2, gain*0.5); }
  function voice_(when, gain){                    // voce lontana, non parole
    const dur = rnd(0.4, 0.9);
    const g = ctx.createGain();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = rnd(95, 190);
    o.frequency.setValueAtTime(f0, when);
    o.frequency.linearRampToValueAtTime(f0*rnd(0.82,1.25), when + dur);
    const fm = ctx.createBiquadFilter();
    fm.type = 'bandpass'; fm.frequency.value = rnd(500, 950); fm.Q.value = 3.5;
    o.connect(fm).connect(g);
    env(g, when, 0.07, 0.12, gain, gain*0.6, 0.2, dur);
    g.connect(dry); g.connect(wet);
    o.start(when); o.stop(when + dur + 0.3);
  }
  function bird_(when, gain){
    const n = Math.floor(rnd(2,5));
    for(let i=0;i<n;i++){
      const t = when + i*rnd(0.08,0.16);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      const f = rnd(2400, 4200);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f*rnd(0.7,1.4), t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
      o.connect(g); g.connect(dry); g.connect(wet);
      o.start(t); o.stop(t + 0.13);
    }
  }
  function drop_(when, gain){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    const f = rnd(700, 1500);
    o.frequency.setValueAtTime(f, when);
    o.frequency.exponentialRampToValueAtTime(f*0.45, when + 0.06);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
    o.connect(g); g.connect(dry); g.connect(wet);
    o.start(when); o.stop(when + 0.16);
  }
  function boom_(when, gain){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(rnd(48,72), when);
    o.frequency.exponentialRampToValueAtTime(24, when + 2.4);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 2.8);
    o.connect(g); g.connect(dry);
    o.start(when); o.stop(when + 3.0);
    burst(when, 2.2, 'lowpass', 240, 0.7, gain*0.7, 70);
  }
  function step_(when, gain){ burst(when, 0.11, 'bandpass', rnd(240,420), 1.4, gain); }
  function crackle_(when, gain){
    const n = Math.floor(rnd(1,4));
    for(let i=0;i<n;i++) burst(when + i*rnd(0.02,0.09), 0.05, 'bandpass', rnd(1200,3000), 3, gain*rnd(0.4,1));
  }
  function creak_(when, gain){
    const dur = rnd(0.7, 1.6);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rnd(70,120), when);
    o.frequency.linearRampToValueAtTime(rnd(150,240), when + dur);
    const bq = ctx.createBiquadFilter();
    bq.type = 'bandpass'; bq.frequency.value = 900; bq.Q.value = 6;
    o.connect(bq).connect(g);
    env(g, when, 0.2, 0.2, gain, gain*0.5, 0.4, dur);
    g.connect(dry); g.connect(wet);
    o.start(when); o.stop(when + dur + 0.5);
  }

  // altezze per la cetra: convenzione moderna, NON una ricostruzione.
  const CETRA_HZ = [196.0, 220.0, 246.9, 261.6, 293.7, 329.6, 349.2, 392.0];
  function cetraNote(when, gain){
    cetra(CETRA_HZ[Math.floor(Math.random()*CETRA_HZ.length)], when, gain);
  }

  /* --------------------------------------------------- letti continui */

  function bed(kind, gain, params){
    const nz = noiseSrc();
    const bq = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.value = 0;
    bq.type = params.type; bq.frequency.value = params.f; bq.Q.value = params.q || 0.7;
    nz.connect(bq).connect(g);
    g.connect(dry);
    if(params.verb) g.connect(wet);
    // respiro lento del filtro
    if(params.mod){
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = params.mod.rate; lg.gain.value = params.mod.depth;
      lfo.connect(lg).connect(bq.frequency);
      lfo.start();
      bedNodes.push({ stop:()=>{ try{lfo.stop();}catch(e){} } });
    }
    nz.start();
    g.gain.setTargetAtTime(gain, now(), 0.8);
    const node = { g, stop(){ try{ g.gain.setTargetAtTime(0, now(), 0.5); nz.stop(now()+2.4); }catch(e){} } };
    bedNodes.push(node);
    return node;
  }

  /* ------------------------------------- configurazione per ogni fase */
  // Dichiarato: l'ambiente sonoro è una EVOCAZIONE, non una ricostruzione
  // documentata. Nessuna fonte descrive il paesaggio sonoro di Pompei.

  const SCENES = [
    { // 0 — la vigilia
      beds:[ {type:'bandpass', f:480, q:0.6, g:0.055, verb:1, mod:{rate:0.07, depth:120}},
             {type:'lowpass',  f:320, q:0.5, g:0.030} ],
      events:[ [voice_,1.6,4.5,0.030], [step_,1.2,3.4,0.026], [bird_,3.5,9,0.020],
               [cymbala,14,30,0.028], [cetraNote,8,17,0.055], [tibiaCall,26,60,0.032] ]
    },
    { // 1 — il seppellimento
      beds:[ {type:'lowpass', f:190, q:0.6, g:0.115},
             {type:'highpass', f:2200, q:0.5, g:0.060} ],
      events:[ [tick_,0.03,0.13,0.055], [boom_,16,34,0.085], [voice_,7,20,0.016] ]
    },
    { // 2 — recuperi e cunicoli
      beds:[ {type:'lowpass', f:340, q:0.5, g:0.038, mod:{rate:0.05, depth:90}} ],
      events:[ [pick_,1.1,3.6,0.055], [voice_,9,24,0.020], [creak_,12,28,0.030] ]
    },
    { // 3 — la rioccupazione
      beds:[ {type:'lowpass', f:300, q:0.5, g:0.034},
             {type:'bandpass', f:1100, q:0.4, g:0.022, verb:1} ],
      events:[ [crackle_,0.35,1.4,0.030], [voice_,11,28,0.018], [bird_,6,15,0.014] ]
    },
    { // 4 — Civita
      beds:[ {type:'lowpass', f:420, q:0.4, g:0.070, mod:{rate:0.045, depth:170}} ],
      events:[ [bird_,2.4,7,0.024], [tick_,4,11,0.012] ]
    },
    { // 5 — il canale di Fontana
      beds:[ {type:'lowpass', f:380, q:0.4, g:0.042, mod:{rate:0.05, depth:120}},
             {type:'bandpass', f:1800, q:0.5, g:0.038, verb:1} ],
      events:[ [drop_,0.9,3.4,0.030], [pick_,2.2,6,0.042], [voice_,12,30,0.016] ]
    },
    { // 6 — lo scavo borbonico
      beds:[ {type:'lowpass', f:360, q:0.5, g:0.040, mod:{rate:0.05, depth:100}} ],
      events:[ [pick_,0.8,2.3,0.055], [creak_,10,24,0.034], [voice_,6,16,0.024], [step_,2,5,0.020] ]
    },
    { // 7 — il cantiere aperto
      beds:[ {type:'lowpass', f:400, q:0.4, g:0.052, mod:{rate:0.04, depth:130}},
             {type:'lowpass', f:150, q:0.5, g:0.026} ],
      events:[ [trowel_,2,6,0.036], [bird_,5,13,0.018], [voice_,14,34,0.014] ]
    }
  ];

  // chiamata di cornu/tibia: nota sola tenuta, nessuna melodia
  function tibiaCall(when, gain){
    if(Math.random() < 0.5) tibia(CETRA_HZ[Math.floor(Math.random()*4)]*2, when, rnd(0.7,1.5), gain);
    else cornu(rnd(96,132), when, rnd(1.1,2.0), gain*0.9);
  }

  /* ------------------------------------------------------- scheduler */

  let evQueue = [];
  function planScene(i){
    bedNodes.forEach(n => n.stop && n.stop());
    bedNodes = [];
    const sc = SCENES[i] || SCENES[0];
    sc.beds.forEach(b => bed(null, b.g, b));
    evQueue = sc.events.map(e => ({ fn:e[0], lo:e[1], hi:e[2], gain:e[3], next: now() + rnd(0, e[2]) }));
  }

  function pump(){
    if(!ready || !on) return;
    const t = now(), horizon = t + 0.6;
    for(const e of evQueue){
      while(e.next < horizon){
        try { e.fn(Math.max(e.next, t + 0.02), e.gain * rnd(0.7, 1.25)); } catch(err){}
        e.next += rnd(e.lo, e.hi);
      }
    }
  }

  /* ------------------------------------------------------------- API */

  function init(){
    if(ready) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    try { ctx = new AC(); } catch(e){ return false; }
    master = ctx.createGain(); master.gain.value = 0.9;
    dry = ctx.createGain(); dry.gain.value = 0.82;
    wet = ctx.createGain(); wet.gain.value = 0.30;
    const conv = ctx.createConvolver();
    noiseBuf = makeNoise(4);
    conv.buffer = makeIR(2.6, 2.4);
    wet.connect(conv).connect(master);
    dry.connect(master);
    master.connect(ctx.destination);
    ready = true;
    return true;
  }

  function setEnabled(v){
    if(v && !init()) return false;
    on = !!v;
    if(on){
      if(ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(now());
      master.gain.setTargetAtTime(0.9, now(), 0.4);
      planScene(epochNow);
      if(!evTimer) evTimer = setInterval(pump, 250);
    } else if(ready){
      master.gain.setTargetAtTime(0, now(), 0.3);
      bedNodes.forEach(n => n.stop && n.stop());
      bedNodes = [];
      evQueue = [];
      if(evTimer){ clearInterval(evTimer); evTimer = null; }
    }
    return on;
  }

  function setEpoch(i){
    epochNow = i;
    if(ready && on) planScene(i);
  }

  document.addEventListener('visibilitychange', () => {
    if(!ready || !on) return;
    if(document.hidden) master.gain.setTargetAtTime(0, now(), 0.25);
    else master.gain.setTargetAtTime(0.9, now(), 0.5);
  });

  return { init, setEnabled, setEpoch, isOn: () => on, isReady: () => ready };
})();

/* =====================================================================
   CONFRONTO STRATIGRAFICO — Pompei / Ercolano
   Scena separata, con camera e luci proprie: non tocca il modello urbano.
   Scala verticale identica a quella del modello: 1 unità = 4 m.

   Dati incisi qui dentro, con la fonte a fianco nel pannello:
   · Pompei   ~5 m di deposito nel settore indagato, di cui 3,1–3,3 m di
              lapilli pomicei — Sparice et al. 2024, Front. Earth Sci. 12
   · Ercolano ~20 m, valore modale nelle fonti peer-reviewed e ufficiali;
              le fonti divergono fra 16 e 25 m — vedi pannello
   · A Pompei ricaduta pliniana di pomici, poi correnti piroclastiche;
     a Ercolano correnti piroclastiche fin dall'inizio, senza la fase di
     ricaduta — Pensa et al. 2023; UNESCO WHC 829
   ===================================================================== */
