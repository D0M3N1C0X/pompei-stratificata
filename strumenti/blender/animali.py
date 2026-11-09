"""
Gli animali della scena: un cane e un piccione, con scheletro e due
movimenti ciascuno, costruiti da zero con uno script (nessuna estensione,
nessun file esterno).

    python strumenti/blender/animali.py          (con il modulo bpy di PyPI)
    Blender -b --python strumenti/blender/animali.py

Scrive src/assets/figure/cane-NN.glb, piccione.glb e animali.json.

Che cosa sono: animali generici, a misura plausibile (un cane di taglia
media alto 50 cm al garrese, un piccione di 32 cm), per prendere il posto
dei solidi geometrici disegnati nel codice. A Pompei i cani sono attestati
(il mosaico «cave canem» della Casa del Poeta Tragico, il calco del cane
della Casa di Vesonius Primus) e i piccioni erano già nella scena; qui non
si dice niente di più: razza, mantello e piumaggio sono [ipotesi], il
movimento è [disegno].

Tecnica: uno scheletro di spigoli con il modificatore Skin dà la forma
(raggi diversi per ogni punto), una suddivisione la ammorbidisce, uno
scheletro di ossa la muove; i pesi delle ossa vengono dal calore
(parent_set ARMATURE_AUTO). I movimenti sono chiavi sulle rotazioni delle
ossa, un ciclo ciascuno: «passo» e «sosta», gli stessi nomi che il modello
cerca (src/scene/figure.js). In Blender l'animale guarda verso -Y, che nel
glTF diventa +Z come le figure umane.
"""
import json
import math
import os

import bpy
from mathutils import Quaternion, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.abspath(os.path.join(QUI, '..', '..', 'src', 'assets', 'figure'))
FPS = 24


def pulisci():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS


def attiva(o):
    for x in bpy.context.view_layer.objects:
        x.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def corpo_skin(nome, punti, spigoli, raggi, suddivisioni=1):
    """Una mesh dal modificatore Skin: punti (x, y, z), spigoli (i, j), raggi per punto."""
    me = bpy.data.meshes.new(nome)
    me.from_pydata(punti, spigoli, [])
    o = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(o)
    attiva(o)
    sk = o.modifiers.new('skin', 'SKIN')
    sk.use_smooth_shade = True
    for v, r in zip(me.skin_vertices[0].data, raggi):
        v.radius = r if isinstance(r, (tuple, list)) else (r, r)
    me.skin_vertices[0].data[0].use_root = True
    sub = o.modifiers.new('sub', 'SUBSURF')
    sub.levels = sub.render_levels = suddivisioni
    bpy.ops.object.modifier_apply(modifier='skin')
    bpy.ops.object.modifier_apply(modifier='sub')
    bpy.ops.object.shade_smooth()
    return o


def scheletro(nome, ossa):
    """ossa: [(nome, testa, coda, genitore)]"""
    arm = bpy.data.armatures.new(nome)
    o = bpy.data.objects.new(nome, arm)
    bpy.context.scene.collection.objects.link(o)
    attiva(o)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    for n, testa, coda, padre in ossa:
        b = eb.new(n)
        b.head, b.tail = Vector(testa), Vector(coda)
        if padre:
            b.parent = eb[padre]
            b.use_connect = (Vector(testa) - eb[padre].tail).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def lega(corpo, arm):
    for x in bpy.context.view_layer.objects:
        x.select_set(False)
    corpo.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')


def materiale(nome, rgb, ruvido=0.85):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = ruvido
    return m


