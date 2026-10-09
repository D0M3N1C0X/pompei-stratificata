# =====================================================================
# GLI ABITANTI DELLO SCAVO BORBONICO (1748–1763): operai e visitatori.
#
#   npm run figure                                  (tutte le serie)
#   Blender -b --python figure_borbonici.py -- 3    solo la variante 3
#
# Scrive src/assets/figure/borb-NN.glb e borbonici.json.
#
# FONTE: Pietro Fabris, «The discovery of the temple of Isis at Pompeii»,
# acquaforte colorata a guazzo per W. Hamilton, Campi Phlegraei, 1776
# (Wellcome Collection 43680i, pubblico dominio). È di poco successiva alla
# fase (il tempio di Iside si scava dal 1764) e la leggo così:
#   · operai: camicia bianca, calzoni al ginocchio color ocra, piedi nudi,
#     berretto bianco; uno porta un panciotto rosso. Carriole e ceste .. FONTE
#   · visitatori: marsina lunga (blu, rossa, bruna), calzoni al ginocchio,
#     calze chiare, scarpe, tricorno; uno col bastone ................... FONTE
#   · due figure in abito lungo, rosso e giallo: lette come donne .. LETTURA
# Semplificazioni dichiarate: la marsina è una gonna dalla vita al ginocchio
# sopra il busto dipinto, chiusa davanti; il tricorno è una calotta con una
# tesa piatta, senza le tre punte; niente carriole né ceste in mano.
# Il rapporto fra operai e visitatori lo decide il peso nel JSON: nella
# stampa i visitatori sono un gruppo, gli operai sparsi nello scavo.
#
# Le funzioni di corpo, pesi e gonna vengono da figure_romane.py.
# =====================================================================
import bpy, bmesh, os, sys, json, math, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import figure_romane as FR
from figure_romane import (HumanService, DATI, pulisci, materiale, osso_dominante,
                           misure, nuova_mesh, volto, lin, gonna)

USCITA = FR.USCITA

CAMICIA = [(236, 232, 220), (226, 220, 204)]
CALZONI_OPERAI = [(196, 160, 96), (176, 140, 84), (150, 124, 90)]
PANCIOTTO = (170, 48, 40)
MARSINE = [(40, 64, 120), (150, 50, 40), (110, 76, 48)]
CALZONI_SIGNORI = [(60, 50, 44), (200, 186, 150)]
CALZE = (232, 228, 216)
SCARPE = (34, 30, 28)
VESTI = [(170, 52, 44), (214, 176, 80)]
PELLI = [(0.86, 0.68, 0.54), (0.78, 0.6, 0.46), (0.9, 0.76, 0.66)]
CAPELLI_COL = [(0.08, 0.07, 0.06), (0.18, 0.12, 0.08), (0.36, 0.26, 0.16)]

RUOLI = [
    ('operaio',      dict(sesso='m', eta=(0.3, 0.7),  n=4, peso=6.0)),
    ('visitatore',   dict(sesso='m', eta=(0.45, 0.8), n=2, peso=1.0)),
    ('visitatrice',  dict(sesso='f', eta=(0.4, 0.7),  n=1, peso=0.8)),
]
VARIANTI = []
for ruolo, spec in RUOLI:
    for k in range(spec['n']):
        i = len(VARIANTI)
        VARIANTI.append({'n': i, 'ruolo': ruolo, 'sesso': spec['sesso'], 'k': k, 'peso': spec['peso'],
                         'eta': round(random.Random(1748 + i * 43).uniform(*spec['eta']), 3), 'seme': 1748 + i * 43})


