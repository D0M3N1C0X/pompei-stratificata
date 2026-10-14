/*
   La prova d'avvio: apre davvero il simulatore in un Chrome senza schermo.

     node scripts/prova-avvio.mjs http://localhost:8000/

   I controlli di check-build.js guardano i file; nessuno avviava la pagina.
   Il 14 ottobre 2026 un errore d'avvio («Cannot access 'N' before
   initialization») li ha passati tutti e quarantasei. Questa prova:

   1. apre l'indirizzo con ?debug e aspetta che la scheda d'ingresso cada;
   2. fallisce se compare il pannello del guasto o se la pagina lancia
      un'eccezione;
   3. lancia il giro di verifica (scripts/giro.js): ogni fase, ogni luogo di
      Pompei e di Ercolano, il confronto, le viste «sotto», e fallisce se
      trova testi rotti.

   Nessuna dipendenza: Chrome si pilota dal protocollo DevTools con il
   WebSocket e il fetch che Node ha già (dalla 22). Su GitHub Actions Chrome
   c'è; WebGL gira in SwiftShader, sul processore.
*/
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');
const CHROME = process.env.CHROME || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const PORTA = 9400 + Math.floor(Math.random() * 400);
const pausa = ms => new Promise(r => setTimeout(r, ms));
const errori = [];

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'avvio-'))}`,
  '--window-size=1280,720', 'about:blank'
], { stdio:'ignore' });
const fine = codice => { try { chrome.kill('SIGKILL'); } catch(e){} process.exit(codice); };
setTimeout(() => { console.error('✗ tempo scaduto (4 minuti)'); fine(1); }, 240000);

try {
  let pronto = false;
  for(let i = 0; i < 80 && !pronto; i++){
    try { await fetch(`http://127.0.0.1:${PORTA}/json/version`); pronto = true; } catch(e){ await pausa(250); }
  }
  if(!pronto) throw new Error('Chrome non risponde sul protocollo DevTools');
  const pagina = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find(b => b.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let id = 0; const attese = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if(m.id && attese.has(m.id)){ attese.get(m.id)(m); attese.delete(m.id); }
    if(m.method === 'Runtime.exceptionThrown'){
      const d = m.params.exceptionDetails;
      errori.push((d.exception && d.exception.description || d.text || 'eccezione').split('\n')[0]);
    }
  };
  const cmd = (method, params = {}) => new Promise(ok => {
    const n = ++id; attese.set(n, ok); ws.send(JSON.stringify({ id:n, method, params }));
  });
  const valuta = async (expression, awaitPromise = false) => {
    const r = await cmd('Runtime.evaluate', { expression, awaitPromise, returnByValue:true });
    if(r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'errore nella valutazione');
    return r.result && r.result.result && r.result.result.value;
  };

  await cmd('Runtime.enable');
  await cmd('Page.navigate', { url: base + '?debug' });

  // 1. l'avvio
  let stato = null;
  for(let i = 0; i < 120; i++){
    await pausa(1000);
    try {
      stato = await valuta(`({ pronto: !!window.pompei && document.getElementById('loading').classList.contains('gone'),
                               guasto: !document.getElementById('guasto').hidden,
                               dettaglio: (document.getElementById('guastoDett') || {}).textContent || '' })`);
    } catch(e){ continue; }
    if(stato && (stato.pronto || stato.guasto)) break;
  }
  if(!stato || stato.guasto) throw new Error('pannello del guasto: ' + (stato && stato.dettaglio));
  if(!stato.pronto) throw new Error('la pagina non ha finito di avviarsi in due minuti');
  console.log('✓ avvio');

  // 2. il giro di verifica
  const giro = await valuta(`(async () => (0, eval)(await (await fetch('scripts/giro.js')).text()))()`, true);
  if(!giro || !giro.fatti) throw new Error('il giro non ha restituito un esito');
  console.log(`✓ giro: ${giro.fatti.fasi} fasi, ${giro.fatti.luoghi} luoghi di Pompei, ${giro.fatti.erc} di Ercolano`);
  for(const g of giro.guai) console.error('✗ ' + g);

  // 3. eccezioni non gestite durante tutto questo
  const vere = errori.filter(e => !/ServiceWorker|service worker|fetching the script/i.test(e));
  for(const e of vere) console.error('✗ eccezione: ' + e);
  ws.close();
  if(giro.guai.length || vere.length){ console.error('prova d\'avvio fallita'); fine(1); }
  console.log('prova d\'avvio superata');
  fine(0);
} catch(e){
  console.error('✗ ' + (e.message || e));
  fine(1);
}
