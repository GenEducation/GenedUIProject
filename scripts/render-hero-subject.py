"""The Continue card's hero, one grand scene per subject, built around continuation.

Each scene is the subject card's diorama made grand and spread across the whole card (1440x400), with the lesson's
progress drawn into the picture, starting where the card's progress bar ends:

    english   A voyage by lighthouse light, at dusk: a paper boat with a lime sail sets out from the jetty on the
              lighthouse of books' island and sails off across the bay into open water, a lime wake behind it, the
              lighthouse's beam tracking it the whole way. No destination: the voyage is open.
    maths     The bridge is the progress bar: a parabolic arch plotted on a graph-paper pond, its face one panel per
              step, each with a maths sign (lime up to where you are, the next gold and being set in, the rest paper).
    science   A planet tour: a small sun and five planets across the evening sky as tiny points, nothing joining them; the telescope, out through a slit in the dome, visits each in turn, and the planet in its sight
              grows where it is, magnified to show its features, ending on the ringed planet with its moon.

The scene and the progress are rendered apart, so one render serves every lesson length:

    --mode still     one picture with progress --done/--total (for review)
    --mode frames    the entrance, without the progress: frames f0001.png.. into --dir, and track.json (where the
                     reveal front is across the card per frame: the text surfaces as it passes, like the tide's crest)
    --mode poster    the scene's last frame without the progress, to --out (with --phone: framed for phones)
    --mode progress  the progress alone, transparent, at 20 states (0..19 of 19) into --dir as p00.png..; the rest of
                     the scene held out, so whatever stands in front of it still hides it (with --phone: phone framing)

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/render-hero-subject.py -- \\
        --scene english|maths|science --mode still --done 2 --total 19 --out /path/still.png [--samples 32]

Then scripts/build-hero-subject.py assembles the files the card ships (see heroScenes.ts). Places are given in screen
space (u across, v down, 0..1) and cast into the world, so the layout is designed against the card: the text block
on the left, the progress bar ending at about u 0.37. Imports render-student-moments.py for the palette and primitives.
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


SCENE = _arg("--scene", "english")
DONE = int(_arg("--done", "2"))
TOTAL = int(_arg("--total", "19"))
OUT = os.path.abspath(_arg("--out", "/tmp/hero.png"))
SAMPLES = int(_arg("--samples", "32"))
SAVE_BLEND = _arg("--blend")
MODE = _arg("--mode", "still")
DIR = _arg("--dir")
PHONE = "--phone" in argv
ANIM = MODE == "frames"
FRAMES = 96          # 3.2s at 30fps
FPS = 30
STATES = 19          # progress states 0..19 (of 19)
W, H = 1440, 400

M.PALETTE.update({
    "sea": "#D2E5D0",        # the bay: a pale sea-green paper, a step off the stone sage
    "pond": "#D9E8B4",
    "hill": "#C9DCA0",
    "hill_far": "#DCE7C2",
    "hill_night": "#93AC7C",  # the far range at evening
    "sky_low": "#E3EEC4",    # the card's own gradient, bottom
    "sky_high": "#7F9F62",   # evening: the logo greens, softened
})
mat, paper, accent, ink = M.mat, M.paper, M.accent, M.ink
box, cyl, cone, ball, slab, mesh, sheet, rod, ring = M.box, M.cyl, M.cone, M.ball, M.slab, M.mesh, M.sheet, M.rod, M.ring


# ---------------------------------------------------------------- camera and screen-space placement
def setup(cam_loc, pitch, lens=35):
    sc = M.reset_scene()
    sc.cycles.samples = SAMPLES
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.image_settings.file_format = "PNG"
    sc.view_layers[0].freestyle_settings.linesets[0].linestyle.thickness = 1.6 * W / 1440
    cam = sc.camera
    cam.data.lens = lens
    cam.location = cam_loc
    cam.rotation_euler = (math.radians(pitch), 0, 0)
    for o in [o for o in sc.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(o)
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 2.6
    sun.angle = math.radians(12)
    so = bpy.data.objects.new("sun", sun)
    sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(48), math.radians(-22), math.radians(-28))
    bpy.context.view_layer.update()
    coll = bpy.data.collections.new("hero")
    sc.collection.children.link(coll)
    root = bpy.data.objects.new("root", None)
    coll.objects.link(root)
    prog = bpy.data.collections.new("progress")      # what the lesson's progress changes: rendered on its own
    sc.collection.children.link(prog)
    return sc, coll, root


def prog():
    return bpy.data.collections["progress"]


def lamp_pair(make, on_frame=8, lit=None):
    """A lamp that lights: a paper version and a lit (glow) version, swapped at `on_frame` in the entrance (lit
    from the start everywhere else). `make(material)` builds one version."""
    off, on = make(paper()), make(lit or glow())
    if ANIM:
        M._shown_keys(off, [(1, True), (on_frame, False)])
        M._shown_keys(on, [(1, False), (on_frame, True)])
    else:
        off.hide_render = True
    return on


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def front_track(f0, f1):
    """The reveal front's x across the card (1.05 .. -0.1, right to left) at each frame, eased from f0 to f1."""
    return [round(1.05 - 1.15 * ease((f - f0) / (f1 - f0)), 4) for f in range(1, FRAMES + 1)]


def ray(sc, u, v):
    cam = sc.camera
    tr, br, bl, tl = cam.data.view_frame(scene=sc)
    p = bl + (br - bl) * u + (tl - bl) * (1 - v)
    return cam.matrix_world.translation.copy(), (cam.matrix_world.to_3x3() @ p).normalized()


def on_ground(sc, u, v, z=0.0):
    """The point on the plane z = `z` seen at (u, v) on screen."""
    o, d = ray(sc, u, v)
    return o + d * ((z - o.z) / d.z)


def at_depth(sc, u, v, y):
    """The point on the upright plane y = `y` seen at (u, v)."""
    o, d = ray(sc, u, v)
    return o + d * ((y - o.y) / d.y)


def path(points, n):
    """n points evenly along a Catmull-Rom curve through `points` (Vectors)."""
    pts = [points[0]] + list(points) + [points[-1]]
    dense = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(30):
            t = k / 30
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    dense.append(points[-1])
    lengths = [0.0]
    for a, b in zip(dense, dense[1:]):
        lengths.append(lengths[-1] + (b - a).length)
    out = []
    for k in range(n):
        s = lengths[-1] * k / (n - 1)
        j = next(i for i, L in enumerate(lengths) if L >= s - 1e-9)
        if j == 0:
            out.append(dense[0].copy())
        else:
            f = (s - lengths[j - 1]) / max(lengths[j] - lengths[j - 1], 1e-9)
            out.append(dense[j - 1].lerp(dense[j], f))
    return out


def hills(c, p, sc, y, z0, spans, m, seed=0.0):
    """A row of soft paper hills along depth y: (u0, u1, height) spans in screen u."""
    for i, (u0, u1, h) in enumerate(spans):
        a, b = at_depth(sc, u0, 0.5, y), at_depth(sc, u1, 0.5, y)
        w = (b - a).length
        ball(c, p, m, 1.0, loc=((a.x + b.x) / 2, y + 0.3 * math.sin(i + seed), z0), scale=(w / 2, 1.2, h))


