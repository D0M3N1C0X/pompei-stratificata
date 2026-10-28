# =====================================================================
# GLI ABITANTI DELLE FASI CHE AVEVANO ANCORA I MANICHINI (28/10/2026)
#
#   Blender -b --python figure_fasi.py                 tutte e quattro le serie
#   Blender -b --python figure_fasi.py -- canale       una serie sola
#
# Scrive src/assets/figure/<prefisso>-NN.glb e <serie>.json.
# Quattro figure per serie: ogni figura pesa ~210 kB dentro index.html.
#
# FONTI, una per serie, e che cosa se ne legge:
#
# tardoantichi — la rioccupazione, IV–V secolo
#   · Villa Romana del Casale, Piazza Armerina, mosaico del trasporto degli
#     animali (inizio IV sec.), foto su Wikimedia Commons, pubblico dominio:
#     i lavoratori portano tuniche al ginocchio a MANICHE LUNGHE, rosse,
#     ocra o verdi, calzari aderenti scuri e stivaletti ............ FONTE
#   · Catacombe di San Gennaro, Napoli, arcosolio di Teotecno, Ilaritas e
#     Nonnosa (V sec.), foto Commons di AlMare, CC BY-SA 2.5: la donna in un
#     manto bruno scuro che copre il capo e scende ai piedi ........ FONTE
#   · il mosaico è siciliano, l'affresco di una famiglia agiata: la gente
#     della rioccupazione di Pompei era povera ................... LETTURA
#
# civita — la collina coltivata, XV–XVI secolo
#   · Tavola Strozzi, Napoli 1472 circa (Museo di San Martino), Commons,
#     pubblico dominio: i facchini del porto in veste corta al ginocchio,
#     grigia, bruna o rosso spento, con calze scure o gambe nude; berretti
#     rossi o scuri .............................................. FONTE
#   · contadini e pastori della Civita vestiti come i facchini di Napoli;
#     solo uomini, perché nella Tavola donne non se ne distinguono . LETTURA
#
# canale — gli scavatori del canale di Fontana, 1592–1600
#   · D. Fontana, «Della trasportatione dell'obelisco vaticano», Roma 1590,
#     tavola a p. 37 dell'esemplare Internet Archive su Commons (pubblico
#     dominio): gli operai che spostano l'obelisco nel 1586 hanno farsetto
#     corto a maniche, calzoni al ginocchio, polpacci nudi, berretto tondo
#     o niente in testa ......................................... FONTE
#   · gli stessi uomini dello stesso ingegnere, sei anni dopo .... LETTURA
#   · l'incisione è in bianco e nero: i colori (tela grezza, bruno, grigio)
#     sono di disegno ............................................ IPOTESI
#
# operai1958 — gli operai di Maiuri a Ercolano
#   · Parco Archeologico di Ercolano, fotografie storiche (open data, licenza
#     «Beni Culturali Standard», non ridistribuite, solo lette): C2510 e
#     C2537, 1931, scavo dell'insula V e del Cardo V: camicia chiara con le
#     maniche rimboccate, calzoni scuri, berretto a visiera; qualcuno col
#     gilet scuro ................................................. FONTE
#   · le foto sono del 1931, la scena del 1958 ...................... IPOTESI
#   · bianco e nero: i colori dei calzoni sono di disegno ......... IPOTESI
#
# Semplificazioni dichiarate: i calzoni rigonfi del Cinquecento sono
# disegnati aderenti; i berretti sono calotte, la visiera una piccola tesa
# davanti; nessun attrezzo in mano. Le funzioni di corpo, pesi e gonna
# vengono da figure_romane.py, come per i borbonici.
# =====================================================================
import bpy, bmesh, os, sys, json, math, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import figure_romane as FR
from figure_romane import (HumanService, DATI, pulisci, materiale, osso_dominante,
                           misure, nuova_mesh, volto, lin, gonna)

USCITA = FR.USCITA
PELLI = [(0.86, 0.68, 0.54), (0.78, 0.6, 0.46), (0.9, 0.76, 0.66)]

