"""The chapter page's subject header: the subject's name as a paper word-mark, big standing letters in the logo's
colours (each a coloured face on a paper backing, like cut card), with a small scene living on them.

    science   a ringed lime planet is the dot of the "i"; a little telescope on a tripod stands on the arch of the
              "n", aimed at the brightest of the stars over the word.

    english   a drop of ink is the dot of the "i"; the "g" steps forward, its tail hooked over the plinth's edge; a pencil
              leans on the "E", a stack of books stands by the "h", paper birds fly over.
    maths     on graph paper: a gold plus is the dot of the "i"; a protractor arcs behind the "a", a ruler leans on the
              "M"; pi, times, equals and divide float over the word.

Every subject renders through one fixed orthographic camera (the same scale and baseline), so the letters come out the
same size in all of them. Modes:

    --mode still   one picture (the finished word-mark) to --out
    --mode enter   the entrance into --dir as e0001.png..: the letters fold up from lying flat, one after another,
                   then the things on and over them pop in
    --mode hover   the hover loop into --dir as h0001.png..: a wave runs along the letters (each hops in turn) while
                   whatever floats over the word bobs; it ends where it began

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/render-subject-wordmark.py -- \\
        --subject science --mode enter --dir /path/frames [--samples 24] [--pct 66]

then scripts/build-subject-wordmark.py assembles the sprites the chapter page ships (public/student/wordmarks).

Imports render-student-moments.py for the palette, materials, primitives, lighting and framing.
"""

import importlib.util
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("moments", os.path.join(HERE, "render-student-moments.py"))
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


SUBJECT = _arg("--subject", "science")
OUT = os.path.abspath(_arg("--out", "/tmp/wordmark.png"))
SAMPLES = int(_arg("--samples", "32"))
MODE = _arg("--mode", "still")
DIR = _arg("--dir")
PCT = int(_arg("--pct", "100"))
SHELF = float(_arg("--shelf", "0"))   # >0: the plinth runs this long (font units from the word's left), a shelf across
                                      # the whole header that the page's info stands on at its right end       # render size, % of SIZE (the line width follows)
FONT = _arg("--font", "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf")
# One fixed orthographic camera for every subject: the same scale (px per font unit) and the same baseline row, so
# the letters come out the same height in all three and their plinths line up; the page crops each across only.
SIZE = (3400, 900)
ORTHO = 12.0          # world units across the frame's width
LINE = 5.0            # ink line width at this size (about 2px once the page shows it)
DEPTH = 0.16          # the letters' thickness: coloured faces, paper edges


def _to_mesh(o):
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects:
        s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.view_layer.objects.active


