"""
La luce cotta del suolo: l'occlusione ambientale di strade, marciapiedi e
terreno, calcolata da Cycles e messa in una texture vista dall'alto.

    python strumenti/blender/luce_cotta.py citta.json src/assets/luce/ao-suolo.png [lato_px] [campioni]

citta.json è la geometria della città come la costruisce il modello
(pompei.geometria() con ?debug, vedi scripts/luce-cotta.mjs): blocchi e
tetti come [x, y, z, l, h, p], centro e misure in unità di scena (1 = 4 m).

Che cosa fa: ricostruisce i blocchi in un'unica mesh, stende sotto un piano
alla quota del marciapiede, e cuoce sul piano quanto cielo vede ogni punto
entro 12 m. Lungo i muri, nei vicoli e nei cortili il suolo si scurisce;
nelle piazze resta chiaro. È luce, non un dato: non dice niente di più
sulla città di quanto dica la geometria che già c'è.

Gira con Blender (anche il modulo bpy di PyPI, senza interfaccia) e il
motore Cycles sul processore. Scrive accanto alla PNG un JSON con l'estensione
del piano, che il modello usa per leggere la texture in coordinate di mondo.
"""
import json
import sys
import time

import bpy
import bmesh

DISTANZA = 3.0          # unità: 12 m di raggio per l'occlusione [disegno]
MARGINE = 6.0           # unità attorno alla città
SOPRA = 0.1             # unità: 40 cm, la cima minima di un blocco che fa ombra


def main():
    sorgente, uscita = sys.argv[-2], sys.argv[-1]
    lato = 4096
    campioni = 48
    args = [a for a in sys.argv[1:] if not a.endswith(('.json', '.png'))]
    if args:
        lato = int(args[0])
    if len(args) > 1:
        campioni = int(args[1])

    geo = json.load(open(sorgente))
    # solo ciò che sta sopra il suolo: le lastre di strade, marciapiedi e
    # terreno (cima sotto i 40 cm) coprirebbero il piano su cui si cuoce
    blocchi = [b for b in geo['blocchi'] + geo['tetti'] if b[1] + b[4] / 2 > SOPRA]

    # l'estensione del piano: la terrazza della città, con un margine
    xs = [p[0] for p in geo['terreno']] + [b[0] for b in blocchi]
    zs = [p[1] for p in geo['terreno']] + [b[2] for b in blocchi]
    x0, x1 = min(xs) - MARGINE, max(xs) + MARGINE
    z0, z1 = min(zs) - MARGINE, max(zs) + MARGINE
    larghezza = lato
    altezza = max(64, round(lato * (z1 - z0) / (x1 - x0)))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scena = bpy.context.scene
    scena.render.engine = 'CYCLES'
    scena.cycles.device = 'CPU'
    scena.cycles.samples = campioni
    scena.world = bpy.data.worlds.new('cielo')
    scena.world.light_settings.distance = DISTANZA

    # la città: in Blender l'asse alto è z, quindi (x, y, z) della scena
    # diventa (x, -z, y)
    bm = bmesh.new()
    for x, y, z, l, h, p in blocchi:
        if l <= 0 or h <= 0 or p <= 0:
            continue
        v = [bm.verts.new((x + sx * l / 2, -(z + sz * p / 2), y + sy * h / 2))
             for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
        for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            bm.faces.new([v[i] for i in f])
    me = bpy.data.meshes.new('citta')
    bm.to_mesh(me)
    bm.free()
    citta = bpy.data.objects.new('citta', me)
    scena.collection.objects.link(citta)

    # il piano del suolo, con le coordinate di texture che il modello userà:
    # u = (x - x0) / (x1 - x0), v = (z - z0) / (z1 - z0)
    bm = bmesh.new()
    # l'ordine dei vertici fa guardare il piano verso l'alto: invertire z per
    # passare a Blender ribalta il giro, e un piano rivolto in basso cuoceva
    # tutto bianco (provato con un muro solo)
    angoli = [(x0, z0), (x0, z1), (x1, z1), (x1, z0)]
    vv = [bm.verts.new((x, -z, 0.0)) for x, z in angoli]
    faccia = bm.faces.new(vv)
    faccia.normal_update()
    assert faccia.normal.z > 0.99, 'il piano del suolo deve guardare in alto'
    uv = bm.loops.layers.uv.new('UVMap')
    for loop, (x, z) in zip(faccia.loops, angoli):
        loop[uv].uv = ((x - x0) / (x1 - x0), (z - z0) / (z1 - z0))
    me = bpy.data.meshes.new('suolo')
    bm.to_mesh(me)
    bm.free()
    suolo = bpy.data.objects.new('suolo', me)
    scena.collection.objects.link(suolo)

    img = bpy.data.images.new('ao', larghezza, altezza, float_buffer=False)
    mat = bpy.data.materials.new('suolo')
    mat.use_nodes = True
    nodo = mat.node_tree.nodes.new('ShaderNodeTexImage')
    nodo.image = img
    mat.node_tree.nodes.active = nodo
    suolo.data.materials.append(mat)

    for o in scena.objects:
        o.select_set(o is suolo)
    bpy.context.view_layer.objects.active = suolo
    t = time.time()
    bpy.ops.object.bake(type='AO', margin=2)
    print(f'cottura: {larghezza}×{altezza} px, {campioni} campioni, {len(blocchi)} blocchi, {time.time() - t:.0f} s')

    img.filepath_raw = uscita
    img.file_format = 'PNG'
    scena.render.image_settings.color_mode = 'BW'
    img.save()
    meta = uscita[:-4] + '.json'
    json.dump({'x0': round(x0, 3), 'z0': round(z0, 3), 'x1': round(x1, 3), 'z1': round(z1, 3),
               'px': [larghezza, altezza], 'distanza_unita': DISTANZA, 'campioni': campioni},
              open(meta, 'w'), indent=1)
    print('scritti', uscita, meta)


main()