# ogni ruolo: sesso, età, quante figure, peso nella folla, e la veste:
#   busto/braccia/cosce/polpacci/piedi: colori RGB, None = pelle
#   avambracci: True se nudi (maniche corte o rimboccate)
#   orlo: gonna fino a quella frazione (0,5 ≈ ginocchio), None = nessuna
#   capo: 'velo' | 'berretto' | 'coppola' | None
SERIE = {
    'tardoantichi': dict(prefisso='tard', seme=395, ruoli=[
        ('lavoratore', dict(sesso='m', eta=(0.3, 0.7), n=3, peso=4.0,
            busto=[(150, 52, 40), (188, 138, 62), (104, 112, 82)], cosce='busto',
            polpacci=[(70, 62, 56), (62, 66, 58)], piedi=[(50, 40, 32)],
            avambracci=False, orlo=(0.46, 0.52), capo=None, capelli='short02')),
        ('donna', dict(sesso='f', eta=(0.35, 0.7), n=1, peso=1.5,
            busto=[(84, 52, 46)], cosce='busto', polpacci='busto', piedi=[(50, 40, 32)],
            avambracci=False, orlo=(0.02, 0.04), capo='velo', capelli=None)),
    ]),
    'civita': dict(prefisso='civ', seme=1472, ruoli=[
        ('contadino', dict(sesso='m', eta=(0.25, 0.8), n=4, peso=1.0,
            busto=[(130, 124, 112), (110, 82, 58), (140, 62, 48), (96, 90, 80)], cosce='busto',
            polpacci=[(58, 52, 46), None], piedi=[(46, 38, 32), None],
            avambracci=False, orlo=(0.47, 0.52), capo='berretto', capelli='short02',
            berretti=[(150, 50, 40), (52, 46, 42)])),
    ]),
    'canale': dict(prefisso='can', seme=1592, ruoli=[
        ('scavatore', dict(sesso='m', eta=(0.25, 0.7), n=4, peso=1.0,
            busto=[(214, 204, 180), (120, 92, 62), (128, 124, 116), (160, 132, 96)],
            cosce=[(98, 84, 66), (120, 112, 98), (82, 70, 58)],
            polpacci=[None], piedi=[(46, 38, 32), None],
            avambracci=False, orlo=None, capo='berretto', capelli='short02',
            berretti=[(70, 60, 50), (120, 100, 76)])),
    ]),
    'operai1958': dict(prefisso='mai', seme=1958, ruoli=[
        ('operaio', dict(sesso='m', eta=(0.3, 0.75), n=4, peso=1.0,
            busto=[(232, 228, 218), (214, 208, 192)], cosce=[(64, 60, 58), (78, 70, 60), (54, 56, 62)],
            polpacci='cosce', piedi=[(40, 34, 30)],
            avambracci=True, orlo=None, capo='coppola', capelli='short02',
            gilet=(58, 56, 54), berretti=[(70, 68, 64), (98, 92, 82)])),
    ]),
}


def varianti(nome):
    s = SERIE[nome]
    out = []
    for ruolo, spec in s['ruoli']:
        for k in range(spec['n']):
            i = len(out)
            seme = s['seme'] + i * 43
            out.append({'n': i, 'ruolo': ruolo, 'k': k, 'spec': spec, 'sesso': spec['sesso'], 'peso': spec['peso'],
                        'eta': round(random.Random(seme).uniform(*spec['eta']), 3), 'seme': seme})
    return out


def scegli(spec, chiave, k, r, gia=None):
    v = spec.get(chiave)
    if v == 'busto' or v == 'cosce': return gia[v]
    if v is None: return None
    return v[k % len(v)] if isinstance(v, list) else v