def _text(c, body, extrude, offset=0.0, bevel=0.012):
    cu = bpy.data.curves.new("word", "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    cu.align_x = "CENTER"
    cu.extrude = extrude
    cu.offset = offset
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    cu.resolution_u = 10
    o = bpy.data.objects.new("word", cu)
    c.objects.link(o)
    return o


def _letters(c, p, body, colours):
    """The word standing up, facing the camera: each letter cut from thick card, its faces in a logo colour and its
    edges the paper's own white. Returns the letters, left to right."""
    face = _text(c, body, DEPTH / 2, bevel=0.0)                          # crisp card edges (a bevel adds stray ink lines)
    face = _to_mesh(face)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    # loose parts are not always whole letters (a bevel can split a glyph's outline from its counter): group the
    # parts that overlap across into one letter each
    def xr(o):
        xs = [(o.matrix_world @ Vector(v)).x for v in o.bound_box]
        return min(xs), max(xs)
    groups = []
    for o in sorted(bpy.context.selected_objects, key=lambda o: xr(o)[0]):
        a, b = xr(o)
        if groups and a < groups[-1][1] - 0.01:
            groups[-1][0].append(o)
            groups[-1][1] = max(groups[-1][1], b)
        else:
            groups.append([[o], b])
    parts = []
    for objs, _ in groups:
        for s_ in bpy.context.selected_objects:
            s_.select_set(False)
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        parts.append(bpy.context.view_layer.objects.active)
    print(f"[wordmark] {len(parts)} letters")
    for o, key in zip(parts, colours):
        o.data.materials.clear()
        o.data.materials.append(M.mat(key))
        o.data.materials.append(M.paper())
        for poly in o.data.polygons:                                     # front and back coloured, the edges paper
            poly.material_index = 0 if abs(poly.normal.z) > 0.7 else 1
            poly.use_smooth = False
        o.parent = p
    return parts


def _centre(o):
    pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
    return sum(pts, Vector()) / 8, Vector((min(v.x for v in pts), min(v.y for v in pts), min(v.z for v in pts))), \
        Vector((max(v.x for v in pts), max(v.y for v in pts), max(v.z for v in pts)))


def build_science(c, root):
    letters = _word(c, root, "Sc\u0131ence", ["logo_dark", "logo_lime", "logo_gold", "logo_deep", "logo_lime", "logo_dark", "logo_gold"])
    S, c1, i_, e1, n, c2, e2 = letters
    # a low paper plinth the letters stand on, grass on top, tufts and pines at its ends
    lo = min(_centre(o)[1].z for o in letters)
    x0 = min(_centre(o)[1].x for o in letters) - 0.35
    x1 = xw = max(_centre(o)[2].x for o in letters) + 0.35
    x1 = max(x1, x0 + SHELF)
    M.box(c, root, M.paper(), (x1 - x0, 0.62, 0.1), loc=((x0 + x1) / 2, 0.02, lo - 0.05), bevel=0.02)
    M.box(c, root, M.mat("grass"), (x1 - x0 - 0.08, 0.54, 0.035), loc=((x0 + x1) / 2, 0.02, lo + 0.012), bevel=0.01)
    for (x, s) in ((x0 + 0.16, 1.0), (x0 + 0.3, 0.75), (xw - 0.18, 0.9)):
        M._pine(c, root, x, 0.18, lo + 0.03, s=s * 1.2)
    # the dot of the "i": a ringed lime planet
    ci, mn, mx = _centre(i_)
    planet = M._empty(c, root, "planet", loc=(ci.x, -0.02, mx.z + 0.19))
    M.ball(c, planet, M.accent(), 0.11)
    M.ring(c, planet, M.accent(), 0.18, 0.014, rot=(16, -20, 0))      # tilted, like Saturn's
    # a little stargazer's telescope on a tripod, standing on the arch of the "n", aimed up at the brightest star
    cc, mn_c, mx_c = _centre(c1)
    ce, mn_e, mx_e = _centre(e2)
    top = max(_centre(o)[2].z for o in letters)
    cn, mn_n, mx_n = _centre(n)
    base = Vector((cn.x, -0.02, mx_n.z))
    for a in (90, 210, 330):                                             # the tripod
        r = math.radians(a)
        M.rod(c, root, M.mat("logo_dark"), tuple(base + Vector((0.07 * math.cos(r), 0.05 * math.sin(r), 0.0))), tuple(base + Vector((0, 0, 0.17))), r=0.007, verts=5)
    head = base + Vector((0, 0, 0.18))
    target = Vector((cn.x + 0.42, -0.02, top + 0.42))
    aim = (target - head).normalized()
    scope = M._empty(c, root, "scope", loc=tuple(head))
    scope.rotation_mode = "QUATERNION"
    scope.rotation_quaternion = aim.to_track_quat("Z", "Y")
    M.cyl(c, scope, M.mat("logo_gold"), 0.034, 0.26, loc=(0, 0, 0.07), verts=20, bevel=0.003)
    M.ring(c, scope, M.mat("logo_dark"), 0.039, 0.009, loc=(0, 0, 0.2))
    M.cyl(c, scope, M.paper(), 0.016, 0.05, loc=(0, 0, -0.07), verts=12)
    # stars: the one in the telescope's sight brightest, others scattered over the word
    for (x, z, r) in ((target.x, target.z, 0.075), (target.x + 0.55, top + 0.3, 0.045), (mx_e.x + 0.12, top + 0.14, 0.05),
                      (_centre(S)[0].x - 0.05, top + 0.22, 0.04), (cc.x - 0.1, top + 0.38, 0.03)):
        M.slab(c, root, M.mat("logo_gold"), M.star_pts(5, r, r * 0.45), 0.02, loc=(x, -0.02, z), rot=(90, 0, 0), bevel=0.002)
    return lo


def _word(c, root, body, colours):
    word = M._empty(c, root, "word", rot=(90, 0, 0))                    # text is drawn in XY: stand it up, facing -Y
    letters = _letters(c, word, body, colours)
    bpy.context.view_layer.update()
    LETTERS[:] = letters
    return letters


def _glyph(c, root, ch, m, loc, size=0.3, depth=0.05, roll=0.0):
    """One character cut from card, standing facing the camera (a floating maths sign, say)."""
    o = _to_mesh(_text(c, ch, depth / 2, bevel=0.0))
    o.data.materials.clear()
    o.data.materials.append(m)
    o.data.materials.append(M.paper())
    for poly in o.data.polygons:
        poly.material_index = 0 if abs(poly.normal.z) > 0.7 else 1
        poly.use_smooth = False
    holder = M._empty(c, root, "glyph", loc=loc, rot=(90, roll, 0))
    o.parent = holder
    o.scale = (size, size, 1)
    return holder


def _graph():
    """Graph paper: pale green paper ruled in a fine grid, a texture (so Freestyle draws no line for each rule)."""
    m = bpy.data.materials.new("graph")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.8
    tex = nt.nodes.new("ShaderNodeTexBrick")
    tex.offset = 0.0
    tex.inputs["Color1"].default_value = M.hex_rgb("#E4EFC6") + (1,)
    tex.inputs["Color2"].default_value = M.hex_rgb("#E4EFC6") + (1,)
    tex.inputs["Mortar"].default_value = M.hex_rgb("#A9C77A") + (1,)
    tex.inputs["Scale"].default_value = 9.0
    tex.inputs["Mortar Size"].default_value = 0.02
    tex.inputs["Brick Width"].default_value = 1.0
    tex.inputs["Row Height"].default_value = 1.0
    co = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(co.outputs["Object"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def _base(letters, skip=()):
    """The baseline: the lowest point of the letters that sit on it (descenders, like the tail of a g, go below)."""
    return min(_centre(o)[1].z for k, o in enumerate(letters) if k not in skip)


def build_english(c, root):
    letters = _word(c, root, "Engl\u0131sh", ["logo_dark", "logo_lime", "logo_gold", "logo_deep", "logo_lime", "logo_dark", "logo_gold"])
    E, n, g, l, i_, s_, h = letters
    lo = _base(letters, skip=(2,))
    x0 = min(_centre(o)[1].x for o in letters) - 0.5
    x1 = max(_centre(o)[2].x for o in letters) + 0.7
    x1 = max(x1, x0 + SHELF)
    M.box(c, root, M.paper(), (x1 - x0, 0.62, 0.1), loc=((x0 + x1) / 2, 0.02, lo - 0.05), bevel=0.02)
    M.box(c, root, M.mat("grass"), (x1 - x0 - 0.08, 0.54, 0.035), loc=((x0 + x1) / 2, 0.02, lo + 0.012), bevel=0.01)
    # the "g" steps forward, its tail hooked over the front edge of the plinth
    g.location.z += 0.39                                                 # (the letters' local z is the world's -y)
    bpy.context.view_layer.update()
    # the dot of the "i": a drop of ink
    ci, mn_i, mx_i = _centre(i_)
    drop = M._empty(c, root, "drop", loc=(ci.x, -0.02, mx_i.z + 0.12))
    M.ball(c, drop, M.mat("logo_deep"), 0.072, scale=(1, 1, 0.95))
    M.cone(c, drop, M.mat("logo_deep"), 0.05, 0.0, 0.1, loc=(0, 0, 0.085), verts=16)
    # a pencil leaning on the "E"
    cE, mn_E, mx_E = _centre(E)
    pencil = M._empty(c, root, "pencil", loc=(mn_E.x - 0.2, -0.14, lo + 0.01), rot=(0, 22, 0))
    M.cyl(c, pencil, M.mat("logo_gold"), 0.035, 0.66, loc=(0, 0, 0.36), verts=6)
    M.cone(c, pencil, M.paper(), 0.035, 0.008, 0.08, loc=(0, 0, -0.01), rot=(180, 0, 0), verts=6)
    M.cyl(c, pencil, M.mat("logo_deep"), 0.009, 0.02, loc=(0, 0, -0.055), verts=6)
    M.cyl(c, pencil, M.mat("logo_lime"), 0.036, 0.06, loc=(0, 0, 0.72), verts=12)
    # a stack of books by the "h", paper birds over the word
    ch, mn_h, mx_h = _centre(h)
    z = lo + 0.03
    for k, (w, d, t, key) in enumerate(((0.44, 0.3, 0.08, "logo_dark"), (0.4, 0.28, 0.07, "logo_gold"), (0.36, 0.26, 0.075, "logo_lime"), (0.3, 0.22, 0.06, "logo_deep"))):
        yaw = (-8, 6, -4, 9)[k]
        M.box(c, root, M.mat(key), (w, d, t), loc=(mx_h.x + 0.36, 0.04, z + t / 2), rot=(0, 0, yaw), bevel=0.008)
        M.box(c, root, M.paper(), (w * 0.95, d * 0.9, t * 0.7), loc=(mx_h.x + 0.38, 0.03, z + t / 2), rot=(0, 0, yaw), bevel=0.003)
        z += t
    top = max(_centre(o)[2].z for o in letters)
    M._bird(c, root, (_centre(n)[0].x + 0.1, -0.02, top + 0.16), s=0.2, yaw=20)
    M._bird(c, root, (_centre(s_)[0].x + 0.25, -0.02, top + 0.24), s=0.16, yaw=-10)
    return lo


def build_maths(c, root):
    keys = ["logo_dark", "logo_lime", "logo_gold", "logo_deep", "logo_lime", "logo_dark", "logo_gold", "logo_deep", "logo_lime", "logo_dark", "logo_gold"]
    letters = _word(c, root, "Mathemat\u0131cs", keys)
    Mm, a1, t1, h, e, m2, a2, t2, i_, c_, s_ = letters
    lo = _base(letters)
    x0 = min(_centre(o)[1].x for o in letters) - 0.4
    x1 = max(_centre(o)[2].x for o in letters) + 0.4
    x1 = max(x1, x0 + SHELF)
    # graph paper: the plinth's top a pale green paper ruled in a fine grid (a texture, so the ink lines stay off it)
    M.box(c, root, M.paper(), (x1 - x0, 0.66, 0.1), loc=((x0 + x1) / 2, 0.02, lo - 0.05), bevel=0.02)
    M.box(c, root, _graph(), (x1 - x0 - 0.08, 0.58, 0.02), loc=((x0 + x1) / 2, 0.02, lo + 0.005), bevel=0.004)
    # the dot of the "i": a gold plus
    ci, mn_i, mx_i = _centre(i_)
    plus = M._empty(c, root, "plus", loc=(ci.x, -0.02, mx_i.z + 0.17), rot=(90, 0, 0))
    M.box(c, plus, M.mat("logo_gold"), (0.24, 0.075, 0.05), bevel=0.008)
    M.box(c, plus, M.mat("logo_gold"), (0.075, 0.24, 0.056), bevel=0.008)
    # a paper protractor standing behind the first "a", its arc over the letters
    ca, mn_a, mx_a = _centre(a1)
    arc = [(0.5 * math.cos(math.radians(a)), 0.5 * math.sin(math.radians(a))) for a in range(0, 181, 6)]
    arc += [(0.33 * math.cos(math.radians(a)), 0.33 * math.sin(math.radians(a))) for a in range(180, -1, -6)]
    prot = M._empty(c, root, "protractor", loc=(ca.x + 0.25, 0.16, lo + 0.38), rot=(90, 0, 0))
    M.slab(c, prot, M.paper(), arc, 0.02, bevel=0.002)
    for a in range(10, 180, 10):                                          # its degree ticks
        r = math.radians(a)
        M.box(c, prot, M.mat("logo_dark"), (0.005, 0.06 if a % 30 == 0 else 0.035, 0.025),
              loc=(0.47 * math.cos(r), 0.47 * math.sin(r), 0.0), rot=(0, 0, math.degrees(r) - 90), bevel=0)
    # a gold ruler leaning on the "M"
    cM, mn_M, mx_M = _centre(Mm)
    ruler = M._empty(c, root, "ruler", loc=(mn_M.x - 0.3, -0.12, lo), rot=(0, 16, 0))   # leaning in, on the "M"
    M.box(c, ruler, M.mat("logo_gold"), (0.1, 0.02, 0.9), loc=(0, 0, 0.45), bevel=0.004)
    for j in range(1, 18):
        M.box(c, ruler, M.mat("logo_dark"), (0.035 if j % 5 else 0.06, 0.024, 0.004), loc=(-0.05 + (0.0175 if j % 5 else 0.03), 0, j * 0.05), bevel=0)
    # maths signs floating over the word, like stars over Science's
    top = max(_centre(o)[2].z for o in letters)
    for ch, x, z, size, key, roll in (("\u03c0", _centre(h)[0].x, top + 0.12, 0.62, "logo_gold", -8), ("\u00d7", _centre(m2)[0].x + 0.1, top + 0.08, 0.55, "logo_dark", 6),
                                     ("=", _centre(e)[0].x, top + 0.2, 0.5, "logo_lime", 0), ("\u00f7", _centre(s_)[0].x + 0.35, top + 0.05, 0.55, "logo_deep", -6)):
        _glyph(c, root, ch, M.mat(key), (x, -0.02, z), size=size, roll=roll)
    return lo


LETTERS = []          # the word's letters, left to right (set by _word)
HOVER_FRAMES = 24


def _top_level(root):
    return [o for o in bpy.data.objects if o.parent is root]


def _animate(root, lo):
    """Keys the entrance and the hover loop. Each letter turns on a pivot at its foot (so it folds up from lying flat
    behind the word, and hops in place on hover); the props are everything else on the plinth or over the word."""
    bpy.context.view_layer.update()
    top = max(_centre(o)[2].z for o in LETTERS)
    word = LETTERS[0].parent
    pivots = []
    for o in LETTERS:
        cx = _centre(o)[0].x
        pv = M._empty(o.users_collection[0], root, "pivot", loc=(cx, 0.0, lo))
        bpy.context.view_layer.update()
        mw = o.matrix_world.copy()
        o.parent = pv
        o.matrix_parent_inverse = pv.matrix_world.inverted()
        o.matrix_world = mw
        pivots.append(pv)
    plinth = [o for o in _top_level(root) if o.type == "MESH" and o.dimensions.x > 2.0]
    props = [o for o in _top_level(root) if o is not word and o not in plinth and o not in pivots]
    floating = [o for o in props if _centre(o)[1].z > lo + (top - lo) * 0.75]
    if MODE == "enter":
        end = 0
        for k, pv in enumerate(pivots):                                  # fold up, one after another, a little bounce
            f0 = 1 + 2 * k
            for f, a in ((f0, -90), (f0 + 6, 9), (f0 + 9, 0)):
                M._key(pv, "rotation_euler", f, (math.radians(a), 0, 0))
            end = f0 + 9
        start = end - 5
        for k, o in enumerate(props):                                    # then the props pop in
            s0 = o.scale.copy()
            f0 = start + k % 6
            for f, kk in ((1, 0.2), (f0, 0.2), (f0 + 4, 1.15), (f0 + 7, 1.0)):
                M._key(o, "scale", f, tuple(v * kk for v in s0))
            M._shown_keys(o, [(1, False), (f0, True)])                   # hidden till it pops (no stray ink dots)
            end = max(end, f0 + 7)
        return end + 2
    if MODE == "hover":
        n = len(pivots)
        for k, pv in enumerate(pivots):                                  # a wave along the word
            f0 = 1 + round(k * (HOVER_FRAMES - 10) / max(n - 1, 1))
            for f, dz in ((1, 0), (f0, 0), (f0 + 3, 0.07), (f0 + 6, 0), (HOVER_FRAMES, 0)):
                M._key(pv, "location", f, (pv.location.x, 0.0, lo + dz))
        for k, o in enumerate(floating):                                 # the sky bobs, each a little out of step
            base = o.location.copy()
            ph = k * 1.3
            for f in range(1, HOVER_FRAMES + 1, 3):
                t = (f - 1) / (HOVER_FRAMES - 1)
                M._key(o, "location", f, tuple(base + Vector((0, 0, 0.05 * math.sin(2 * math.pi * t + ph) - 0.05 * math.sin(ph)))))
            M._key(o, "location", HOVER_FRAMES, tuple(base))
        return HOVER_FRAMES
    return 1


M.PALETTE.setdefault("sea", "#D2E5D0")
BUILDERS = {"science": build_science, "english": build_english, "maths": build_maths}


def main():
    M.SAMPLES = SAMPLES
    sc = M.reset_scene()
    sc.cycles.samples = SAMPLES
    coll = bpy.data.collections.new("wordmark")
    sc.collection.children.link(coll)
    root = bpy.data.objects.new("wordmark_root", None)
    coll.objects.link(root)
    lo = BUILDERS[SUBJECT](coll, root)
    bpy.context.view_layer.update()
    frames = _animate(root, lo)
    bpy.context.view_layer.update()
    sc.render.resolution_x, sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = PCT
    sc.view_layers[0].freestyle_settings.linesets[0].linestyle.thickness = LINE * PCT / 100
    pts = M._points(coll)
    cx = (min(v.x for v in pts) + max(v.x for v in pts)) / 2
    el, az = math.radians(12), math.radians(-14)                         # nearly face on, so the word reads
    d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    target = Vector((cx, 0.0, lo + 0.62))                                # the same height over the baseline for all
    cam = sc.camera
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ORTHO
    cam.data.shift_x = cam.data.shift_y = 0.0
    cam.location = target + d * 20
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.render.image_settings.file_format = "PNG"
    if MODE == "still":
        sc.frame_set(1)
        sc.render.filepath = OUT
        bpy.ops.render.render(write_still=True)
        print(f"[wordmark] {OUT}")
        return
    os.makedirs(DIR, exist_ok=True)
    prefix = "e" if MODE == "enter" else "h"
    for f in range(1, frames + 1):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(DIR, f"{prefix}{f:04d}.png")
        bpy.ops.render.render(write_still=True)
    print(f"[wordmark] {frames} frames into {DIR}")


main()
