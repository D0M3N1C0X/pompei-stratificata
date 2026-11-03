"""
Gli interni di tre case di Pompei, da piante libere con la scala grafica.

    python3 strumenti/piante/case_pompei.py

  Casa del Fauno (VI.12.2)   A. Mau, Pompeii, its Life and Art, fig. 137
                              (1899/1907), pubblico dominio
  Casa dei Vettii (VI.15.1)  A. Mau, 1907, pubblico dominio
  Casa del Menandro (I.10.4) Udimu, Wikimedia Commons, CC BY-SA 4.0: i
                              dati ricavati restano CC BY-SA

A differenza di Ercolano (strumenti/piante/case_ercolano.py) qui le MISURE
vengono dal disegno: ognuno ha la sua scala grafica, misurata in pixel
(SCALA). Il contorno di OpenStreetMap serve a due cose soltanto: controllare
che il disegno abbia la misura giusta (area a confronto) e scegliere
l'orientamento, provando le quattro rotazioni e tenendo quella che si
sovrappone meglio alla sagoma vera. La Casa del Menandro è disegnata
ruotata di ~35°: prima la si raddrizza sull'angolo che allinea di più i muri.

Uscita: src/data/pompei-interni.json, metri nel sistema della griglia
locale della casa (x verso est, z verso sud, origine nell'angolo nord-ovest).
Dove la casa sta nella scena lo decide src/app.js (la città della scena è
schematica, con la griglia raddrizzata).

Solo libreria standard; le immagini si leggono con sips (macOS) e curl.
"""
import json, math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from case_ercolano import pixel, apertura, rettangoli

QUI = os.path.dirname(os.path.abspath(__file__))
FONTI = os.path.join(QUI, 'fonti')
USCITA = os.path.join(QUI, '..', '..', 'src', 'data', 'pompei-interni.json')
UA = 'pompei-stratificata/8 (github.com/D0M3N1C0X)'
CELLA = 0.25

# file, ritaglio (x0,y0,x1,y1), px per metro dalla scala grafica, apertura,
# OSM (tipo, id), licenza
CASE = {
  # Fauno: apertura di raggio 2, perché Mau disegna le soglie delle porte
  # come rettangoli tratteggiati, che con raggio 1 restavano muri e
  # chiudevano metà della casa.
  # Rotazioni di 90° e 270° quasi pari col contorno OSM (la casa è
  # quasi un rettangolo); decide l'ingresso: le fauces A di Mau, a sinistra
  # nel disegno, danno su Via della Fortuna, cioè a sud → 270°
  'fauno':    dict(nome='Casa del Fauno', file='Plan of the house of the Faun in Mau fig137.png',
                   ritaglio=(25, 12, 1545, 606), scala=335/20, r=2, osm=('way', 240715554), rotazione=270,
                   licenza='pubblico dominio', autore='A. Mau 1899/1907, fig. 137'),
  'vettii':   dict(nome='Casa dei Vettii', file='Floor Plan of the House of the Vettii Pompeii (VI 15,1) by August Mau 1907.jpg',
                   ritaglio=(232, 62, 1488, 1532), scala=753/20, r=3, osm=('relation', 3247807),
                   licenza='pubblico dominio', autore='A. Mau 1907'),
  # Menandro: disegno e contorno OSM non hanno la stessa estensione (56 × 71
  # contro 42 × 62 m), e nessuna rotazione, nemmeno a specchio, supera 0,51
  # di sovrapposizione. Decide l'ingresso: I.10.4 dà sul Vicolo del Menandro,
  # che OSM mette sul lato nord, e l'atrio dietro le fauces è l'ala in alto
  # del disegno raddrizzato → 0°
  'menandro': dict(nome='Casa del Menandro', file='Casa menandro plan.jpg',
                   ritaglio=(25, 15, 1075, 900), scala=153/10, r=1, osm=('relation', 14481353), rotazione=0,
                   licenza='CC BY-SA 4.0', autore='Udimu, Wikimedia Commons'),
}


