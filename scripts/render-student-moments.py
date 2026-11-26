"""Builds and renders the Student portal's "moment" illustrations in Blender.

Paper-and-ink: white folded planes, thin ink-green outlines (Freestyle) and a
single lime accent per scene. Each scene is one idea, told with as little as
possible -- no books, bags or clocks, just a shape that carries the feeling:

    chapter-complete     the last jigsaw piece, about to click into place
    revisit              a winding path, a pin where you left off
    placement-intro      rising stepping posts, a marble waiting at the start
    placement-complete   the marble come to rest on its own step
    result-above         the full moon
    result-at            a half moon: right where it should be
    result-below         a thin crescent, waxing: on its way to full
    welcome-aboard       a paper kite lifting off
    test-ready           a diving board over a pool, ready to jump in
    empty-chapters       an empty platform, tracks leading away: the next one is coming
    empty-report         a chart's first bar just starting to rise
    empty-notifications  a paper plane parked on the runway
    not-found            a door standing alone, open onto nothing
    error                a house of cards, one card slipped out

and the dashboard (public/student/dashboard):

    streak               a paper chain, the newest link lime
    chapters             a paper honeycomb, finished cells filled in lime
    longest              a trophy cup folded from paper, a lime ribbon round it
    time                 a tear-off pad of days, the top sheet lifting away
    empty-recent         an arched garden gate swung open, stepping stones through

Each dashboard scene is rendered as <name>-base.webp + <name>-accent.webp (the lime parts alone, in the same
frame), so the page can animate the accent. Transparent WebP with no baked shadow: the page draws its own soft
shadow.
The scene is built entirely from code, so this script *is* the source:

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \\
        -P scripts/render-student-moments.py -- --only chapter-complete,revisit
    # options after `--`: --only a,b  --samples 48  --out DIR  --blend /path/save.blend

Consumed by src/features/student/theme/momentArt.ts and progressArt.ts.
"""

import math
import os
import sys

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


ONLY = set(filter(None, (_arg("--only", "") or "").split(",")))
SAMPLES = int(_arg("--samples", "48"))
OUT_ROOT = os.path.abspath(_arg("--out", os.path.join(ROOT, "public", "student")))   # moments/ and dashboard/ go under it
SAVE_BLEND = _arg("--blend")
EXPOSURE = float(_arg("--exposure", "-0.35"))

PALETTE = {
    "paper": "#FBFAF4",
    "lime": "#A6CF08",
    "ink": "#1D6315",
}
INK_LINE = "#17500F"


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def _set(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


_MATS = {}


def mat(key, rough=0.75):
    if key in _MATS:
        return _MATS[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hex_rgb(PALETTE[key]) + (1.0,)
    bsdf.inputs["Roughness"].default_value = rough
    _set(bsdf, ["Specular IOR Level", "Specular"], 0.25)
    _MATS[key] = m
    return m


def paper():
    return mat("paper")


def accent():
    return mat("lime", rough=0.55)


def ink():
    return mat("ink", rough=0.6)


# ---------------------------------------------------------------- primitives
def _finish(obj, coll, material, loc, rot, scale, parent, bevel):
    obj.location = loc
    obj.rotation_euler = [math.radians(a) for a in rot]
    obj.scale = scale
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    if material is not None:
        obj.data.materials.append(material)
    obj.parent = parent
    if bevel:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
        b.limit_method = "ANGLE"
    return obj


def _smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def box(c, p, m, size, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, c, m, loc, rot, (1, 1, 1), p, bevel)


def cyl(c, p, m, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=40, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth)
    o = bpy.context.active_object
    _finish(o, c, m, loc, rot, (1, 1, 1), p, bevel)
    return o


def cone(c, p, m, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=40):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth)
    o = bpy.context.active_object
    _finish(o, c, m, loc, rot, (1, 1, 1), p, 0)
    return _smooth(o)


def ball(c, p, m, r, loc=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r)
    o = bpy.context.active_object
    _finish(o, c, m, loc, (0, 0, 0), scale, p, 0)
    return _smooth(o)


def slab(c, p, m, pts, thick, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.01):
    """A 2D outline drawn in XY, extruded up along Z."""
    me = bpy.data.meshes.new("slab")
    n = len(pts)
    verts = [(x, y, 0) for x, y in pts] + [(x, y, thick) for x, y in pts]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))]
    faces += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("slab", me)
    bpy.context.scene.collection.objects.link(o)
    return _finish(o, c, m, loc, rot, (1, 1, 1), p, bevel)


def mesh(c, p, m, verts, faces, loc=(0, 0, 0), rot=(0, 0, 0), thick=0.02):
    me = bpy.data.meshes.new("mesh")
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("mesh", me)
    bpy.context.scene.collection.objects.link(o)
    _finish(o, c, m, loc, rot, (1, 1, 1), p, 0)
    if thick:
        s = o.modifiers.new("solid", "SOLIDIFY")
        s.thickness = thick
    return o


def sheet(c, p, m, fn, nu=40, nv=4, thick=0.02, loc=(0, 0, 0), rot=(0, 0, 0)):
    """A thin surface (u, v in 0..1 -> xyz), solidified."""
    verts = [fn(i / nu, j / nv) for j in range(nv + 1) for i in range(nu + 1)]
    faces = [[j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i]
             for j in range(nv) for i in range(nu)]
    o = mesh(c, p, m, verts, faces, loc, rot, thick)
    return _smooth(o)


