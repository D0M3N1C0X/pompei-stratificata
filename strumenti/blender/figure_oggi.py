# =====================================================================
# GLI ABITANTI DI OGGI: turisti, archeologi, operai del cantiere.
#
#   npm run figure                              (tutte le serie)
#   Blender -b --python figure_oggi.py -- 3     solo la variante 3 (prove)
#
# Scrive src/assets/figure/oggi-NN.glb e oggi.json.
#
# È la fase più documentata di tutte, perché si può guardare: i vestiti
# sono quelli di chiunque visiti o lavori a Pompei oggi. Non c'è niente da
# ricostruire, ed è dichiarato così: OSSERVAZIONE CONTEMPORANEA, non fonte.
# Due scelte invece vanno dette:
#   · il gilet ad alta visibilità e il casco degli operai sono i dispositivi
#     di un cantiere; che in ogni settore dello scavo si portino entrambi è
#     una semplificazione ............................................ IPOTESI
#   · le donne in pantaloni o pantaloncini, senza gonne: è una scelta di
#     semplicità del modello, non un dato ............................. SCELTA
# Le carnagioni sono varie: chi visita Pompei viene da tutto il mondo.
#
# Le funzioni di corpo, pesi e cappello vengono da figure_romane.py; qui
# cambiano i ruoli e i vestiti, tutti «dipinti» sul corpo per regioni di
# ossa (maglia, pantaloni, scarpe), più il cappello come guscio.
# =====================================================================
import bpy, bmesh, os, sys, json, math, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import figure_romane as FR
from figure_romane import (HumanService, DATI, pulisci, materiale, osso_dominante,
                           misure, nuova_mesh, smooth, volto, lin)

USCITA = FR.USCITA

MAGLIE = [(232, 232, 228), (40, 44, 52), (180, 52, 48), (52, 92, 150), (226, 196, 90), (96, 140, 96), (120, 120, 126), (70, 150, 160)]
PANTALONI = [(50, 62, 92), (196, 182, 150), (60, 60, 62), (120, 104, 82), (82, 96, 70), (210, 206, 196)]
SCARPE = [(240, 240, 238), (40, 40, 42), (120, 92, 66), (90, 110, 140)]
GILET = (255, 120, 20)
CASCO = [(245, 245, 240), (250, 210, 40)]
CAPPELLI = [(230, 222, 200), (40, 70, 120), (200, 60, 50), (240, 240, 236)]
# chi visita Pompei viene da tutto il mondo: tutte le carnagioni di MakeHuman
RAZZE = [{'caucasian': 0.9, 'african': 0.05, 'asian': 0.05}, {'caucasian': 0.1, 'african': 0.05, 'asian': 0.85},
         {'caucasian': 0.1, 'african': 0.85, 'asian': 0.05}, {'caucasian': 0.6, 'african': 0.2, 'asian': 0.2}]
PELLI = {'caucasian': [(0.9, 0.76, 0.66), (0.86, 0.7, 0.58)], 'asian': [(0.88, 0.74, 0.6)], 'african': [(0.55, 0.4, 0.3), (0.45, 0.32, 0.24)]}
CAPELLI_COL = [(0.08, 0.07, 0.06), (0.18, 0.12, 0.08), (0.36, 0.26, 0.16), (0.55, 0.42, 0.25)]

# maniche: corte o lunghe · gambe: corte (pantaloncini) o lunghe
RUOLI = [
    ('turista',    dict(sesso='m', eta=(0.3, 0.75), n=2, maniche=['corte'], gambe=['corte', 'lunghe'], capo=['berretto', 'nudo'])),
    ('turista',    dict(sesso='f', eta=(0.3, 0.7),  n=2, maniche=['corte'], gambe=['corte', 'lunghe'], capo=['cappello', 'nudo'])),
    ('archeologo', dict(sesso='m', eta=(0.4, 0.7),  n=1, maniche=['lunghe'], gambe=['lunghe'], capo=['cappello'])),
    ('archeologa', dict(sesso='f', eta=(0.35, 0.6), n=1, maniche=['lunghe'], gambe=['lunghe'], capo=['cappello'])),
    ('operaio',    dict(sesso='m', eta=(0.35, 0.7), n=2, maniche=['corte', 'lunghe'], gambe=['lunghe'], capo=['casco'], gilet=True)),
]
VARIANTI = []
for ruolo, spec in RUOLI:
    for k in range(spec['n']):
        i = len(VARIANTI)
        r = random.Random(2026 + i * 41)
        VARIANTI.append({'n': i, 'ruolo': ruolo, 'sesso': spec['sesso'], 'eta': round(r.uniform(*spec['eta']), 3),
                         'seme': 2026 + i * 41, 'spec': spec, 'k': k})