def scarica(nome):
    os.makedirs(FONTI, exist_ok=True)
    dest = os.path.join(FONTI, nome.replace(' ', '_'))
    if os.path.exists(dest): return dest
    api = ('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=File:'
           + nome.replace(' ', '%20'))
    d = json.loads(subprocess.run(['curl', '-s', '-A', UA, api], capture_output=True, check=True).stdout)
    url = list(d['query']['pages'].values())[0]['imageinfo'][0]['url']
    subprocess.run(['curl', '-s', '-A', UA, '-o', dest, url], check=True)
    return dest


CACHE_OSM = os.path.join(FONTI, 'osm_case_pompei.json')


def elementi_osm():
    """I tre contorni, scaricati una volta sola (Overpass rifiuta le richieste
    ravvicinate) e tenuti in fonti/, che non va nel repository."""
    if not os.path.exists(CACHE_OSM):
        ids = {t: [str(c['osm'][1]) for c in CASE.values() if c['osm'][0] == t] for t in ('way', 'relation')}
        q = '[out:json][timeout:60];(' + ''.join(f'{t}(id:{",".join(v)});' for t, v in ids.items() if v) + ');out geom;'
        r = subprocess.run(['curl', '-s', '-A', UA, '--data-urlencode', 'data=' + q,
                            'https://overpass.private.coffee/api/interpreter'], capture_output=True, check=True)
        json.loads(r.stdout)                         # se non è JSON, meglio fermarsi qui
        open(CACHE_OSM, 'wb').write(r.stdout)
    return json.load(open(CACHE_OSM))['elements']


def contorno_osm(tipo, id_):
    """Il contorno OSM nella griglia locale: assi dal lato più lungo."""
    e = next(e for e in elementi_osm() if e['type'] == tipo and e['id'] == id_)
    g = e.get('geometry') or [p for m in e.get('members', []) if m.get('role') == 'outer' for p in m.get('geometry', [])]
    lat0 = sum(p['lat'] for p in g) / len(g)
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110540
    P = [((p['lon'] - g[0]['lon']) * kx, (p['lat'] - g[0]['lat']) * ky) for p in g]
    i = max(range(len(P) - 1), key=lambda i: math.hypot(P[i+1][0] - P[i][0], P[i+1][1] - P[i][1]))
    az = math.atan2(P[i+1][0] - P[i][0], P[i+1][1] - P[i][1]) % math.pi
    if az < math.pi / 2: az += math.pi / 2          # l'asse «sud» della griglia, fra 90° e 180°
    sud = (math.sin(az), math.cos(az)); est = (-sud[1], sud[0])
    L = [(x*est[0] + y*est[1], x*sud[0] + y*sud[1]) for x, y in P]
    x0, z0 = min(p[0] for p in L), min(p[1] for p in L)
    L = [(x - x0, z - z0) for x, z in L]
    area = 0.5 * abs(sum(L[i][0]*L[i+1][1] - L[i+1][0]*L[i][1] for i in range(len(L) - 1)))
    return L, area, math.degrees(az)


def dentro(px, pz, poly):
    c = False
    for i in range(len(poly) - 1):
        (ax, az), (bx, bz) = poly[i], poly[i+1]
        if (az > pz) != (bz > pz) and px < ax + (pz - az) * (bx - ax) / (bz - az): c = not c
    return c


def raddrizza(nero, H, W):
    """L'angolo (gradi) che allinea di più i muri agli assi."""
    pts = [(x, y) for y in range(0, H, 2) for x in range(0, W, 2) if nero[y][x]]
    def nitidezza(a):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        hx, hy = {}, {}
        for x, y in pts:
            u, v = int((x*c + y*s) / 3), int((-x*s + y*c) / 3)
            hx[u] = hx.get(u, 0) + 1; hy[v] = hy.get(v, 0) + 1
        return sum(n*n for n in hx.values()) + sum(n*n for n in hy.values())
    grezzo = max(range(-45, 46), key=nitidezza)
    return max([grezzo + d/4 for d in range(-4, 5)], key=nitidezza)


