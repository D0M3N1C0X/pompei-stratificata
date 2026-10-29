/*
   Le immagini dell'App Store, rifatte da sole.

     npm run build
     python3 -m http.server 8780
     node scripts/scatti-store.mjs [indirizzo] [solo-questo-scatto]

   Apre il simulatore in un Chrome senza schermo, una scena di
   store/scatti.json alla volta, nei due formati (iPhone 6,9" e iPad 13"),
   a mezzogiorno. Di ogni scena fa una sola foto e ci scrive sopra le sei
   didascalie, così le lingue mostrano lo stesso istante. Le immagini
   finiscono in store/immagini come JPEG di qualità 90.

   Ogni scena si apre da capo: tenere aperta la stessa pagina per 12 foto
   grandi esaurisce la memoria grafica e Chrome spegne il 3D.

   Stesso pilotaggio di prova-avvio.mjs: protocollo DevTools, niente
   dipendenze. Chrome usa la scheda grafica del Mac (Metal); se non la
   trova, CHROME_ANGLE=swiftshader lo fa disegnare col processore, molto
   più lento.
*/
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'http://localhost:8780/').replace(/\/?$/, '/');
const solo = process.argv[3] || null;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ANGLE = process.env.CHROME_ANGLE || 'metal';
const PORTA = 9400 + Math.floor(Math.random() * 400);
const pausa = ms => new Promise(r => setTimeout(r, ms));

const { formati, scatti } = JSON.parse(readFileSync(join(radice, 'store/scatti.json'), 'utf8'));
const testi = JSON.parse(readFileSync(join(radice, 'store/testi.json'), 'utf8'));
const LINGUE = ['it', 'en', 'fr', 'de', 'es', 'pt'];
const uscita = join(radice, 'store/immagini');
mkdirSync(uscita, { recursive:true });

const chrome = spawn(CHROME, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'store-'))}`,
  'about:blank'
], { stdio:'ignore' });
const fine = codice => { try { chrome.kill('SIGKILL'); } catch(e){} process.exit(codice); };

let pronto = false;
for(let i = 0; i < 80 && !pronto; i++){
  try { await fetch(`http://127.0.0.1:${PORTA}/json/version`); pronto = true; } catch(e){ await pausa(250); }
}
if(!pronto){ console.error('✗ Chrome non risponde'); fine(1); }
const pagina = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find(b => b.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
let id = 0; const attese = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if(m.id && attese.has(m.id)){ attese.get(m.id)(m); attese.delete(m.id); }
};
const cmd = (method, params = {}) => new Promise(ok => {
  const n = ++id; attese.set(n, ok); ws.send(JSON.stringify({ id:n, method, params }));
});
const valuta = async (expression, awaitPromise = false) => {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise, returnByValue:true });
  if(r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'errore nella pagina');
  return r.result && r.result.result && r.result.result.value;
};

const didascalie = s => JSON.stringify(LINGUE.map(l => [s.didascalia[l], testi[l].nome.toUpperCase()]));

try {
  for(const [formato, [w, h]] of Object.entries(formati)){
    // finestra a metà della misura e densità 2: il canvas esce già w × h
    await cmd('Emulation.setDeviceMetricsOverride', { width: w / 2, height: h / 2, deviceScaleFactor: 2, mobile: false });
    for(const s of scatti){
      if(solo && s.nome !== solo) continue;
      await cmd('Page.navigate', { url: 'about:blank' });
      await pausa(300);
      await cmd('Page.navigate', { url: base + s.indirizzo });
      let ok = false;
      for(let i = 0; i < 120 && !ok; i++){
        await pausa(1000);
        try { ok = await valuta(`!!window.pompei && document.getElementById('loading').classList.contains('gone')`); } catch(e){}
      }
      if(!ok) throw new Error(`${s.nome}: la pagina non si è avviata`);
      // le figure di Blender arrivano dopo l'avvio: senza, in foto ci
      // sarebbero i manichini
      let figure = false;
      for(let i = 0; i < 60 && !figure; i++){
        try { figure = await valuta(`!!pompei.figure`); } catch(e){}
        if(!figure) await pausa(500);
      }
      if(!figure) throw new Error(`${s.nome}: le figure non si sono caricate`);
      await pausa(1500);
      const immagini = await valuta(`(async () => {
        const c = document.getElementById('clockSlider');
        c.value = ${s.ora ?? 720}; c.dispatchEvent(new Event('input', { bubbles:true }));
        const q = document.querySelector('canvas');
        if(q.width < ${w} * 0.98) throw new Error('canvas di ' + q.width + ' pixel invece di ${w}');
        return pompei.vetrina(${w}, ${h}, ${didascalie(s)}, undefined, ${s.passi ?? 45});
      })()`, true);
      immagini.forEach((url, i) => {
        const png = join(uscita, `${s.nome}-${formato}-${LINGUE[i]}.png`);
        writeFileSync(png, Buffer.from(url.replace(/^data:image\/png;base64,/, ''), 'base64'));
        execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', png, '--out', png.replace(/\.png$/, '.jpg')], { stdio:'ignore' });
        unlinkSync(png);
      });
      console.log(`✓ ${s.nome} ${formato}`);
    }
  }
  ws.close();
  fine(0);
} catch(e){
  console.error('✗ ' + (e.message || e));
  fine(1);
}
