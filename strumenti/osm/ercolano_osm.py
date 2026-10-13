"""
La pianta dello scavo di Ercolano, da OpenStreetMap.

    python3 strumenti/osm/ercolano_osm.py

Scrive src/data/ercolano-pianta.json: le case scavate (con il loro nome
quando OSM lo ha), la Palestra, le vie antiche, in metri, nel sistema della
scena: X lungo i decumani, Z lungo i cardini con il mare verso +Z, origine
all'incrocio fra Cardo IV e Decumano Inferiore.

Perché OSM: per le vie di Ercolano non ho trovato larghezze pubblicate, e la
scena era costruita a occhio, con carreggiate di 7–13 m. Le piante di OSM sono
tracciate dai contributori, di solito su ortofoto: non sono un rilievo
archeologico, ma sono geometria vera, verificabile da chiunque, e molto più
vicina al reale di un disegno a mano. Lo si dichiara così.

Dati © OpenStreetMap contributors, licenza ODbL 1.0
(https://www.openstreetmap.org/copyright). Il JSON prodotto è un database
derivato e resta sotto ODbL: lo dice il suo campo «licenza».

Nessuna dipendenza: solo la libreria standard di Python.
"""
import json, math, os, sys, urllib.parse, urllib.request, datetime

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.abspath(os.path.join(QUI, '..', '..', 'src', 'data', 'ercolano-pianta.json'))
BBOX = (40.8025, 14.3435, 40.8085, 14.3505)          # sud, ovest, nord, est
SERVER = ['https://overpass.private.coffee/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass-api.de/api/interpreter']
QUERY = ('[out:json][timeout:150];(way(%s,%s,%s,%s)[~"^(historic|highway|building|ruins)$"~"."];);out geom tags;' % BBOX)


def scarica():
    corpo = urllib.parse.urlencode({'data': QUERY}).encode()
    for url in SERVER:
        try:
            req = urllib.request.Request(url, data=corpo, headers={'User-Agent': 'pompei-stratificata/8 (github.com/D0M3N1C0X)'})
            with urllib.request.urlopen(req, timeout=200) as r:
                return json.loads(r.read()), url
        except Exception as e:
            print('server non disponibile:', url, e, file=sys.stderr)
    sys.exit('nessun server Overpass ha risposto')


