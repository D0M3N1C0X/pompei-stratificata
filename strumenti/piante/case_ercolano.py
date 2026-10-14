"""
Gli interni di sei case di Ercolano, dalle piante libere di Wikimedia Commons.

    python3 strumenti/piante/case_ercolano.py

Le piante sono di «V. D.», caricate dall'utente Ursus nel 2009: cinque in
pubblico dominio, quella della Casa Sannitica in CC BY-SA 4.0. Sono schemi
senza scala grafica; la scala la dà il contorno vero della casa
(OpenStreetMap, src/data/ercolano-pianta.json): il riquadro dei muri del
disegno si fa coincidere con il riquadro della pianta OSM, asse per asse.

Dal disegno si tengono i tratti neri spessi (i muri) con un'apertura
morfologica che cancella le scritte e i tratteggi sottili; l'azzurro è
l'impluvio, il verde il giardino. Il risultato, in metri nel sistema della
scena, va in src/data/ercolano-interni.json.

Che cosa vale: la DISPOSIZIONE delle stanze (atri, tablini, portici, giardini)
viene dagli schemi; le DIMENSIONI sono riscalate sul contorno OSM, quindi
sono approssimate quanto il disegno è in proporzione. Non è un rilievo.

Solo libreria standard: i PNG/JPEG si convertono in BMP con sips (macOS).
"""
import json, os, subprocess, sys, tempfile, urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
FONTI = os.path.join(QUI, 'fonti')
RADICE = os.path.abspath(os.path.join(QUI, '..', '..'))
PIANTA = os.path.join(RADICE, 'src', 'data', 'ercolano-pianta.json')
USCITA = os.path.join(RADICE, 'src', 'data', 'ercolano-interni.json')

# file Commons, nome OSM, ritaglio (x0, y0, x1, y1 in pixel), rotazione del
# disegno rispetto alla scena (0: nord in alto e ovest a sinistra; 180: il
# contrario), licenza
CASE = [
    ('Herculanum_Casa_Bicentenario.jpg', 'Casa del Bicentenario', (180, 55, 456, 556), 0, 'pubblico dominio'),
    ('Herculanum_Casa_Atrio_a_Mosaico.jpg', "Casa dell'Atrio a Mosaico", (185, 4, 472, 606), 0, 'pubblico dominio'),
    ('Herculanum_Casa_Sannitica.png', 'Casa Sannitica', (178, 216, 641, 472), 0, 'CC BY-SA 4.0'),
    ('Herculanum_Casa_del_atrio_corinzio.jpg', "Casa dell'Atrio Corinzio", (154, 198, 586, 437), 0, 'pubblico dominio'),
    ('Herculanum_Casa_dei_due_atrii.jpg', 'Casa dei Due Atri', (64, 254, 612, 442), 0, 'pubblico dominio'),
    # il disegno chiama «Cardo III» la via dell'ingresso, a destra; nella
    # pianta OSM la casa confina a ovest con la Casa dello Scheletro e si
    # affaccia sul Cardo IV, a est: si tiene l'ingresso sulla via vera (con
    # 180° l'ingresso finiva contro il muro della casa vicina)
    ('Herculanum_Casa_erma_di_bronzo.jpg', "Casa dell'Erma di Bronzo", (160, 158, 594, 328), 0, 'pubblico dominio'),
]
CELLA = 0.25       # metri: i muri si campionano a 25 cm


def scarica(nome):
    os.makedirs(FONTI, exist_ok=True)
    dest = os.path.join(FONTI, nome)
    if os.path.exists(dest): return dest
    api = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=File:' + nome
    req = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'pompei-stratificata/8 (github.com/D0M3N1C0X)'}), timeout=60)
    url = list(json.load(req(api))['query']['pages'].values())[0]['imageinfo'][0]['url']
    open(dest, 'wb').write(req(url).read())
    return dest


def pixel(percorso):
    """Legge l'immagine come griglia RGB, passando da un BMP fatto da sips."""
    tmp = tempfile.mktemp(suffix='.bmp')
    subprocess.run(['sips', '-s', 'format', 'bmp', percorso, '--out', tmp], check=True, capture_output=True)
    d = open(tmp, 'rb').read(); os.remove(tmp)
    off = int.from_bytes(d[10:14], 'little'); w = int.from_bytes(d[18:22], 'little', signed=True)
    h = int.from_bytes(d[22:26], 'little', signed=True); bpp = int.from_bytes(d[28:30], 'little') // 8
    riga = (w * bpp + 3) // 4 * 4
    giu = h > 0; h = abs(h)
    img = []
    for y in range(h):
        r = (h - 1 - y) if giu else y
        base = off + r * riga
        img.append([(d[base + x*bpp + 2], d[base + x*bpp + 1], d[base + x*bpp]) for x in range(w)])
    return img


def apertura(m, r=1):
    """Erosione e dilatazione con un quadrato (2r+1): via i tratti sottili."""
    H, W = len(m), len(m[0])
    er = [[all(m[y+j][x+i] for j in range(-r, r+1) for i in range(-r, r+1)) if r <= y < H-r and r <= x < W-r else False
           for x in range(W)] for y in range(H)]
    return [[any(er[y+j][x+i] for j in range(-r, r+1) for i in range(-r, r+1) if 0 <= y+j < H and 0 <= x+i < W)
             for x in range(W)] for y in range(H)]


