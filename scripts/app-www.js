/*
   Prepara la cartella che finisce dentro l'applicazione per iPhone e Mac.

   Capacitor copia nel pacchetto una cartella intera (webDir). La radice del
   repository non può esserlo: dentro ci sono node_modules, i sorgenti, il
   progetto Xcode stesso. Qui si ricompone app/www/ con i soli file che il
   sito pubblica, presi dal prodotto già versionato — la stessa cosa che
   serve GitHub Pages, niente di più.

   Resta fuori sw.js: nell'applicazione i file sono già nel pacchetto, e
   WKWebView non esegue service worker sullo schema capacitor://.
*/
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'app', 'www');

const FILE = [
  'index.html', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-1024.png',
  'icon-maskable-512.png', 'apple-touch-icon.png'
];
const CARTELLE = ['dossier', 'i18n'];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for(const f of FILE){
  if(!existsSync(join(root, f))){
    console.error(`manca ${f}: lancia prima npm run build`);
    process.exit(1);
  }
  cpSync(join(root, f), join(www, f));
}
for(const d of CARTELLE) cpSync(join(root, d), join(www, d), { recursive: true });

console.log(`app/www pronta — ${FILE.length} file, ${CARTELLE.length} cartelle`);