def anteprima(chiave, g, osm):
    """Un PNG di controllo in fonti/: muri in nero, contorno OSM in rosso."""
    h, w = len(g), len(g[0]); M = 4
    W, H = w + 2*M, h + 2*M
    pix = [[(255, 255, 255)] * W for _ in range(H)]
    for j in range(h):
        for i in range(w):
            if g[j][i]: pix[j+M][i+M] = (30, 30, 30)
    for k in range(len(osm) - 1):
        (ax, az), (bx, bz) = osm[k], osm[k+1]
        n = int(max(abs(bx-ax), abs(bz-az)) / CELLA * 2) + 1
        for t in range(n + 1):
            x = int((ax + (bx-ax)*t/n) / CELLA) + M; z = int((az + (bz-az)*t/n) / CELLA) + M
            if 0 <= x < W and 0 <= z < H: pix[z][x] = (220, 40, 40)
    riga = (W * 3 + 3) // 4 * 4
    corpo = b''.join(bytes(c for p in pix[H-1-y] for c in p[::-1]) + bytes(riga - W*3) for y in range(H))
    bmp = (b'BM' + (54 + len(corpo)).to_bytes(4, 'little') + bytes(4) + (54).to_bytes(4, 'little') + (40).to_bytes(4, 'little')
           + W.to_bytes(4, 'little') + H.to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (24).to_bytes(2, 'little')
           + bytes(4) + len(corpo).to_bytes(4, 'little') + bytes(16) + corpo)
    tmp = os.path.join(FONTI, f'controllo_{chiave}.bmp'); open(tmp, 'wb').write(bmp)
    subprocess.run(['sips', '-s', 'format', 'png', tmp, '--out', tmp[:-4] + '.png'], capture_output=True)
    os.remove(tmp)


