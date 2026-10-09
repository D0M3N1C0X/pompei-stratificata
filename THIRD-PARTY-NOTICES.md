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
- `Plastered Wall 05` — https://polyhaven.com/a/plastered_wall_05
- `Roof Tiles` — https://polyhaven.com/a/roof_tiles

## Figure umane — MakeHuman / MPFB

I corpi, gli occhi, le sopracciglia, i capelli e le texture della pelle degli
abitanti del 79 e di oggi (`src/assets/figure/romana-*.glb`, `oggi-*.glb`) vengono dagli asset di
sistema di MakeHuman, usati con l'estensione MPFB 2 per Blender, distribuiti
con licenza CC0 1.0. Le vesti sono costruite dagli script
`strumenti/blender/figure_romane.py` e `figure_oggi.py` di questo progetto.

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
