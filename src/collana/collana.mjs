#!/usr/bin/env node
/* =====================================================================
   LA COLLANA: codice comune a «Dopo il 79» (pompei-stratificata) e a
   «Firenze 1216» (firenze-1216/citta). La cartella src/collana è la stessa
   nei due progetti; collana.json ne registra la versione e l'impronta di
   ogni file, così una modifica fatta da una parte sola si vede subito.

     node src/collana/collana.mjs verifica            i file corrispondono al manifest?
     node src/collana/collana.mjs firma [versione]    riscrive le impronte (dopo una modifica voluta)
     node src/collana/collana.mjs copia <cartella>    copia questa collana in <cartella> (l'altro progetto)

   Regola: si modifica la collana in un progetto, si firma con una versione
   nuova, si copia nell'altro. Mai modificarla a mano da una parte sola.
   ===================================================================== */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(QUI, 'collana.json');
const file = d => readdirSync(d).filter(f => f !== 'collana.json').sort();
const impronta = p => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

export function verifica(dir = QUI){
  const m = JSON.parse(readFileSync(join(dir, 'collana.json'), 'utf8'));
  const errori = [];
  const presenti = file(dir);
  for(const [f, h] of Object.entries(m.file)){
    if(!presenti.includes(f)) errori.push(`manca ${f}`);
    else if(impronta(join(dir, f)) !== h) errori.push(`${f} è cambiato senza una nuova firma`);
  }
  for(const f of presenti) if(!(f in m.file)) errori.push(`${f} non è nel manifest`);
  return { versione: m.versione, errori };
}

const [cmd, arg] = process.argv.slice(2);
if(cmd === 'verifica'){
  const { versione, errori } = verifica();
  if(errori.length){ for(const e of errori) console.error('  NO   collana: ' + e); process.exit(1); }
  console.log(`  ok   collana ${versione}: i file corrispondono al manifest`);
} else if(cmd === 'firma'){
  const vecchio = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { versione: '0.0.0' };
  const m = { versione: arg || vecchio.versione, nota: 'Generato da collana.mjs firma: non modificare a mano.', file: {} };
  for(const f of file(QUI)) m.file[f] = impronta(join(QUI, f));
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log(`collana ${m.versione} firmata: ${Object.keys(m.file).length} file`);
} else if(cmd === 'copia' && arg){
  mkdirSync(arg, { recursive: true });
  for(const f of [...file(QUI), 'collana.json']) copyFileSync(join(QUI, f), join(arg, f));
  const { versione, errori } = verifica(arg);
  console.log(errori.length ? `copiata con errori: ${errori.join('; ')}` : `collana ${versione} copiata in ${arg}`);
} else if(cmd){
  console.error('uso: collana.mjs verifica | firma [versione] | copia <cartella>');
  process.exit(2);
}