def rod(c, p, m, a, b, r=0.02, verts=12):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(c, p, m, r, d.length, loc=tuple((a + b) / 2), verts=verts)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o


def subtract(target, cutter):
    b = target.modifiers.new("cut", "BOOLEAN")
    b.operation = "DIFFERENCE"
    b.object = cutter
    target.modifiers.move(len(target.modifiers) - 1, 0)
    cutter.hide_render = True
    cutter.hide_viewport = True


def jigsaw_outline(s=0.32, knobs=("E", "N"), sockets=("W",), k=0.15, n=0.075, steps=18, e=0.0):
    """A jigsaw piece outline (CCW), knobs out, sockets in."""
    corners = [(-s, -s), (s, -s), (s, s), (-s, s)]
    names = ["S", "E", "N", "W"]
    pts = []
    for i in range(4):
        A, B = Vector(corners[i]), Vector(corners[(i + 1) % 4])
        d = (B - A).normalized()
        out = Vector((d.y, -d.x))
        side = names[i]
        pts.append(tuple(A))
        sign = 1 if side in knobs else (-1 if side in sockets else 0)
        if not sign:
            continue
        mid = (A + B) / 2
        nn = n - 0.018 if sign > 0 else n        # knobs a touch smaller than sockets: a visible seam
        p1, p2 = mid - d * nn, mid + d * nn
        C = mid + out * (e + sign * k * 0.8)   # e: gap to the true cell edge, so neighbours mesh
        a1 = math.atan2(*(p1 - C).yx)
        a2 = math.atan2(*(p2 - C).yx)
        # of the two ways round, take the one that bulges through the outward side
        d1 = (a2 - a1) % (2 * math.pi)
        best = None
        for d in (d1, d1 - 2 * math.pi):
            m = a1 + d / 2
            if Vector((math.cos(m), math.sin(m))).dot(out * sign) > 0:
                best = d
        a2 = a1 + best
        r = (p1 - C).length
        for j in range(steps + 1):
            a = a1 + (a2 - a1) * j / steps
            pts.append((C.x + math.cos(a) * r, C.y + math.sin(a) * r))
    return pts


# ---------------------------------------------------------------- moments
def build_chapter_complete(c, p):
    """The last jigsaw piece, about to click into place."""
    cols, rows, size, T = 3, 2, 0.7, 0.1
    last = (2, 0)

    def sides(i, j):
        """Each shared edge: one side's knob is the other side's socket."""
        knob = {
            "E": (i + j) % 2 == 0,
            "W": (i - 1 + j) % 2 != 0,
            "N": (i + j) % 2 == 1,
            "S": (i + j - 1) % 2 != 1,
        }
        inside = {"E": i + 1 < cols, "W": i > 0, "N": j + 1 < rows, "S": j > 0}
        kn = [k for k in knob if inside[k] and knob[k]]
        so = [k for k in knob if inside[k] and not knob[k]]
        return kn, so

    for i in range(cols):
        for j in range(rows):
            kn, so = sides(i, j)
            pts = jigsaw_outline(s=size / 2 - 0.02, knobs=kn, sockets=so, e=0.02)
            x, y = (i - (cols - 1) / 2) * size, (j - (rows - 1) / 2) * size
            if (i, j) == last:
                slab(c, p, accent(), pts, T, loc=(x + 0.05, y - 0.12, 0.55), rot=(12, -8, 10), bevel=0.01)
            else:
                slab(c, p, paper(), pts, T, loc=(x, y, 0), bevel=0.01)
    p.rotation_euler = (0, 0, math.radians(8))


def build_revisit(c, p):
    """A winding path, a pin where you left off."""
    def centre(u):
        return Vector((0.75 * math.sin(u * 2.4 * math.pi) * (1 - 0.45 * u), u * 3.6, 0))

    def path(u, v):
        a, b = centre(u), centre(min(u + 0.01, 1.0) if u < 1 else u)
        t = (centre(min(u + 0.01, 1)) - centre(max(u - 0.01, 0))).normalized()
        nrm = Vector((-t.y, t.x, 0))
        w = 0.36 * (1 - 0.5 * u)
        q = a + nrm * (v - 0.5) * w
        return (q.x, q.y, 0.02)
    sheet(c, p, paper(), path, nu=120, nv=2, thick=0.04)
    # dashed centre line on the stretch already walked
    for i in range(6):
        u = 0.03 + i * 0.05
        a, b = centre(u), centre(u + 0.022)
        rod(c, p, ink(), (a.x, a.y, 0.045), (b.x, b.y, 0.045), r=0.012, verts=6)
    # the pin: a teardrop standing where you stopped
    at = centre(0.36)
    pin = bpy.data.objects.new("pin", None)
    c.objects.link(pin)
    pin.parent = p
    pin.location = (at.x, at.y, 0.04)
    cone(c, pin, accent(), 0.0, 0.2, 0.5, loc=(0, 0, 0.25), verts=40)
    ball(c, pin, accent(), 0.2, loc=(0, 0, 0.52))
    cyl(c, pin, paper(), 0.075, 0.42, loc=(0, -0.0, 0.54), rot=(90, 0, 30), verts=32)
    cyl(c, pin, paper(), 0.16, 0.012, loc=(0, 0, 0.006), verts=40)     # its little footprint
    p.rotation_euler = (0, 0, math.radians(-14))


STEPS = [(0.0, 0.0, 0.45), (0.62, 0.32, 0.75), (1.24, 0.64, 1.05), (1.86, 0.96, 1.35), (2.48, 1.28, 1.65)]


