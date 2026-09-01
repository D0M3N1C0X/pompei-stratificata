// Copia il prodotto della build nella radice, dove GitHub Pages lo pubblica.
// Passaggio separato dalla build apposta: Vite non deve mai avere come uscita
// la cartella che contiene i sorgenti.
import { copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'dist', 'index.html');
const to = join(root, 'index.html');

copyFileSync(from, to);
const kb = (statSync(to).size / 1024).toFixed(0);
console.log(`index.html pubblicato in radice — ${kb} kB`);