def _facet_ball(c, p, m, r, loc, scale=(1, 1, 1), sub=1):
    """A low-poly ball with flat faces: a canopy clump folded from paper (each facet catches the light its own way)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r)
    o = bpy.context.active_object
    M._finish(o, c, m, loc, (0, 0, 0), scale, p, 0)
    for poly in o.data.polygons:
        poly.use_smooth = False
    return o


def tree(c, p, loc, s=1.0, m=None):
    """A paper tree, a little different each time (seeded by where it stands): a tapered trunk that forks into two
    branches, and a canopy of faceted clumps in two greens, darker underneath, lighter on top where the light falls.
    `m` picks the family: the logo's dark green (default) or the pale hill green; one in three is a conifer instead,
    three folded cones stacked on a short trunk. All flat paper colours, so it costs the picture nothing extra."""
    import random
    x, y, z = loc
    rnd = random.Random(int(abs(x) * 1000 + abs(y) * 37))
    pale = m is not None and m.name == "hill"
    dark, light = (mat("hill"), mat("hill_far")) if pale else (mat("logo_dark"), mat("logo_deep") if rnd.random() < 0.5 else mat("grass"))
    bark = mat("wood")
    if rnd.random() < 0.33:                                               # a conifer
        cyl(c, p, bark, 0.05 * s, 0.25 * s, loc=(x, y, z + 0.12 * s), verts=7)
        for i, (r, h, zz) in enumerate(((0.36, 0.42, 0.28), (0.28, 0.38, 0.52), (0.18, 0.34, 0.74))):
            o = cone(c, p, dark if i % 2 == 0 else light, r * s, 0.0, h * s, loc=(x, y, z + (zz + h / 2) * s), verts=7)
            o.rotation_euler = (0, 0, math.radians(rnd.uniform(0, 50)))
            for poly in o.data.polygons:
                poly.use_smooth = False
        return
    cone(c, p, bark, 0.065 * s, 0.035 * s, 0.6 * s, loc=(x, y, z + 0.3 * s), verts=7)
    lean = rnd.uniform(-0.12, 0.12)
    for side in (-1, 1):                                                  # two branches forking up into the canopy
        rod(c, p, bark, (x, y, z + 0.42 * s), (x + side * 0.2 * s + lean * s, y, z + 0.72 * s), r=0.025 * s, verts=5)
    top = Vector((x + lean * s, y, z + 0.82 * s))
    _facet_ball(c, p, dark, 0.32 * s, tuple(top), scale=(1.15, 1, 0.9))     # the canopy's body
    for k in range(4):                                                    # clumps round it, lighter ones up top
        a = rnd.uniform(0, 2 * math.pi)
        up = k >= 2
        off = Vector((math.cos(a) * 0.26 * s, math.sin(a) * 0.12 * s - 0.08 * s, (0.16 if up else -0.04) * s))
        _facet_ball(c, p, light if up else dark, rnd.uniform(0.17, 0.23) * s, tuple(top + off))
    _facet_ball(c, p, light, 0.18 * s, tuple(top + Vector((0.04 * s, -0.06 * s, 0.26 * s))))


def cloud(c, p, loc, s=1.0):
    """A flat paper cloud standing in the sky, facing the camera."""
    slab(c, p, paper(), [(x * s, y * s) for x, y in M.cloud_outline()], 0.05 * s, loc=tuple(loc), rot=(90, 0, 0), bevel=0.01)


def glow(colour="#C8EA3A", name="glow"):
    """Lit lime: the lanterns, the bridge lamps, the stars. Emissive, so it reads as light, not paint. (The lighthouse
    burns the logo's yellow: glow_gold.)"""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = M.hex_rgb(colour) + (1,)
    M._set(b, ["Emission Color", "Emission"], M.hex_rgb(colour) + (1,))
    M._set(b, ["Emission Strength"], 1.6)
    return m


def glow_gold():
    """The lighthouse's light: the logo's yellow (#E0C21E), lit."""
    return glow("#F0D338", "glow_gold")


def beam_mat():
    """A lighthouse beam as light, not a shape: the logo's yellow, strongest at the lamp and fades out along the beam
    and toward its edges (no ink line: beams are kept out of the Freestyle lines)."""
    m = bpy.data.materials.new("beam")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = M.hex_rgb("#F2D84E") + (1,)
    em.inputs["Strength"].default_value = 1.3
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    along = nt.nodes.new("ShaderNodeMath")                                # 0 at the far end .. 1 at the lamp, eased
    along.operation = "POWER"
    nt.links.new(sep.outputs["Z"], along.inputs[0])
    along.inputs[1].default_value = 1.1
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    edge = nt.nodes.new("ShaderNodeMath")                                 # 1 facing us .. 0 at the edges
    edge.operation = "SUBTRACT"
    edge.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs["Facing"], edge.inputs[1])
    a = nt.nodes.new("ShaderNodeMath")
    a.operation = "MULTIPLY"
    nt.links.new(along.outputs[0], a.inputs[0])
    nt.links.new(edge.outputs[0], a.inputs[1])
    k = nt.nodes.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    nt.links.new(a.outputs[0], k.inputs[0])
    k.inputs[1].default_value = 1.0
    nt.links.new(k.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def no_lines():
    """A collection Freestyle leaves alone: light (beams, glows) has no ink outline."""
    sc = bpy.context.scene
    if "nolines" in bpy.data.collections:
        return bpy.data.collections["nolines"]
    nl = bpy.data.collections.new("nolines")
    sc.collection.children.link(nl)
    ls = sc.view_layers[0].freestyle_settings.linesets[0]
    ls.select_by_collection = True
    ls.collection = nl
    ls.collection_negation = "EXCLUSIVE"
    return nl


def light_beam(src, far, r_far, r_src=0.1):
    """A soft cone of light from `src` out to `far` (open ends, apex at the lamp)."""
    d = src - far
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=r_far, radius2=r_src, depth=d.length, end_fill_type="NOTHING")
    o = bpy.context.active_object
    for cc in o.users_collection:
        cc.objects.unlink(o)
    no_lines().objects.link(o)
    o.location = (src + far) / 2
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.normalized().to_track_quat("Z", "Y")
    o.data.materials.append(beam_mat())
    for poly in o.data.polygons:
        poly.use_smooth = True
    o.visible_shadow = False
    return o


def stone_path(c, p, sc, pts_uv, r=0.22, m=None):
    """Flat paper stepping stones along screen points (u, v) on the ground."""
    for q in path([on_ground(sc, u, v) for u, v in pts_uv], 12):
        ball(c, p, m or paper(), r, loc=(q.x, q.y, 0.0), scale=(1.4, 1, 0.18))


def parent_at(c, p, name, loc, scale, yaw):
    e = M._empty(c, p, name, loc=tuple(loc), rot=(0, 0, yaw))
    e.scale = (scale, scale, scale)
    return e


# ---------------------------------------------------------------- english: voyage to the lighthouse
def boat(c, p, loc, heading):
    """A folded paper boat, hull in paper with a dark keel line, a lime sail: you."""
    b = M._empty(c, p, "boat", loc=tuple(loc), rot=(0, 0, math.degrees(heading)))
    L, Wd, Hh = 0.55, 0.2, 0.14
    hull = [(-L, 0, Hh), (L, 0, Hh), (L * 0.55, -Wd, Hh * 0.55), (-L * 0.55, -Wd, Hh * 0.55), (L * 0.55, Wd, Hh * 0.55),
            (-L * 0.55, Wd, Hh * 0.55), (-L * 0.4, 0, 0), (L * 0.4, 0, 0)]
    faces = [[0, 3, 2, 1], [0, 1, 4, 5], [3, 6, 7, 2], [5, 4, 7, 6], [0, 5, 6, 3], [1, 2, 7, 4]]
    mesh(c, b, paper(), hull, faces, thick=0.02)
    rod(c, b, mat("logo_dark"), (0.02, 0, Hh), (0.02, 0, Hh + 0.62), r=0.014, verts=6)
    mesh(c, b, accent(), [(0.06, 0, Hh + 0.6), (0.06, 0, Hh + 0.06), (0.42, 0, Hh + 0.08)], [[0, 1, 2]], thick=0.02)
    mesh(c, b, accent(), [(-0.02, 0, Hh + 0.5), (-0.02, 0, Hh + 0.1), (-0.3, 0, Hh + 0.1)], [[0, 1, 2]], thick=0.02)
    return b


