"""
La piscina della Palestra Grande, costruita in Blender senza interfaccia.

    npm run modelli

È il pilota della regola decisa il 7 ottobre 2026: realismo SOLO dove c'è una
misura pubblicata. Qui la misura è quella della guida ufficiale del Parco
Archeologico di Pompei — piscina di 23 × 35 m — su cui le altre fonti
concordano entro un metro (35 × 22).

Che cosa è misurato e che cosa no, dentro questo stesso file:
· pianta della vasca, 35 × 23 m ................................ MISURATA
· profondità: fondo inclinato, da 1 m a 2 m ..................... NON certa:
  una guida dà da 1 a 2,6 m, un'altra un massimo di circa 2 m. Qui il fondo
  scende da 1 a 2 m; l'acqua è disegnata quasi opaca apposta, perché il fondo
  non è il dato che il modello vuole mostrare.
· larghezza e forma del bordo in pietra ......................... NON misurate:
  scelta di disegno, sottile.
· materiali ..................................................... NON documentati:
  colori neutri. Il realismo qui sta nella geometria, non nelle superfici.

Unità: quelle del modello, 1 unità = 4 m. Origine al centro della vasca, al
piano del 79. Asse lungo su X. Blender lavora con Z in alto; l'esportatore
glTF ruota in Y in alto, come vuole three.js.
"""
import bpy, bmesh, sys, os

M = 1 / 4.0                      # un metro in unità del modello
LUNGO, CORTO = 35 * M, 23 * M    # misura pubblicata
BORDO = 0.7 * M                  # disegno, non misura
ALTO_BORDO = 0.25 * M            # di quanto il bordo sporge dal piano
PROF_MIN, PROF_MAX = 1.0 * M, 2.0 * M
PELO = -0.12 * M                 # l'acqua appena sotto il bordo

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'palestra-piscina.glb'

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

def oggetto(nome, bm, mat):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nome, me)
    ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    return ob

def scatola(bm, x0, x1, y0, y1, z0, z1):
    v = [bm.verts.new((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    for f in ((0,1,3,2), (4,6,7,5), (0,4,5,1), (2,3,7,6), (0,2,6,4), (1,5,7,3)):
        bm.faces.new([v[i] for i in f])

hx, hy = LUNGO / 2, CORTO / 2

# ── il bordo: quattro conci continui, con gli spigoli smussati
bm = bmesh.new()
scatola(bm, -hx-BORDO, hx+BORDO, -hy-BORDO, -hy, -0.05*M, ALTO_BORDO)
scatola(bm, -hx-BORDO, hx+BORDO,  hy, hy+BORDO, -0.05*M, ALTO_BORDO)
scatola(bm, -hx-BORDO, -hx, -hy, hy, -0.05*M, ALTO_BORDO)
scatola(bm,  hx, hx+BORDO, -hy, hy, -0.05*M, ALTO_BORDO)
bordo = oggetto('bordo', bm, PIETRA)
smusso = bordo.modifiers.new('smusso', 'BEVEL')
smusso.width = 0.04 * M; smusso.segments = 2

# ── la vasca: pareti e fondo inclinato lungo l'asse lungo
def prof(x):
    return -(PROF_MIN + (PROF_MAX - PROF_MIN) * (x + hx) / LUNGO)

bm = bmesh.new()
a = [bm.verts.new(p) for p in ((-hx,-hy,0), (hx,-hy,0), (hx,hy,0), (-hx,hy,0))]
b = [bm.verts.new((x, y, prof(x))) for x, y, _ in (v.co for v in a)]
bm.faces.new((b[0], b[3], b[2], b[1]))                       # fondo, normale in su
for i in range(4):
    j = (i + 1) % 4
    bm.faces.new((a[i], a[j], b[j], b[i]))                   # pareti, normali verso l'interno
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bmesh.ops.reverse_faces(bm, faces=bm.faces)                  # le vogliamo verso il centro
oggetto('vasca', bm, VASCA)

# ── l'acqua
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
for v in bm.verts:
    v.co.x *= LUNGO; v.co.y *= CORTO; v.co.z = PELO
oggetto('acqua', bm, ACQUA)

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True,
                          export_yup=True, export_materials='EXPORT')
print('ESPORTATO', out, os.path.getsize(out), 'byte')