def _steps(c, p):
    for x, y, h in STEPS:
        box(c, p, paper(), (0.56, 0.56, 0.06), loc=(x, y, h), bevel=0.01)
        cyl(c, p, paper(), 0.035, h - 0.03, loc=(x, y, (h - 0.03) / 2), verts=16)
    box(c, p, paper(), (3.6, 2.2, 0.03), loc=(1.24, 0.64, 0.015), rot=(0, 0, 0), bevel=0.006)


def build_placement_intro(c, p):
    """Rising stepping posts, a marble waiting at the start."""
    _steps(c, p)
    ball(c, p, accent(), 0.16, loc=(-0.65, -0.45, 0.19))


def build_placement_complete(c, p):
    """The marble come to rest on its own step."""
    _steps(c, p)
    x, y, h = STEPS[2]
    ball(c, p, accent(), 0.16, loc=(x, y, h + 0.03 + 0.16))


def _bound(c, p, loc):
    """An invisible framing point, so a set of scenes shares one frame."""
    e = bpy.data.objects.new("bound", None)
    c.objects.link(e)
    e.parent = p
    e.location = loc


def _tris(c, p, m, tris, thick=0.014):
    for t in tris:
        mesh(c, p, m, list(t), [[0, 1, 2]], thick=thick)


def _empty(c, p, name, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    c.objects.link(e)
    e.parent = p
    e.location = loc
    e.rotation_euler = [math.radians(a) for a in rot]
    return e


def _circle(cx, cy, r, a0, a1, steps):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / steps), cy + r * math.sin(a0 + (a1 - a0) * i / steps))
            for i in range(steps + 1)]


def moon_outline(phase, R=0.8):
    """The lit part only, lit from the right (waxing)."""
    if phase == "full":
        return _circle(0, 0, R, 0, 2 * math.pi, 128)[:-1]
    if phase == "half":
        return _circle(0, 0, R, -math.pi / 2, math.pi / 2, 64) + [(0, R * 0.98), (0, -R * 0.98)][1:]
    # crescent: the outer circle minus a slightly smaller one pushed left
    d, R2 = R * 0.5, R * 0.93
    xi = (R2 * R2 - R * R - d * d) / (2 * d)
    yi = math.sqrt(max(R * R - xi * xi, 0))
    t0 = math.atan2(yi, xi)
    f0 = math.atan2(yi, xi + d)
    outer = _circle(0, 0, R, -t0, t0, 96)
    inner = _circle(-d, 0, R2, f0, -f0, 96)[1:-1]
    return outer + inner


def star_pts(n, r_out, r_in, rot=90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180 / n)
        pts.append((math.cos(a) * r, math.sin(a) * r))
    return pts


def sparkle(r):
    pts = []
    for i in range(8):
        a = math.pi / 2 + i * math.pi / 4
        k = r if i % 2 == 0 else r * 0.28
        pts.append((math.cos(a) * k, math.sin(a) * k))
    return pts


def cloud_outline(base=-0.18, steps=60):
    bumps = [(-0.55, 0.0, 0.26), (-0.2, 0.12, 0.34), (0.2, 0.02, 0.27), (0.5, -0.06, 0.18)]
    x0, x1 = -0.8, 0.68
    top = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        y = base
        for cx, cy, r in bumps:
            if abs(x - cx) < r:
                y = max(y, cy + math.sqrt(r * r - (x - cx) ** 2))
        top.append((x, y))
    return [(x1, base)] + top[::-1] + [(x0, base)]


CRATERS = {
    "full": [(0.24, 0.3, 0.15), (-0.32, -0.08, 0.11), (0.12, -0.38, 0.08), (-0.1, 0.5, 0.06)],
    "half": [(0.3, 0.3, 0.13), (0.42, -0.28, 0.08), (0.14, -0.05, 0.06)],
    "crescent": [(0.6, 0.12, 0.06), (0.5, -0.4, 0.045)],
}


def _moon(c, p, phase):
    # one shared frame for the three phases
    _bound(c, p, (-1.4, 0, 0))
    _bound(c, p, (1.4, 0, 2.3))
    q = _empty(c, p, "moon", loc=(0, 0, 1.2), rot=(90, 0, -18))
    T = 0.16
    slab(c, q, accent(), moon_outline(phase), T, bevel=0.03)
    for x, y, r in CRATERS[phase]:
        cyl(c, q, accent(), r, 0.03, loc=(x, y, T + 0.008), verts=48, bevel=0.008)
    # a paper cloud drifting across the bottom, in front of the moon
    cl = slab(c, q, paper(), cloud_outline(), 0.08, loc=(-0.62, -0.74, T + 0.12), bevel=0.015)
    cl.scale = (0.68, 0.68, 1)
    for x, y, r in ((-1.15, 0.7, 0.13), (1.12, 0.55, 0.09), (0.98, -0.55, 0.11), (-0.95, -0.25, 0.07)):
        slab(c, q, paper(), sparkle(r), 0.03, loc=(x, y, 0.05), bevel=0.004)


def build_result_below(c, p):
    """A thin crescent: the moon is waxing, on its way to full."""
    _moon(c, p, "crescent")


def build_result_at(c, p):
    """Half lit: right where it should be."""
    _moon(c, p, "half")


def build_result_above(c, p):
    """The full moon."""
    _moon(c, p, "full")