def build_english(sc, c, p):
    # dusk: a lighthouse works when the light goes, so the bay is at evening (the sky darkens in the entrance), the
    # daylight lowered, the water and hills a shade deeper; the lamp and its beam carry the light
    M.PALETTE.update({"sea": "#BBD2BC", "hill": "#B9CF92", "hill_far": "#C9D8B0"})
    sun = bpy.data.objects.get("sun")
    if sun:
        sun.data.energy = 1.5
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    sky(c, p, 60, low="#D4E0BC", high="#4F6F42")
    no_lines()                                                            # the beam's collection: light has no ink line
    box(c, p, mat("sea"), (80, 60, 0.02), loc=(0, 20, -0.01), bevel=0)
    hills(c, p, sc, 34, -0.6, [(-0.1, 0.25, 2.2), (0.18, 0.5, 1.6), (0.44, 0.64, 2.0)], mat("hill_far"))
    hills(c, p, sc, 26, -0.5, [(-0.05, 0.16, 1.3), (0.1, 0.3, 0.9)], mat("hill"), seed=1.2)
    # the far shore on the right, behind the lighthouse
    hills(c, p, sc, 30, -0.6, [(0.82, 1.12, 2.4)], mat("hill"), seed=2.0)
    # the lighthouse of books on its island, grand, on the right
    base = on_ground(sc, 0.8, 0.86)
    lh = parent_at(c, p, "lighthouse", base, 1.58, 205)
    M.build_english_a(c, lh)
    # the card's solid cone beam goes; the lamp is lit and throws a long see-through beam over the bay toward you
    bpy.context.view_layer.update()
    for o in [o for o in c.all_objects if o.name.startswith("card_beam")]:
        bpy.data.objects.remove(o)
    lamp = bpy.data.objects["pt_english_lamp"]
    def lamp_room(m):
        o = cyl(c, lamp, m, 0.155, 0.26, loc=(0, 0, 0.03), verts=24)
        ring(c, o, m, 0.24, 0.012)
        return o
    lamp_pair(lamp_room, on_frame=6, lit=glow_gold())
    bpy.context.view_layer.update()
    src = lamp.matrix_world.translation.copy()
    # the beam is part of the progress: it follows the boat, step by step, as it comes across the bay
    for (u, v, r) in ((0.69, 0.8, 0.42), (0.9, 0.79, 0.34), (0.73, 0.86, 0.26), (0.95, 0.86, 0.22)):   # rocks round the island
        q = on_ground(sc, u, v)
        ball(c, p, paper(), r, loc=(q.x, q.y, r * 0.3), scale=(1.4, 1, 0.7))
    # gulls over the bay, clouds in the sky
    for (u, v, s, yaw) in ((0.56, 0.18, 0.32, 20), (0.62, 0.1, 0.24, -10), (0.9, 0.12, 0.26, 40), (0.5, 0.3, 0.2, 60)):
        M._bird(c, p, tuple(at_depth(sc, u, v, 14)), s=s, yaw=yaw)
    for (u, v, s) in ((0.35, 0.12, 2.2), (0.6, 0.06, 1.6), (0.97, 0.08, 1.8)):
        cloud(c, p, at_depth(sc, u, v, 36), s)
    # a little islet with a tree on the far left, a sailboat far off, a jetty where the voyage set out
    q = on_ground(sc, 0.2, 0.62)
    ball(c, p, mat("grass"), 0.9, loc=(q.x, q.y, -0.2), scale=(1.8, 1, 0.5))
    tree(c, p, (q.x + 0.3, q.y, 0.15), s=1.2)
    tree(c, p, (q.x - 0.5, q.y + 0.2, 0.1), s=0.9, m=mat("hill"))
    far = on_ground(sc, 0.3, 0.6)
    boat(c, p, far, 0.3).scale = (0.6, 0.6, 0.6)
    # the near shore, bottom left: grass on a pale sandy rim, a tree
    sc_ = on_ground(sc, 0.14, 0.98)
    edge = on_ground(sc, 0.36, 0.87)
    rx = abs(edge.x - sc_.x)
    ry = abs(edge.y - sc_.y) + 0.6
    ball(c, p, mat("wood"), 1.0, loc=(sc_.x, sc_.y, -0.12), scale=(rx + 0.3, ry + 0.3, 0.32))
    ball(c, p, mat("grass"), 1.0, loc=(sc_.x - 0.15, sc_.y - 0.1, -0.06), scale=(rx, ry, 0.32))
    tree(c, p, (sc_.x - rx * 0.3, sc_.y + 1.2, 0.18), s=1.1)
    # the voyage sets out from the lighthouse's own island: a jetty off its west side, out over the water
    ja = Vector((base.x - 1.25, base.y - 0.35, 0))
    jb = Vector((base.x - 2.55, base.y - 1.05, 0))
    run = jb - ja
    n_pl = 8
    for k in range(n_pl):                                                 # planks across, stepping out over the water
        q = ja + run * ((k + 0.5) / n_pl)
        box(c, p, mat("wood"), (0.16, 0.7, 0.05), loc=(q.x, q.y, 0.24), rot=(0, 0, math.degrees(math.atan2(run.y, run.x))), bevel=0.005)
    for t in (0.1, 0.5, 0.95):
        q = ja + run * t
        side = Vector((-run.y, run.x, 0)).normalized() * 0.32
        for sgn in (-1, 1):
            rod(c, p, mat("logo_dark"), (q.x + side.x * sgn, q.y + side.y * sgn, -0.05), (q.x + side.x * sgn, q.y + side.y * sgn, 0.34), r=0.04, verts=6)
    # wave curls scattered on the bay
    import random
    rnd = random.Random(4)
    for _ in range(26):
        u, v = rnd.uniform(0.02, 0.98), rnd.uniform(0.58, 0.97)
        q = on_ground(sc, u, v)
        a = rnd.uniform(-0.2, 0.2)
        s = 0.25 + 0.25 * v
        def curl(uu, vv, q=q, a=a, s=s):
            t = math.pi * 1.25 * uu
            return (q.x + math.cos(a) * (uu - 0.5) * s * 2, q.y + math.sin(a) * (uu - 0.5) * s * 2 + (vv - 0.5) * 0.03, 0.08 * s * math.sin(t))
        sheet(c, p, paper(), curl, nu=14, nv=1, thick=0.025)
    # the route: from the end of the jetty, round toward us and away across the bay into open water, toward the
    # horizon. No harbour at the end: the voyage is open; the lighthouse only lights the way.
    start = jb + run.normalized() * 0.35
    route = path([start] + [on_ground(sc, u, v) for (u, v) in ((0.55, 0.93), (0.47, 0.86), (0.45, 0.74), (0.5, 0.63), (0.56, 0.55))], 34)
    for (i, m) in ((len(route) // 3, "logo_gold"), (2 * len(route) // 3, "logo_gold")):   # milestone buoys, beside the course
        d_ = route[i + 1] - route[i - 1]
        q = route[i] + Vector((-d_.y, d_.x, 0)).normalized() * 0.6
        cone(c, p, mat(m), 0.14, 0.04, 0.34, loc=(q.x, q.y, 0.17), verts=8)
        ring(c, p, mat("logo_dark"), 0.11, 0.025, loc=(q.x, q.y, 0.2))

    def progress(done, total):
        # the boat at the student's step, a lime wake behind it back to the jetty (no markers ahead: open water),
        # and the lighthouse's beam on the boat, guiding it in
        pc = prog()
        k_boat = round(done / total * (len(route) - 1))
        q = route[k_boat]
        nxt = route[min(k_boat + 1, len(route) - 1)] - route[max(k_boat - 1, 0)]
        heading = math.atan2(nxt.y, nxt.x)
        if k_boat > 0:
            trail = route[:k_boat + 1]
            def wake(u, v, trail=trail):
                f = u * (len(trail) - 1)
                i = min(int(f), len(trail) - 2)
                a_, b_ = trail[i], trail[i + 1]
                pt = a_.lerp(b_, f - i)
                side = Vector((-(b_ - a_).y, (b_ - a_).x, 0)).normalized()
                w = 0.05 + 0.1 * u                                        # widening toward the boat
                return tuple(pt + side * (v - 0.5) * w + Vector((0, 0, 0.02)))
            sheet(pc, p, accent(), wake, nu=max(8, k_boat * 4), nv=1, thick=0.01)
        back = Vector((math.cos(heading), math.sin(heading), 0))
        for sgn in (-1, 1):                                               # the V of the bow wave
            side = Vector((-back.y, back.x, 0)) * sgn
            rod(pc, p, accent(), q - back * 0.35 + side * 0.08 + Vector((0, 0, 0.02)), q - back * 0.95 + side * 0.4 + Vector((0, 0, 0.02)), r=0.018, verts=5)
        boat(pc, p, q, heading).scale = (1.25, 1.25, 1.25)
        b_ = light_beam(src, q + Vector((0, 0, 0.35)) - (q - src).normalized() * 0.2, 0.6)
        b_["state"] = True

    return {"progress": progress, "track": front_track(10, 52)}


# ---------------------------------------------------------------- maths: the bridge is the progress bar
def graph_mat():
    """Graph paper: the pond's pale water ruled into squares (a brick texture with no offset is a square grid)."""
    m = bpy.data.materials.new("graph")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.75
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.squash = 1.0
    br.inputs["Color1"].default_value = M.hex_rgb(M.PALETTE["pond"]) + (1,)
    br.inputs["Color2"].default_value = M.hex_rgb(M.PALETTE["pond"]) + (1,)
    br.inputs["Mortar"].default_value = M.hex_rgb("#9DBB6A") + (1,)
    br.inputs["Scale"].default_value = 2.2
    br.inputs["Mortar Size"].default_value = 0.025
    br.inputs["Brick Width"].default_value = 0.6
    br.inputs["Row Height"].default_value = 0.6
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def symbol(c, p, kind, q, ang, s, m):
    """A raised maths sign (+ - x / =) on a panel facing us, tilted with the arch."""
    e = M._empty(c, p, "sign", loc=tuple(q), rot=(0, -ang, 0))
    t, d = s * 0.22, 0.04
    if kind in "+x":
        holder = M._empty(c, e, "x", rot=(0, 45 if kind == "x" else 0, 0))
        box(c, holder, m, (s, d, t), bevel=0.006)
        box(c, holder, m, (t, d, s), bevel=0.006)
    elif kind == "-":
        box(c, e, m, (s, d, t), bevel=0.006)
    elif kind == "/":
        box(c, e, m, (s, d, t), bevel=0.006)
        for z in (-s * 0.34, s * 0.34):
            ball(c, e, m, t * 0.6, loc=(0, 0, z))
    elif kind == "=":
        for z in (-s * 0.2, s * 0.2):
            box(c, e, m, (s, d, t), loc=(0, 0, z), bevel=0.006)
    return e


def arrow(c, p, a, b, m, r=0.03):
    rod(c, p, m, a, b, r=r, verts=6)
    d = (b - a).normalized()
    o = cone(c, p, m, r * 3, 0.0, r * 7, loc=tuple(b), verts=10)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")


def set_square(c, p, loc, s, yaw):
    """A paper set square standing on its edge: a right triangle with a triangular hole."""
    e = M._empty(c, p, "set_square", loc=tuple(loc), rot=(90, 0, yaw))
    outer = [(0, 0), (s, 0), (0, s * 0.8)]
    slab(c, e, mat("logo_gold"), outer, 0.05, bevel=0.006)
    inner = [(s * 0.18, s * 0.12), (s * 0.62, s * 0.12), (s * 0.18, s * 0.48)]
    slab(c, e, mat("grass"), inner, 0.07, loc=(0, 0, 0.0), bevel=0.003)
    for k in range(1, 9):                                                 # ruler ticks along the base
        box(c, e, ink(), (0.012, 0.05 if k % 2 else 0.09, 0.06), loc=(s * k / 10, 0.04, 0), bevel=0)
    return e


def compass(c, p, loc, s, yaw):
    """A drawing compass standing open: two legs from a gold hinge, one ending in a point, one in a pencil."""
    x, y, z = loc
    e = M._empty(c, p, "compass", loc=(x, y, z), rot=(0, 0, yaw))
    top = Vector((0, 0, s))
    for side, m in ((-1, mat("logo_dark")), (1, mat("logo_dark"))):
        foot = Vector((side * s * 0.38, 0, 0.0))
        rod(c, e, m, top, foot, r=0.04 * s, verts=8)
    cone(c, e, mat("logo_gold"), 0.06 * s, 0.0, 0.16 * s, loc=(s * 0.38, 0, 0.06 * s), rot=(180, 0, 0), verts=8)
    ball(c, e, mat("logo_gold"), 0.08 * s, loc=tuple(top))
    rod(c, e, mat("logo_dark"), top, top + Vector((0, 0, 0.2 * s)), r=0.025 * s, verts=6)
    return e


def protractor(c, p, loc, R, yaw):
    """A paper protractor standing up: a half disc with degree ticks round its edge and a centre mark."""
    e = M._empty(c, p, "protractor", loc=tuple(loc), rot=(90, 0, yaw))
    half = [(R * math.cos(math.pi * k / 40), R * math.sin(math.pi * k / 40)) for k in range(41)]
    slab(c, e, paper(), half, 0.04, bevel=0.005)
    for k in range(1, 18):
        a = math.pi * k / 18
        L = 0.16 * R if k % 3 == 0 else 0.08 * R
        rod(c, e, ink(), (math.cos(a) * (R - L), math.sin(a) * (R - L), 0.03), (math.cos(a) * R * 0.98, math.sin(a) * R * 0.98, 0.03), r=0.012, verts=4)
    rod(c, e, ink(), (-0.1 * R, 0.0, 0.03), (0.1 * R, 0.0, 0.03), r=0.012, verts=4)
    rod(c, e, ink(), (0.0, 0.0, 0.03), (0.0, 0.12 * R, 0.03), r=0.012, verts=4)
    return e


def build_maths(sc, c, p):
    box(c, p, mat("grass"), (80, 60, 0.02), loc=(0, 20, -0.02), bevel=0)
    hills(c, p, sc, 34, -0.6, [(-0.1, 0.3, 2.0), (0.25, 0.6, 1.5), (0.55, 0.85, 1.9), (0.8, 1.1, 1.6)], mat("hill_far"))
    # the bridge's ends, on the banks: from the end of the progress bar to the far right bank
    a, b = on_ground(sc, 0.37, 0.74), on_ground(sc, 0.965, 0.74)
    y0 = (a.y + b.y) / 2
    x0, x1 = a.x, b.x
    span = x1 - x0
    # the pond of mathematics lies between them, under and in front of the arch; both ends stand on grass
    pond = cyl(c, p, graph_mat(), 1.0, 0.04, loc=((x0 + x1) / 2, y0 - 1.2, 0.0), verts=64, bevel=0.01)
    pond.scale = (span / 2 - 0.9, 3.4, 1)
    cyl(c, p, mat("hill"), 1.0, 0.03, loc=((x0 + x1) / 2, y0 - 1.2, -0.01), verts=64).scale = (span / 2 - 0.6, 3.7, 1)   # the bank's edge
    ripples = []
    for (u, v, rs) in ((0.74, 0.88, (0.3, 0.55, 0.8)), (0.48, 0.78, (0.25, 0.45))):
        q = on_ground(sc, u, v, 0.03)
        for r in rs:
            ripples.append(ring(c, p, mat("logo_dark"), r, 0.018, loc=(q.x, q.y, 0.03), scale=(1, 0.75, 1)))
    for (u, v, r, miss) in ((0.56, 0.9, 0.36, 0.25), (0.86, 0.84, 0.3, 0.5), (0.42, 0.92, 0.26, 0.0)):
        q = on_ground(sc, u, v, 0.03)
        slab(c, p, mat("logo_lime"), M._pie(r, miss), 0.04, loc=(q.x, q.y, 0.04), rot=(0, 0, 30 * u * 10), bevel=0.004)
    q = on_ground(sc, 0.93, 0.9)
    cone(c, p, mat("logo_gold"), 0.26, 0.0, 0.34, loc=(q.x, q.y, 0.17), rot=(0, 0, 45), verts=4)
    q = on_ground(sc, 0.79, 0.94, 0.04)
    fish = M._empty(c, p, "fish", loc=(q.x, q.y, 0.05), rot=(0, 0, 160))
    for tri in (((0, 0, 0), (0.5, 0.25, 0), (0.5, -0.25, 0)), ((0.5, 0.25, 0), (0.5, -0.25, 0), (0.8, 0, 0)),
                ((0, 0, 0), (-0.28, 0.22, 0), (-0.28, -0.22, 0))):
        mesh(c, fish, mat("logo_gold"), list(tri), [[0, 1, 2]], thick=0.04)
    # trees and reeds on the far bank
    for (u, s) in ((0.47, 1.3), (0.53, 1.0), (0.9, 1.4), (0.96, 1.1), (0.2, 1.2), (0.27, 0.9)):
        q = on_ground(sc, u, 0.47)
        tree(c, p, (q.x, q.y + 3, 0), s=s * 1.6, m=mat("logo_dark" if s > 1.1 else "hill"))
    # the bridge, built as you go: a parabolic arch whose face is one panel per step, each carrying a maths sign
    # (lime up to where you are, the next gold and being set in, the rest paper), posts topped with the solids
    rise = 1.9

    def arch(u):                                                          # a parabola: y = rise (1 - (2u - 1)^2)
        return rise * (1 - (2 * u - 1) ** 2)

    def at(u, dy=0.0, dz=0.0):
        return Vector((x0 + span * u, y0 + dy, 0.3 + arch(u) + dz))

    def slope(u):
        d = at(u + 0.002) - at(u - 0.002)
        return math.degrees(math.atan2(d.z, d.x))

    def deck(u, v):                                                       # the deck, paper on a dark frame
        return (x0 + span * u, y0 + (v - 0.5) * 1.2, 0.3 + arch(u))
    sheet(c, p, paper(), deck, nu=80, nv=2, thick=0.1)
    def frame_(u, v):
        return (x0 + span * u, y0 + (v - 0.5) * 1.2, 0.3 + arch(u) - 0.1)
    sheet(c, p, mat("logo_dark"), frame_, nu=80, nv=2, thick=0.14)
    # the bridge's face, toward us: one square panel per step, lime up to where you are, the next gold and lifted
    # out of its slot, about to be set in; the rest paper
    u0, u1 = 0.04, 0.96
    du = (u1 - u0) / STATES
    # the railing: posts at every panel edge topped with the solids (cube, pyramid, sphere), a gold top rail
    yr = -0.56
    edges = [u0 + du * k for k in range(STATES + 1)]
    for i, u in enumerate(edges):
        rod(c, p, mat("logo_dark"), at(u, yr, 0.04), at(u, yr, 0.62), r=0.03, verts=6)
        top = at(u, yr, 0.7)
        if i % 3 == 0:
            box(c, p, mat("logo_gold"), (0.13, 0.13, 0.13), loc=tuple(top), bevel=0.01)
        elif i % 3 == 1:
            cone(c, p, mat("logo_gold"), 0.1, 0.0, 0.16, loc=tuple(top + Vector((0, 0, 0.02))), rot=(0, 0, 45), verts=4)
        else:
            ball(c, p, mat("logo_gold"), 0.072, loc=tuple(top))
    pts = [at(k / 80 * (u1 - u0) + u0, yr, 0.62) for k in range(81)]
    for a_, b_ in zip(pts, pts[1:]):
        rod(c, p, mat("logo_gold"), a_, b_, r=0.04, verts=6)
    # the arch is a parabola plotted on the graph-paper pond: x and y axes with ticks, the vertex dropped to the axis
    xa = Vector((x0 + 0.5, y0 - 1.0, 0.07))
    arrow(c, p, xa, Vector((x1 - 0.4, y0 - 1.0, 0.07)), mat("logo_dark"), r=0.035)
    mid = (x0 + x1) / 2
    arrow(c, p, Vector((mid, y0 - 1.0, 0.07)), Vector((mid, y0 - 1.0, 0.3 + rise - 0.45)), mat("logo_dark"), r=0.035)
    for k in range(1, 12):
        x = x0 + 0.5 + (x1 - x0 - 0.9) * k / 12
        rod(c, p, mat("logo_dark"), (x, y0 - 1.0, 0.04), (x, y0 - 1.0, 0.2), r=0.018, verts=4)
    # maths instruments round the pond: a set square, a compass, a protractor
    q = on_ground(sc, 0.44, 0.9)
    protractor(c, p, (q.x, q.y, 0.04), 0.75, 8)
    q = on_ground(sc, 0.94, 0.92)
    compass(c, p, (q.x, q.y, 0.0), 1.2, -15)
    q = on_ground(sc, 0.33, 0.66)
    set_square(c, p, (q.x, q.y, 0.0), 1.3, -10)
    for x in (x0, x1):                                                    # abutments on the banks, and end lamps
        box(c, p, mat("logo_dark"), (0.7, 1.6, 0.5), loc=(x, y0, 0.25), bevel=0.03)
        box(c, p, paper(), (0.8, 1.7, 0.08), loc=(x, y0, 0.54), bevel=0.01)
        rod(c, p, mat("logo_dark"), (x, y0 - 0.6, 0.55), (x, y0 - 0.6, 2.1), r=0.06, verts=8)
        lamp_pair(lambda m, x=x: cyl(c, p, m, 0.12, 0.22, loc=(x, y0 - 0.6, 2.22), verts=10), on_frame=8 if x == x1 else 14)
        cone(c, p, mat("logo_gold"), 0.2, 0.05, 0.2, loc=(x, y0 - 0.6, 2.42), verts=8)
    # a stone path from under the button to the bridge's foot; flowers, reeds and clouds
    stone_path(c, p, sc, ((0.12, 0.98), (0.24, 0.9), (0.33, 0.8), (0.36, 0.73)))
    import random
    rnd = random.Random(5)
    for _ in range(30):
        u, v = rnd.uniform(0.02, 0.4), rnd.uniform(0.62, 0.99)
        q = on_ground(sc, u, v)
        rod(c, p, mat("logo_dark"), (q.x, q.y, 0), (q.x, q.y, 0.18), r=0.012, verts=4)
        ball(c, p, mat(rnd.choice(("logo_gold", "paper", "logo_gold"))), 0.07, loc=(q.x, q.y, 0.2))
    for (u, v) in ((0.4, 0.97), (0.43, 0.95), (0.46, 0.98), (0.98, 0.96), (0.95, 0.98)):
        q = on_ground(sc, u, v)
        rod(c, p, mat("logo_dark"), (q.x, q.y, 0), (q.x + 0.06, q.y, 0.7), r=0.025, verts=5)
        ball(c, p, mat("wood"), 0.05, loc=(q.x + 0.06, q.y, 0.72), scale=(1, 1, 2.2))
    for (u, v, s) in ((0.3, 0.1, 2.0), (0.62, 0.05, 1.5), (0.88, 0.12, 1.8)):
        cloud(c, p, at_depth(sc, u, v, 36), s)
    q = on_ground(sc, 0.5, 0.95, 0.04)                                     # a second fish
    fish2 = M._empty(c, p, "fish2", loc=(q.x, q.y, 0.05), rot=(0, 0, 20))
    for tri in (((0, 0, 0), (0.4, 0.2, 0), (0.4, -0.2, 0)), ((0.4, 0.2, 0), (0.4, -0.2, 0), (0.62, 0, 0)),
                ((0, 0, 0), (-0.22, 0.18, 0), (-0.22, -0.18, 0))):
        mesh(c, fish2, mat("logo_gold"), list(tri), [[0, 1, 2]], thick=0.04)
    if ANIM:                                                              # the fish swim, the ripples spread
        for fobj, dx in ((fish, -0.9), (fish2, 0.8)):
            x_, y_, z_ = fobj.location
            for f, t in ((1, 0.0), (FRAMES, 1.0)):
                M._key(fobj, "location", f, (x_ + dx * t, y_ + 0.15 * math.sin(t * 3), z_))
        for o in ripples:
            for f, k in ((1, 0.85), (40, 1.1), (FRAMES, 0.95)):
                M._key(o, "scale", f, (k, 0.75 * k, 1))

    def progress(done, total):
        # the face: one panel per step, each with a maths sign; lime up to where you are, the next gold and lifted out
        # of its slot about to be set in, the rest paper
        pc = prog()
        lit = round(done / total * STATES)
        yf = -0.66
        for k in range(STATES):
            u = u0 + du * (k + 0.5)
            ang = slope(u)
            w = span * du / math.cos(math.radians(ang)) - 0.07
            q = at(u, yf, -0.28)
            sign = "+-x/="[k % 5]
            if k < lit:
                box(pc, p, accent(), (w, 0.08, 0.42), loc=tuple(q), rot=(0, -ang, 0), bevel=0.012)
                symbol(pc, p, sign, q + Vector((0, -0.06, 0)), ang, 0.22, mat("logo_dark"))
            elif k == lit:
                lifted = q + Vector((0, -0.35, 0.62))
                box(pc, p, mat("logo_gold"), (w, 0.08, 0.42), loc=tuple(lifted), rot=(4, -ang + 9, 0), bevel=0.012)
                symbol(pc, p, sign, lifted + Vector((0, -0.06, 0)), ang - 9, 0.22, mat("logo_dark"))
                box(pc, p, mat("logo_dark"), (w, 0.04, 0.42), loc=tuple(q + Vector((0, 0.02, 0))), rot=(0, -ang, 0), bevel=0.004)
            else:
                box(pc, p, paper(), (w, 0.08, 0.42), loc=tuple(q), rot=(0, -ang, 0), bevel=0.012)
                symbol(pc, p, sign, q + Vector((0, -0.06, 0)), ang, 0.22, mat("hill"))

    return {"progress": progress, "track": front_track(8, 50)}


# ---------------------------------------------------------------- science: building a constellation
def sky(c, p, y, low=None, high=None):
    m = bpy.data.materials.new("sky")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].position = 0.3
    low, high = low or M.PALETTE["sky_low"], high or M.PALETTE["sky_high"]
    ramp.color_ramp.elements[0].color = M.hex_rgb(low) + (1,)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = M.hex_rgb(high) + (1,)
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    o = box(c, p, m, (90, 0.1, 30), loc=(0, y, 9), bevel=0)
    o.visible_shadow = False
    if ANIM:                                                              # evening falls: day sky to dusk
        day = M.hex_rgb("#EEF4DA") + (1,)
        for el, fin in ((ramp.color_ramp.elements[0], M.hex_rgb(low) + (1,)), (ramp.color_ramp.elements[1], M.hex_rgb(high) + (1,))):
            for f, col in ((1, day), (8, day), (50, fin)):
                el.color = col
                el.keyframe_insert("color", frame=f)
    return o


def build_science(sc, c, p):
    sky(c, p, 60)
    box(c, p, mat("grass"), (80, 60, 0.02), loc=(0, 20, -0.02), bevel=0)
    hills(c, p, sc, 40, -0.8, [(-0.1, 0.2, 2.2), (0.15, 0.45, 1.5), (0.4, 0.7, 1.9)], mat("hill"))
    for (u, s) in ((0.08, 1.4), (0.14, 1.0), (0.3, 1.2), (0.52, 1.0)):
        q = on_ground(sc, u, 0.82)
        tree(c, p, (q.x, q.y + 8, 0), s=s * 1.8)
    # a far range of darker hills along the horizon: night coming down behind them
    hills(c, p, sc, 52, -0.9, [(-0.1, 0.18, 2.4), (0.12, 0.38, 1.7), (0.33, 0.6, 2.1), (0.55, 0.82, 1.6), (0.78, 1.1, 2.2)], mat("hill_night"), seed=0.7)
    # the observatory's hill on the right: a mound with a flat top (the observatory stands on it, not over it)
    hc = on_ground(sc, 0.8, 0.95)
    centre = Vector((hc.x, hc.y + 4.0, 0))
    PLATEAU = 0.72
    mound = cone(c, p, mat("grass"), 7.6, 2.9, PLATEAU + 0.5, loc=(centre.x, centre.y, (PLATEAU - 0.5) / 2), verts=64)
    mound.scale = (1, 0.62, 1)
    for poly in mound.data.polygons:
        poly.use_smooth = True
    # turned so the slit and telescope face the constellation (up and to the left); the card's plinth goes, so the
    # building's foot (0.16 up in its own space) stands on the plateau
    SCALE = 2.7
    obs = parent_at(c, p, "observatory", (centre.x, centre.y, PLATEAU - 0.16 * SCALE), SCALE, 200)
    M.build_science_a(c, obs)
    for o in list(obs.children):
        if o.type != "MESH":
            continue
        mats = [m.name for m in o.data.materials if m]
        if (o.name.startswith("Cylinder") and o.location.z < 0.15) or (o.name.startswith("Cone") and "logo_dark" in mats):
            o.hide_render = True                                          # the card's octagonal plinth and its grass tufts
    bpy.context.view_layer.update()
    dome_c = obs.matrix_world @ Vector((-0.1, 0.1, 0.16))                  # the round building's foot, in the world
    R_w = 0.48 * SCALE
    # a stone foundation ring the building stands in, set into the plateau
    cyl(c, p, paper(), R_w + 0.18, 0.2, loc=(dome_c.x, dome_c.y, PLATEAU + 0.06), verts=48, bevel=0.02)
    cyl(c, p, mat("wood"), R_w + 0.42, 0.06, loc=(dome_c.x, dome_c.y, PLATEAU + 0.0), verts=48, bevel=0.01)   # a gravel apron
    # its door, toward us, lit from inside in the lighthouse's yellow; steps down to the path; a lit window
    door = Vector((dome_c.x, dome_c.y - R_w - 0.01, PLATEAU))
    box(c, p, mat("logo_dark"), (0.5, 0.08, 0.74), loc=(door.x, door.y, PLATEAU + 0.37 + 0.12), bevel=0.01)
    box(c, p, glow("#F0D338", "glow_gold"), (0.36, 0.09, 0.6), loc=(door.x, door.y - 0.01, PLATEAU + 0.33 + 0.12), bevel=0.004)
    for k in range(3):
        box(c, p, paper(), (0.8 - 0.06 * k, 0.26, 0.08), loc=(door.x, door.y - 0.3 - 0.26 * k, PLATEAU - 0.02 - 0.12 * k), bevel=0.01)
    for a in (-38, 34):
        r_ = math.radians(a - 90)
        wx, wy = dome_c.x + math.cos(r_) * (R_w + 0.01), dome_c.y + math.sin(r_) * (R_w + 0.01)
        box(c, p, mat("logo_dark"), (0.26, 0.06, 0.26), loc=(wx, wy, PLATEAU + 0.72), rot=(0, 0, a), bevel=0.006)
        box(c, p, glow("#F0D338", "glow_gold"), (0.18, 0.07, 0.18), loc=(wx, wy, PLATEAU + 0.72), rot=(0, 0, a), bevel=0.003)
    # trees and bushes round the plateau's edge, standing on it
    for (dx, dy, kind, sz) in ((-2.4, 0.6, "tree", 1.3), (2.3, 0.9, "tree", 1.1), (2.0, -0.6, "bush", 0.32), (-1.9, -0.7, "bush", 0.28), (1.2, 1.3, "tree", 0.9)):
        x_, y_ = dome_c.x + dx, dome_c.y + dy
        if kind == "tree":
            tree(c, p, (x_, y_, PLATEAU - 0.05), s=sz)
        else:
            _facet_ball(c, p, mat("logo_dark"), sz, (x_, y_, PLATEAU + sz * 0.5), scale=(1.2, 1, 0.9))
            _facet_ball(c, p, mat("grass"), sz * 0.55, (x_ + sz * 0.3, y_ - 0.1, PLATEAU + sz * 1.1))
    top = Vector((centre.x, centre.y, PLATEAU))
    # the card's cartoon stars and its planet and moon would compete with the real sky: the hero keeps the observatory
    for o in list(obs.children):
        if o.type == "MESH" and any(m and m.name == "logo_gold" for m in o.data.materials):
            o.hide_render = True
    for name in ("planet", "moon"):
        o = bpy.data.objects.get(name)
        if o:
            for ch in [o] + list(o.children_recursive):
                ch.hide_render = True
    # a lantern-lit path winding up the hill, a fence, bushes
    stone_path(c, p, sc, ((0.56, 1.0), (0.62, 0.95), (0.7, 0.93), (0.76, 0.91)), r=0.2)
    for i, (u, v) in enumerate(((0.6, 0.96), (0.7, 0.9))):
        q = on_ground(sc, u, v)
        rod(c, p, mat("logo_dark"), (q.x, q.y, 0), (q.x, q.y, 0.7), r=0.03, verts=6)
        lamp_pair(lambda m, q=q: cyl(c, p, m, 0.08, 0.14, loc=(q.x, q.y, 0.78), verts=8), on_frame=30 + 8 * i)
        cone(c, p, mat("logo_dark"), 0.12, 0.02, 0.1, loc=(q.x, q.y, 0.9), verts=8)
    for (u, v, s) in ((0.22, 0.42, 2.0), (0.5, 0.58, 1.4)):
        cloud(c, p, at_depth(sc, u, v, 40), s)
    # The journey: a tour of the planets. A small sun low on the left and five planets scattered up across the evening
    # sky (on an arc, but nothing draws it). To the eye they are what planets are, tiny coloured points; only the telescope
    # shows them as worlds. So the planet in its sight grows where it is, magnified in place (covering its neighbours
    # while it's looked at) to show its features, ringed in lime; the rest stay points. Each step moves the telescope
    # on to the next planet; the tour ends on the ringed planet with its moon.
    ys = top.y + 9.0                                                      # well behind the observatory, up in the sky
    k_ = (ys + 14) / 44
    ARC = [(0.42, 0.42), (0.46, 0.31), (0.51, 0.23), (0.56, 0.19), (0.61, 0.18), (0.655, 0.2)]
    SUN = at_depth(sc, 0.42, 0.4, ys)
    stops = path([Vector((u, v, 0)) for u, v in ARC], 6)[1:]             # five stops after the sun's end
    planet_pos = [at_depth(sc, q.x, q.y, ys) for q in stops]
    U = 0.64 * k_                                                         # a planet unit, world size at that depth
    M.PALETTE.update({"ice": "#DDEDE6", "rock": "#BDB8A4", "rock_dark": "#9A957F", "band": "#C9A417"})

    DOT_COLOURS = ["rock", "logo_lime", "ice", "logo_gold", "lime"]
    def planet(pc, i, q, U=U):
        """Planet i (0..4), facing us at q, at size unit U."""
        if i == 0:                                                        # a small rocky world, cratered
            R = U * 0.75
            ball(pc, p, mat("rock"), R, loc=tuple(q))
            for (dx, dz, r) in ((0.3, 0.25, 0.28), (-0.35, -0.1, 0.22), (0.05, -0.4, 0.18)):
                cyl(pc, p, mat("rock_dark"), R * r, R * 0.1, loc=(q.x + dx * R, q.y - R * 0.93, q.z + dz * R), rot=(90, 0, 0), verts=16)
        elif i == 1:                                                      # a green world with swirling cloud bands
            R = U * 1.0
            ball(pc, p, mat("logo_lime"), R, loc=tuple(q))
            for (zz, w) in ((0.35, 0.86), (-0.15, 0.95), (-0.55, 0.76)):
                ring(pc, p, paper(), R * w, R * 0.06, loc=(q.x, q.y, q.z + zz * R), rot=(90 - 72, 0, 0), scale=(1, 1, 0.3))
        elif i == 2:                                                      # an icy world with a polar cap
            R = U * 0.9
            ball(pc, p, mat("ice"), R, loc=tuple(q))
            ball(pc, p, paper(), R * 0.55, loc=(q.x, q.y, q.z + R * 0.62), scale=(1, 1, 0.55))
        elif i == 3:                                                      # a banded gold giant
            R = U * 1.35
            ball(pc, p, mat("logo_gold"), R, loc=tuple(q))
            for (zz, w, m) in ((0.45, 0.9, "band"), (0.05, 1.0, "band"), (-0.4, 0.92, "band")):
                ring(pc, p, mat(m), R * w, R * 0.07, loc=(q.x, q.y, q.z + zz * R), rot=(0, 0, 0), scale=(1, 1, 0.25))
            ball(pc, p, mat("logo_dark"), R * 0.16, loc=(q.x + R * 0.45, q.y - R * 0.88, q.z - R * 0.2), scale=(1.4, 0.3, 0.8))   # a storm
        else:                                                             # the ringed planet, with its moon: the end
            R = U * 1.3
            ball(pc, p, accent(), R, loc=tuple(q))
            ring(pc, p, mat("logo_gold"), R * 1.75, R * 0.09, loc=tuple(q), rot=(72, 0, 14), scale=(1, 1, 0.3))
            ring(pc, p, mat("logo_gold"), R * 1.5, R * 0.05, loc=tuple(q), rot=(72, 0, 14), scale=(1, 1, 0.3))
            ball(pc, p, paper(), R * 0.26, loc=(q.x + R * 2.1, q.y - R * 0.3, q.z + R * 0.75))
        return R

    import random
    rnd = random.Random(9)
    for _ in range(40):                                                   # the sky's other, fainter stars: points too
        u, v = rnd.uniform(0.38, 0.99), rnd.uniform(0.03, 0.55)
        q = at_depth(sc, u, v, 34)
        o = ball(c, p, mat(rnd.choice(("paper", "logo_gold", "paper"))), rnd.uniform(0.04, 0.09), loc=tuple(q))
        if ANIM:                                                          # they come out as the sky darkens
            f_on = rnd.randint(24, 60)
            for f, k in ((1, 0.001), (f_on, 0.001), (f_on + 8, 1.0)):
                M._key(o, "scale", f, (k, k, k))
    # a shooting star crosses the sky once, early in the entrance, as evening falls
    if ANIM:
        a_, b_ = at_depth(sc, 0.95, 0.06, 40), at_depth(sc, 0.7, 0.3, 40)
        streak = rod(c, p, mat("logo_gold"), Vector((0, 0, 0)), (b_ - a_).normalized() * -2.2, r=0.05, verts=6)
        head = ball(c, streak, glow("#F0D338", "glow_gold"), 0.12)
        for f, t in ((1, 0.0), (22, 0.0), (34, 1.0), (FRAMES, 1.0)):
            M._key(streak, "location", f, tuple(a_.lerp(b_, t)))
        M._shown_keys(streak, [(1, False), (22, True), (35, False)])
    # the telescope is part of the progress (it turns to the star in its sight): it renders with the progress layer
    bpy.context.view_layer.update()
    scope = bpy.data.objects.get("scope")
    # the card's painted-on slit goes (the hero cuts its own, where the telescope comes out)
    for o in list(obs.children):
        if o.type == "MESH" and any(m and m.name == "ink" for m in o.data.materials):
            o.hide_render = True
    DOME_C, DOME_R, DOME_RZ = Vector((-0.1, 0.1, 0.64)), 0.48, 0.384      # the card's dome, in the observatory's own space
    if scope:
        # the telescope stands at the middle of the dome, so it comes out through the slit, never across its face;
        # the part inside the dome is hidden by it (the dome is held out in the progress render)
        scope.location = tuple(DOME_C + Vector((0, 0, 0.06)))
        scope.scale = (1.0, 1.0, 1.5)
        for o in [scope] + list(scope.children_recursive):
            for cc in list(o.users_collection):
                cc.objects.unlink(o)
            prog().objects.link(o)

    def progress(done, total):
        pc = prog()
        n = len(planet_pos)
        seen = round(done / total * n) if total else 0                  # planets the telescope has visited
        cur = min(seen, n - 1)                                            # the one in its sight now (the last, once done)
        # the sun, low on the left (no line joins the planets: where the tour goes next stays a surprise)
        ball(pc, p, glow("#F0D338", "glow_gold"), U * 0.55, loc=tuple(SUN))
        # the planets, as the eye sees them: points of colour (visited and current), faint points (still ahead)
        for i, q in enumerate(planet_pos):
            if i <= cur:
                ball(pc, p, mat(DOT_COLOURS[i]), U * 0.2, loc=tuple(q))
            else:
                ball(pc, p, paper(), U * 0.09, loc=tuple(q))
        # the one in the telescope's sight, magnified where it is, inside a lime focus ring
        tq = planet_pos[cur]
        last = cur == n - 1
        R = planet(pc, cur, tq + Vector((0, -0.3, 0)), U=U * (1.05 if last else 1.35))
        rr = R * (2.25 if last else 1.45)
        for j in range(36):
            t = 2 * math.pi * j / 36
            ball(pc, p, accent(), 0.022 * k_ * 2.2, loc=(tq.x + math.cos(t) * rr, tq.y - 0.35, tq.z + math.sin(t) * rr))
        nxt = cur
        if scope:
            target = planet_pos[nxt]
            scope.location = tuple(DOME_C + Vector((0, 0, 0.06)))             # aim from the dome's middle
            bpy.context.view_layer.update()
            d = (obs.matrix_world.to_3x3().inverted() @ (target - scope.matrix_world.translation)).normalized()
            scope.rotation_quaternion = d.to_track_quat("Z", "Y")
            # the slit: a dark opening up the dome's face, from just below where the telescope comes out, over the top
            foot = Vector(scope.location)
            lo, hi = 0.0, 3.0                                                 # where the tube leaves the dome
            for _ in range(40):
                mid = (lo + hi) / 2
                pnt = foot + d * mid - DOME_C
                inside = (pnt.x ** 2 + pnt.y ** 2) / DOME_R ** 2 + pnt.z ** 2 / DOME_RZ ** 2 < 1
                lo, hi = (mid, hi) if inside else (lo, mid)
            hit = foot + d * lo - DOME_C
            # stand the telescope where it leaves the dome, so none of it lies inside (its hidden outline would show
            # through: Freestyle doesn't see the held-out dome)
            scope.location = tuple(DOME_C + hit * 0.96)
            phi = math.atan2(hit.y, hit.x)
            th0 = math.asin(max(-1.0, min(1.0, hit.z / DOME_RZ))) - 0.22
            def slit(u, v, phi=phi, th0=th0):
                th = th0 + (math.pi / 2 + 0.3 - th0) * u
                k = 1.015
                perp = Vector((-math.sin(phi), math.cos(phi), 0)) * (v - 0.5) * 0.15
                return tuple(DOME_C + Vector((DOME_R * k * math.cos(th) * math.cos(phi), DOME_R * k * math.cos(th) * math.sin(phi), DOME_RZ * k * math.sin(th))) + perp)
            sheet(pc, obs, ink(), slit, nu=24, nv=1, thick=0.012)

    return {"progress": progress, "track": front_track(8, 48)}


SCENES = {
    "english": (build_english, (0.0, -14.0, 2.6), 84),
    "maths": (build_maths, (0.0, -14.0, 3.6), 81),
    "science": (build_science, (0.0, -14.0, 1.4), 92),
}


def phone_camera(sc):
    """Phones show the scene as a strip above the text, so no room is kept for it: frame the landmark and the whole
    progress path (u 0.37..1.0 of the desktop frame) at 2:1."""
    keep = 0.64
    sc.render.resolution_x, sc.render.resolution_y = 960, 480
    cam = sc.camera
    cam.data.lens = 35 / keep
    cam.data.shift_x = (1.0 - keep / 2 - 0.5) / keep
    sc.view_layers[0].freestyle_settings.linesets[0].linestyle.thickness = 1.6 * 960 / 1440 / keep * 0.7


def layer(name):
    return bpy.context.scene.view_layers[0].layer_collection.children.get(name)


def clear_progress():
    nl = bpy.data.collections.get("nolines")
    for o in [o for o in list(prog().objects) + (list(nl.objects) if nl else []) if o.get("state")]:
        bpy.data.objects.remove(o)


def build_progress(ctx, done, total):
    before = set(prog().objects)
    ctx["progress"](done, total)
    for o in prog().objects:
        if o not in before:
            o["state"] = True


def render_to(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    import json
    build, cam_loc, pitch = SCENES[SCENE]
    sc, coll, root = setup(cam_loc, pitch)
    ctx = build(sc, coll, root)
    if PHONE:
        phone_camera(sc)
    if MODE == "still":
        build_progress(ctx, DONE, TOTAL)
        render_to(sc, OUT)
    elif MODE == "frames":
        layer("progress").exclude = True
        os.makedirs(DIR, exist_ok=True)
        with open(os.path.join(DIR, "track.json"), "w") as f:
            json.dump({"fps": FPS, "frames": FRAMES, "crest": ctx["track"]}, f)
        step = int(_arg("--step", "1"))
        for fr in range(1, FRAMES + 1, step):
            sc.frame_set(fr)
            render_to(sc, os.path.join(DIR, f"f{fr:04d}.png"))
    elif MODE == "poster":
        layer("progress").exclude = True
        sc.frame_set(FRAMES)
        render_to(sc, OUT)
    elif MODE == "progress":
        # the progress alone: the scene is held out (still hiding what stands behind it), light has no say, and
        # only the progress gets ink lines
        layer("hero").holdout = True                                      # (light, like the beam, stays in: no lines)
        ls = sc.view_layers[0].freestyle_settings.linesets[0]
        ls.select_by_collection = True
        ls.collection = prog()
        ls.collection_negation = "INCLUSIVE"
        sc.frame_set(FRAMES)
        os.makedirs(DIR, exist_ok=True)
        for st in range(STATES + 1):
            clear_progress()
            build_progress(ctx, st, STATES)
            render_to(sc, os.path.join(DIR, f"p{st:02d}.png"))
    print(f"[hero] {SCENE} {MODE} done")
    if SAVE_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE_BLEND))


main()