def crea(nome_serie, var):
    pref = SERIE[nome_serie]['prefisso']
    r = random.Random(var['seme'])
    pulisci()
    spec, k = var['spec'], var['k']
    m = var['sesso'] == 'm'
    macro = {'gender': r.uniform(0.92, 1.0) if m else r.uniform(0.0, 0.08), 'age': var['eta'],
             'muscle': r.uniform(0.45, 0.65) if m else r.uniform(0.35, 0.5),
             'weight': r.uniform(0.3, 0.5), 'proportions': r.uniform(0.4, 0.6),
             'height': r.uniform(0.2, 0.45), 'cupsize': 0.45, 'firmness': 0.5,
             'race': {'caucasian': 0.92, 'african': 0.04, 'asian': 0.04}}
    base = HumanService.create_human(macro_detail_dict=macro)
    volto(base, r)
    HumanService.add_builtin_rig(base, 'cmu_mb')
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    rig.name = f'{pref}-{var["n"]:02d}'
    proxy = 'male1591' if m else 'female1605'
    HumanService.add_mhclo_asset(os.path.join(DATI('proxymeshes'), proxy, proxy + '.proxy'), base, asset_type='Proxymeshes', subdiv_levels=0)
    HumanService.add_mhclo_asset(os.path.join(DATI('eyes'), 'low-poly', 'low-poly.mhclo'), base, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    sop = f'eyebrow{r.randint(1, 12):03d}'
    HumanService.add_mhclo_asset(os.path.join(DATI('eyebrows'), sop, sop + '.mhclo'), base, asset_type='Eyebrows', subdiv_levels=0, material_type='MAKESKIN')
    corpo = next(o for o in rig.children if o.type == 'MESH' and proxy in o.name)

    pelle_tinta = r.choice(PELLI)
    eta_pelle = 'young' if var['eta'] < 0.62 else 'middleage' if var['eta'] < 0.78 else 'old'
    cartella = os.path.join(DATI('skins'), f'{eta_pelle}_caucasian_{"male" if m else "female"}')
    png = next((os.path.join(dp, f) for dp, _, fs in os.walk(cartella) for f in fs if f.endswith('diffuse.png')), None)
    img = bpy.data.images.load(png) if png else None
    if img and max(img.size) > 512: img.scale(512, 512)

    gia = {}
    gia['busto'] = scegli(spec, 'busto', k, r)
    braccia = gia['busto']
    if spec.get('gilet') and k == 1: gia['busto'] = spec['gilet']        # uno col gilet, come nella foto
    gia['cosce'] = scegli(spec, 'cosce', k, r, gia)
    polpacci = scegli(spec, 'polpacci', k, r, gia)
    piedi = scegli(spec, 'piedi', k, r, gia)
    L = lambda c: lin(c) if c else (1, 1, 1, 1)
    M = [materiale('pelle', (1, 1, 1, 1), 0.55, img), materiale('busto', L(gia['busto']), 0.9),
         materiale('braccia', L(braccia), 0.9), materiale('cosce', L(gia['cosce']), 0.9),
         materiale('polpacci', L(polpacci), 0.85), materiale('piedi', L(piedi), 0.6)]
    corpo.data.materials.clear()
    for mt in M: corpo.data.materials.append(mt)
    PELLE = {'Head', 'Neck', 'Neck1', 'LeftHand', 'RightHand', 'LThumb', 'RThumb', 'LeftFingerBase', 'RightFingerBase', 'LeftHandFinger1', 'RightHandFinger1'}
    if spec['avambracci']: PELLE |= {'LeftForeArm', 'RightForeArm'}
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

    if spec['orlo']:
        veste = M[3] if spec.get('cosce') == 'busto' else M[1]
        gonna(rig, corpo, fetta, B, r.uniform(*spec['orlo']), m, veste,
              svasa=(0.22 if not m else None), nome='veste')

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

    capelli = spec.get('capelli')
    capo = spec['capo']
    if capo == 'velo':
        # il manto tirato sul capo: una calotta che scende fino alla nuca
        guscio('velo', tc + Vector((0, 0.012, 0.0)), tr + Vector((0.022, 0.026, 0.02)), tc.z - tr.z * 0.55, M[1])
    elif capo in ('berretto', 'coppola'):
        tinte = spec.get('berretti') or [(60, 52, 46)]
        if capo == 'berretto' and r.random() < 0.3 and nome_serie == 'canale':
            capo = None                                           # qualcuno a capo scoperto, come nella tavola
        else:
            mat = materiale('berretto', lin(tinte[k % len(tinte)]), 0.95)
            # una calotta sopra la fronte: tagliata a metà altezza della testa,
            # non più bassa (al primo giro scendeva sugli occhi, come un elmo)
            guscio('berretto', tc + Vector((0, 0.008, 0.05)), tr + Vector((0.012, 0.014, 0.0)), tc.z + tr.z * 0.55, mat)
            if capo == 'coppola':
                # la visiera: una piccola tesa davanti, sopra la fronte
                n, R0, R1, z = 12, max(tr.x, tr.y) + 0.005, max(tr.x, tr.y) + 0.055, tc.z + tr.z * 0.56
                arco = [(-0.9 + 1.8 * i / (n - 1)) for i in range(n)]
                verts = [(tc.x + math.sin(a) * R, tc.y + 0.01 - math.cos(a) * R, z) for R in (R0, R1) for a in arco]
                facce = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
                nuova_mesh('visiera', rig, verts, facce, [[('Head', 1)]] * len(verts), mat)
    # sotto un copricapo i capelli non si vedono, e pesano ~150 kB a figura
    if capo in ('berretto', 'coppola', 'velo'): capelli = None
    if capelli:
        HumanService.add_mhclo_asset(os.path.join(DATI('hair'), capelli, capelli + '.mhclo'), base, asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN')

    bpy.data.objects.remove(base, do_unlink=True)
    for o in rig.children:
        for mod in o.modifiers:
            if mod.type != 'ARMATURE':
                o.modifiers.remove(mod)
    info = {kk: var[kk] for kk in ('n', 'ruolo', 'sesso', 'eta', 'seme', 'peso')}
    info.update(capelli=capelli, capo=capo, pelle=pelle_tinta, altezza=round(altezza, 3), anche=round(zh, 4),
                file=f'{pref}-{var["n"]:02d}.glb',
                vertici=sum(len(o.data.vertices) for o in rig.children if o.type == 'MESH'))
    return rig, info


def main():
    os.makedirs(USCITA, exist_ok=True)
    nomi = [sys.argv[sys.argv.index('--') + 1]] if '--' in sys.argv else list(SERIE)
    for nome in nomi:
        elenco = []
        for var in varianti(nome):
            rig, info = crea(nome, var)
            FR.esporta(rig, os.path.join(USCITA, info['file']))
            elenco.append(info)
            print('FIGURA', nome, json.dumps(info))
        json.dump(elenco, open(os.path.join(USCITA, nome + '.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
