/*
   Le stesse cifre in ogni lingua.

   Una traduzione può cambiare le parole, non i numeri: 66 ettari, 1763,
   23 × 35 m, inv. 14897 devono restare tali in inglese come in tedesco.
   Questo modulo estrae le cifre da un testo in modo che lingue diverse
   diano lo stesso elenco:

   · i secoli in numeri romani diventano cifre (IV–V sec. → 4 5), anche con
     l'esponente francese (Ier–IIIe s.);
   · le date 24/08/2026 e 24 August 2026 diventano giorno e anno (il mese,
     scritto a parole in inglese, non si confronta);
   · 12.000, 12,000 e 12 000 sono lo stesso numero, e così 1,8 e 1.8.

   Dove una lingua scrive il secolo a parole («first century», «18. Jh.»
   per «Settecento») i numeri da 1 a 21 di quel testo non si confrontano.
   Usato da check-build.js.
*/
const R = 'X{0,3}(?:IX|IV|V?I{1,3}|V)', ESP = '(?:er|e|ᵉ)?';
const DOPO = '(?![\\p{L}\\d])', PRIMA = '(?<![\\p{L}\\d])';
const SEC = '(?:sec|secolo|secoli|siècles?|s\\.|Jh|Jahrhunderts?|century|centuries|siglos?|séculos?)';
const ROMANI = new RegExp(
  `${PRIMA}(${R})${ESP}(?=\\s*[–-]\\s*${R}${ESP}${DOPO})` +          // IV–V: il primo
  `|(?<=${PRIMA}${R}${ESP}\\s*[–-]\\s*)(${R})${ESP}${DOPO}` +          // IV–V: il secondo
  `|${PRIMA}(${R})${ESP}(?=\\s*${SEC}${DOPO})` +                       // V secolo
  `|${PRIMA}((?=[IVX]{2})X{0,3}(?:IX|IV|V?I{0,3}))${DOPO}`, 'gu');     // XVI, IX
const VAL = { I:1, V:5, X:10 };
const romano = x => { let n = 0; for(let i = 0; i < x.length; i++){ const a = VAL[x[i]], b = VAL[x[i+1]] || 0; n += a < b ? -a : a; } return n; };

export const SECOLO_A_PAROLE = /secol|siècle|jahrhundert|jh\.|centur|siglo|século|settecento|seicento|cinquecento|quattrocento|ottocento|novecento/i;

export function cifre(s){
  s = String(s)
    .replace(/<sup>(.*?)<\/sup>/g, '$1').replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ').replace(/\{[^}]*\}/g, '')
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, '$1 ; $3')
    .replace(/\b(\d{1,2}) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{4})\b/g, '$1 ; $2')
    .replace(ROMANI, (m, a, b, c, d) => ' ' + romano(a || b || c || d) + ' ');
  return (s.match(/\d+(?:[.,   ]\d{3})*(?:[.,]\d+)?/g) || [])
    .map(x => x.replace(/\D/g, '').replace(/^0+(?=\d)/, ''));
}

// le cifre che stanno in un testo e non nell'altro (con le ripetizioni)
export function scarto(a, b){
  const A = cifre(a), B = cifre(b), d = [...A];
  for(const x of B){ const i = d.indexOf(x); if(i >= 0) d.splice(i, 1); else d.push(x); }
  const aParole = SECOLO_A_PAROLE.test(a) || SECOLO_A_PAROLE.test(b);
  return d.filter(x => !(aParole && +x >= 1 && +x <= 21));
}