def main():
    if len(sys.argv) > 1:                            # un file già scaricato, per lavorare offline
        dati, server = json.load(open(sys.argv[1])), sys.argv[1]
    else:
        dati, server = scarica()
    E = [e for e in dati['elements'] if e['type'] == 'way' and e.get('geometry')]

    lat0, lon0 = 40.8055, 14.3475
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110540
    metri = lambda g: ((g['lon'] - lon0) * kx, (g['lat'] - lat0) * ky)

    # l'azimut dei cardini, verso monte: media dei tratti con nome
    def azimut(g):
        (x0, y0), (x1, y1) = metri(g[0]), metri(g[-1])
        a = math.degrees(math.atan2(x1 - x0, y1 - y0)) % 360
        return a if a < 180 else a - 180               # tutti verso nord-est
    cardini = [e for e in E if e['tags'].get('name', '').startswith('Cardo')]
    az = sum(azimut(e['geometry']) for e in cardini) / len(cardini)
    decumani = [e for e in E if e['tags'].get('name', '').startswith('Decumano')]
    az_dec = sum((azimut(e['geometry']) + 90) % 180 + 90 for e in decumani) / len(decumani)

    ux, uy = math.sin(math.radians(az)), math.cos(math.radians(az))   # verso monte
    vx, vy = uy, -ux                                                   # lungo i decumani
    ruota = lambda p: (p[0] * vx + p[1] * vy, -(p[0] * ux + p[1] * uy))

    def linea(nome):
        e = next(e for e in E if e['tags'].get('name') == nome)
        return [ruota(metri(g)) for g in e['geometry']]
    # origine: Cardo IV sulla linea del Decumano Inferiore
    c4 = linea('Cardo IV Superiore') + linea('Cardo IV Inferiore')
    di = linea('Decumano Inferiore')
    X0 = sum(p[0] for p in c4) / len(c4)
    Z0 = sum(p[1] for p in di) / len(di)
    loc = lambda p: (round(p[0] - X0, 2), round(p[1] - Z0, 2))

    def area(g):
        return abs(sum(g[i][0] * g[i + 1][1] - g[i + 1][0] * g[i][1] for i in range(len(g) - 1))) / 2

    edifici, vie, grandi = [], [], {}
    for e in E:
        t = e['tags']
        g = [loc(ruota(metri(x))) for x in e['geometry']]
        if (t.get('historic') == 'archaeological_site' or t.get('building') == 'ruins') and g[0] == g[-1]:
            a = area(g)
            nome = t.get('name')
            if a >= 3000:
                grandi[nome or str(e['id'])] = {'punti': g, 'area': round(a)}
                continue
            edifici.append({'id': e['id'], 'nome': nome, 'area': round(a), 'punti': g})
        elif t.get('name', '').startswith(('Cardo', 'Decumano')):
            vie.append({'nome': t['name'], 'punti': g})

    # --- la fossa di scavo: ciò che è stato tolto del deposito -----------
    # Non c'è un poligono OSM della fossa (quello del Parco è il recinto, con
    # la rampa e terreni non scavati). La si ricava da ciò che è scavato: le
    # case allargate di 5 m, le vie, la fascia della Palestra su Cardo V,
    # l'area sacra e la spiaggia davanti ai fornici [ipotesi: x -30…95,
    # z 100…140], lo scavo della Villa dei Papiri. Griglia da 2 m; si
    # salvano le strisce NON scavate, che la scena alza a deposito.
    CELLA, BX0, BX1, BZ0, BZ1 = 2.0, -330.0, 330.0, -260.0, 260.0
    nx, nz = int((BX1 - BX0) / CELLA), int((BZ1 - BZ0) / CELLA)
    def dentro(px, pz, g):
        c = False
        for i in range(len(g) - 1):
            (x1, z1), (x2, z2) = g[i], g[i + 1]
            if (z1 > pz) != (z2 > pz) and px < (x2 - x1) * (pz - z1) / (z2 - z1) + x1: c = not c
        return c
    def dist_seg(px, pz, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
        t = max(0, min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2))
        return math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz)
    def vicino(px, pz, g, d):
        if dentro(px, pz, g): return True
        return any(dist_seg(px, pz, g[i], g[i + 1]) <= d for i in range(len(g) - 1))
    poligoni = [d['punti'] for d in edifici]
    if 'Villa dei Papiri' in grandi: poligoni.append(grandi['Villa dei Papiri']['punti'])
    linee = [v['punti'] for v in vie]
    scavata = [[False] * nx for _ in range(nz)]
    for j in range(nz):
        pz = BZ0 + (j + 0.5) * CELLA
        for i in range(nx):
            px = BX0 + (i + 0.5) * CELLA
            ok = (-30 <= px <= 95 and 100 <= pz <= 140) or (48 <= px <= 62 and -95 <= pz <= 7)
            if not ok:
                for g in poligoni:
                    xs = [q[0] for q in g]; zs = [q[1] for q in g]
                    if min(xs) - 6 <= px <= max(xs) + 6 and min(zs) - 6 <= pz <= max(zs) + 6 and vicino(px, pz, g, 5):
                        ok = True; break
            if not ok:
                for g in linee:
                    if any(dist_seg(px, pz, g[k], g[k + 1]) <= 9 for k in range(len(g) - 1)):
                        ok = True; break
            scavata[j][i] = ok
    righe = []
    for j in range(nz):
        corse, i = [], 0
        while i < nx:
            if not scavata[j][i]:
                k = i
                while k < nx and not scavata[j][k]: k += 1
                corse.append([i, k]); i = k
            else: i += 1
        righe.append(corse)
    maschera = {'cella': CELLA, 'x0': BX0, 'z0': BZ0, 'nx': nx, 'nz': nz, 'deposito': righe,
                'nota': 'righe lungo Z, corse [i0,i1) di celle NON scavate lungo X'}

    # gli edifici moderni, che stanno sopra il deposito
    moderni = []
    for e in E:
        t = e['tags']
        if t.get('building') and t.get('historic') != 'archaeological_site' and t.get('building') != 'ruins':
            g = [loc(ruota(metri(x))) for x in e['geometry']]
            if g[0] == g[-1] and len(g) >= 4: moderni.append({'punti': g, 'piani': t.get('building:levels')})
    strade_moderne = []
    for e in E:
        t = e['tags']
        if t.get('highway') in ('primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'pedestrian') and not t.get('name', '').startswith(('Cardo', 'Decumano')):
            strade_moderne.append({'nome': t.get('name'), 'tipo': t['highway'], 'punti': [loc(ruota(metri(x))) for x in e['geometry']]})
    teatro = next(([loc(ruota(metri(x))) for x in e['geometry']] for e in E if e['tags'].get('name') == 'ingresso anfiteatro'), None)

    out = {
        'licenza': 'ODbL 1.0 — dati © OpenStreetMap contributors, https://www.openstreetmap.org/copyright',
        'fonte': server,
        'scaricato': datetime.date.today().isoformat(),
        'nota': 'Piante tracciate dai contributori OSM, non un rilievo archeologico. Metri, X lungo i decumani, Z verso il mare, origine Cardo IV × Decumano Inferiore.',
        'azimut_cardini': round(az, 1),
        'azimut_decumani': round(az_dec % 180, 1),
        'edifici': sorted(edifici, key=lambda d: d['id']),
        'vie': sorted(vie, key=lambda d: d['nome']),
        'palestra': grandi.get('Palaestra'),
        'scavo': grandi.get('Scavi archeologici di Ercolano'),
        'villa_papiri': grandi.get('Villa dei Papiri'),
        'ingresso_teatro': teatro,
        'moderni': moderni,
        'strade_moderne': strade_moderne,
        'maschera': maschera,
    }
    os.makedirs(os.path.dirname(USCITA), exist_ok=True)
    json.dump(out, open(USCITA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('scritto', USCITA, os.path.getsize(USCITA), 'byte ·', len(edifici), 'edifici ·', len(vie), 'vie · cardini', out['azimut_cardini'], '° · decumani', out['azimut_decumani'], '°')


if __name__ == '__main__':
    main()
