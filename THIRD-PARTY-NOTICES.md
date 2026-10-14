# Componenti di terze parti

## three.js

Il motore 3D incluso in `index.html` è three.js, distribuito dai suoi autori con licenza MIT.

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Texture PBR — Poly Haven

Le mappe diffuse, normali e roughness sono versioni 1K degli asset Poly Haven,
distribuiti con licenza CC0 1.0. I crediti sono riportati per tracciabilità;
la licenza non li richiede.

- `Cobblestone Pavement` — https://polyhaven.com/a/cobblestone_pavement
- `Roof Tiles` — https://polyhaven.com/a/roof_tiles

## Figure umane — MakeHuman / MPFB

I corpi, gli occhi, le sopracciglia, i capelli e le texture della pelle degli
abitanti (`src/assets/figure/romana-*.glb`, `borb-*.glb`, `oggi-*.glb`) vengono dagli asset di
sistema di MakeHuman, usati con l'estensione MPFB 2 per Blender, distribuiti
con licenza CC0 1.0. Le vesti sono costruite dagli script
`strumenti/blender/figure_romane.py`, `figure_borbonici.py` e `figure_oggi.py`
di questo progetto.

- MakeHuman — https://static.makehumancommunity.org/
- MPFB 2 — https://static.makehumancommunity.org/mpfb.html

## Movimenti — CMU Graphics Lab Motion Capture Database

Il passo e la sosta degli abitanti (`src/assets/figure/movimenti.glb`) vengono
dalle registrazioni 35_01 e 77_02 del CMU Graphics Lab Motion Capture
Database, http://mocap.cs.cmu.edu/ — «The data used in this project was
obtained from mocap.cs.cmu.edu. The database was created with funding from
NSF EIA-0196217.» L'uso è libero, anche in prodotti; i file grezzi non si
ridistribuiscono, e qui non ci sono: c'è solo il risultato del trasferimento
sullo scheletro di MakeHuman, fatto dal progetto Firenze 1216 dello stesso
autore (conversione BVH di B. Hahne).

## Pianta di Ercolano — OpenStreetMap

Le piante delle case scavate, il tracciato delle vie antiche, la posizione
della Palestra e dello scavo della Villa dei Papiri, gli edifici e le strade
della città moderna nella scena di Ercolano vengono da OpenStreetMap.

- Dati © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
- Licenza: Open Database License (ODbL) 1.0. Il file derivato
  `src/data/ercolano-pianta.json` resta sotto ODbL; lo produce
  `strumenti/osm/ercolano_osm.py`.

## Interni di sei case di Ercolano — piante di Wikimedia Commons

La disposizione delle stanze, dell'impluvio e del giardino di sei case
(Bicentenario, Atrio a Mosaico, Sannitica, Atrio Corinzio, Due Atri, Erma di
Bronzo) è ricavata dagli schemi disegnati da «V. D.» e caricati su Wikimedia
Commons dall'utente Ursus (2009). I disegni non sono inclusi nel repository:
`strumenti/piante/case_ercolano.py` li scarica in `strumenti/piante/fonti/`.

- `File:Herculanum_Casa_Bicentenario.jpg`, `File:Herculanum_Casa_Atrio_a_Mosaico.jpg`,
  `File:Herculanum_Casa_del_atrio_corinzio.jpg`, `File:Herculanum_Casa_dei_due_atrii.jpg`,
  `File:Herculanum_Casa_erma_di_bronzo.jpg`: pubblico dominio.
- `File:Herculanum_Casa_Sannitica.png`: Creative Commons Attribution-ShareAlike
  4.0 (https://creativecommons.org/licenses/by-sa/4.0/). I dati ricavati da
  questo disegno, la voce «Casa Sannitica» di `src/data/ercolano-interni.json`,
  restano sotto CC BY-SA 4.0.
- Le misure vengono dal contorno di OpenStreetMap (ODbL, sopra): il disegno si
  riscala sul riquadro della casa. Disposizione dagli schemi, dimensioni
  approssimate: non è un rilievo.