def crea(var):
    r = random.Random(var['seme'])
    pulisci()
    sp = var['spec']
    m = var['sesso'] == 'm'
    razza = r.choice(RAZZE)
    macro = {'gender': r.uniform(0.92, 1.0) if m else r.uniform(0.0, 0.08), 'age': var['eta'],
             'muscle': r.uniform(0.4, 0.62), 'weight': r.uniform(0.35, 0.65), 'proportions': r.uniform(0.4, 0.6),
             'height': r.uniform(0.35, 0.65), 'cupsize': 0.45, 'firmness': 0.5, 'race': razza}
    base = HumanService.create_human(macro_detail_dict=macro)
    volto(base, r)
    HumanService.add_builtin_rig(base, 'cmu_mb')
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    rig.name = f'oggi-{var["n"]:02d}'
    proxy = 'male1591' if m else 'female1605'
    HumanService.add_mhclo_asset(os.path.join(DATI('proxymeshes'), proxy, proxy + '.proxy'), base, asset_type='Proxymeshes', subdiv_levels=0)
    HumanService.add_mhclo_asset(os.path.join(DATI('eyes'), 'low-poly', 'low-poly.mhclo'), base, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    sop = f'eyebrow{r.randint(1, 12):03d}'
    HumanService.add_mhclo_asset(os.path.join(DATI('eyebrows'), sop, sop + '.mhclo'), base, asset_type='Eyebrows', subdiv_levels=0, material_type='MAKESKIN')
    corpo = next(o for o in rig.children if o.type == 'MESH' and proxy in o.name)

    dominante = max(razza, key=razza.get)
    pelle_tinta = r.choice(PELLI[dominante])
    capelli_tinta = r.choice(CAPELLI_COL if dominante == 'caucasian' else CAPELLI_COL[:2])
    # dentro un ruolo le varianti si alternano, così ogni combinazione si vede
    k = var['k']
    maniche = sp['maniche'][k % len(sp['maniche'])]
    gambe = sp['gambe'][k % len(sp['gambe'])]
    capo = sp['capo'][k % len(sp['capo'])]

    eta_pelle = 'young' if var['eta'] < 0.62 else 'middleage' if var['eta'] < 0.78 else 'old'
    tipo = {'caucasian': 'caucasian', 'asian': 'asian', 'african': 'african'}[dominante]
    cartella = os.path.join(DATI('skins'), f'{eta_pelle}_{tipo}_{"male" if m else "female"}')
    png = next((os.path.join(dp, f) for dp, _, fs in os.walk(cartella) for f in fs if f.endswith('diffuse.png')), None)
    img = bpy.data.images.load(png) if png else None
    if img and max(img.size) > 512: img.scale(512, 512)

    if sp.get('gilet'):
        maglia = lin(r.choice([(150, 150, 150), (60, 66, 80)]))
        pantaloni = lin(r.choice([(60, 66, 80), (90, 84, 70)]))
    elif var['ruolo'].startswith('archeolog'):
        maglia = lin(r.choice([(200, 190, 160), (150, 160, 140), (230, 230, 226)]))
        pantaloni = lin(r.choice([(120, 104, 82), (82, 96, 70), (196, 182, 150)]))
    else:
        maglia, pantaloni = lin(r.choice(MAGLIE)), lin(r.choice(PANTALONI))
    M = {
        'pelle': materiale('pelle', (1, 1, 1, 1), 0.55, img),
        'maglia': materiale('maglia', maglia, 0.9),
        'pantaloni': materiale('pantaloni', pantaloni, 0.9),
        'scarpe': materiale('scarpe', lin(r.choice(SCARPE)), 0.6),
        'gilet': materiale('gilet', lin(GILET), 0.7),
    }
    corpo.data.materials.clear()
    for k in ['pelle', 'maglia', 'pantaloni', 'scarpe', 'gilet']: corpo.data.materials.append(M[k])
    PELLE = {'Head', 'Neck', 'Neck1', 'LeftHand', 'RightHand', 'LThumb', 'RThumb', 'LeftFingerBase', 'RightFingerBase', 'LeftHandFinger1', 'RightHandFinger1'}
    if maniche == 'corte': PELLE |= {'LeftForeArm', 'RightForeArm'}
    if gambe == 'corte': PELLE |= {'LeftLeg', 'RightLeg'}
    TRONCO = {'Spine', 'Spine1', 'LowerBack', 'LeftShoulder', 'RightShoulder'}
    GAMBE = {'Hips', 'LHipJoint', 'RHipJoint', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'}
    PIEDI = {'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'}
    for p in corpo.data.polygons:
        conta = {}
        for vi in p.vertices:
            o = osso_dominante(corpo, corpo.data.vertices[vi]); conta[o] = conta.get(o, 0) + 1
        o = max(conta, key=conta.get)
        if o in PELLE: p.material_index = 0
        elif o in PIEDI: p.material_index = 3
        elif o in GAMBE: p.material_index = 2
        elif o in TRONCO and sp.get('gilet'): p.material_index = 4
        else: p.material_index = 1

    fetta, tc, tr = misure(corpo)
    B = {b.name: b for b in rig.data.bones}
    zc = B['Neck'].head_local.z
    zh = B['Hips'].head_local.z
    altezza = B['Head'].tail_local.z

    def guscio(nome, centro, raggi, z_taglio, mat):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
        for v in bm.verts:
            v.co = Vector((centro.x + v.co.x * raggi.x, centro.y + v.co.y * raggi.y, centro.z + v.co.z * raggi.z))
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z < z_taglio], context='FACES')
        verts = [tuple(v.co) for v in bm.verts]
        idx = {v: i for i, v in enumerate(bm.verts)}
        facce = [tuple(idx[v] for v in f.verts) for f in bm.faces]
        bm.free()
        return nuova_mesh(nome, rig, verts, facce, [[('Head', 1)]] * len(verts), mat)

    capelli = None
    if capo == 'casco':
        guscio('casco', tc + Vector((0, 0.005, 0.03)), tr + Vector((0.025, 0.03, 0.02)), tc.z + tr.z * 0.15, materiale('casco', lin(r.choice(CASCO)), 0.4))
    elif capo in ('berretto', 'cappello'):
        guscio('cappello', tc + Vector((0, 0.008, 0.02)), tr + Vector((0.014, 0.016, 0.01)), tc.z + tr.z * 0.3, materiale('cappello', lin(r.choice(CAPPELLI)), 0.9))
        if capo == 'cappello':
            # la tesa: un anello piatto attorno alla calotta
            n, R0, R1, z = 28, max(tr.x, tr.y) + 0.012, max(tr.x, tr.y) + 0.07, tc.z + tr.z * 0.32
            verts = [(tc.x + math.sin(i / n * 2 * math.pi) * R, tc.y + 0.008 - math.cos(i / n * 2 * math.pi) * R, z) for R in (R0, R1) for i in range(n)]
            facce = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
            nuova_mesh('tesa', rig, verts, facce, [[('Head', 1)]] * len(verts), materiale('tesa', lin(r.choice(CAPPELLI)), 0.9))
    if capo != 'casco':
        capelli = r.choice(['short01', 'short02', 'short03', 'short04', 'afro01']) if m else r.choice(['long01', 'ponytail01', 'bob01', 'bob02', 'braid01'])
        if dominante != 'african' and capelli == 'afro01': capelli = 'short02'
        HumanService.add_mhclo_asset(os.path.join(DATI('hair'), capelli, capelli + '.mhclo'), base, asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN')

    bpy.data.objects.remove(base, do_unlink=True)
    for o in rig.children:
        for mod in o.modifiers:
            if mod.type != 'ARMATURE':
                o.modifiers.remove(mod)
    info = {k: var[k] for k in ('n', 'ruolo', 'sesso', 'eta', 'seme')}
    info.update(maniche=maniche, gambe=gambe, capo=capo, capelli=capelli, pelle=pelle_tinta, colore_capelli=capelli_tinta,
                altezza=round(altezza, 3), anche=round(zh, 4), file=f'oggi-{var["n"]:02d}.glb',
                vertici=sum(len(o.data.vertices) for o in rig.children if o.type == 'MESH'))
    return rig, info


def main():
    os.makedirs(USCITA, exist_ok=True)
    scelta = [int(sys.argv[sys.argv.index('--') + 1])] if '--' in sys.argv else [v['n'] for v in VARIANTI]
    percorso = os.path.join(USCITA, 'oggi.json')
    elenco = []
    if os.path.exists(percorso) and len(scelta) == 1:
        elenco = [e for e in json.load(open(percorso)) if e['n'] not in scelta]
    for n in scelta:
        rig, info = crea(VARIANTI[n])
        FR.esporta(rig, os.path.join(USCITA, info['file']))
        elenco.append(info)
        print('FIGURA', json.dumps(info))
    elenco.sort(key=lambda e: e['n'])
    json.dump(elenco, open(percorso, 'w'), indent=1)


if __name__ == '__main__':
    main()