def build_welcome_aboard(c, p):
    """A paper kite lifting off."""
    top, left, right, bottom, mid = (0, 0, 1.1), (-0.62, 0, 0.35), (0.62, 0, 0.35), (0, 0, -0.55), (0, -0.16, 0.35)
    kite = bpy.data.objects.new("kite", None)
    c.objects.link(kite)
    kite.parent = p
    kite.location = (0.55, 0, 2.0)
    kite.rotation_euler = (math.radians(-12), math.radians(-22), math.radians(-8))
    mesh(c, kite, paper(), [top, left, mid], [[0, 1, 2]], thick=0.015)
    mesh(c, kite, accent(), [top, mid, right], [[0, 1, 2]], thick=0.015)
    mesh(c, kite, paper(), [left, bottom, mid], [[0, 1, 2]], thick=0.015)
    mesh(c, kite, paper(), [mid, bottom, right], [[0, 1, 2]], thick=0.015)
    # tail and string trail away, curling in the breeze
    bpy.context.view_layer.update()
    start = kite.matrix_world @ Vector(bottom)

    def tail(u, v):
        return (start.x - 0.35 * math.sin(u * 3.0) - 0.15 * u, start.y + (v - 0.5) * 0.03,
                start.z - u * 1.25 + 0.12 * math.sin(u * 6.5))
    sheet(c, p, ink(), tail, nu=60, nv=1, thick=0.012)
    for u in (0.3, 0.6, 0.9):
        x, y, z = tail(u, 0.5)
        mesh(c, p, paper(), [(x, y, z), (x - 0.12, y, z + 0.07), (x - 0.12, y, z - 0.07)], [[0, 1, 2]], thick=0.01)
        mesh(c, p, paper(), [(x, y, z), (x + 0.12, y, z - 0.07), (x + 0.12, y, z + 0.07)], [[0, 1, 2]], thick=0.01)
    s0 = kite.matrix_world @ Vector(mid)

    def string(u, v):
        return (s0.x - u * 2.0, s0.y + (v - 0.5) * 0.02, s0.z - u * 2.0 + 0.4 * math.sin(u * math.pi) * 0.5)
    sheet(c, p, ink(), string, nu=40, nv=1, thick=0.008)


def build_test_ready(c, p):
    """A diving board over a pool: ready to jump in."""
    box(c, p, accent(), (1.7, 1.5, 0.05), loc=(0.55, 0, 0.025), bevel=0.01)       # the pool
    box(c, p, paper(), (2.05, 1.85, 0.03), loc=(0.55, 0, 0.0), bevel=0.006)        # its rim
    box(c, p, paper(), (0.9, 1.0, 0.75), loc=(-0.95, 0, 0.375), bevel=0.012)       # the deck
    box(c, p, paper(), (0.18, 0.3, 0.12), loc=(-0.65, 0, 0.81), bevel=0.008)       # fulcrum
    box(c, p, paper(), (1.55, 0.34, 0.05), loc=(-0.15, 0, 0.9), rot=(0, -2, 0), bevel=0.01)
    p.rotation_euler = (0, 0, math.radians(-4))


def build_empty_chapters(c, p):
    """An empty platform, tracks leading away: the next one is coming."""
    box(c, p, paper(), (3.4, 0.9, 0.36), loc=(0, 0.75, 0.18), bevel=0.01)          # platform
    box(c, p, paper(), (3.4, 0.08, 0.012), loc=(0, 0.34, 0.366), bevel=0)           # its edge line
    box(c, p, paper(), (3.6, 1.0, 0.02), loc=(0, -0.2, 0.01), bevel=0.004)          # track bed
    for i in range(12):
        box(c, p, paper(), (0.08, 0.7, 0.04), loc=(-1.65 + i * 0.3, -0.2, 0.04), bevel=0.004)
    for y in (-0.42, 0.02):
        rod(c, p, ink(), (-1.8, y, 0.075), (1.8, y, 0.075), r=0.02, verts=8)
    # the bench, waiting
    bx, by = -0.35, 0.85
    box(c, p, accent(), (0.8, 0.26, 0.05), loc=(bx, by, 0.36 + 0.24), bevel=0.01)
    box(c, p, accent(), (0.8, 0.05, 0.22), loc=(bx, by + 0.14, 0.36 + 0.42), rot=(-10, 0, 0), bevel=0.01)
    for dx in (-0.32, 0.32):
        box(c, p, accent(), (0.05, 0.22, 0.22), loc=(bx + dx, by, 0.36 + 0.11), bevel=0.006)
    # a lamp post at the far end
    rod(c, p, paper(), (1.25, 0.95, 0.36), (1.25, 0.95, 1.55), r=0.03, verts=10)
    box(c, p, paper(), (0.3, 0.06, 0.04), loc=(1.12, 0.95, 1.55), bevel=0.005)
    box(c, p, paper(), (0.12, 0.12, 0.14), loc=(1.0, 0.95, 1.46), bevel=0.01)


def build_empty_report(c, p):
    """A chart's first bar just starting to rise."""
    box(c, p, paper(), (2.6, 1.0, 0.06), loc=(0, 0, 0.03), bevel=0.01)
    box(c, p, paper(), (2.6, 0.06, 1.5), loc=(0, 0.47, 0.75), bevel=0.01)
    for z in (0.5, 0.9, 1.3):
        box(c, p, paper(), (2.45, 0.012, 0.012), loc=(0, 0.435, z), bevel=0)
    for i in range(5):
        x = -0.96 + i * 0.48
        box(c, p, paper(), (0.32, 0.32, 0.012), loc=(x, 0.0, 0.066), bevel=0)
    box(c, p, accent(), (0.32, 0.32, 0.16), loc=(-0.96, 0.0, 0.06 + 0.08), bevel=0.01)


