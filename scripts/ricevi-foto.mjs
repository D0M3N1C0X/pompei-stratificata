/*
   Riceve le foto del modello e le salva come PNG.

     node scripts/ricevi-foto.mjs <cartella>        in ascolto sulla porta 8781

   Nella pagina, aperta con ?debug&cam=…:
     fetch('http://localhost:8781/?nome=vista', { method:'POST', body: pompei.foto(45) })

   Serve perché su questo Mac Chrome senza schermo non disegna fotogrammi:
   l'immagine la produce il modello stesso (pompei.foto legge il canvas) e
   qui la si scrive su disco. Le stesse righe rifanno le stesse foto quando
   il modello cambia: verifiche visive e screenshot dello store.
*/
import http from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const cartella = process.argv[2] || '.';
mkdirSync(cartella, { recursive:true });
let n = 0;
http.createServer((q, r) => {
  let corpo = '';
  q.on('data', c => corpo += c);
  q.on('end', () => {
    if(q.method === 'POST'){
      const nome = (new URL(q.url, 'http://x').searchParams.get('nome') || `foto-${++n}`).replace(/[^\w-]/g, '_');
      writeFileSync(join(cartella, nome + '.png'), Buffer.from(corpo.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log('salvata', nome);
    }
    r.writeHead(200, { 'Access-Control-Allow-Origin':'*' });
    r.end('ok');
  });
}).listen(8781, () => console.log('in ascolto sulla porta 8781 →', cartella));