def azione(arm, nome, durata_f, chiavi):
    """chiavi(f) -> {osso: (asse, gradi)} oppure {'Hips@z': metri}; un ciclo chiuso."""
    act = bpy.data.actions.new(nome)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    for f in range(durata_f + 1):
        fase = 2 * math.pi * f / durata_f
        valori = chiavi(fase)
        for pb in arm.pose.bones:
            pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
            pb.location = (0, 0, 0)
        for k, v in valori.items():
            if k.endswith('@loc'):
                arm.pose.bones[k[:-4]].location = v
                continue
            q = Quaternion()
            for asse, gradi in v:
                q = q @ Quaternion(asse, math.radians(gradi))
            arm.pose.bones[k].rotation_quaternion = q
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=f + 1)
            pb.keyframe_insert('location', frame=f + 1)
    # una traccia NLA per azione: l'esportatore glTF le prende tutte
    tr = arm.animation_data.nla_tracks.new()
    tr.name = nome
    tr.strips.new(nome, 1, act)
    arm.animation_data.action = None
    return act


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def cane(variante, mantello, ventre):
    pulisci()
    s = 1.0 + 0.06 * (variante - 1)                       # taglie leggermente diverse
    P = lambda x, y, z: (x * s, y * s, z * s)
    punti = [
        P(0, 0.22, 0.47), P(0, 0.0, 0.49), P(0, -0.21, 0.50),      # 0 bacino, 1 dorso, 2 petto
        P(0, -0.30, 0.60), P(0, -0.35, 0.68), P(0, -0.49, 0.65),   # 3 collo, 4 testa, 5 muso
        # zampe anteriori (sinistra +x, destra -x): spalla, gomito, carpo, zampa
        P(0.075, -0.21, 0.42), P(0.075, -0.23, 0.26), P(0.075, -0.22, 0.09), P(0.075, -0.26, 0.015),
        P(-0.075, -0.21, 0.42), P(-0.075, -0.23, 0.26), P(-0.075, -0.22, 0.09), P(-0.075, -0.26, 0.015),
        # zampe posteriori: anca, ginocchio, garretto, zampa
        P(0.075, 0.21, 0.42), P(0.075, 0.27, 0.26), P(0.075, 0.30, 0.10), P(0.075, 0.26, 0.015),
        P(-0.075, 0.21, 0.42), P(-0.075, 0.27, 0.26), P(-0.075, 0.30, 0.10), P(-0.075, 0.26, 0.015),
        # coda
        P(0, 0.30, 0.50), P(0, 0.40, 0.55), P(0, 0.49, 0.56),
        # orecchie
        P(0.045, -0.34, 0.77), P(-0.045, -0.34, 0.77),
    ]
    spigoli = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5),
               (2, 6), (6, 7), (7, 8), (8, 9), (2, 10), (10, 11), (11, 12), (12, 13),
               (0, 14), (14, 15), (15, 16), (16, 17), (0, 18), (18, 19), (19, 20), (20, 21),
               (0, 22), (22, 23), (23, 24), (4, 25), (4, 26)]
    raggi = [(0.10, 0.11), (0.11, 0.12), (0.12, 0.13), 0.065, (0.075, 0.08), 0.035,
             0.045, 0.035, 0.025, (0.028, 0.035), 0.045, 0.035, 0.025, (0.028, 0.035),
             0.055, 0.04, 0.026, (0.028, 0.035), 0.055, 0.04, 0.026, (0.028, 0.035),
             0.03, 0.022, 0.012, 0.018, 0.018]
    raggi = [tuple(v * s for v in r) if isinstance(r, tuple) else r * s for r in raggi]
    corpo = corpo_skin('cane', punti, spigoli, raggi)
    corpo.data.materials.append(materiale('mantello', mantello))
    # il ventre e il muso un tono più chiari: un secondo materiale sulle facce basse
    corpo.data.materials.append(materiale('ventre', ventre))
    for poly in corpo.data.polygons:
        c = poly.center
        if (c.z < 0.42 * s and abs(c.y) < 0.2 * s and abs(c.x) < 0.06 * s) or c.y < -0.47 * s:
            poly.material_index = 1

    pt = punti
    ossa = [
        ('Hips', pt[0], pt[1], None), ('Spine', pt[1], pt[2], 'Hips'),
        ('Neck', pt[2], pt[3], 'Spine'), ('Head', pt[3], pt[5], 'Neck'),
        ('FL1', pt[6], pt[7], 'Spine'), ('FL2', pt[7], pt[8], 'FL1'), ('FL3', pt[8], pt[9], 'FL2'),
        ('FR1', pt[10], pt[11], 'Spine'), ('FR2', pt[11], pt[12], 'FR1'), ('FR3', pt[12], pt[13], 'FR2'),
        ('HL1', pt[14], pt[15], 'Hips'), ('HL2', pt[15], pt[16], 'HL1'), ('HL3', pt[16], pt[17], 'HL2'),
        ('HR1', pt[18], pt[19], 'Hips'), ('HR2', pt[19], pt[20], 'HR1'), ('HR3', pt[20], pt[21], 'HR2'),
        ('Tail1', pt[22], pt[23], 'Hips'), ('Tail2', pt[23], pt[24], 'Tail1'),
    ]
    arm = scheletro('scheletro', ossa)
    lega(corpo, arm)

    # il passo: un'andatura al trotto, le diagonali insieme (FL con HR) [disegno]
    def passo(f):
        a, b = math.sin(f), math.sin(f + math.pi)
        alza = lambda v: max(0.0, -v)                      # piega solo quando la zampa torna avanti
        return {
            'FL1': [(X, 26 * a)], 'FL2': [(X, -38 * alza(math.cos(f)))],
            'FR1': [(X, 26 * b)], 'FR2': [(X, -38 * alza(math.cos(f + math.pi)))],
            'HL1': [(X, 24 * b)], 'HL2': [(X, 34 * alza(math.cos(f + math.pi)))],
            'HR1': [(X, 24 * a)], 'HR2': [(X, 34 * alza(math.cos(f)))],
            'Hips@loc': (0, 0, 0.012 * abs(math.sin(f))),
            'Head': [(X, 4 * math.sin(2 * f))],
            'Tail1': [(Z, 14 * math.sin(f)), (X, -10)], 'Tail2': [(Z, 18 * math.sin(f - 0.8))],
        }

    # la sosta: fermo, la testa che si guarda intorno, la coda che si muove [disegno]
    def sosta(f):
        return {
            'Head': [(Z, 22 * math.sin(f)), (X, 6 * math.sin(2 * f))],
            'Neck': [(Z, 8 * math.sin(f))],
            'Tail1': [(Z, 25 * math.sin(3 * f)), (X, -6)], 'Tail2': [(Z, 30 * math.sin(3 * f - 0.6))],
            'Spine': [(X, 1.5 * math.sin(2 * f))],
        }

    azione(arm, 'passo', 12, passo)                       # mezzo secondo per ciclo al trotto
    azione(arm, 'sosta', 96, sosta)                       # quattro secondi
    return corpo, arm


