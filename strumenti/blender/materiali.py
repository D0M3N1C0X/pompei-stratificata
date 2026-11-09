"""
I materiali di pietra: marmo, pietra da taglio e intonaco, generati in
Blender e cotti in texture che si ripetono senza giunture.

    python strumenti/blender/materiali.py           (con il modulo bpy di PyPI)

Scrive in src/assets/pbr/procedurali/ tre mappe per materiale, in WebP:
  <nome>-colore.webp      chiaro e quasi neutro: la tinta la dà la tavolozza
                          della scena (src/scene/palette.js), che la moltiplica
  <nome>-normale.webp     il rilievo, in spazio tangente
  <nome>-ruvido.webp      la ruvidità

Perché il colore è chiaro: il 13 ottobre 2026 un intonaco fotografico con
media RGB 69/73/77, moltiplicato per il beige delle pareti, dava muri neri.
Qui la media sta fra 0,72 e 0,97 e si controlla alla fine (MEDIA).

Come si ripetono: il rumore è a quattro dimensioni, e le coordinate (u, v)
del piano diventano (cos u, sin u, cos v, sin v), un toro: il bordo destro
coincide col sinistro, quello alto col basso.

Sono materiali, non dati: non dicono di che pietra fosse fatto un edificio.
"""
import math
import os
import time

import bpy

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.abspath(os.path.join(QUI, '..', '..', 'src', 'assets', 'pbr', 'procedurali'))
LATO = 1024
CAMPIONI = 16


def scena():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = CAMPIONI
    bpy.ops.mesh.primitive_plane_add(size=2)
    piano = bpy.context.active_object
    return sc, piano


def toro(nt):
    """(u, v) del piano → vettore 3D e W del rumore 4D, che si ripete su u e v."""
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    def angolo(sock):
        m = nt.nodes.new('ShaderNodeMath'); m.operation = 'MULTIPLY'; m.inputs[1].default_value = 2 * math.pi
        nt.links.new(sock, m.inputs[0]); return m.outputs[0]
    def trig(sock, op):
        m = nt.nodes.new('ShaderNodeMath'); m.operation = op
        nt.links.new(sock, m.inputs[0]); return m.outputs[0]
    au, av = angolo(sep.outputs['X']), angolo(sep.outputs['Y'])
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(trig(au, 'COSINE'), comb.inputs['X'])
    nt.links.new(trig(au, 'SINE'), comb.inputs['Y'])
    nt.links.new(trig(av, 'COSINE'), comb.inputs['Z'])
    return comb.outputs[0], trig(av, 'SINE')


def rumore(nt, vec, w, scala, dettaglio=8, ruvidita=0.55, tipo='noise'):
    if tipo == 'voronoi':
        n = nt.nodes.new('ShaderNodeTexVoronoi'); n.voronoi_dimensions = '4D'; n.feature = 'F1'
        nt.links.new(vec, n.inputs['Vector']); nt.links.new(w, n.inputs['W'])
        n.inputs['Scale'].default_value = scala
        return n.outputs['Distance']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.noise_dimensions = '4D'
    nt.links.new(vec, n.inputs['Vector']); nt.links.new(w, n.inputs['W'])
    n.inputs['Scale'].default_value = scala
    n.inputs['Detail'].default_value = dettaglio
    n.inputs['Roughness'].default_value = ruvidita
    return n.outputs['Fac']


def rampa(nt, sock, punti):
    r = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(sock, r.inputs['Fac'])
    els = r.color_ramp.elements
    while len(els) > 2:
        els.remove(els[-1])
    for i, (pos, col) in enumerate(punti):
        e = els[i] if i < 2 else els.new(pos)
        e.position = pos
        e.color = (*col, 1) if len(col) == 3 else (col[0], col[0], col[0], 1)
    return r.outputs['Color']


def mix(nt, a, b, fac, modo='MIX'):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = modo
    m.inputs['Factor'].default_value = fac if isinstance(fac, float) else 0.5
    if not isinstance(fac, float):
        nt.links.new(fac, m.inputs['Factor'])
    nt.links.new(a, m.inputs[6]); nt.links.new(b, m.inputs[7])
    return m.outputs[2]


