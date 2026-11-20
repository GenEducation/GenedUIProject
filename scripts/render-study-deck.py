"""Builds and renders the post-login "Study Deck" loader objects in Blender.

Soft-clay study objects (book, pencil, set square, atom, globe, flask, bulb,
abacus) plus the completion graduation cap, each rendered to a transparent
512x512 WebP in public/loaders/study/. The scene is built entirely from code,
so this script *is* the source: edit it and re-run to change the set.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/render-study-deck.py
    # options after `--`:  --only book,cap   --blend /path/to/save.blend   --samples 96

Consumed by src/components/shared/loaders/StudyDeck/studyObjects.ts.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "public", "loaders", "study")

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


ONLY = set(filter(None, (_arg("--only", "") or "").split(",")))
SAVE_BLEND = _arg("--blend")
SAMPLES = int(_arg("--samples", "96"))

# ---------------------------------------------------------------- palette
PALETTE = {
    "lime": "#A6CF08",
    "green": "#287624",
    "ink": "#1D6315",
    "yellow": "#FBE023",
    "cream": "#F7F4EA",
    "coral": "#E8635A",
    "sky": "#4A90D9",
    "wood": "#F2C98A",
    "steel": "#B9C2B0",
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def _set_input(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


_MATS = {}


def mat(key, rough=0.6, emission=0.0, glass=False):
    """Clay material: matte, a touch of subsurface, a faint noise bump."""
    name = f"clay_{key}_{rough}_{emission}_{glass}"
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    col = hex_rgba(PALETTE[key])
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = 0.12 if glass else rough
    if glass:
        _set_input(bsdf, ["Transmission Weight", "Transmission"], 1.0)
        bsdf.inputs["IOR"].default_value = 1.35
    else:
        _set_input(bsdf, ["Subsurface Weight", "Subsurface"], 0.06)
        _set_input(bsdf, ["Subsurface Radius"], (0.2, 0.12, 0.08))
        _set_input(bsdf, ["Subsurface Scale"], 0.05)
    if emission:
        _set_input(bsdf, ["Emission Color", "Emission"], col)
        _set_input(bsdf, ["Emission Strength"], emission)
    if not glass:
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 38.0
        noise.inputs["Detail"].default_value = 4.0
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.035
        nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _MATS[name] = m
    return m


# ---------------------------------------------------------------- helpers
def soften(obj, bevel=0.0, segments=4, subdiv=2, smooth=True):
    if bevel:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = segments
        b.limit_method = "ANGLE"
        b.harden_normals = False
    if subdiv:
        s = obj.modifiers.new("subd", "SUBSURF")
        s.levels = subdiv
        s.render_levels = subdiv
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def _finish(obj, coll, material, loc, rot, scale, parent):
    obj.location = loc
    obj.rotation_euler = [math.radians(a) for a in rot]
    obj.scale = scale
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    if material is not None:
        obj.data.materials.append(material)
    obj.parent = parent
    return obj


def box(coll, parent, material, size, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.06, subdiv=2):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    _finish(o, coll, material, loc, rot, (1, 1, 1), parent)
    return soften(o, bevel=bevel, subdiv=subdiv)


def cyl(coll, parent, material, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=48, bevel=0.03, subdiv=1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth)
    o = bpy.context.active_object
    _finish(o, coll, material, loc, rot, (1, 1, 1), parent)
    return soften(o, bevel=bevel, subdiv=subdiv)


def cone(coll, parent, material, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=48, bevel=0.02, subdiv=1):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth)
    o = bpy.context.active_object
    _finish(o, coll, material, loc, rot, (1, 1, 1), parent)
    return soften(o, bevel=bevel, subdiv=subdiv)


def ball(coll, parent, material, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r)
    o = bpy.context.active_object
    _finish(o, coll, material, loc, rot, scale, parent)
    return soften(o, subdiv=1)


def ring(coll, parent, material, R, r, loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=20)
    o = bpy.context.active_object
    _finish(o, coll, material, loc, rot, (1, 1, 1), parent)
    return soften(o, subdiv=1)


def prism(coll, parent, material, pts2d, depth, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.05):
    """Extrude a 2D polygon (in XZ) along Y."""
    me = bpy.data.meshes.new("prism")
    n = len(pts2d)
    verts = [(x, -depth / 2, z) for x, z in pts2d] + [(x, depth / 2, z) for x, z in pts2d]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))]
    faces += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("prism", me)
    bpy.context.scene.collection.objects.link(o)
    _finish(o, coll, material, loc, rot, (1, 1, 1), parent)
    return soften(o, bevel=bevel, segments=4, subdiv=1)


# ---------------------------------------------------------------- objects
def build_book(c, p):
    cover = mat("green")
    pages = mat("cream", rough=0.7)
    for side in (-1, 1):
        box(c, p, cover, (1.05, 1.45, 0.08), loc=(side * 0.53, 0, 0.1), rot=(0, side * -9, 0), bevel=0.04)
        box(c, p, pages, (0.95, 1.33, 0.18), loc=(side * 0.5, 0, 0.24), rot=(0, side * -11, 0), bevel=0.05)
        # a fanned page lifting off each side
        box(c, p, pages, (0.85, 1.25, 0.03), loc=(side * 0.42, 0, 0.42), rot=(0, side * -24, 0), bevel=0.012)
    # spine valley + ribbon
    cyl(c, p, cover, 0.09, 1.45, loc=(0, 0, 0.1), rot=(90, 0, 0), bevel=0.0)
    box(c, p, mat("coral"), (0.1, 0.55, 0.02), loc=(0.05, -0.85, 0.12), rot=(-62, 0, 0), bevel=0.008)
    # text lines on the pages
    line = mat("lime")
    for side in (-1, 1):
        for i in range(3):
            box(c, p, line, (0.55, 0.06, 0.02), loc=(side * 0.5, 0.35 - i * 0.22, 0.345 + 0.03 * side * 0),
                rot=(0, side * -11, 0), bevel=0.008, subdiv=1)
    # tip the open book toward the camera so the pages show
    p.rotation_euler = (math.radians(-24), 0, math.radians(14))


def build_pencil(c, p):
    body = cyl(c, p, mat("yellow"), 0.26, 2.0, loc=(0, 0, 0), verts=6, bevel=0.05, subdiv=2)
    cone(c, p, mat("wood"), 0.255, 0.07, 0.55, loc=(0, 0, -1.27), rot=(180, 0, 0), verts=6, bevel=0.02)
    cone(c, p, mat("ink"), 0.085, 0.0, 0.2, loc=(0, 0, -1.6), rot=(180, 0, 0), verts=24, bevel=0.0)
    cyl(c, p, mat("steel", rough=0.35), 0.27, 0.28, loc=(0, 0, 1.12), bevel=0.02)
    for z in (1.04, 1.2):
        ring(c, p, mat("steel", rough=0.35), 0.27, 0.025, loc=(0, 0, z))
    cyl(c, p, mat("coral"), 0.25, 0.32, loc=(0, 0, 1.4), bevel=0.08)
    body.name = "pencil_body"
    p.rotation_euler = (math.radians(0), math.radians(-58), math.radians(-25))


def build_ruler(c, p):
    # set square (right triangle with a cut-out) standing up
    outer = [(-1.0, 0.0), (1.0, 0.0), (-1.0, 1.7)]
    prism(c, p, mat("lime"), outer, 0.16, loc=(0, 0.1, 0), bevel=0.06)
    inner = [(-0.68, 0.32), (0.18, 0.32), (-0.68, 1.05)]
    prism(c, p, mat("cream"), inner, 0.2, loc=(0, 0.1, 0), bevel=0.03)
    # ruler leaning across the front
    r = box(c, p, mat("yellow"), (2.1, 0.12, 0.38), loc=(0.15, -0.18, 0.5), rot=(0, -22, 0), bevel=0.04)
    tick = mat("ink")
    for i in range(9):
        L = 0.16 if i % 2 == 0 else 0.1
        # ticks are children of the ruler, so they ride along its lean
        box(c, r, tick, (0.035, 0.03, L), loc=(-0.85 + i * 0.21, -0.07, 0.19 - L / 2), bevel=0.01, subdiv=1)
    r.name = "ruler_body"
    p.rotation_euler = (0, 0, math.radians(-20))


def build_atom(c, p):
    ball(c, p, mat("coral"), 0.34, loc=(0, 0, 0))
    for dx, dz in ((0.18, 0.12), (-0.16, 0.14), (0.02, -0.2)):
        ball(c, p, mat("lime"), 0.2, loc=(dx, -0.12, dz))
    orbit = mat("green")
    e = mat("yellow", emission=0.15)
    for i, ang in enumerate((0, 60, 120)):
        rr = ring(c, p, orbit, 0.95, 0.07, rot=(70, 0, ang))
        # electron placed on the ring
        t = math.radians(40 + i * 110)
        v = Vector((math.cos(t), math.sin(t), 0))
        v.rotate(rr.rotation_euler)
        ball(c, p, e, 0.13, loc=tuple(v))


def build_globe(c, p):
    g = bpy.data.objects.new("globe_tilt", None)
    c.objects.link(g)
    g.parent = p
    g.location = (0, 0, 1.25)
    g.rotation_euler = (0, math.radians(23), 0)
    ball(c, g, mat("sky", rough=0.5), 0.82)
    land = mat("lime")
    for (th, ph, s) in ((20, 30, 0.42), (-30, 120, 0.36), (40, 200, 0.3), (-10, 280, 0.44), (60, 80, 0.22), (-55, 330, 0.25)):
        t, f = math.radians(th), math.radians(ph)
        n = Vector((math.cos(t) * math.cos(f), math.cos(t) * math.sin(f), math.sin(t)))
        ball(c, g, land, s, loc=tuple(n * 0.74), scale=(1, 1, 0.45),
             rot=(0, math.degrees(math.acos(max(-1, min(1, n.z)))), math.degrees(math.atan2(n.y, n.x))))
    # stand: half meridian arc + stem + base
    arc = ring(c, p, mat("green"), 0.98, 0.06, loc=(0, 0, 1.25), rot=(90, 23, 0))
    cyl(c, p, mat("green"), 0.08, 0.35, loc=(0, 0, 0.18))
    cyl(c, p, mat("ink"), 0.55, 0.16, loc=(0, 0, 0.08), bevel=0.06)
    arc.name = "globe_arc"
    p.rotation_euler = (0, 0, math.radians(-30))


def build_flask(c, p):
    glass = mat("cream", glass=True)
    ball(c, p, glass, 0.85, loc=(0, 0, 0.85))
    cyl(c, p, glass, 0.26, 0.9, loc=(0, 0, 1.85), bevel=0.0, subdiv=0)
    ring(c, p, mat("green"), 0.3, 0.07, loc=(0, 0, 2.3))
    liquid = ball(c, p, mat("sky", rough=0.35), 0.78, loc=(0, 0, 0.85))
    cut = box(c, p, None, (2, 2, 1.2), loc=(0, 0, 1.55), bevel=0, subdiv=0)
    b = liquid.modifiers.new("cut", "BOOLEAN")
    b.operation = "DIFFERENCE"
    b.object = cut
    liquid.modifiers.move(len(liquid.modifiers) - 1, 0)
    cut.hide_render = True
    cut.hide_viewport = True
    ball(c, p, mat("lime"), 0.13, loc=(0.18, -0.1, 2.65))
    ball(c, p, mat("lime"), 0.09, loc=(-0.12, 0.05, 2.95))
    ball(c, p, mat("yellow"), 0.11, loc=(-0.25, -0.35, 0.95))
    ball(c, p, mat("yellow"), 0.07, loc=(0.25, -0.4, 1.15))


def build_bulb(c, p):
    bulb = mat("yellow", emission=0.55, rough=0.45)
    ball(c, p, bulb, 0.9, loc=(0, 0, 1.55))
    cone(c, p, bulb, 0.5, 0.36, 0.55, loc=(0, 0, 0.85), bevel=0.0, subdiv=1)
    base = mat("green")
    cyl(c, p, base, 0.37, 0.5, loc=(0, 0, 0.4), bevel=0.04)
    for z in (0.28, 0.42, 0.56):
        ring(c, p, mat("ink"), 0.38, 0.045, loc=(0, 0, z))
    cone(c, p, mat("ink"), 0.25, 0.1, 0.2, loc=(0, 0, 0.08), rot=(180, 0, 0))
    # shine streak
    box(c, p, mat("cream", emission=0.6), (0.12, 0.05, 0.5), loc=(-0.48, -0.62, 1.85), rot=(0, 28, -30), bevel=0.04)
    # rays
    ray = mat("lime")
    for a in (-60, -25, 25, 60):
        t = math.radians(a)
        box(c, p, ray, (0.09, 0.09, 0.32), loc=(math.sin(t) * 1.25, 0, 1.6 + math.cos(t) * 1.25), rot=(0, a, 0), bevel=0.04)


def build_abacus(c, p):
    frame = mat("green")
    for x in (-1.0, 1.0):
        box(c, p, frame, (0.18, 0.3, 1.9), loc=(x, 0, 0.95), bevel=0.06)
    box(c, p, frame, (2.2, 0.32, 0.18), loc=(0, 0, 1.85), bevel=0.06)
    box(c, p, mat("ink"), (2.4, 0.5, 0.2), loc=(0, 0, 0.1), bevel=0.07)
    rod = mat("cream")
    colours = ("lime", "yellow", "coral")
    offsets = ((-0.55, -0.3, -0.05, 0.6), (-0.6, 0.25, 0.5, 0.75), (-0.55, -0.3, 0.35, 0.6))
    for i, z in enumerate((1.45, 1.0, 0.55)):
        cyl(c, p, rod, 0.035, 1.9, loc=(0, 0, z), rot=(0, 90, 0), bevel=0.0, subdiv=0)
        for x in offsets[i]:
            ball(c, p, mat(colours[i]), 0.16, loc=(x, 0, z), scale=(0.75, 1, 1))
    p.rotation_euler = (0, 0, math.radians(-18))


def build_cap(c, p):
    ink = mat("ink")
    cyl(c, p, ink, 0.62, 0.55, loc=(0, 0, 0.3), bevel=0.06)
    board = box(c, p, mat("green"), (1.9, 1.9, 0.14), loc=(0, 0, 0.63), rot=(0, 0, 45), bevel=0.05)
    ball(c, p, mat("yellow"), 0.1, loc=(0, 0, 0.75))
    # Tassel: one continuous cord from the button, across the board to the
    # midpoint of its front-right edge (the board is turned 45°, so that edge
    # midpoint lies on the diagonal at 0.95 from the centre), over a knot and
    # straight down to a fringe that flares toward the bottom.
    tassel = mat("yellow")
    edge = 0.95 / math.sqrt(2)          # x = -y of the edge midpoint
    top = 0.745                         # cord resting on the board's top face (0.70)
    cyl(c, p, tassel, 0.042, 0.95, loc=(edge / 2, -edge / 2, top), rot=(0, 90, -45), bevel=0.0, subdiv=1)
    ball(c, p, tassel, 0.07, loc=(edge + 0.02, -edge - 0.02, top - 0.02))
    drop_top, drop_bottom = top - 0.02, 0.27
    cyl(c, p, tassel, 0.042, drop_top - drop_bottom, loc=(edge + 0.02, -edge - 0.02, (drop_top + drop_bottom) / 2),
        bevel=0.0, subdiv=1)
    cyl(c, p, mat("green"), 0.075, 0.07, loc=(edge + 0.02, -edge - 0.02, drop_bottom), bevel=0.02)
    cone(c, p, tassel, 0.14, 0.06, 0.34, loc=(edge + 0.02, -edge - 0.02, drop_bottom - 0.2), bevel=0.02)
    board.name = "cap_board"
    p.rotation_euler = (math.radians(-6), math.radians(8), math.radians(10))


OBJECTS = [
    ("book", build_book),
    ("pencil", build_pencil),
    ("ruler", build_ruler),
    ("atom", build_atom),
    ("globe", build_globe),
    ("flask", build_flask),
    ("bulb", build_bulb),
    ("abacus", build_abacus),
    ("cap", build_cap),
]

# All objects are normalised into the same footprint so swaps never jump.
FIT = 2.1          # largest dimension after normalising
GROUND = 0.0
# Flat objects read small from the camera; nudge them up so the set looks even.
SIZE_BIAS = {"book": 1.3, "cap": 1.22, "atom": 1.05, "pencil": 1.08}


def normalise(coll, root):
    bpy.context.view_layer.update()
    pts = []
    for o in coll.all_objects:
        if o.type != "MESH" or o.hide_render:
            continue
        pts += [o.matrix_world @ Vector(v) for v in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dims = mx - mn
    k = FIT * SIZE_BIAS.get(coll.name, 1.0) / max(dims.x, dims.z, dims.y * 0.8)
    holder = bpy.data.objects.new(f"{coll.name}_fit", None)
    coll.objects.link(holder)
    root.parent = holder
    centre = (mn + mx) / 2
    holder.scale = (k, k, k)
    holder.location = (-centre.x * k, -centre.y * k, GROUND - mn.z * k)
    bpy.context.view_layer.update()


# ---------------------------------------------------------------- scene
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = "GPU"
    except Exception:
        sc.cycles.device = "CPU"
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True
    sc.render.resolution_x = sc.render.resolution_y = 512
    sc.render.resolution_percentage = 100
    try:
        # AgX "Punchy": saturated brand colours without Standard's neon clipping.
        sc.view_settings.view_transform = "AgX"
        sc.view_settings.look = "AgX - Punchy"
    except Exception:
        pass
    sc.render.image_settings.file_format = "WEBP"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = 80

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = hex_rgba("#F4F1E4")
    bg.inputs["Strength"].default_value = 0.45
    sc.world = world

    # shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=30)
    floor = bpy.context.active_object
    floor.name = "shadow_catcher"
    floor.is_shadow_catcher = True

    def area(name, loc, energy, size, colour, shadow=True):
        ld = bpy.data.lights.new(name, "AREA")
        # Only the key casts shadows, so every object gets one compact contact
        # shadow that stays inside the frame.
        ld.use_shadow = shadow
        ld.energy = energy
        ld.size = size
        ld.color = colour
        lo = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(lo)
        lo.location = loc
        d = Vector((0, 0, 1.0)) - Vector(loc)
        lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

    area("key", (-2.2, -2.6, 8.5), 1100, 5.0, (1.0, 0.96, 0.88))
    area("fill", (5.0, -4.0, 3.0), 300, 6.0, (0.88, 0.94, 1.0), shadow=False)
    area("rim", (1.5, 5.0, 4.5), 500, 3.0, (1.0, 1.0, 0.95), shadow=False)

    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 85
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    dist = 9.6
    el = math.radians(20)
    target = Vector((0, 0, 1.05))
    cam.location = target + Vector((0, -math.cos(el) * dist, math.sin(el) * dist))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    return sc


# The shadow catcher picks up a faint, frame-wide tint from the world light
# (alpha ~0.03-0.05 everywhere), which shows as a box around each object on the
# page. Drop everything below this floor, then fade the alpha to zero toward
# the frame edge so no edge can ever read.
ALPHA_FLOOR = 0.07
EDGE_FADE = (0.40, 0.49)   # radius (fraction of width): full → zero


def clean_alpha_and_save(sc, out_path):
    import numpy as np

    result = bpy.data.images["Render Result"]
    tmp = os.path.join(bpy.app.tempdir, "study_deck_tmp.exr")
    fmt = sc.render.image_settings.file_format
    sc.render.image_settings.file_format = "OPEN_EXR"
    sc.render.image_settings.color_mode = "RGBA"
    result.save_render(tmp, scene=sc)
    sc.render.image_settings.file_format = fmt
    sc.render.image_settings.color_mode = "RGBA"

    img = bpy.data.images.load(tmp)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)

    a = px[..., 3]
    a = np.clip((a - ALPHA_FLOOR) / (1.0 - ALPHA_FLOOR), 0.0, 1.0)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx + 0.5) / w - 0.5, (yy + 0.5) / h - 0.5)
    t = np.clip((r - EDGE_FADE[0]) / (EDGE_FADE[1] - EDGE_FADE[0]), 0.0, 1.0)
    a *= 1.0 - t * t * (3 - 2 * t)          # smoothstep fade
    px[..., 3] = a

    img.pixels.foreach_set(px.ravel())
    img.save_render(out_path, scene=sc)
    bpy.data.images.remove(img)
    os.remove(tmp)


def main():
    sc = reset_scene()
    os.makedirs(OUT_DIR, exist_ok=True)
    built = []
    for key, fn in OBJECTS:
        if ONLY and key not in ONLY:
            continue
        coll = bpy.data.collections.new(key)
        sc.collection.children.link(coll)
        root = bpy.data.objects.new(f"{key}_root", None)
        coll.objects.link(root)
        fn(coll, root)
        normalise(coll, root)
        built.append(coll)

    for coll in built:
        for other in built:
            other.hide_render = other is not coll
        bpy.ops.render.render()
        out = os.path.join(OUT_DIR, f"{coll.name}.webp")
        clean_alpha_and_save(sc, out)
        print(f"[study-deck] rendered {out}")

    for coll in built:
        coll.hide_render = False
    if SAVE_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE_BLEND))


main()