def build_empty_notifications(c, p):
    """A paper plane parked on the runway: nothing in flight."""
    box(c, p, paper(), (1.0, 3.2, 0.03), loc=(0, 0.2, 0.015), bevel=0.006)
    for i in range(6):
        box(c, p, accent(), (0.06, 0.24, 0.012), loc=(0, -1.15 + i * 0.5, 0.036), bevel=0)
    nose, tail = Vector((0, 0.95, 0.12)), Vector((0, -0.55, 0.16))
    lt, rt = Vector((-0.62, -0.6, 0.3)), Vector((0.62, -0.6, 0.3))
    keel = Vector((0, -0.5, 0.035))
    plane = bpy.data.objects.new("plane", None)
    c.objects.link(plane)
    plane.parent = p
    plane.location = (0.0, 0.1, 0.02)
    plane.rotation_euler = (0, 0, math.radians(18))
    mesh(c, plane, paper(), [nose, lt, tail], [[0, 1, 2]], thick=0.012)
    mesh(c, plane, paper(), [nose, tail, rt], [[0, 1, 2]], thick=0.012)
    mesh(c, plane, paper(), [nose, tail, keel], [[0, 1, 2]], thick=0.012)


def build_not_found(c, p):
    """A door standing alone, open onto nothing."""
    box(c, p, paper(), (2.2, 1.6, 0.03), loc=(0, 0, 0.015), bevel=0.006)
    W, H, t = 0.9, 1.9, 0.08
    for x in (-W / 2 - t / 2, W / 2 + t / 2):
        box(c, p, paper(), (t, 0.14, H), loc=(x, 0, H / 2 + 0.03), bevel=0.008)
    box(c, p, paper(), (W + 2 * t, 0.14, t), loc=(0, 0, H + 0.03 + t / 2), bevel=0.008)
    door = bpy.data.objects.new("door", None)
    c.objects.link(door)
    door.parent = p
    door.location = (W / 2, -0.04, 0.03)
    door.rotation_euler = (0, 0, math.radians(118))
    box(c, door, accent(), (W, 0.05, H), loc=(-W / 2, 0, H / 2), bevel=0.008)
    ball(c, door, paper(), 0.04, loc=(-W + 0.12, 0.05, H * 0.5))
    p.rotation_euler = (0, 0, math.radians(18))


def build_error(c, p):
    """A house of cards, one card slipped out."""
    cw, ch, ct = 0.55, 0.8, 0.018
    lean = 18

    def a_frame(x, z):
        dx = ch / 2 * math.sin(math.radians(lean))
        for side in (-1, 1):
            box(c, p, paper(), (ct, cw, ch), loc=(x + side * dx, 0, z + ch / 2 * math.cos(math.radians(lean))),
                rot=(0, -side * lean, 0), bevel=0.004)

    a_frame(-0.3, 0)
    a_frame(0.3, 0)
    zt = ch * math.cos(math.radians(lean))
    box(c, p, paper(), (1.25, cw, ct), loc=(0, 0, zt + ct / 2), bevel=0.004)
    a_frame(0, zt + ct)
    # the one that slipped, lying flat in front
    box(c, p, accent(), (ch, cw, ct), loc=(0.85, -0.65, ct / 2), rot=(0, 0, 28), bevel=0.004)
    box(c, p, paper(), (2.6, 1.9, 0.02), loc=(0.2, -0.2, -0.01), bevel=0.004)


# ---------------------------------------------------------------- dashboard
def build_stat_streak(c, p):
    """A paper chain, the newest link lime: don't break the chain."""
    n = 5
    for i in range(n):
        x = i * 0.6
        z = 0.5 + 0.35 * math.sin(i / (n - 1) * math.pi * 0.9)
        m = accent() if i == n - 1 else paper()
        ring(c, p, m, 0.33, 0.12, loc=(x, 0, z), rot=(90 if i % 2 else 25, -20 + i * 10, 0), scale=(1.4, 1, 1))


def ring(c, p, m, R, r, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=16)
    o = bpy.context.active_object
    _finish(o, c, m, loc, rot, scale, p, 0)
    return _smooth(o)


# slot -> (builder, (width, height), camera elevation, fit margin)
MOMENTS = {
    "chapter-complete": (build_chapter_complete, (640, 640), 48, 0.09),
    "revisit": (build_revisit, (900, 600), 34, 0.07),
    "placement-intro": (build_placement_intro, (640, 640), 22, 0.08),
    "placement-complete": (build_placement_complete, (640, 640), 22, 0.08),
    "result-above": (build_result_above, (512, 512), 6, 0.08),
    "result-at": (build_result_at, (512, 512), 6, 0.08),
    "result-below": (build_result_below, (512, 512), 6, 0.08),
    "welcome-aboard": (build_welcome_aboard, (640, 640), 14, 0.08),
    "test-ready": (build_test_ready, (512, 512), 24, 0.08),
    "empty-chapters": (build_empty_chapters, (840, 560), 20, 0.07),
    "empty-report": (build_empty_report, (640, 640), 22, 0.08),
    "empty-notifications": (build_empty_notifications, (512, 512), 30, 0.08),
    "not-found": (build_not_found, (840, 560), 18, 0.07),
    "error": (build_error, (840, 560), 20, 0.07),
}

