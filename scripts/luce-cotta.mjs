/*
   La luce cotta, rifatta da capo: «npm run luce».

     npm run build
     python3 -m http.server 8000
     BLENDER_PY=/percorso/python-con-bpy node scripts/luce-cotta.mjs [indirizzo] [lato_px] [campioni]

   1. apre il simulatore in un Chrome senza schermo (?debug) e ne legge la
      geometria con pompei.geometria(): blocchi e tetti, come li costruisce
      src/app.js;
   2. la scrive in strumenti/blender/citta.json (generato, non versionato);
   3. lancia strumenti/blender/luce_cotta.py con il Python che ha il modulo
      bpy di Blender (BLENDER_PY; di norma «python3»: pip install bpy), che
      cuoce l'occlusione del suolo in src/assets/luce/ao-suolo.png e .json;
   4. poi va rifatta la build, perché la texture entra nel file.

   Va rilanciata quando cambia la città: case, monumenti, tetti. Nel
   settembre-novembre 2026 la cottura a 2048 px con 128 campioni richiede
   meno di un minuto su quattro processori.

   Stesso pilotaggio di prova-avvio.mjs: protocollo DevTools, niente
   dipendenze.
*/
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const base = (arg.find(a => a.startsWith('http')) || 'http://localhost:8000/').replace(/\/?$/, '/');
const [lato = '2048', campioni = '128'] = arg.filter(a => !a.startsWith('http'));
const CHROME = process.env.CHROME || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const BLENDER_PY = process.env.BLENDER_PY || 'python3';
const PORTA = 9400 + Math.floor(Math.random() * 400);
const pausa = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'luce-'))}`,
  '--window-size=320,200', 'about:blank'
], { stdio:'ignore' });
const fine = codice => { try { chrome.kill('SIGKILL'); } catch(e){} process.exit(codice); };

try {
  let pronto = false;
  for(let i = 0; i < 80 && !pronto; i++){
    try { await fetch(`http://127.0.0.1:${PORTA}/json/version`); pronto = true; } catch(e){ await pausa(250); }
  }
  if(!pronto) throw new Error('Chrome non risponde');
  const pagina = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find(b => b.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let id = 0; const attese = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if(m.id && attese.has(m.id)){ attese.get(m.id)(m); attese.delete(m.id); } };
  const cmd = (method, params = {}) => new Promise(ok => { const n = ++id; attese.set(n, ok); ws.send(JSON.stringify({ id:n, method, params })); });
  const valuta = async expr => (await cmd('Runtime.evaluate', { expression:expr, returnByValue:true })).result?.result?.value;

  await cmd('Page.navigate', { url: base + '?debug' });
  let geo = null;
  for(let i = 0; i < 120 && !geo; i++){
    await pausa(1000);
    try { geo = await valuta('window.pompei && window.pompei.geometria ? window.pompei.geometria() : null'); } catch(e){}
  }
  if(!geo) throw new Error('la pagina non ha esposto pompei.geometria() in due minuti');
  const file = join(radice, 'strumenti/blender/citta.json');
  writeFileSync(file, JSON.stringify(geo));
  console.log(`✓ geometria: ${geo.blocchi.length} blocchi, ${geo.tetti.length} pezzi di tetto → strumenti/blender/citta.json`);
  ws.close(); try { chrome.kill('SIGKILL'); } catch(e){}

  const r = spawnSync(BLENDER_PY, [join(radice, 'strumenti/blender/luce_cotta.py'), lato, campioni, file,
    join(radice, 'src/assets/luce/ao-suolo.png')], { stdio:'inherit' });
  if(r.status !== 0) throw new Error(`Blender è uscito con codice ${r.status} (BLENDER_PY=${BLENDER_PY} ha il modulo bpy?)`);
  console.log('✓ luce cotta: src/assets/luce/ao-suolo.png — ora npm run build');
  process.exit(0);
} catch(e){
  console.error('✗ ' + (e.message || e));
  fine(1);
}