def piccione():
    pulisci()
    punti = [
        (0, 0.06, 0.12), (0, -0.02, 0.15), (0, -0.07, 0.20), (0, -0.10, 0.23), (0, -0.13, 0.22),  # 0 coda-base, 1 corpo, 2 petto, 3 collo, 4 testa
        (0, 0.13, 0.11), (0, 0.17, 0.105),                                                           # 5-6 coda
        (0.015, -0.01, 0.07), (0.015, 0.0, 0.0), (-0.015, -0.01, 0.07), (-0.015, 0.0, 0.0),           # 7-10 zampe
        (0, -0.155, 0.215),                                                                          # 11 becco
    ]
    spigoli = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 11), (0, 5), (5, 6), (1, 7), (7, 8), (1, 9), (9, 10)]
    raggi = [(0.05, 0.045), (0.06, 0.055), (0.05, 0.05), 0.028, 0.03, (0.04, 0.008), (0.045, 0.006),
             0.007, 0.005, 0.007, 0.005, 0.008]
    corpo = corpo_skin('piccione', punti, spigoli, raggi)
    corpo.data.materials.append(materiale('piume', (0.36, 0.38, 0.42)))
    corpo.data.materials.append(materiale('collo', (0.22, 0.30, 0.30), 0.5))
    for poly in corpo.data.polygons:
        if 0.19 < poly.center.z < 0.24 and poly.center.y < -0.06:
            poly.material_index = 1
    # le ali: due lame sottili, ciascuna con il suo osso
    ali = []
    for lato in (1, -1):
        me = bpy.data.meshes.new('ala')
        v = [(0.02 * lato, -0.06, 0.17), (0.02 * lato, 0.07, 0.15), (0.24 * lato, 0.04, 0.16), (0.20 * lato, -0.03, 0.17)]
        me.from_pydata(v, [], [(0, 1, 2, 3)] if lato > 0 else [(3, 2, 1, 0)])
        o = bpy.data.objects.new('ala', me)
        bpy.context.scene.collection.objects.link(o)
        attiva(o)
        so = o.modifiers.new('spessore', 'SOLIDIFY')
        so.thickness = 0.008
        bpy.ops.object.modifier_apply(modifier='spessore')
        o.data.materials.append(corpo.data.materials[0])
        ali.append(o)
    for x in bpy.context.view_layer.objects:
        x.select_set(False)
    for o in [corpo, *ali]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = corpo
    bpy.ops.object.join()
    ossa = [
        ('Hips', punti[0], punti[1], None), ('Neck', punti[2], punti[3], 'Hips'), ('Head', punti[3], punti[11], 'Neck'),
        ('Tail', punti[0], punti[6], 'Hips'),
        ('WingL', (0.02, 0.0, 0.165), (0.22, 0.0, 0.165), 'Hips'), ('WingR', (-0.02, 0.0, 0.165), (-0.22, 0.0, 0.165), 'Hips'),
    ]
    arm = scheletro('scheletro', ossa)
    lega(corpo, arm)

    # il volo: le ali battono a circa 8 colpi al secondo [disegno]
    def passo(f):
        a = 55 * math.sin(f)
        return {'WingL': [(Y, -a)], 'WingR': [(Y, a)], 'Tail': [(X, 8 * math.sin(f))],
                'Hips@loc': (0, 0, 0.01 * math.sin(f))}

    # la sosta: le ali chiuse, la testa che va avanti e indietro [disegno]
    def sosta(f):
        return {'WingL': [(Y, 70)], 'WingR': [(Y, -70)], 'Neck': [(X, 12 * max(0.0, math.sin(4 * f)))],
                'Head': [(Z, 15 * math.sin(f))]}

    azione(arm, 'passo', 3, passo)
    azione(arm, 'sosta', 72, sosta)
    return corpo, arm