def main():
    out = {'licenza': 'Fauno e Vettii da A. Mau (1899/1907), pubblico dominio; Menandro da Udimu (Wikimedia Commons), '
                      'CC BY-SA 4.0: la voce «menandro» resta CC BY-SA. Contorni OpenStreetMap (ODbL) solo per il '
                      'controllo della misura e dell\'orientamento.',
           'nota': 'Metri nella griglia locale della casa: x verso est, z verso sud, origine a nord-ovest. Muri '
                   'campionati a 25 cm dal disegno, con la sua scala grafica. Non è un rilievo.',
           'case': {}}
    for chiave, c in CASE.items():
        img = pixel(scarica(c['file']))
        x0, y0, x1, y1 = c['ritaglio']
        sub = [row[x0:x1] for row in img[y0:y1]]
        H, W = len(sub), len(sub[0])
        nero = apertura([[max(p) < 110 for p in row] for row in sub], c['r'])
        ang = raddrizza(nero, H, W)
        k = c['scala']
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        # i pixel di muro, raddrizzati e in metri
        P = [((x*ca + y*sa) / k, (-x*sa + y*ca) / k) for y in range(H) for x in range(W) if nero[y][x]]
        mx, mz = min(p[0] for p in P), min(p[1] for p in P)
        nx = int((max(p[0] for p in P) - mx) / CELLA) + 1
        nz = int((max(p[1] for p in P) - mz) / CELLA) + 1
        conta = [[0] * nx for _ in range(nz)]
        for u, v in P: conta[int((v - mz) / CELLA)][int((u - mx) / CELLA)] += 1
        soglia = (CELLA * k) ** 2 * 0.35                   # cella «muro» se è nera per più di un terzo
        griglia = [[n >= soglia for n in r] for r in conta]
        # la sagoma: ciò che non si raggiunge dal bordo senza attraversare muri.
        # Le porte sulla strada la lascerebbero aperta: per questo calcolo
        # soltanto i muri si ingrossano di 1,5 m, e la sagoma si stringe poi
        # dello stesso tanto (una chiusura morfologica)
        R = 6
        def dilata(g, val):
            righe = [[any(g[j][max(0, i-R):i+R+1]) == val for i in range(nx)] for j in range(nz)]
            return [[any(righe[jj][i] for jj in range(max(0, j-R), min(nz, j+R+1))) == val for i in range(nx)] for j in range(nz)]
        chiusa = dilata(griglia, True)
        fuori = [[False] * nx for _ in range(nz)]
        pila = [(i, j) for i in range(nx) for j in (0, nz-1)] + [(i, j) for j in range(nz) for i in (0, nx-1)]
        while pila:
            i, j = pila.pop()
            if 0 <= i < nx and 0 <= j < nz and not fuori[j][i] and not chiusa[j][i]:
                fuori[j][i] = True; pila += [(i+1, j), (i-1, j), (i, j+1), (i, j-1)]
        dentro_ = [[not fuori[j][i] for i in range(nx)] for j in range(nz)]
        # erosione dello stesso raggio: la sagoma torna alla misura dei muri
        righe = [[all(dentro_[j][max(0, i-R):i+R+1]) for i in range(nx)] for j in range(nz)]
        sagoma = [[all(righe[jj][i] for jj in range(max(0, j-R), min(nz, j+R+1))) or griglia[j][i] for i in range(nx)] for j in range(nz)]
        # l'orientamento: le quattro rotazioni a confronto con il contorno OSM
        osm, area_osm, az = contorno_osm(*c['osm'])
        def ruota(g, q):
            for _ in range(q): g = [list(r) for r in zip(*g[::-1])]      # 90° in senso orario
            return g
        migliore = None; iou_di = {}
        for q in range(4):
            s = ruota(sagoma, q); h, w = len(s), len(s[0])
            inter = unione = 0
            for j in range(h):
                for i in range(w):
                    a = s[j][i]; b = dentro((i + .5) * CELLA, (j + .5) * CELLA, osm)
                    inter += a and b; unione += a or b
            iou = inter / max(1, unione); iou_di[q] = iou
            if migliore is None or iou > migliore[1]: migliore = (q, iou)
            print(f'  {chiave:9s} rotazione {q*90:3d}°  sovrapposizione con OSM {iou:.2f}')
        q = c['rotazione'] // 90 if 'rotazione' in c else migliore[0]
        g = ruota(griglia, q)
        muri = [[round(a*CELLA, 2), round(b*CELLA, 2), round(c2*CELLA, 2), round(d*CELLA, 2)] for a, b, c2, d in rettangoli(g)]
        muri = [r for r in muri if (r[2]-r[0]) * (r[3]-r[1]) >= 0.07]
        area_dis = sum(r.count(True) for r in ruota(sagoma, q)) * CELLA**2
        dim = [round(len(g[0]) * CELLA, 2), round(len(g) * CELLA, 2)]
        out['case'][chiave] = {'nome': c['nome'], 'fonte': 'File:' + c['file'], 'autore': c['autore'], 'licenza': c['licenza'],
                               'osm': '/'.join(map(str, c['osm'])), 'scala_px_m': round(k, 3), 'raddrizzata_gradi': round(ang, 2),
                               'rotazione_gradi': q * 90, 'sovrapposizione_osm': round(iou_di[q], 2),
                               'area_disegno_m2': round(area_dis), 'area_osm_m2': round(area_osm),
                               'dim': dim, 'muri': muri}
        print(f'{c["nome"]:20s} raddrizzata {ang:6.2f}°  ruotata {q*90}°  {dim[0]} × {dim[1]} m  '
              f'area disegno {area_dis:.0f} m² / OSM {area_osm:.0f} m²  muri {len(muri)}')
        anteprima(chiave, g, osm)
    json.dump(out, open(USCITA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('scritto', os.path.abspath(USCITA), os.path.getsize(USCITA), 'byte')


if __name__ == '__main__':
    main()
