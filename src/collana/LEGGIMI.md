# La collana

Codice comune ai progetti della collana: **Dopo il 79** (`pompei-stratificata`) e **Firenze 1216** (`firenze-1216/citta`, pubblicato in `firenze-1216-citta`). La cartella `src/collana/` è identica nei due progetti.

| File | Che cosa fa |
|---|---|
| `pioggia.js` | la pioggia: gocce attorno a chi guarda, inclinate dal vento, che si accendono e spengono piano |
| `lucerne.js` | lucerne accese di sera: fiamma, alone e pozza di luce, senza luci vere |
| `annunci.js` | una regione `aria-live` per annunciare ai lettori di schermo che cosa è cambiato |
| `collana.mjs` | verifica, firma e copia della collana |
| `collana.json` | versione e impronta di ogni file (generato) |

I moduli dipendono solo da three.js (dalla 0.169 in su) e dal DOM: niente palette, testi o dati di un progetto. Colori, posizioni e parole li passa chi li usa.

## Come si cambia

1. Si modifica il file in uno dei due progetti.
2. `node src/collana/collana.mjs firma 0.2.0` (versione nuova).
3. `node src/collana/collana.mjs copia ../altro-progetto/src/collana`.
4. In tutti e due: `node src/collana/collana.mjs verifica`, che i controlli dei due progetti lanciano già.

Una modifica fatta a mano da una parte sola, senza firma, fa fallire la verifica.