def _ground(c, p, w, d, x=0.0, y=0.0):
    box(c, p, paper(), (w, d, 0.03), loc=(x, y, 0.015), bevel=0.005)


def build_stat_chapters(c, p):
    """Paper honeycomb, the cells filling up as chapters finish."""
    r = 0.3
    cells = [(0, 0), (1, 0), (-1, 0), (0.5, 0.87), (-0.5, 0.87), (0.5, -0.87), (-0.5, -0.87), (1.5, 0.87), (1.5, -0.87)]
    filled = {0, 1, 3, 5}
    for i, (u, v) in enumerate(cells):
        x, y = u * r * 1.78, v * r * 1.78
        h = 0.32 if i in filled else 0.18
        o = cyl(c, p, accent() if i in filled else paper(), r, h, loc=(x, y, h / 2), verts=6, bevel=0.012)
        o.rotation_euler = (0, 0, math.radians(30))


def build_stat_longest(c, p):
    """A trophy cup folded from paper, a lime ribbon tied round it: your best run."""
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.25, radius2=0.62, depth=0.75, end_fill_type="NOTHING")
    cup = bpy.context.active_object
    _finish(cup, c, paper(), (0, 0, 1.12), (0, 0, 22.5), (1, 1, 1), p, 0)
    cup.modifiers.new("solid", "SOLIDIFY").thickness = 0.03
    for side in (-1, 1):
        ring(c, p, paper(), 0.2, 0.04, loc=(side * 0.6, 0, 1.18), rot=(90, 0, 0), scale=(0.8, 1, 1.2))
    cyl(c, p, paper(), 0.08, 0.4, loc=(0, 0, 0.55), verts=8)
    cyl(c, p, paper(), 0.45, 0.14, loc=(0, 0, 0.3), verts=8, bevel=0.01)
    cyl(c, p, paper(), 0.55, 0.1, loc=(0, 0, 0.08), verts=8, bevel=0.01)
    ring(c, p, accent(), 0.43, 0.05, loc=(0, 0, 1.0), scale=(1, 1, 0.6))
    for side in (-1, 1):
        _tris(c, p, accent(), [((0.05 * side, -0.42, 0.98), (0.22 * side, -0.47, 0.62), (0.08 * side, -0.46, 0.66))], thick=0.02)


def build_stat_time(c, p):
    """A tear-off pad of paper days, the top sheet lifting away in lime."""
    box(c, p, paper(), (1.1, 0.9, 0.32), loc=(0, 0, 0.16), bevel=0.012)
    for z in (0.08, 0.16, 0.24):
        box(c, p, paper(), (1.112, 0.912, 0.006), loc=(0, 0, z), bevel=0)
    box(c, p, paper(), (1.12, 0.25, 0.08), loc=(0, 0.33, 0.36), bevel=0.01)          # the binding
    for x in (-0.3, 0.0, 0.3):
        ring(c, p, ink(), 0.07, 0.015, loc=(x, 0.33, 0.42), rot=(0, 90, 0))
    def page(u, v):
        x = (v - 0.5) * 1.06
        y = 0.2 - u * 0.86
        z = 0.33 + 0.45 * (u ** 2) * 0.9
        return (x, y + 0.08 * u ** 2, z)
    sheet(c, p, accent(), page, nu=30, nv=4, thick=0.01)


def build_empty_recent(c, p):
    """An arched garden gate swung wide open, stepping stones curving through and away."""
    _ground(c, p, 2.8, 2.6, y=0.25)
    for side in (-1, 1):                                               # low hedges framing the gate
        box(c, p, paper(), (0.7, 0.3, 0.38), loc=(side * 0.95, 0.12, 0.22), bevel=0.06)
    for x in (-0.5, 0.5):
        box(c, p, paper(), (0.16, 0.16, 1.05), loc=(x, 0, 0.53), bevel=0.012)
    def arch(u, v):
        a = math.pi * u
        return (math.cos(a) * 0.5, (v - 0.5) * 0.12, 1.05 + math.sin(a) * 0.32)
    sheet(c, p, paper(), arch, nu=40, nv=2, thick=0.09)
    g = _empty(c, p, "gate", loc=(0.5, -0.03, 0.06), rot=(0, 0, -64))
    pts = [(0.03, 0.04), (0.92, 0.04)] + [(0.92 - 0.89 * i / 16, 0.78 + 0.1 * math.sin(math.pi * i / 16)) for i in range(17)]
    frame = slab(c, g, paper(), pts, 0.05, loc=(0, 0.025, 0), rot=(90, 0, 0), bevel=0.006)
    hole = slab(c, g, None, [(0.14, 0.16), (0.81, 0.16), (0.81, 0.66), (0.14, 0.66)], 0.3, loc=(0, 0.15, 0), rot=(90, 0, 0), bevel=0)
    subtract(frame, hole)
    for k in range(3):
        box(c, g, paper(), (0.06, 0.04, 0.5), loc=(0.27 + k * 0.2, 0, 0.41), bevel=0.004)
    path = [(0.0, -1.0), (-0.1, -0.5), (0.02, 0.05), (0.18, 0.55), (0.42, 0.98), (0.75, 1.32)]
    for i, (x, y) in enumerate(path):
        cyl(c, p, accent() if i == 0 else paper(), 0.21 - i * 0.02, 0.05, loc=(x, y, 0.055), verts=40, bevel=0.01)