def esporta(percorso):
    bpy.ops.export_scene.gltf(filepath=percorso, export_format='GLB', export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_apply=False,
                              export_yup=True, export_materials='EXPORT')


def main():
    os.makedirs(USCITA, exist_ok=True)
    elenco = []
    # tre mantelli: fulvo, nero focato, chiaro [ipotesi]
    MANTELLI = [((0.42, 0.28, 0.16), (0.62, 0.48, 0.32)), ((0.10, 0.09, 0.08), (0.45, 0.30, 0.18)),
                ((0.70, 0.62, 0.50), (0.86, 0.80, 0.70))]
    for i, (m, v) in enumerate(MANTELLI):
        cane(i + 1, m, v)
        nome = f'cane-{i:02d}.glb'
        esporta(os.path.join(USCITA, nome))
        elenco.append({'file': nome, 'specie': 'cane', 'ruolo': 'cane'})
    piccione()
    esporta(os.path.join(USCITA, 'piccione.glb'))
    elenco.append({'file': 'piccione.glb', 'specie': 'piccione', 'ruolo': 'piccione'})
    json.dump(elenco, open(os.path.join(USCITA, 'animali.json'), 'w'), indent=1)
    print('scritti', [e['file'] for e in elenco])


if __name__ == '__main__':
    main()
