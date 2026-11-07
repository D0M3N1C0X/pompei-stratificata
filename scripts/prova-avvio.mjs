/*
   La prova d'avvio: apre davvero il simulatore in un Chrome senza schermo.

     node scripts/prova-avvio.mjs http://localhost:8000/            tutto
     node scripts/prova-avvio.mjs http://localhost:8000/ --rapida   1–4

   I controlli di check-build.js guardano i file; nessuno avviava la pagina.
   Il 14 ottobre 2026 un errore d'avvio («Cannot access 'N' before
   initialization») li ha passati tutti e quarantasei. Questa prova:

   1. apre l'indirizzo con ?debug e aspetta che la scheda d'ingresso cada;
      fallisce se compare il pannello del guasto o se la pagina lancia
      un'eccezione, in qualunque momento della prova;
   2. il giro di verifica (scripts/giro.js): ogni fase, ogni luogo di
      Pompei e di Ercolano, il confronto, le viste «sotto», la classe;
   3. il giro dei comandi (scripts/giro-comandi.js): pulsanti, tasti, tour,
      cammino, le stanze delle tre case con gli interni;
   4. le risorse: per ogni fase quante chiamate di disegno e triangoli, e
      se dopo due giri completi la memoria grafica cresce (una perdita);
      chiamate e triangoli non devono superare di oltre il 25% i valori di
      scripts/budget.json, che si aggiorna a mano quando la scena si
      arricchisce apposta (con --budget li riscrive questa prova);
   5. il giro di verifica nelle altre cinque lingue;
   6. l'impaginazione a sei misure di finestra, in tedesco, la lingua con
      le parole più lunghe (scripts/giro-layout.js);
   7. le schermate: le inquadrature di store/scatti.json più Ercolano e il
      confronto, in schermate/ con un foglio che le mostra tutte
      (schermate/index.html). Fallisce se una è vuota o quasi uniforme;
      se schermate/riferimento/ esiste segnala quanto ognuna è cambiata
      (con --riferimento le salva lì, per confrontare le prossime).

   I millisecondi per passo si stampano ma non fanno fallire niente: sul
   processore (SwiftShader) dicono solo se una versione è più lenta
   dell'altra sulla stessa macchina, non come gira su una scheda video.

   Nessuna dipendenza: Chrome si pilota dal protocollo DevTools con il
   WebSocket e il fetch che Node ha già (dalla 22). Su GitHub Actions Chrome
   c'è; WebGL gira in SwiftShader, sul processore.
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const base = (arg.find(a => !a.startsWith('--')) || 'http://localhost:8000/').replace(/\/?$/, '/');
const RAPIDA = arg.includes('--rapida'), RISCRIVI_BUDGET = arg.includes('--budget'), RIFERIMENTO = arg.includes('--riferimento');
const CHROME = process.env.CHROME || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const PORTA = 9400 + Math.floor(Math.random() * 400);
const pausa = ms => new Promise(r => setTimeout(r, ms));
const errori = [], guai = [];
let fase = 'avvio';

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--enable-precise-memory-info',
  `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'avvio-'))}`,
  '--window-size=1280,720', 'about:blank'
], { stdio:'ignore' });
const fine = codice => { try { chrome.kill('SIGKILL'); } catch(e){} process.exit(codice); };
const LIMITE = RAPIDA ? 8 : 25;
setTimeout(() => { console.error(`✗ tempo scaduto (${LIMITE} minuti) durante: ${fase}`); fine(1); }, LIMITE * 60000);

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
      errori.push(fase + ': ' + (d.exception && d.exception.description || d.text || 'eccezione').split('\n')[0]);
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
  const script = nome => valuta(`(async () => (0, eval)(await (await fetch('scripts/${nome}')).text()))()`, true);

  // apre un indirizzo e aspetta la fine dell'avvio; fallisce sul pannello del guasto
  async function apri(query){
    await cmd('Page.navigate', { url: base + query });
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
    if(!stato || stato.guasto) throw new Error(`${query}: pannello del guasto: ` + (stato && stato.dettaglio));
    if(!stato.pronto) throw new Error(`${query}: la pagina non ha finito di avviarsi in due minuti`);
  }
  async function misura(w, h, tocco){
    await cmd('Emulation.setDeviceMetricsOverride', { width:w, height:h, deviceScaleFactor:1, mobile:!!tocco });
    await cmd('Emulation.setTouchEmulationEnabled', { enabled:!!tocco, maxTouchPoints: tocco ? 5 : 0 });
  }

  await cmd('Runtime.enable');
  await cmd('Page.enable');
  await misura(1280, 720, false);

  // 1. l'avvio
  await apri('?debug');
  console.log('✓ avvio');

  // 2. il giro di verifica
  fase = 'giro';
  const giro = await script('giro.js');
  if(!giro || !giro.fatti) throw new Error('il giro non ha restituito un esito');
  console.log(`✓ giro (${giro.lang}): ${giro.fatti.fasi} fasi, ${giro.fatti.eruzione} eventi dell'eruzione, ${giro.fatti.classe} tappe in classe, ${giro.fatti.luoghi} luoghi di Pompei, ${giro.fatti.erc} di Ercolano`);
  guai.push(...giro.guai);

  // 3. il giro dei comandi
  fase = 'comandi';
  const com = await script('giro-comandi.js');
  console.log(`✓ comandi: ${com.fatti.pulsanti} pulsanti, ${com.fatti.tasti} tasti, ${com.fatti.tour} tappe del tour; stanze raggiungibili ` +
    com.case.map(c => c.quota + '%').join(' · '));
  guai.push(...com.guai);

  // 4. le risorse
  fase = 'risorse';
  await apri('?debug');
  const ris = await valuta(`(() => {
    const P = window.pompei, med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const viste = [...Array(8).keys()].map(i => ['fase ' + (i + 1), () => { P.vista('pompei'); P.fase(i); }])
      .concat([['Ercolano', () => P.vista('ercolano')], ['confronto', () => P.vista('confronto')]]);
    // la scena avanza senza disegno fino al punto, poi si disegnano pochi
    // fotogrammi: chiamate e triangoli sono quelli dell'ultimo
    const giro = n => viste.map(([nome, vai]) => { vai(); P.passi(20, false); const ms = P.passi(n); return { nome, ...P.info(), ms: Math.round(med(ms) * 10) / 10 }; });
    const primo = giro(3); giro(1); const terzo = giro(1);
    P.vista('pompei'); P.fase(0);
    return { viste: primo, memoria: [primo.at(-1), terzo.at(-1)] };
  })()`);
  const fileBudget = join(radice, 'scripts/budget.json');
  const budget = existsSync(fileBudget) ? JSON.parse(readFileSync(fileBudget, 'utf8')) : null;
  for(const v of ris.viste){
    const b = budget?.viste?.[v.nome];
    const oltre = b && (v.chiamate > b.chiamate * 1.25 || v.triangoli > b.triangoli * 1.25);
    console.log(`  ${oltre ? '✗' : '·'} ${v.nome.padEnd(10)} ${String(v.chiamate).padStart(5)} chiamate ${String(v.triangoli).padStart(9)} triangoli  ${String(v.ms).padStart(6)} ms/passo`);
    if(oltre && !RISCRIVI_BUDGET) guai.push(`risorse ${v.nome}: ${v.chiamate} chiamate e ${v.triangoli} triangoli, budget ${b.chiamate} e ${b.triangoli} (+25%): se è voluto, node scripts/prova-avvio.mjs --budget`);
  }
  const [m1, m3] = ris.memoria;
  if(m3.geometrie > m1.geometrie * 1.02 + 4 || m3.texture > m1.texture * 1.02 + 2)
    guai.push(`risorse: dopo due giri in più la memoria grafica cresce (geometrie ${m1.geometrie} → ${m3.geometrie}, texture ${m1.texture} → ${m3.texture})`);
  console.log(`✓ risorse: memoria grafica dopo uno e tre giri — geometrie ${m1.geometrie} → ${m3.geometrie}, texture ${m1.texture} → ${m3.texture}, programmi ${m3.programmi}` +
    (m3.heap ? `, heap ${m3.heap} MB` : ''));
  if(RISCRIVI_BUDGET || !budget){
    writeFileSync(fileBudget, JSON.stringify({
      _come: 'Chiamate di disegno e triangoli per vista, misurati da scripts/prova-avvio.mjs a 1280×720. La prova fallisce oltre il 25% in più: quando la scena si arricchisce apposta, si riscrive con node scripts/prova-avvio.mjs <indirizzo> --budget e si committa insieme alla modifica.',
      viste: Object.fromEntries(ris.viste.map(v => [v.nome, { chiamate:v.chiamate, triangoli:v.triangoli }]))
    }, null, 2) + '\n');
    console.log('  scripts/budget.json riscritto');
  }

  if(!RAPIDA){
    // 5. le altre lingue
    for(const lingua of ['it', 'fr', 'de', 'es', 'pt'].filter(l => l !== giro.lang)){
      fase = 'giro in ' + lingua;
      await apri('?debug&lang=' + lingua);
      const g = await script('giro.js');
      if(g.lang !== lingua) guai.push(`lingua ${lingua}: la pagina si è aperta in ${g.lang}`);
      guai.push(...g.guai.map(x => `[${lingua}] ${x}`));
      console.log(`✓ giro in ${lingua}: ${g.fatti.luoghi + g.fatti.erc} luoghi, ${g.fatti.eruzione} eventi, ${g.fatti.classe} tappe in classe`);
    }

    // 6. l'impaginazione
    for(const [w, h, tocco] of [[1920, 1080], [1366, 768], [1280, 720], [1024, 768], [844, 390, true], [390, 844, true]]){
      fase = `impaginazione ${w}×${h}`;
      await misura(w, h, tocco);
      await apri('?debug&lang=de');
      const l = await script('giro-layout.js');
      guai.push(...l.guai);
      console.log(`${l.guai.length ? '✗' : '✓'} impaginazione ${l.misura}: interfaccia sulla scena ` + l.stati.map(s => `${s.stato} ${s.coperto}%`).join(', '));
    }

    // 7. le schermate
    fase = 'schermate';
    await misura(960, 540, false);
    const cartella = join(radice, 'schermate'), rif = join(cartella, 'riferimento');
    mkdirSync(cartella, { recursive:true });
    const { scatti } = JSON.parse(readFileSync(join(radice, 'store/scatti.json'), 'utf8'));
    const elenco = scatti.map(s => ({ nome:s.nome, indirizzo:s.indirizzo, ora:s.ora, passi:s.passi || 45 }))
      .concat([{ nome:'90-eruzione', indirizzo:'?debug&fase=2&eruzione=16', passi:45 },
               { nome:'91-confronto', indirizzo:'?debug&vista=confronto', passi:45 }]);
    const righe = [];
    for(const s of elenco){
      fase = 'schermata ' + s.nome;
      await apri(s.indirizzo + '&lang=it');
      if(s.ora != null) await valuta(`(() => { const r = document.getElementById('clockSlider'); r.value = ${s.ora}; r.dispatchEvent(new Event('input', { bubbles:true })); })()`);
      const riferimento = existsSync(join(rif, s.nome + '.png')) ? 'data:image/png;base64,' + readFileSync(join(rif, s.nome + '.png')).toString('base64') : null;
      const esito = await valuta(`(async () => {
        const url = window.pompei.foto(${s.passi});
        const carica = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
        const pixel = img => { const c = document.createElement('canvas'); c.width = 240; c.height = 135;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0, 240, 135); return g.getImageData(0, 0, 240, 135).data; };
        const a = pixel(await carica(url));
        let s = 0, s2 = 0; const n = a.length / 4;
        for(let i = 0; i < a.length; i += 4){ const y = 0.2126*a[i] + 0.7152*a[i+1] + 0.0722*a[i+2]; s += y; s2 += y*y; }
        const dev = Math.sqrt(Math.max(0, s2/n - (s/n)**2));
        let cambiati = null;
        ${riferimento ? `{ const b = pixel(await carica(${JSON.stringify(riferimento)})); let k = 0;
          for(let i = 0; i < a.length; i += 4) if(Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]) > 48) k++;
          cambiati = Math.round(k / n * 1000) / 10; }` : ''}
        return { url, media: Math.round(s/n), dev: Math.round(dev * 10) / 10, cambiati };
      })()`, true);
      const png = Buffer.from(esito.url.split(',')[1], 'base64');
      writeFileSync(join(cartella, s.nome + '.png'), png);
      if(esito.dev < 6) guai.push(`schermata ${s.nome}: quasi uniforme (luminanza media ${esito.media}, deviazione ${esito.dev}): la scena non si vede`);
      const nota = esito.cambiati == null ? '' : esito.cambiati > 2 ? `  ⚠ cambiata nel ${esito.cambiati}% dei punti rispetto al riferimento` : `  uguale al riferimento (${esito.cambiati}%)`;
      console.log(`${esito.dev < 6 ? '✗' : '✓'} schermata ${s.nome}: luminanza ${esito.media}, deviazione ${esito.dev}${nota}`);
      righe.push(`<figure><img src="${s.nome}.png" alt="${s.nome}"><figcaption>${s.nome} · ${s.indirizzo.replace(/&/g, '&amp;')}${nota ? ' · ' + nota.trim() : ''}</figcaption></figure>`);
    }
    writeFileSync(join(cartella, 'index.html'), `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Schermate di prova</title><style>body{font:14px system-ui,sans-serif;margin:16px;background:#101412;color:#e8ebe6}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr));gap:16px}img{width:100%;display:block;border-radius:6px}
figure{margin:0}figcaption{margin-top:6px;color:#9aa69f;word-break:break-all}</style>
<h1>Schermate di prova · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</h1><main>${righe.join('\n')}</main></html>\n`);
    if(RIFERIMENTO){
      mkdirSync(rif, { recursive:true });
      for(const f of readdirSync(cartella).filter(f => f.endsWith('.png'))) copyFileSync(join(cartella, f), join(rif, f));
      console.log('  schermate salvate come riferimento in schermate/riferimento/');
    }
  }

  // eccezioni non gestite durante tutto questo
  const vere = errori.filter(e => !/ServiceWorker|service worker|fetching the script/i.test(e));
  for(const g of guai) console.error('✗ ' + g);
  for(const e of vere) console.error('✗ eccezione: ' + e);
  ws.close();
  if(guai.length || vere.length){ console.error(`prova d'avvio fallita: ${guai.length + vere.length} problemi`); fine(1); }
  console.log('prova d\'avvio superata');
  fine(0);
} catch(e){
  console.error('✗ ' + fase + ': ' + (e.message || e));
  fine(1);
}
