# =====================================================================
# GLI ABITANTI DEL 79: corpi MakeHuman (MPFB, CC0) vestiti alla romana.
#
#   npm run figure                         tutte le varianti
#   Blender -b --python figure_romane.py -- 3   solo la variante 3 (prove)
#
# Scrive src/assets/figure/romana-NN.glb e romane.json (chi è chi).
#
# La catena viene dal progetto Firenze 1216 dello stesso autore
# (strumenti/figure/figure.py): corpo, drappeggio simulato, pesi sulle ossa
# sono le stesse funzioni, copiate qui sotto invariate. Cambiano i ruoli e
# il guardaroba.
#
# LE VESTI — fonte principale: S. Brown (J. Paul Getty Museum), «Clothing in
# Roman Art», Archaeological Institute of America, Roman Clothing Project:
#   · tuniche corte per gli uomini, più lunghe per le donne ............ FONTE
#   · a Pompei, Caupona di Salvio (VI.14.35): uomini in tuniche colorate
#     a metà polpaccio, una donna in tunica semplice alla caviglia ...... FONTE
#   · il servo: tunica corta, cinta, con maniche ......................... FONTE
#   · le donne avvolgono spalle e capo nella palla, rettangolo di stoffa . FONTE
#   · la stola delle matrone: color lana naturale, sopra una tunica con
#     maniche ............................................................. FONTE
#   · la toga è l'abito delle occasioni formali: per strada non la mette
#     nessuno qui ....................................................... SCELTA
#   · maniche corte per gli uomini, lunghe per le donne ............. IPOTESI
#     coerente con la fonte, non misurata
#   · colori: lane naturali e le tinte di robbia, guado, zafferano ... IPOTESI
#   · sandali e scarpe di cuoio dipinti sul piede ...................... IPOTESI
# Le tinte di pelle e capelli seguono Pilli et al. 2024, Current Biology
# 34, 5307–5318: i pompeiani studiati discendono in gran parte da immigrati
# recenti dal Mediterraneo orientale. È un'approssimazione con i soli
# parametri di MakeHuman, non una ricostruzione.
#
# Per tenere le figure leggere e senza compenetrazioni la parte aderente
# della tunica è «dipinta» sul corpo; sono geometria vera la gonna della
# tunica, la palla (mantello e velo), la cintura. Tutto è pesato sulle
# ossa, quindi si muove con il corpo.
# =====================================================================
import bpy, bmesh, os, sys, json, math, random
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

QUI = os.path.dirname(os.path.abspath(__file__))
PIEGHE = True
USCITA = os.path.abspath(os.path.join(QUI, '..', '..', 'src', 'assets', 'figure'))
DATI = lambda tipo: LocationService.get_user_data(tipo)

lin = lambda c: tuple((v / 255) ** 2.2 for v in c) + (1,)
LANA = [(214, 204, 178), (190, 176, 146), (150, 130, 102), (112, 96, 78)]       # lane non tinte
TINTE = [(150, 60, 44), (190, 146, 66), (66, 88, 122), (90, 106, 66), (166, 96, 58)]  # robbia, zafferano, guado, verde, ocra
STOLA = [(220, 208, 178), (206, 192, 160)]
CUOIO = [(92, 64, 42), (70, 50, 34), (110, 80, 50)]
# carnagioni più scure della media di MakeHuman «caucasico»: Mediterraneo orientale
PELLI = [(0.80, 0.62, 0.48), (0.74, 0.56, 0.42), (0.86, 0.68, 0.54), (0.68, 0.5, 0.38), (0.78, 0.6, 0.46)]
CAPELLI_COL = [(0.08, 0.07, 0.06), (0.12, 0.09, 0.07), (0.18, 0.12, 0.08), (0.06, 0.05, 0.05)]

