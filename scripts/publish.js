// Copia il prodotto della build nella radice, dove GitHub Pages lo pubblica.
// Passaggio separato dalla build apposta: Vite non deve mai avere come uscita
// la cartella che contiene i sorgenti.
import { copyFileSync, statSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'dist', 'index.html');
const to = join(root, 'index.html');

copyFileSync(from, to);
const kb = (statSync(to).size / 1024).toFixed(0);
console.log(`index.html pubblicato in radice — ${kb} kB`);

// Il nome della cache del service worker cambia quando cambia ciò che serve:
// la pagina o una lingua. Un nome fisso teneva i testi vecchi nelle app già
// installate (vedi il commento in sw.js).
const impronta = createHash('sha256');
impronta.update(readFileSync(to));
for(const f of readdirSync(join(root, 'i18n')).filter(f => f.endsWith('.json')).sort())
  impronta.update(readFileSync(join(root, 'i18n', f)));
const sw = join(root, 'sw.js');
const prima = readFileSync(sw, 'utf8');
const dopo = prima.replace(/const CACHE = 'dopo79-v(\d+)-[^']*';/,
  (_, v) => `const CACHE = 'dopo79-v${v}-${impronta.digest('hex').slice(0, 10)}';`);
if(dopo === prima && !/const CACHE = 'dopo79-v\d+-/.test(prima)) throw new Error('sw.js: riga CACHE non trovata');
writeFileSync(sw, dopo);
console.log('cache del service worker:', dopo.match(/dopo79-v[^']*/)[0]);