# The dashboard's renders: slot -> (builder, size, elevation, margin, line weight).
# The stats show at 104-150px, so their lines are drawn heavier.
DASHBOARD = {
    "streak": (build_stat_streak, (512, 512), 22, 0.08, 1.45),
    "chapters": (build_stat_chapters, (512, 512), 40, 0.08, 1.45),
    "longest": (build_stat_longest, (512, 512), 16, 0.08, 1.45),
    "time": (build_stat_time, (512, 512), 34, 0.08, 1.45),
    "empty-recent": (build_empty_recent, (900, 600), 22, 0.07, 1.0),
}
SETS = {"moments": "moments", "dashboard": "dashboard"}     # set -> folder under public/student

FIT = 2.4


def _points(coll):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in coll.all_objects:
        if o.type != "MESH" or o.hide_render:
            continue
        ev = o.evaluated_get(dg)
        pts += [o.matrix_world @ Vector(v) for v in ev.bound_box]
    pts += [o.matrix_world.translation.copy() for o in coll.all_objects if o.name.startswith("bound")]
    return pts


def normalise(coll, root):
    bpy.context.view_layer.update()
    pts = _points(coll)
    mn = Vector((min(v.x for v in pts), min(v.y for v in pts), min(v.z for v in pts)))
    mx = Vector((max(v.x for v in pts), max(v.y for v in pts), max(v.z for v in pts)))
    k = FIT / max(mx - mn)
    holder = bpy.data.objects.new(f"{coll.name}_fit", None)
    coll.objects.link(holder)
    root.parent = holder
    centre = (mn + mx) / 2
    holder.scale = (k, k, k)
    holder.location = (-centre.x * k, -centre.y * k, -mn.z * k)
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
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.exposure = EXPOSURE
    sc.render.image_settings.file_format = "WEBP"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = 90

    # soft, bright paper light: mostly sky, one gentle key for the grey side faces
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1.0, 1.0, 0.98, 1.0)
    bg.inputs["Strength"].default_value = 0.85
    sc.world = world
    ld = bpy.data.lights.new("key", "AREA")
    ld.energy = 900
    ld.size = 6
    lo = bpy.data.objects.new("key", ld)
    sc.collection.objects.link(lo)
    lo.location = (-4.5, -5.0, 7.0)
    lo.rotation_euler = (Vector((0, 0, 0.8)) - lo.location).to_track_quat("-Z", "Y").to_euler()

    # ink outlines
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = "ABSOLUTE"
    vl = sc.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.crease_angle = math.radians(130)
    ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new("ink")
    ls.select_by_visibility = True
    ls.visibility = "VISIBLE"
    ls.select_by_edge_types = True
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = True
    ls.select_contour = True
    ls.select_external_contour = True
    style = ls.linestyle or bpy.data.linestyles.new("ink")
    ls.linestyle = style
    style.color = hex_rgb(INK_LINE)
    style.caps = "ROUND"
    style.chaining = "PLAIN"

    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 70
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc


AZIMUTH = -30


def frame(sc, coll, size, elevation, margin, weight=1.0):
    """Aim the camera along (azimuth, elevation) and fit the model with shift."""
    sc.render.resolution_x, sc.render.resolution_y = size
    # ~2px lines at 640 wide, scaled with the frame
    sc.view_layers[0].freestyle_settings.linesets[0].linestyle.thickness = 2.1 * weight * max(size) / 640
    cam = sc.camera
    cam.data.shift_x = cam.data.shift_y = 0.0
    pts = _points(coll)
    centre = sum(pts, Vector()) / len(pts)
    el, az = math.radians(elevation), math.radians(AZIMUTH)
    direction = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    dist = 10.0
    w, h = size
    for _ in range(12):
        cam.location = centre + direction * dist
        cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        ndc = [world_to_camera_view(sc, cam, v) for v in pts]
        x0, x1 = min(v.x for v in ndc), max(v.x for v in ndc)
        y0, y1 = min(v.y for v in ndc), max(v.y for v in ndc)
        dist *= max((x1 - x0) / (1 - 2 * margin), (y1 - y0) / (1 - 2 * margin))
        big = max(w, h)
        cam.data.shift_x += ((x0 + x1) / 2 - 0.5) * w / big
        cam.data.shift_y += ((y0 + y1) / 2 - 0.5) * h / big


def _pixels(path):
    """Raw pixel values of a saved PNG (no colour management: what's in the file is what we get)."""
    import numpy as np
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4), w, h


def _save_raw(px, w, h, path):
    """Write pixel values to a WebP as they are (again no colour management)."""
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.colorspace_settings.name = "Non-Color"
    img.alpha_mode = "STRAIGHT"
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = "WEBP"
    img.save(quality=90)
    bpy.data.images.remove(img)


