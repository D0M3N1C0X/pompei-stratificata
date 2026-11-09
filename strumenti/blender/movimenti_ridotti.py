"""
I movimenti degli abitanti, presi dal file dei movimenti di Firenze 1216
(strumenti/figure/movimenti.py di quel progetto), che le ha già trasferite
dal database CMU allo scheletro cmu_mb di MakeHuman.

    Blender -b --python movimenti_ridotti.py -- <movimenti.glb di Firenze> --elenco
        stampa i movimenti che il file contiene, con la durata, e si ferma

    Blender -b --python movimenti_ridotti.py -- <movimenti.glb di Firenze> <uscita.glb> [gesto=NOME] [corsa=NOME]

Sempre:
  · cammina2  — CMU 35_01, 1,104 m/s: la più vicina al passo medio degli
                abitanti (0,86–1,38 m/s)
  · fermo     — CMU 77_02, 4,9 s: le soste
Facoltativi (dal 9 novembre 2026), rinominati per il modello:
  · gesto     — chi si ferma al bancone di una bottega o a una fontana
                (un movimento sul posto: porgere, prendere, chinarsi)
  · corsa     — chi fugge durante l'eruzione (1,4–2,4 m/s)
Se mancano, il modello usa la sosta al posto del gesto e il passo al posto
della corsa (src/scene/figure.js): niente si rompe.

Dati: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), uso
libero anche in prodotti; conversione BVH di B. Hahne (cgspeed).
"""
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
sorgente = argv[0]
ELENCO = '--elenco' in argv
uscita = None if ELENCO else argv[1]
scelte = dict(a.split('=', 1) for a in argv[2:] if '=' in a)     # gesto=NOME, corsa=NOME
TENERE = {'cammina2', 'fermo'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sorgente)
nome_di = lambda a: a.name.split('_Armature')[0].split('|')[-1]
fps = bpy.context.scene.render.fps
if ELENCO:
    for a in sorted(bpy.data.actions, key=lambda a: nome_di(a)):
        f0, f1 = a.frame_range
        print(f'MOVIMENTO {nome_di(a):30s} {(f1 - f0) / fps:5.1f} s')
    sys.exit(0)

print('AZIONI', sorted(a.name for a in bpy.data.actions))
rinomina = {v: k for k, v in scelte.items() if k in ('gesto', 'corsa')}
for nome in rinomina:
    if not any(nome_di(a) == nome or a.name.startswith(nome) for a in bpy.data.actions):
        sys.exit(f'movimento «{nome}» non trovato: lancia con --elenco per vedere quelli che ci sono')
for a in list(bpy.data.actions):
    nome = nome_di(a)
    trovato = next((n for n in rinomina if nome == n or a.name.startswith(n)), None)
    if trovato:
        a.name = rinomina[trovato]
    elif not any(a.name.startswith(t) or nome == t for t in TENERE):
        bpy.data.actions.remove(a)
# le tracce NLA create dall'importatore puntano anche alle azioni tolte
for o in bpy.data.objects:
    if o.animation_data:
        for tr in list(o.animation_data.nla_tracks):
            if not any(s.action for s in tr.strips):
                o.animation_data.nla_tracks.remove(tr)
print('RESTANO', sorted(a.name for a in bpy.data.actions))
bpy.ops.export_scene.gltf(filepath=uscita, export_format='GLB', export_animations=True,
                          export_animation_mode='ACTIONS', export_skins=True, export_yup=True)