# I ruoli: chi si vede per strada un giorno qualunque prima dell'eruzione.
# età secondo MakeHuman: 0,19 = 11 anni, 0,3 ≈ 16, 0,5 = 25, 0,8 ≈ 64.
# «orlo»: altezza dell'orlo in frazione d'altezza ×1,7 (0,5 ≈ ginocchio).
RUOLI = [
    ('popolano',  dict(sesso='m', eta=(0.45, 0.8),  n=3, orlo=(0.33, 0.44), maniche='corte', palla=0.15, colori='misti')),
    ('servo',     dict(sesso='m', eta=(0.35, 0.7),  n=2, orlo=(0.50, 0.56), maniche='corte', palla=0.0,  colori='naturali')),
    ('cittadino', dict(sesso='m', eta=(0.55, 0.82), n=2, orlo=(0.30, 0.36), maniche='corte', palla=0.9,  colori='chiari')),
    ('donna',     dict(sesso='f', eta=(0.42, 0.8),  n=2, orlo=(0.03, 0.06), maniche='lunghe', palla=0.9, velo=0.9, colori='misti')),
    ('matrona',   dict(sesso='f', eta=(0.55, 0.8),  n=1, orlo=(0.02, 0.04), maniche='lunghe', palla=1.0, velo=1.0, colori='stola')),
    ('ragazza',   dict(sesso='f', eta=(0.22, 0.3),  n=1, orlo=(0.04, 0.07), maniche='lunghe', palla=0.0, velo=0.0, colori='misti')),
    ('ragazzo',   dict(sesso='m', eta=(0.17, 0.24), n=1, orlo=(0.46, 0.52), maniche='corte', palla=0.0,  colori='naturali')),
]
VARIANTI = []
for ruolo, spec in RUOLI:
    for k in range(spec['n']):
        i = len(VARIANTI)
        r = random.Random(79 + i * 37)
        VARIANTI.append({'n': i, 'ruolo': ruolo, 'sesso': spec['sesso'], 'eta': round(r.uniform(*spec['eta']), 3), 'seme': 79 + i * 37})
SPEC = dict(RUOLI)

# ---------------------------------------------------------------------
# funzioni di servizio, da Firenze 1216 (strumenti/figure/figure.py)
# ---------------------------------------------------------------------
def pulisci():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures):
        for x in list(coll):
            if x.users == 0:
                coll.remove(x)


def materiale(nome, colore, ruv=0.85, immagine=None):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = colore
    bsdf.inputs['Roughness'].default_value = ruv
    if immagine:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = immagine
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    m.use_backface_culling = False
    return m


def osso_dominante(obj, v):
    best, w = None, 0
    for g in v.groups:
        if g.weight > w:
            best, w = obj.vertex_groups[g.group].name, g.weight
    return best


TRONCO = {'Hips', 'LowerBack', 'Spine', 'Spine1', 'LHipJoint', 'RHipJoint', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
          'LeftShoulder', 'RightShoulder', 'Neck', 'Neck1'}


def misure(corpo):
    """Ellissi del corpo a varie quote (corpo a riposo, braccia escluse:
    nella posa ad A le mani pendono all'altezza dei fianchi), e la testa."""
    dom = [osso_dominante(corpo, v) for v in corpo.data.vertices]
    vs = [corpo.matrix_world @ v.co for v in corpo.data.vertices]
    tronco = [v for v, d in zip(vs, dom) if d in TRONCO]
    def fetta(z, banda=0.025):
        p = [v for v in tronco if abs(v.z - z) < banda]
        if not p: return None
        cx = (max(v.x for v in p) + min(v.x for v in p)) / 2; cy = (max(v.y for v in p) + min(v.y for v in p)) / 2
        return cx, cy, max(abs(v.x - cx) for v in p), max(abs(v.y - cy) for v in p)
    testa = [v for v, d in zip(vs, dom) if d == 'Head']
    tc = sum(testa, Vector()) / len(testa)
    tr = Vector((max(abs(v.x - tc.x) for v in testa), max(abs(v.y - tc.y) for v in testa), max(abs(v.z - tc.z) for v in testa)))
    return fetta, tc, tr