def materiale(nome):
    """Il grafo di un materiale: restituisce (colore, altezza, ruvidità) come socket."""
    mat = bpy.data.materials.new(nome)
    mat.use_nodes = True
    nt = mat.node_tree
    vec, w = toro(nt)
    if nome == 'marmo':
        # bianco con venature grigio-azzurre sottili, molto liscio: le vene
        # stanno dove il rumore passa per il suo valore medio (una linea)
        base = rumore(nt, vec, w, 1.6, 6, 0.6)
        vene = rumore(nt, vec, w, 1.1, 12, 0.62)
        fini = rumore(nt, vec, w, 2.6, 10, 0.6)
        vena = rampa(nt, vene, [(0.0, (0.95, 0.94, 0.92)), (0.485, (0.95, 0.94, 0.92)), (0.5, (0.50, 0.52, 0.57)), (0.515, (0.95, 0.94, 0.92)), (1.0, (0.95, 0.94, 0.92))])
        filo = rampa(nt, fini, [(0.0, (1.0,)), (0.493, (1.0,)), (0.5, (0.78,)), (0.507, (1.0,)), (1.0, (1.0,))])
        colore = mix(nt, mix(nt, vena, filo, 1.0, 'MULTIPLY'),
                     rampa(nt, base, [(0.25, (0.84, 0.83, 0.80)), (0.75, (1.0, 0.99, 0.97))]), 0.6, 'MULTIPLY')
        altezza = fini
        ruvido = rampa(nt, base, [(0.0, (0.12,)), (1.0, (0.40,))])
    elif nome == 'pietra':
        # pietra da taglio porosa: grana fine, piccoli pori, macchie larghe
        grana = rumore(nt, vec, w, 18.0, 10, 0.65)
        macchie = rumore(nt, vec, w, 2.2, 4, 0.5)
        pori = rumore(nt, vec, w, 40.0, 0, 0.5, 'voronoi')
        colore = mix(nt, rampa(nt, macchie, [(0.3, (0.62, 0.60, 0.55)), (0.7, (0.95, 0.93, 0.88))]),
                     rampa(nt, grana, [(0.25, (0.66,)), (0.75, (1.0,))]), 0.7, 'MULTIPLY')
        colore = mix(nt, colore, rampa(nt, pori, [(0.0, (0.30,)), (0.09, (1.0,))]), 0.8, 'MULTIPLY')
        altezza = mix(nt, rampa(nt, grana, [(0.0, (0.0,)), (1.0, (1.0,))]), rampa(nt, pori, [(0.0, (0.0,)), (0.1, (1.0,))]), 0.5, 'MULTIPLY')
        ruvido = rampa(nt, grana, [(0.0, (0.62,)), (1.0, (1.0,))])
    else:
        # intonaco di calce: grana finissima e larghe passate di cazzuola appena visibili
        grana = rumore(nt, vec, w, 30.0, 10, 0.6)
        passate = rumore(nt, vec, w, 1.4, 3, 0.45)
        colore = mix(nt, rampa(nt, passate, [(0.25, (0.70,)), (0.75, (1.0,))]),
                     rampa(nt, grana, [(0.2, (0.76,)), (0.8, (1.0,))]), 0.6, 'MULTIPLY')
        altezza = mix(nt, rampa(nt, grana, [(0.0, (0.0,)), (1.0, (1.0,))]), rampa(nt, passate, [(0.0, (0.0,)), (1.0, (1.0,))]), 0.35, 'MIX')
        ruvido = rampa(nt, grana, [(0.0, (0.66,)), (1.0, (1.0,))])
    return mat, nt, colore, altezza, ruvido


def cuoci(piano, mat, nt, uscita_sock, tipo, file, forza_bump=None, altezza=None):
    """Cuoce un'uscita del grafo in una immagine del piano."""
    img = bpy.data.images.new(file, LATO, LATO, float_buffer=False)
    if tipo == 'NORMAL' or 'ruvido' in file:
        img.colorspace_settings.name = 'Non-Color'
    out = nt.nodes.get('Material Output')
    bsdf = nt.nodes.get('Principled BSDF')
    if tipo == 'NORMAL':
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = forza_bump
        bump.inputs['Distance'].default_value = 0.02
        nt.links.new(altezza, bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        nt.links.new(bsdf.outputs[0], out.inputs['Surface'])
    else:
        em = nt.nodes.new('ShaderNodeEmission')
        nt.links.new(uscita_sock, em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs['Surface'])
    nodo = nt.nodes.new('ShaderNodeTexImage'); nodo.image = img
    nt.nodes.active = nodo
    bpy.ops.object.bake(type='NORMAL' if tipo == 'NORMAL' else 'EMIT', margin=0,
                        normal_space='TANGENT')
    img.filepath_raw = os.path.join(USCITA, file)
    img.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.quality = 88
    img.save()
    px = img.pixels[:]
    media = sum(px[i] for i in range(0, len(px), 4 * 97)) / len(range(0, len(px), 4 * 97))
    return media


def main():
    os.makedirs(USCITA, exist_ok=True)
    MEDIA = {}
    for nome, bump in (('marmo', 0.25), ('pietra', 0.9), ('intonaco', 0.35)):
        t = time.time()
        sc, piano = scena()
        mat, nt, colore, altezza, ruvido = materiale(nome)
        piano.data.materials.append(mat)
        MEDIA[nome] = cuoci(piano, mat, nt, colore, 'EMIT', f'{nome}-colore.webp')
        cuoci(piano, mat, nt, ruvido, 'EMIT', f'{nome}-ruvido.webp')
        cuoci(piano, mat, nt, None, 'NORMAL', f'{nome}-normale.webp', bump, altezza)
        print(f'{nome}: colore medio {MEDIA[nome]:.2f}, {time.time() - t:.0f} s')
    # il colore deve restare chiaro: moltiplicato per la tavolozza non deve spegnere i muri
    for nome, m in MEDIA.items():
        assert 0.72 <= m <= 0.97, f'{nome}: colore medio {m:.2f}, fuori da 0,72–0,97'
    print('scritti in', USCITA)


main()
