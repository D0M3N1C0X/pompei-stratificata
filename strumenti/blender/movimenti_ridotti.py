"""
I movimenti degli abitanti: due sole clip, prese dal file dei movimenti di
Firenze 1216 (strumenti/figure/movimenti.py di quel progetto), che le ha già
trasferite dal database CMU allo scheletro cmu_mb di MakeHuman.

    Blender -b --python movimenti_ridotti.py -- <movimenti.glb di Firenze> <uscita.glb>

  · cammina2  — CMU 35_01, 1,104 m/s: la più vicina al passo medio degli
                abitanti (0,86–1,38 m/s)
  · fermo     — CMU 77_02, 4,9 s: le soste

Dati: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), uso
libero anche in prodotti; conversione BVH di B. Hahne (cgspeed).
"""
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
sorgente, uscita = argv[0], argv[1]
TENERE = {'cammina2', 'fermo'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sorgente)
print('AZIONI', sorted(a.name for a in bpy.data.actions))
for a in list(bpy.data.actions):
    nome = a.name.split('_Armature')[0].split('|')[-1]
    if not any(a.name.startswith(t) or nome == t for t in TENERE):
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