def nuova_mesh(nome, rig, verts, facce, pesi, mat):
    me = bpy.data.meshes.new(nome)
    me.from_pydata(verts, [], facce)
    me.update()
    # coordinate di texture cilindriche, in metri: servono alla trama della lana
    uv = me.uv_layers.new(name='UVMap')
    cx = sum(v[0] for v in verts) / len(verts); cy = sum(v[1] for v in verts) / len(verts)
    for poly in me.polygons:
        for li in poly.loop_indices:
            x, y, z = verts[me.loops[li].vertex_index]
            uv.data[li].uv = (math.atan2(x - cx, y - cy) * 0.25, z)
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    gruppi = {}
    for i, wl in enumerate(pesi):
        tot = sum(w for _, w in wl) or 1
        for osso, w in wl:
            if w <= 0: continue
            if osso not in gruppi: gruppi[osso] = ob.vertex_groups.new(name=osso)
            gruppi[osso].add([i], w / tot, 'REPLACE')
    ob.parent = rig
    mod = ob.modifiers.new('scheletro', 'ARMATURE'); mod.object = rig
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return ob


def drappeggia(ob, corpo, fissati, fotogrammi=50, rigidezza=12, piega=0.8, massa=0.35):
    """Fa cadere il tessuto sul corpo con la simulazione di Blender e ne
    salva la forma finale. «fissati»: indici dei vertici cuciti (vita,
    spalle, collo). Il tessuto in eccesso si raccoglie in pieghe."""
    sc = bpy.context.scene
    g = ob.vertex_groups.new(name='spillo')
    g.add(list(fissati), 1.0, 'REPLACE')
    if 'collisione' not in corpo.modifiers:
        corpo.modifiers.new('collisione', 'COLLISION')
        corpo.collision.thickness_outer = 0.006
        corpo.collision.cloth_friction = 8
    cl = ob.modifiers.new('tessuto', 'CLOTH')
    ob.modifiers.move(len(ob.modifiers) - 1, 0)            # prima dello scheletro
    st = cl.settings
    st.quality = 6; st.mass = massa; st.air_damping = 1.5
    st.tension_stiffness = st.compression_stiffness = rigidezza
    st.shear_stiffness = rigidezza * 0.5; st.bending_stiffness = piega
    st.pin_stiffness = 1.0; st.vertex_group_mass = 'spillo'
    cl.collision_settings.distance_min = 0.006
    cl.collision_settings.use_self_collision = False
    cl.point_cache.frame_start = 1; cl.point_cache.frame_end = fotogrammi
    sc.frame_start, sc.frame_end = 1, fotogrammi
    for f in range(1, fotogrammi + 1):
        sc.frame_set(f)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=cl.name)
    sc.frame_set(1)
    ob.vertex_groups.remove(ob.vertex_groups['spillo'])
    return ob


def tornio(profilo, n, a0, a1, cx, cy, sx, sy, chiuso):
    """profilo: [(z, rx, ry)] dall'alto in basso. Restituisce vertici e facce."""
    verts, facce = [], []
    nn = n if chiuso else n + 1
    for (z, rx, ry) in profilo:
        for i in range(nn):
            a = a0 + (a1 - a0) * i / n
            verts.append((cx + math.sin(a) * rx * sx, cy - math.cos(a) * ry * sy, z))
    for k in range(len(profilo) - 1):
        for i in range(n):
            a = k * nn + i; b = k * nn + (i + 1) % nn
            facce.append((a, b, b + nn, a + nn))
    return verts, facce