def crea(var):
    r = random.Random(var['seme'])
    pulisci()
    m = var['sesso'] == 'm'
    ruolo, k = var['ruolo'], var['k']
    macro = {'gender': r.uniform(0.92, 1.0) if m else r.uniform(0.0, 0.08), 'age': var['eta'],
             'muscle': r.uniform(0.45, 0.65) if ruolo == 'operaio' else r.uniform(0.35, 0.5),
             'weight': r.uniform(0.3, 0.5), 'proportions': r.uniform(0.4, 0.6),
             'height': r.uniform(0.25, 0.5), 'cupsize': 0.45, 'firmness': 0.5,
             'race': {'caucasian': 0.92, 'african': 0.04, 'asian': 0.04}}
    base = HumanService.create_human(macro_detail_dict=macro)
    volto(base, r)
    HumanService.add_builtin_rig(base, 'cmu_mb')
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    rig.name = f'borb-{var["n"]:02d}'
    proxy = 'male1591' if m else 'female1605'
    HumanService.add_mhclo_asset(os.path.join(DATI('proxymeshes'), proxy, proxy + '.proxy'), base, asset_type='Proxymeshes', subdiv_levels=0)
    HumanService.add_mhclo_asset(os.path.join(DATI('eyes'), 'low-poly', 'low-poly.mhclo'), base, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    sop = f'eyebrow{r.randint(1, 12):03d}'
    HumanService.add_mhclo_asset(os.path.join(DATI('eyebrows'), sop, sop + '.mhclo'), base, asset_type='Eyebrows', subdiv_levels=0, material_type='MAKESKIN')
    corpo = next(o for o in rig.children if o.type == 'MESH' and proxy in o.name)

    pelle_tinta = r.choice(PELLI)
    capelli_tinta = r.choice(CAPELLI_COL)
    eta_pelle = 'young' if var['eta'] < 0.62 else 'middleage' if var['eta'] < 0.78 else 'old'
    cartella = os.path.join(DATI('skins'), f'{eta_pelle}_caucasian_{"male" if m else "female"}')
    png = next((os.path.join(dp, f) for dp, _, fs in os.walk(cartella) for f in fs if f.endswith('diffuse.png')), None)
    img = bpy.data.images.load(png) if png else None
    if img and max(img.size) > 512: img.scale(512, 512)

    # le regioni del corpo, e di che colore sono
    if ruolo == 'operaio':
        busto = lin(PANCIOTTO) if k == 0 else lin(r.choice(CAMICIA))      # uno col panciotto, come in Fabris
        braccia = lin(r.choice(CAMICIA))
        cosce = lin(CALZONI_OPERAI[k % len(CALZONI_OPERAI)])
        polpacci, piedi = None, None                                      # piedi nudi
    elif ruolo == 'visitatore':
        busto = braccia = lin(MARSINE[k % len(MARSINE)])
        cosce = lin(r.choice(CALZONI_SIGNORI))
        polpacci, piedi = lin(CALZE), lin(SCARPE)
    else:
        busto = braccia = lin(VESTI[k % len(VESTI)])
        cosce = busto
        polpacci, piedi = lin(CALZE), lin(SCARPE)
    M = [materiale('pelle', (1, 1, 1, 1), 0.55, img), materiale('busto', busto, 0.9), materiale('braccia', braccia, 0.9),
         materiale('cosce', cosce, 0.9), materiale('polpacci', polpacci or (1, 1, 1, 1), 0.85), materiale('piedi', piedi or (1, 1, 1, 1), 0.6)]
    corpo.data.materials.clear()
    for mt in M: corpo.data.materials.append(mt)
    PELLE = {'Head', 'Neck', 'Neck1', 'LeftHand', 'RightHand', 'LThumb', 'RThumb', 'LeftFingerBase', 'RightFingerBase', 'LeftHandFinger1', 'RightHandFinger1'}
    if ruolo == 'operaio': PELLE |= {'LeftForeArm', 'RightForeArm'}   # maniche rimboccate [lettura della stampa]
    TRONCO = {'Spine', 'Spine1', 'LowerBack'}
    BRACCIA = {'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'}
    COSCE = {'Hips', 'LHipJoint', 'RHipJoint', 'LeftUpLeg', 'RightUpLeg'}
    POLPACCI = {'LeftLeg', 'RightLeg'}
    PIEDI = {'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'}
    for p in corpo.data.polygons:
        conta = {}
        for vi in p.vertices:
            o = osso_dominante(corpo, corpo.data.vertices[vi]); conta[o] = conta.get(o, 0) + 1
        o = max(conta, key=conta.get)
        if o in PELLE: p.material_index = 0
        elif o in TRONCO: p.material_index = 1
        elif o in BRACCIA: p.material_index = 2
        elif o in COSCE: p.material_index = 3
        elif o in POLPACCI: p.material_index = 4 if polpacci else 0
        elif o in PIEDI: p.material_index = 5 if piedi else 0
        else: p.material_index = 1

    fetta, tc, tr = misure(corpo)
    B = {b.name: b for b in rig.data.bones}
    zh = B['Hips'].head_local.z
    altezza = B['Head'].tail_local.z

    # la marsina dei signori fino al ginocchio, la veste lunga delle signore
    if ruolo == 'visitatore':
        gonna(rig, corpo, fetta, B, r.uniform(0.44, 0.5), True, M[1], svasa=0.1, nome='marsina')
    elif ruolo == 'visitatrice':
        gonna(rig, corpo, fetta, B, 0.03, False, M[1], svasa=0.24, nome='veste')

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
    if ruolo == 'operaio':
        guscio('berretto', tc + Vector((0, 0.01, 0.025)), tr + Vector((0.012, 0.016, 0.016)), tc.z + tr.z * 0.25, materiale('berretto', lin((236, 232, 222)), 0.95))
    elif ruolo == 'visitatore':
        nero = materiale('tricorno', lin((30, 28, 28)), 0.8)
        guscio('tricorno', tc + Vector((0, 0.008, 0.035)), tr + Vector((0.01, 0.012, 0.0)), tc.z + tr.z * 0.45, nero)
        n, R0, R1, z = 30, max(tr.x, tr.y) + 0.01, max(tr.x, tr.y) + 0.075, tc.z + tr.z * 0.47
        verts = [(tc.x + math.sin(i / n * 2 * math.pi) * R, tc.y + 0.008 - math.cos(i / n * 2 * math.pi) * R, z) for R in (R0, R1) for i in range(n)]
        facce = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        nuova_mesh('tesa', rig, verts, facce, [[('Head', 1)]] * len(verts), nero)
        capelli = 'short02'
    else:
        capelli = 'bob02'
    if capelli:
        HumanService.add_mhclo_asset(os.path.join(DATI('hair'), capelli, capelli + '.mhclo'), base, asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN')

    bpy.data.objects.remove(base, do_unlink=True)
    for o in rig.children:
        for mod in o.modifiers:
            if mod.type != 'ARMATURE':
                o.modifiers.remove(mod)
    info = {kk: var[kk] for kk in ('n', 'ruolo', 'sesso', 'eta', 'seme', 'peso')}
    info.update(capelli=capelli, pelle=pelle_tinta, colore_capelli=capelli_tinta, altezza=round(altezza, 3),
                anche=round(zh, 4), file=f'borb-{var["n"]:02d}.glb',
                vertici=sum(len(o.data.vertices) for o in rig.children if o.type == 'MESH'))
    return rig, info


def main():
    os.makedirs(USCITA, exist_ok=True)
    scelta = [int(sys.argv[sys.argv.index('--') + 1])] if '--' in sys.argv else [v['n'] for v in VARIANTI]
    percorso = os.path.join(USCITA, 'borbonici.json')
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
