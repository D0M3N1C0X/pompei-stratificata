"""
La vasca cruciforme della Palestra di Ercolano, costruita in Blender senza
interfaccia.

    npm run modelli

Seconda applicazione della regola del 7 ottobre 2026: realismo SOLO dove c'è
una misura pubblicata. La misura sicura qui è una sola, la lunghezza dei due
bracci, e due fonti indipendenti la danno uguale:
  · Deiss 1968, «Herculaneum: a city returns to the sun», p. 128:
    croce «some 160 feet in length», braccio trasversale di 100 piedi
    (48,8 e 30,5 m)
  · De Vos & De Vos 1982, via it.wikipedia «Palestra (Ercolano)», e il
    Madain Project: bracci di circa 50 e 30 m

Che cosa è misurato e che cosa no, dentro questo stesso file:
· bracci, 50 e 30 m ............................................. MISURATI
· orientamento: il braccio lungo corre sul lato lungo del campo ... DEDOTTO,
  non scritto: il campo misura 77 × 47 m (Maiuri 1960) e un braccio di 50 m
  non entra nei 47.
· incrocio al centro dei due bracci ............................. NON certo:
  nessuna fonte lo dice; qui la croce è simmetrica.
· larghezza dei bracci, 5,5 m ................................... DEBOLE:
  la dà solo il Madain Project [fonte terziaria]; it.wikipedia ha una frase
  guasta («una lunghezza di cinque»).
· profondità, 1 m ............................................... DEBOLE:
  1 m per it.wikipedia, 1,1 m per il Madain Project. Fondo piano.
· bordo e materiali ............................................. NON documentati:
  scelta di disegno, sottile e neutra.

E soprattutto: la vasca è SEPOLTA. Il deposito sopra non è mai stato tolto,
solo svuotato «come una caverna» sopra la parte centrale (Deiss 1968). Nel
modello sta sotto il deposito e si vede solo con «ciò che è sotto».

Unità: quelle del modello, 1 unità = 4 m. Origine all'incrocio dei bracci,
al piano antico. Braccio lungo su X. Blender lavora con Z in alto;
l'esportatore glTF ruota in Y in alto, come vuole three.js.
"""
import bpy, bmesh, sys, os

M = 1 / 4.0                       # un metro in unità del modello
LUNGO, CORTO = 50 * M, 30 * M     # i due bracci: la misura pubblicata
LARGO = 5.5 * M                   # debole: una sola fonte terziaria
PROF = 1.0 * M                    # debole: 1 – 1,1 m
BORDO = 0.6 * M                   # disegno, non misura
ALTO_BORDO = 0.2 * M
PELO = -0.12 * M

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'ercolano-palestra-vasca.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)

def materiale(nome, colore, ruvido, alfa=1.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*colore, 1)
    p.inputs['Roughness'].default_value = ruvido
    if alfa < 1:
        p.inputs['Alpha'].default_value = alfa
        m.blend_method = 'BLEND'
    return m

PIETRA = materiale('pietra', (0.66, 0.62, 0.54), 0.85)
VASCA  = materiale('vasca',  (0.50, 0.51, 0.49), 0.9)
ACQUA  = materiale('acqua',  (0.10, 0.24, 0.27), 0.05, 0.88)

def croce(lx, ly, w):
    """La croce come poligono, in senso antiorario: bracci lx e ly, larghezza 2w."""
    return [(-lx,-w), (-w,-w), (-w,-ly), (w,-ly), (w,-w), (lx,-w),
            (lx, w), (w, w), (w, ly), (-w, ly), (-w, w), (-lx, w)]

def prisma(nome, poligono, z0, z1, mat=None):
    bm = bmesh.new()
    giu = [bm.verts.new((x, y, z0)) for x, y in poligono]
    su  = [bm.verts.new((x, y, z1)) for x, y in poligono]
    bm.faces.new(list(reversed(giu)))
    bm.faces.new(su)
    n = len(poligono)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((giu[i], giu[j], su[j], su[i]))
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nome, me)
    if mat: ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    return ob

hx, hy, w = LUNGO / 2, CORTO / 2, LARGO / 2
DENTRO = croce(hx, hy, w)
FUORI  = croce(hx + BORDO, hy + BORDO, w + BORDO)

# ── il bordo: la croce allargata, meno la croce della vasca
bordo = prisma('bordo', FUORI, -0.05 * M, ALTO_BORDO, PIETRA)
taglio = prisma('taglio', DENTRO, -1.0, 1.0)
bool_ = bordo.modifiers.new('vuoto', 'BOOLEAN')
bool_.operation = 'DIFFERENCE'; bool_.object = taglio; bool_.solver = 'EXACT'
bpy.context.view_layer.objects.active = bordo
bpy.ops.object.modifier_apply(modifier='vuoto')
bpy.data.objects.remove(taglio, do_unlink=True)

# ── la vasca: pareti e fondo piano, senza coperchio, facce verso l'interno
vasca = prisma('vasca', DENTRO, -PROF, 0.0, VASCA)
bm = bmesh.new(); bm.from_mesh(vasca.data)
bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.faces[1]], context='FACES')   # il coperchio
bmesh.ops.reverse_faces(bm, faces=bm.faces)
bm.to_mesh(vasca.data); bm.free()

# ── l'acqua: la croce, appena sotto il bordo
bm = bmesh.new()
bm.faces.new([bm.verts.new((x, y, PELO)) for x, y in DENTRO])
me = bpy.data.meshes.new('acqua'); bm.to_mesh(me); bm.free()
acqua = bpy.data.objects.new('acqua', me); acqua.data.materials.append(ACQUA)
bpy.context.collection.objects.link(acqua)

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True,
                          export_yup=True, export_materials='EXPORT')
print('ESPORTATO', out, os.path.getsize(out), 'byte')