def render_split(sc, coll, folder, slot):
    """Render a scene as a stack of layers in one frame, so the page can animate each on its own.

    `-base` is everything not in a group. Groups are `accent` (everything lime) and `<name>` for objects named
    `layer_<name>`; their stacking order (bottom to top) is the root's "layer_order" (default: just accent).
    Each layer image is a colour pass in which the groups stacked above it are hidden (they're drawn over it on
    the page anyway), cut out by a coverage mask in which everything below it is holdout, grown a few pixels to
    take in the ink outline. So a layer is hidden exactly where something under it in the stack sits in front,
    and it stays whole where a layer above will cover it (a wheel can turn under the river in front of it)."""
    import numpy as np
    # A copy: changing visibility rebuilds all_objects mid-loop otherwise.
    meshes = [o for o in list(coll.all_objects) if o.type == "MESH" and not o.hide_viewport]
    groups = {}
    for o in meshes:
        if o.name.startswith("layer_"):
            groups.setdefault(o.name[len("layer_"):].split(".")[0], []).append(o)
        elif any(m is not None and m.name == "lime" for m in o.data.materials):
            groups.setdefault("accent", []).append(o)
    root = next((o for o in coll.all_objects if o.name.endswith("_root")), None)
    order = [g for g in (root.get("layer_order", "") if root else "").split(",") if g in groups]
    order += [g for g in groups if g not in order]
    in_group = [o for objs in groups.values() for o in objs]
    tmp = lambda k: os.path.join(bpy.app.tempdir, f"{slot}_{k}.png")
    fmt, samples = sc.render.image_settings.file_format, sc.cycles.samples
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"

    def shoot(key):
        sc.render.filepath = tmp(key)
        bpy.ops.render.render(write_still=True)

    def show(objs, hidden):
        for o in objs:
            o.hide_render = hidden

    show(in_group, True)
    shoot("base")
    for i, name in enumerate(order):
        above = [o for g in order[i + 1:] for o in groups[g]]
        free = name in (root.get("layer_unoccluded", "") if root else "").split(",")
        show(meshes, False)
        show(above, True)
        if free:
            show([o for o in meshes if o not in in_group], True)
        shoot(f"colour_{name}")
        sc.render.use_freestyle = False
        sc.cycles.samples = 16
        for o in meshes:
            if free and o not in in_group:
                o.hide_render = True             # a layer the base never covers: no base cut-outs at all
            else:
                o.is_holdout = o not in groups[name]
        shoot(f"mask_{name}")
        show(meshes, False)
        for o in meshes:
            o.is_holdout = False
        sc.render.use_freestyle = True
        sc.cycles.samples = samples
    show(in_group, False)
    sc.render.image_settings.file_format = fmt
    sc.render.image_settings.color_depth = "8"

    base, w, h = _pixels(tmp("base"))
    _save_raw(base, w, h, os.path.join(folder, f"{slot}-base.webp"))
    r = max(2, round(4 * max(w, h) / 1024))           # about the line width, scaled with the frame
    for name in order:
        colour = _pixels(tmp(f"colour_{name}"))[0]
        mask = _pixels(tmp(f"mask_{name}"))[0][..., 3]
        grown = mask.copy()
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    grown = np.maximum(grown, np.roll(np.roll(mask, dy, axis=0), dx, axis=1))
        layer = colour.copy()
        layer[..., 3] = colour[..., 3] * np.clip(grown, 0.0, 1.0)
        _save_raw(layer, w, h, os.path.join(folder, f"{slot}-{name}.webp"))
    for k in ["base"] + [f"{t}_{n}" for n in order for t in ("colour", "mask")]:
        os.remove(tmp(k))
    print(f"[moments] rendered {folder}/{slot}: base + {', '.join(order)}")


def export_path(sc, coll, folder, slot, size):
    """Empties named pt_<name> mark points the page needs (a wheel's hub, where water pours...); empties named
    path_000, path_001... trace a route. Written in image pixels to <slot>-points.json."""
    import json
    empties = [o for o in coll.all_objects if o.type == "EMPTY"]
    pts = {o.name[3:]: o for o in empties if o.name.startswith("pt_")}
    route = sorted((o for o in empties if o.name.startswith("path_")), key=lambda o: o.name)
    if not pts and not route:
        return
    bpy.context.view_layer.update()
    w, h = size

    def px(o):
        v = world_to_camera_view(sc, sc.camera, o.matrix_world.translation)
        return [round(v.x * w, 1), round((1 - v.y) * h, 1)]
    data = {"width": w, "height": h, "points": {k: px(o) for k, o in pts.items()}, "route": [px(o) for o in route]}
    with open(os.path.join(folder, f"{slot}-points.json"), "w") as f:
        json.dump(data, f, indent=1)


def main():
    sc = reset_scene()
    jobs = [("moments", slot, fn, size, el, margin, 1.0) for slot, (fn, size, el, margin) in MOMENTS.items()]
    jobs += [("dashboard", slot, *spec) for slot, spec in DASHBOARD.items()]
    built = []
    for set_, slot, fn, size, el, margin, weight in jobs:
        if ONLY and slot not in ONLY:
            continue
        coll = bpy.data.collections.new(f"{set_}:{slot}")
        sc.collection.children.link(coll)
        root = bpy.data.objects.new(f"{slot}_root", None)
        coll.objects.link(root)
        fn(coll, root)
        normalise(coll, root)
        built.append((coll, set_, slot, size, el, margin, weight))

    for coll, set_, slot, size, el, margin, weight in built:
        for other, *_ in built:
            other.hide_render = other is not coll
        frame(sc, coll, size, el, margin, weight)
        folder = os.path.join(OUT_ROOT, SETS[set_])
        os.makedirs(folder, exist_ok=True)
        if set_ == "dashboard":
            render_split(sc, coll, folder, slot)
            export_path(sc, coll, folder, slot, size)
        else:
            out = os.path.join(folder, f"{slot}.webp")
            sc.render.filepath = out
            bpy.ops.render.render(write_still=True)
            print(f"[moments] rendered {out}")

    for coll, *_ in built:
        coll.hide_render = False
    if SAVE_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE_BLEND))

main()