def smooth(a, b, v):
    t = max(0.0, min(1.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


SEZIONI_VOLTO = {'nose': 0.6, 'chin': 0.5, 'cheek': 0.5, 'eyes': 0.35, 'mouth': 0.45, 'forehead': 0.4, 'head': 0.35, 'ears': 0.4, 'eyebrows': 0.4}


def volto(base, r):
    """Un volto diverso per ogni variante: pochi modificatori MakeHuman per
    sezione, con pesi moderati, simmetrici a destra e a sinistra."""
    radice = LocationService.get_mpfb_data('targets')
    for sez, forza in SEZIONI_VOLTO.items():
        cartella = os.path.join(radice, sez)
        if not os.path.isdir(cartella): continue
        nomi = sorted(f for f in os.listdir(cartella) if f.endswith('.target.gz'))
        gruppi = {}
        for f in nomi:
            chiave = f[2:] if f.startswith(('l-', 'r-')) else f
            gruppi.setdefault(chiave.replace('.target.gz', ''), []).append(f)
        # coppie incr/decr: se ne sceglie un verso solo
        scelte = r.sample(sorted(gruppi), min(len(gruppi), r.randint(1, 3)))
        for ch in scelte:
            w = r.uniform(0.1, forza)
            for f in gruppi[ch]:
                TargetService.load_target(base, os.path.join(cartella, f), weight=w)



# ---------------------------------------------------------------------
# la figura romana
# ---------------------------------------------------------------------
def gonna(rig, corpo, fetta, B, orlo, m, mat, svasa=None, nome='gonna'):
    """La gonna di una veste, dalla vita all'orlo, pesata su anche e gambe e
    drappeggiata sul corpo. orlo: frazione d'altezza ×1,7 (0,5 ≈ ginocchio).
    Usata dalla tunica romana, dalla marsina e dalla veste del Settecento."""
    zh = B['Hips'].head_local.z
    zv = zh + 0.1 * (zh / 0.874)
    zg = B['LeftLeg'].head_local.z
    altezza = B['Head'].tail_local.z
    z_orlo = orlo * altezza / 1.7
    fv = fetta(zv, 0.02) or (0, 0, 0.14, 0.1)
    fianchi = [fetta(zv - 0.02 * i, 0.02) for i in range(1, 14)]
    fianchi = [(f, zv - 0.02 * (i + 1)) for i, f in enumerate(fianchi) if f]
    (fh, zfh) = max(fianchi, key=lambda x: x[0][2]) if fianchi else (fv, zv - 0.15)
    if svasa is None: svasa = 0.16 if not m else 0.08
    ring = []
    k = 16
    for i in range(k + 1):
        t = i / k
        z = zv + (z_orlo - zv) * t
        if z >= zfh:
            u = (zv - z) / max(1e-3, zv - zfh)
            rx = fv[2] + 0.004 + (fh[2] + 0.02 - fv[2]) * math.sin(u * math.pi / 2)
            ry = fv[3] + 0.006 + (fh[3] + 0.025 - fv[3]) * math.sin(u * math.pi / 2)
        else:
            u = (zfh - z) / max(1e-3, zfh - z_orlo)
            rx = fh[2] + 0.02 + svasa * u
            ry = fh[3] + 0.025 + svasa * 0.8 * u
            f = fetta(z, 0.03)
            if f:
                rx = max(rx, f[2] + 0.03); ry = max(ry, f[3] + 0.04)
        ring.append((z, rx, ry, fv[0], fv[1]))
    cx0, cy0 = ring[0][3], ring[0][4]
    segue = 0.85 if orlo > 0.35 else 0.6 if orlo > 0.15 else 0.4

    def come_gonna(x, z):
        t = smooth(zv, z_orlo, z) * segue
        lato = smooth(-1.0, 1.0, (x - cx0) / 0.2)
        basso = smooth(zg + 0.05, zg - 0.25, z) * 0.35
        return [('Hips', 1 - t), ('LeftUpLeg', t * lato * (1 - basso)), ('RightUpLeg', t * (1 - lato) * (1 - basso)),
                ('LeftLeg', t * lato * basso), ('RightLeg', t * (1 - lato) * basso)]

    N = 48
    verts, facce = tornio([(z, rx, ry) for (z, rx, ry, _, _) in ring], N, 0, 2 * math.pi, cx0, cy0, 1, 1, True)
    lobi = 12 if orlo < 0.2 else 9
    for i, (x, y, z) in enumerate(verts):
        a = (i % N) / N * 2 * math.pi
        t = smooth(zv, z_orlo, z)
        kk = 1 + (0.012 + 0.05 * t) * math.sin(lobi * a)
        verts[i] = (cx0 + (x - cx0) * kk, cy0 + (y - cy0) * kk, z)
    gonna = nuova_mesh(nome, rig, verts, facce, [come_gonna(x, z) for (x, y, z) in verts], mat)
    if PIEGHE:
        drappeggia(gonna, corpo, range(2 * N), rigidezza=13, piega=1.2 if m else 0.6)
    return gonna



def crea(var):
    r = random.Random(var['seme'])
    pulisci()
    m = var['sesso'] == 'm'
    sp = SPEC[var['ruolo']]
    macro = {'gender': r.uniform(0.92, 1.0) if m else r.uniform(0.0, 0.08), 'age': var['eta'],
             'muscle': r.uniform(0.4, 0.62), 'weight': r.uniform(0.3, 0.55), 'proportions': r.uniform(0.4, 0.6),
             'height': r.uniform(0.25, 0.5), 'cupsize': 0.45, 'firmness': 0.5,
             'race': {'caucasian': 0.86, 'african': 0.08, 'asian': 0.06}}
    base = HumanService.create_human(macro_detail_dict=macro)
    volto(base, r)
    HumanService.add_builtin_rig(base, 'cmu_mb')
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    rig.name = f'romana-{var["n"]:02d}'
    proxy = 'male1591' if m else 'female1605'
    HumanService.add_mhclo_asset(os.path.join(DATI('proxymeshes'), proxy, proxy + '.proxy'), base, asset_type='Proxymeshes', subdiv_levels=0)
    HumanService.add_mhclo_asset(os.path.join(DATI('eyes'), 'low-poly', 'low-poly.mhclo'), base, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    if var['eta'] > 0.25:
        sop = f'eyebrow{r.randint(1, 12):03d}'
        HumanService.add_mhclo_asset(os.path.join(DATI('eyebrows'), sop, sop + '.mhclo'), base, asset_type='Eyebrows', subdiv_levels=0, material_type='MAKESKIN')
    corpo = next(o for o in rig.children if o.type == 'MESH' and proxy in o.name)

    # --- la veste: tinta secondo il ruolo
    c = sp['colori']
    if c == 'naturali': tunica = lin(r.choice(LANA))
    elif c == 'chiari': tunica = lin(r.choice(LANA[:2]))
    elif c == 'stola': tunica = lin(r.choice(STOLA))
    else: tunica = lin(r.choice(TINTE) if r.random() < 0.6 else r.choice(LANA))
    scarpe = lin(r.choice(CUOIO))
    orlo = r.uniform(*sp['orlo'])
    palla = r.random() < sp.get('palla', 0)
    velo = r.random() < sp.get('velo', 0)
    pelle_tinta = r.choice(PELLI)
    capelli_tinta = (0.4, 0.38, 0.36) if var['eta'] > 0.78 and r.random() < 0.7 else r.choice(CAPELLI_COL)

    eta_pelle = 'young' if var['eta'] < 0.62 else 'middleage' if var['eta'] < 0.78 else 'old'
    nome_pelle = f'{eta_pelle}_caucasian_{"male" if m else "female"}'
    cartella = os.path.join(DATI('skins'), nome_pelle)
    png = next((os.path.join(dp, f) for dp, _, fs in os.walk(cartella) for f in fs if f.endswith('diffuse.png')), None)
    img = bpy.data.images.load(png) if png else None
    if img and max(img.size) > 512: img.scale(512, 512)
    M = {
        'pelle': materiale('pelle', (1, 1, 1, 1), 0.55, img),
        'veste': materiale('veste', tunica, 0.9),
        'scarpe': materiale('scarpe', scarpe, 0.7),
    }
    corpo.data.materials.clear()
    for k in ['pelle', 'veste', 'scarpe']: corpo.data.materials.append(M[k])
    PELLE = {'Head', 'Neck', 'Neck1', 'LeftHand', 'RightHand', 'LThumb', 'RThumb', 'LeftFingerBase', 'RightFingerBase', 'LeftHandFinger1', 'RightHandFinger1'}
    if sp['maniche'] == 'corte':
        PELLE |= {'LeftForeArm', 'RightForeArm'}
    GAMBE = {'LHipJoint', 'RHipJoint', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'}
    PIEDI = {'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'}
    z_sotto = orlo * rig.data.bones['Head'].tail_local.z / 1.7 + 0.04
    for p in corpo.data.polygons:
        conta = {}
        for vi in p.vertices:
            o = osso_dominante(corpo, corpo.data.vertices[vi]); conta[o] = conta.get(o, 0) + 1
        o = max(conta, key=conta.get)
        # gambe nude sotto l'orlo: niente calze, è la differenza col 1216
        if o in GAMBE:
            p.material_index = 1 if (corpo.matrix_world @ p.center).z > z_sotto else 0
        else:
            p.material_index = 0 if o in PELLE else 2 if o in PIEDI else 1

    fetta, tc, tr = misure(corpo)
    B = {b.name: b for b in rig.data.bones}
    zh = B['Hips'].head_local.z
    zv = zh + 0.1 * (zh / 0.874)
    zg = B['LeftLeg'].head_local.z
    altezza = B['Head'].tail_local.z

    # --- la gonna della tunica, come a Firenze
    gonna(rig, corpo, fetta, B, orlo, m, M['veste'])

    # --- la cintura: la tunica degli uomini è cinta (Brown); le donne a volte
    if m or r.random() < 0.5:
        f = fetta(zv + 0.01, 0.02) or (0, 0, 0.15, 0.11)
        verts, facce = tornio([(zv + 0.025, f[2] + 0.012, f[3] + 0.012), (zv - 0.005, f[2] + 0.014, f[3] + 0.014)], 28, 0, 2 * math.pi, f[0], f[1], 1, 1, True)
        nuova_mesh('cintura', rig, verts, facce, [[('Hips', 1)]] * len(verts), materiale('cintura', lin(r.choice(CUOIO) if m else r.choice(LANA)), 0.6))

    # --- la palla (o il pallio degli uomini): dalle spalle in giù, aperta davanti
    zs = B['LeftArm'].head_local.z
    zc = B['Neck'].head_local.z
    if palla:
        colore = lin(r.choice(LANA + TINTE[:3]) if not m else r.choice(LANA))
        fino = (r.uniform(0.25, 0.4) if not m else r.uniform(0.4, 0.55)) * altezza / 1.7
        fs = fetta(zs - 0.03, 0.03)
        prof = [(zc + 0.02, 0.075, 0.07), (zs + 0.01, fs[2] + 0.03, fs[3] + 0.04)]
        for i in range(1, 6):
            z = zs - (zs - fino) * i / 5
            f = fetta(z, 0.04) or fs
            prof.append((z, max(fs[2] + 0.04, f[2] + 0.06) + 0.02 * i, max(fs[3] + 0.05, f[3] + 0.07) + 0.02 * i))
        prof = [prof[0], prof[1]] + [(z, rx * 1.12, ry * 1.12) for (z, rx, ry) in prof[2:]]
        verts, facce = tornio(prof, 30, math.pi * 0.6, math.pi * 1.4, fs[0], fs[1], 1, 1, False)
        pesi = []
        for (x, y, z) in verts:
            a = smooth(zc, zs - 0.25, z)
            b = smooth(zs - 0.25, fino, z) * 0.35
            lato = smooth(-0.6, 0.6, x / 0.2)
            pesi.append([('Neck', (1 - a) * 0.6), ('Spine1', (1 - a) * 0.4 + a * (1 - b) * 0.5), ('Spine', a * (1 - b) * 0.5),
                         ('Hips', b * 0.4), ('LeftUpLeg', b * 0.6 * lato), ('RightUpLeg', b * 0.6 * (1 - lato))])
        ob = nuova_mesh('palla', rig, verts, facce, pesi, materiale('palla', colore, 0.92))
        if PIEGHE:
            drappeggia(ob, corpo, range(2 * 31), rigidezza=12, piega=1.5, massa=0.45)
    else:
        colore = None

    # --- il capo: la palla tirata sulla testa, oppure i capelli
    def guscio(nome, centro, raggi, z_taglio, faccia_aperta, mat, osso_basso='Neck'):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
        for v in bm.verts:
            v.co = Vector((centro.x + v.co.x * raggi.x, centro.y + v.co.y * raggi.y, centro.z + v.co.z * raggi.z))
        via = [f for f in bm.faces if f.calc_center_median().z < z_taglio or
               (faccia_aperta and f.calc_center_median().y < centro.y - raggi.y * 0.35 and f.calc_center_median().z < centro.z + raggi.z * 0.45)]
        bmesh.ops.delete(bm, geom=via, context='FACES')
        verts = [tuple(v.co) for v in bm.verts]
        idx = {v: i for i, v in enumerate(bm.verts)}
        facce = [tuple(idx[v] for v in f.verts) for f in bm.faces]
        bm.free()
        pesi = [[('Head', smooth(zc + 0.02, centro.z, z)), (osso_basso, 1 - smooth(zc + 0.02, centro.z, z))] for (_, _, z) in verts]
        return nuova_mesh(nome, rig, verts, facce, pesi, mat)

    capelli = None
    if velo and not m:
        mat = materiale('velo', colore or lin(r.choice(STOLA)), 0.95)
        guscio('velo', tc + Vector((0, 0.01, 0.012)), tr + Vector((0.016, 0.018, 0.012)), tc.z - tr.z * 0.6, True, mat)
        fs = fetta(zs - 0.02, 0.03)
        verts, facce = tornio([(tc.z - tr.z * 0.3, tr.x + 0.016, tr.y + 0.018), (zc, tr.x + 0.03, tr.y + 0.03), (zs - 0.08, fs[2] * 0.8, fs[3] + 0.03)],
                              18, math.pi * 0.62, math.pi * 1.38, tc.x, tc.y + 0.01, 1, 1, False)
        pesi = [[('Head', smooth(zc, tc.z, z)), ('Neck1', 1 - smooth(zc, tc.z, z) - smooth(zc, zs - 0.08, z) * 0.5), ('Spine1', smooth(zc, zs - 0.08, z) * 0.5)] for (_, _, z) in verts]
        nuova_mesh('velo-dietro', rig, verts, facce, pesi, mat)
    else:
        # uomini a capelli corti (ritratti pompeiani); ragazze con la treccia [ipotesi]
        capelli = r.choice(['short01', 'short02', 'short03', 'short04']) if m else r.choice(['braid01', 'ponytail01'])
        HumanService.add_mhclo_asset(os.path.join(DATI('hair'), capelli, capelli + '.mhclo'), base, asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN')

    bpy.data.objects.remove(base, do_unlink=True)
    for o in rig.children:
        for mod in o.modifiers:
            if mod.type != 'ARMATURE':
                o.modifiers.remove(mod)
    info = dict(var, palla=palla, velo=velo, capelli=capelli, maniche=sp['maniche'],
                pelle=pelle_tinta, colore_capelli=capelli_tinta, orlo=round(orlo, 2), altezza=round(altezza, 3),
                anche=round(zh, 4), file=f'romana-{var["n"]:02d}.glb',
                vertici=sum(len(o.data.vertices) for o in rig.children if o.type == 'MESH'))
    return rig, info


def esporta(rig, file):
    # tutto dentro un solo file HTML: texture piccole, la pelle a 512
    for img in bpy.data.images:
        if not img.size[0]: continue
        nome = img.name.lower()
        # i capelli restano PNG per la trasparenza: a 512 pesavano 270 KB
        capelli = any(h in nome for h in ('short', 'braid', 'ponytail', 'bob', 'long'))
        lato = 64 if 'eye' in nome and 'brow' not in nome else 128 if 'brow' in nome or 'lash' in nome or capelli else 256 if 'diffuse' not in nome else 512
        if max(img.size) > lato:
            img.scale(lato, lato)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in rig.children: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=file, export_format='GLB', use_selection=True, export_animations=False,
                              export_skins=True, export_morph=False, export_yup=True, export_apply=False,
                              export_image_format='JPEG', export_jpeg_quality=72, export_materials='EXPORT')


def main():
    os.makedirs(USCITA, exist_ok=True)
    scelta = [int(sys.argv[sys.argv.index('--') + 1])] if '--' in sys.argv else [v['n'] for v in VARIANTI]
    percorso_json = os.path.join(USCITA, 'romane.json')
    elenco = []
    if os.path.exists(percorso_json) and len(scelta) == 1:
        elenco = [e for e in json.load(open(percorso_json)) if e['n'] not in scelta]
    for n in scelta:
        rig, info = crea(VARIANTI[n])
        esporta(rig, os.path.join(USCITA, info['file']))
        elenco.append(info)
        print('FIGURA', json.dumps(info))
    elenco.sort(key=lambda e: e['n'])
    json.dump(elenco, open(percorso_json, 'w'), indent=1)


if __name__ == '__main__':
    main()