def rettangoli(m):
    """Maschera booleana → rettangoli: corse per riga, unite fra righe uguali."""
    aperti, fatti = {}, []
    for y, riga in enumerate(m + [[False] * len(m[0])]):
        corse, x = set(), 0
        while x < len(riga):
            if riga[x]:
                k = x
                while k < len(riga) and riga[k]: k += 1
                corse.add((x, k)); x = k
            else: x += 1
        for c in list(aperti):
            if c not in corse: fatti.append((c[0], aperti.pop(c), c[1], y))
        for c in corse:
            if c not in aperti: aperti[c] = y
    return fatti                       # (x0, y0, x1, y1) in celle, estremi esclusi


def main():
    pianta = json.load(open(PIANTA))
    osm = {e['nome']: e for e in pianta['edifici'] if e['nome']}
    out = {'licenza': 'Disposizione dalle piante di «V. D.» (Wikimedia Commons, utente Ursus, 2009): pubblico dominio, '
                      'tranne Casa Sannitica (CC BY-SA 4.0, i dati ricavati restano CC BY-SA). Scala dal contorno OpenStreetMap (ODbL).',
           'nota': 'Metri nel sistema della scena. Muri campionati a 25 cm. Disposizione dagli schemi, dimensioni riscalate: non è un rilievo.',
           'case': {}}
    for file, nome, (cx0, cy0, cx1, cy1), rot, lic in CASE:
        img = pixel(scarica(file))
        sub = [row[cx0:cx1] for row in img[cy0:cy1]]
        H, W = len(sub), len(sub[0])
        nero = apertura([[max(p) < 90 for p in row] for row in sub], 1)
        azzurro = [[(p[2] > 190 and p[1] > 190 and p[0] < 205 and p[2] - p[0] > 15) for p in row] for row in sub]
        verde = [[(p[1] > 150 and p[1] - p[0] > 60 and p[1] - p[2] > 60) for p in row] for row in sub]
        ys = [y for y in range(H) if any(nero[y])]; xs = [x for x in range(W) if any(nero[y][x] for y in range(H))]
        bx0, bx1, by0, by1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
        e = osm[nome]
        ox = [p[0] for p in e['punti']]; oz = [p[1] for p in e['punti']]
        X0, X1, Z0, Z1 = min(ox), max(ox), min(oz), max(oz)
        sx, sz = (X1 - X0) / (bx1 - bx0), (Z1 - Z0) / (by1 - by0)
        def metri(u, v):
            # u, v: pixel nel ritaglio → metri nella scena, con la rotazione
            fu, fv = (u - bx0) / (bx1 - bx0), (v - by0) / (by1 - by0)
            if rot == 180: fu, fv = 1 - fu, 1 - fv
            return X0 + fu * (X1 - X0), Z0 + fv * (Z1 - Z0)
        # i muri, ricampionati a CELLA metri
        nx, nz = max(1, round((X1 - X0) / CELLA)), max(1, round((Z1 - Z0) / CELLA))
        griglia = [[False] * nx for _ in range(nz)]
        for j in range(nz):
            for i in range(nx):
                fu, fv = (i + 0.5) / nx, (j + 0.5) / nz
                if rot == 180: fu, fv = 1 - fu, 1 - fv
                u, v = int(bx0 + fu * (bx1 - bx0)), int(by0 + fv * (by1 - by0))
                griglia[j][i] = nero[min(H-1, v)][min(W-1, u)]
        muri = [[round(X0 + a*CELLA, 2), round(Z0 + b*CELLA, 2), round(X0 + c*CELLA, 2), round(Z0 + d*CELLA, 2)]
                for (a, b, c, d) in rettangoli(griglia)]
        def riquadro(mask):
            # le macchie di colore come componenti connesse: separare per
            # colonne fondeva l'impluvio e la vasca del giardino allineati
            visto = [[False] * W for _ in range(H)]; res = []
            for y0 in range(H):
                for x0 in range(W):
                    if not mask[y0][x0] or visto[y0][x0]: continue
                    pila, comp = [(x0, y0)], []
                    visto[y0][x0] = True
                    while pila:
                        x, y = pila.pop(); comp.append((x, y))
                        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                            u, v = x+dx, y+dy
                            if 0 <= u < W and 0 <= v < H and mask[v][u] and not visto[v][u]:
                                visto[v][u] = True; pila.append((u, v))
                    if len(comp) < 30: continue
                    a = metri(min(x for x, _ in comp), min(y for _, y in comp)); b = metri(max(x for x, _ in comp) + 1, max(y for _, y in comp) + 1)
                    r = [round(min(a[0], b[0]), 2), round(min(a[1], b[1]), 2), round(max(a[0], b[0]), 2), round(max(a[1], b[1]), 2)]
                    if (r[2] - r[0]) * (r[3] - r[1]) >= 1.5: res.append(r)    # le cornici spezzate no
            return res
        # via i frammenti di lettere sopravvissuti all'apertura: celle isolate
        # (0,0625 m²); le colonne, almeno 2 × 2 celle, restano
        muri = [r for r in muri if (r[2] - r[0]) * (r[3] - r[1]) >= 0.07]
        out['case'][nome] = {'osm': e['id'], 'fonte': 'File:' + file, 'licenza': lic, 'rotazione': rot,
                             'scala_m_px': [round(sx, 3), round(sz, 3)],
                             'muri': muri, 'impluvi': riquadro(azzurro), 'giardini': riquadro(verde)}
        print(f'{nome:28s} muri {len(muri):4d} · impluvi {len(out["case"][nome]["impluvi"])} · giardini {len(out["case"][nome]["giardini"])} · '
              f'scala {sx:.3f}×{sz:.3f} m/px (diverse = disegno fuori proporzione)')
    json.dump(out, open(USCITA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('scritto', USCITA, os.path.getsize(USCITA), 'byte')


if __name__ == '__main__':
    main()
