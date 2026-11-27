"""Builds and renders the Student portal's "moment" illustrations in Blender.

Paper-and-ink: stone-sage folded planes, thin ink-green outlines (Freestyle) and a
single lime accent per scene. Each scene is one idea, told with as little as
possible -- no books, bags or clocks, just a shape that carries the feeling:

    chapter-complete     the last jigsaw piece drops and clicks into place (animated)
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
    school-sent          a letter slips into a mailbox, its lime flag swings up
    guardian-linked      a plug pushed home in a power strip, its lime switch clicked on
    link-failed          the lime plug lying out of its socket, the switch off
    device-paired        a plug pushed home in its socket, a lime glow at the join
    device-empty         the socket waiting, its plug lying in front, a small lime light on
    profile-start        a blank luggage tag, the lime eyelet
    invite-parent        an open envelope, a lime card sliding out
    times-up             a candle burned low, its lime flame still lit
    unanswered           a row of envelopes sealed in lime, two still open
    no-subjects          a signpost, one lime arm pointing ahead
    streak-up            a paper chain; its newest lime link swings in and snaps on (animated)
    streak-record        a paper trophy; its lime ribbon drops on and ties tight, it hops (animated)

and the dashboard (public/student/dashboard):

    streak               a paper chain, the newest link lime
    chapters             a paper honeycomb, finished cells filled in lime
    longest              a trophy cup folded from paper, a lime ribbon round it
    time                 a tear-off pad of days, the top sheet lifting away
    empty-recent         an arched garden gate swung open, stepping stones through

The pop-ups (school-sent .. no-subjects) are rendered the same way, as layers, so each can play one small move as
it opens (see MomentArt).
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
    "paper": "#E4E9D6",   # stone sage: calm, a touch grey, so the renders stand off white cards and the lime still leads
    "lime": "#A6CF08",
    "ink": "#1D6315",
    # --tint: pale paper tints borrowed from the hero scene, for secondary parts only (never the story part)
    "wood": "#E9DCC6",
    "clay": "#EBD3C4",
    "teal": "#D5E8E4",
    # the Zoovi logo's own folded-paper colours (used on the English diorama's book covers)
    "logo_dark": "#2A6E22",
    "logo_lime": "#8DB000",
    "logo_gold": "#E0C21E",
    "logo_pale": "#D9E8B4",
    "logo_deep": "#18540C",   # the logo's deepest folds
    "log": "#8A5A34",         # bark, for the camp's logs and frames
    "stone": "#CFCDBD",       # river stones
    "smoke": "#E3E8DA",       # the campfire's smoke: a pale sage, lighter and greener than the stones
    "flame_core": "#FBEB8F",  # a flame's hot pale-yellow heart (the fire stays warm: no lime in it)
    "grass": "#A9C95A",       # the island tops: a soft grass green between the logo's leaf green and the paper   # the leaf green, washed pale: water and large quiet surfaces
}
# The progress stats: each in one logo colour, with the lime constant. --statcol streak=logo_gold,chapters=...
STAT_COL = {"streak": "logo_deep", "chapters": "logo_gold", "longest": "logo_gold", "time": "logo_dark"}
for _kv in filter(None, (_arg("--statcol", "") or "").split(",")):
    _k, _v = _kv.split("=")
    STAT_COL[_k] = _v
ANIMATE = False      # set per job: builders add their hover keyframes only for rendered hover sequences
TINT = "--tint" in argv
# --paper HEX: try the whole set on another paper colour (a warm cream, a pale sage...) instead of white
if "--paper" in argv:
    PALETTE["paper"] = argv[argv.index("--paper") + 1]
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


def tint(name):
    """A secondary part's paper: a pale hero tint (wood, clay, teal) with --tint, plain paper otherwise."""
    return mat(name) if TINT else paper()


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
    """The last jigsaw piece drops and clicks into place (animated; the last frame is the still)."""
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
                piece = slab(c, p, accent(), pts, T, loc=(x, y, 0), bevel=0.01)
                home = (x, y)
            else:
                patch = ("paper", "wood", "teal", "clay", "paper", "wood")[i + j * cols]
                slab(c, p, paper() if patch == "paper" else tint(patch), pts, T, loc=(x, y, 0), bevel=0.01)
    p.rotation_euler = (0, 0, math.radians(8))
    # the move, 22 frames at 24fps: the lime piece drops in, tilting level, lands with a small bounce
    x, y = home
    _bound(c, p, (x + 0.3, y - 0.42, 1.15))
    for f, xyz, rot in ((1, (x + 0.28, y - 0.4, 1.05), (24, -16, 26)),
                        (11, (x + 0.05, y - 0.07, 0.24), (7, -4, 5)),
                        (15, (x, y, 0.0), (0, 0, 0)),
                        (17, (x, y, 0.05), (0, 0, 0)),
                        (19, (x, y, 0.0), (0, 0, 0))):
        _key(piece, "location", f, xyz)
        _key(piece, "rotation_euler", f, tuple(math.radians(r) for r in rot))
    bpy.context.scene.frame_set(1)


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
        # two colours, as in all four stats: the chain in the logo's gold, the newest link lime
        m = accent() if i == n - 1 else mat(STAT_COL["streak"])
        ring(c, p, m, 0.33, 0.12, loc=(x, 0, z), rot=(90 if i % 2 else 25, -20 + i * 10, 0), scale=(1.4, 1, 1))


def ring(c, p, m, R, r, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=16)
    o = bpy.context.active_object
    _finish(o, c, m, loc, rot, scale, p, 0)
    return _smooth(o)


# slot -> (builder, (width, height), camera elevation, fit margin)
MOMENTS = {
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
        # two colours: finished cells lime, the rest the logo's dark green
        m = accent() if i in filled else mat(STAT_COL["chapters"])
        o = cyl(c, p, m, r, h, loc=(x, y, h / 2), verts=6, bevel=0.012)
        o.rotation_euler = (0, 0, math.radians(30))


def build_stat_longest(c, p):
    """A trophy cup folded from paper, a lime ribbon tied round it: your best run."""
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.25, radius2=0.62, depth=0.75, end_fill_type="NOTHING")
    cup = bpy.context.active_object
    _finish(cup, c, mat(STAT_COL["longest"]), (0, 0, 1.12), (0, 0, 22.5), (1, 1, 1), p, 0)
    cup.modifiers.new("solid", "SOLIDIFY").thickness = 0.03
    for side in (-1, 1):
        ring(c, p, mat(STAT_COL["longest"]), 0.2, 0.04, loc=(side * 0.6, 0, 1.18), rot=(90, 0, 0), scale=(0.8, 1, 1.2))
    cyl(c, p, mat(STAT_COL["longest"]), 0.08, 0.4, loc=(0, 0, 0.55), verts=8)
    cyl(c, p, mat(STAT_COL["longest"]), 0.45, 0.14, loc=(0, 0, 0.3), verts=8, bevel=0.01)
    cyl(c, p, mat(STAT_COL["longest"]), 0.55, 0.1, loc=(0, 0, 0.08), verts=8, bevel=0.01)
    ring(c, p, accent(), 0.43, 0.05, loc=(0, 0, 1.0), scale=(1, 1, 0.6))
    for side in (-1, 1):
        _tris(c, p, accent(), [((0.05 * side, -0.42, 0.98), (0.22 * side, -0.47, 0.62), (0.08 * side, -0.46, 0.66))], thick=0.02)


def build_stat_time(c, p):
    """A tear-off pad of paper days, the top sheet lifting away in lime."""
    box(c, p, mat(STAT_COL["time"]), (1.1, 0.9, 0.32), loc=(0, 0, 0.16), bevel=0.012)
    for z in (0.08, 0.16, 0.24):
        box(c, p, mat(STAT_COL["time"]), (1.112, 0.912, 0.006), loc=(0, 0, z), bevel=0)
    box(c, p, mat(STAT_COL["time"]), (1.12, 0.25, 0.08), loc=(0, 0.33, 0.36), bevel=0.01)     # the binding
    for x in (-0.3, 0.0, 0.3):
        ring(c, p, mat(STAT_COL["time"]), 0.07, 0.015, loc=(x, 0.33, 0.42), rot=(0, 90, 0))
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





# ---------------------------------------------------------------- pop-ups (profile, guardian, device, test)
# Each pop-up is rendered as layers (render_split) so the page can play one small move as it opens: the moving part
# is its own layer, named with _layer(); pt_<name> empties mark the pivots the page turns them about.
def _mark():
    return {o.name for o in bpy.data.objects}


def _layer(name, before):
    """Put every mesh made since `before` (a _mark()) on layer `name`."""
    for o in list(bpy.data.objects):
        if o.name not in before and o.type == "MESH" and not o.hide_render:
            o.name = f"layer_{name}"


def _curve(c, p, m, fn, n=40, r=0.018):
    """A round cord along fn(t), t in 0..1, as a mesh (the layer split only sees meshes)."""
    cu = bpy.data.curves.new("cord", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(n - 1)
    for i, pt in enumerate(sp.points):
        x, y, z = fn(i / (n - 1))
        pt.co = (x, y, z, 1)
    o = bpy.data.objects.new("cord", cu)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    for other in bpy.context.selected_objects:
        other.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    return _finish(o, c, m, (0, 0, 0), (0, 0, 0), (1, 1, 1), p, 0)


def _tunnel(W, Hr, z0=0.0, steps=18):
    """A mailbox's end profile (x, z): a flat-bottomed box with a round top."""
    pts = [(-W / 2, z0), (W / 2, z0)]
    pts += [(W / 2 * math.cos(math.pi * i / steps), z0 + Hr + W / 2 * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
    return pts


def _key(o, path, frame, value, index=-1):
    setattr(o, path, value)
    o.keyframe_insert(path, frame=frame, index=index)


def build_school_sent(c, p):
    """A detailed paper mailbox. Its door swings open, a letter slides in, the door shuts, the lime flag swings up:
    your request is on its way. Rendered as a frame sequence (ANIMATED); the last frame is the still."""
    W, Hr, L = 0.56, 0.3, 1.1                     # width, height of the straight sides, length
    Zb = 1.05                                      # the box's floor
    # ground: a paver and a few tufts of paper grass round the post
    _ground(c, p, 1.5, 1.4, y=-0.1)
    box(c, p, tint("clay"), (0.5, 0.5, 0.035), loc=(0, 0, 0.032), bevel=0.008)
    for (gx, gy, k) in ((-0.42, -0.35, 3), (0.38, -0.5, 2), (0.45, 0.35, 3)):
        for j in range(k):
            cone(c, p, tint("teal"), 0.028, 0.0, 0.2 + 0.05 * j, loc=(gx + 0.04 * j, gy + 0.02 * j, 0.12), rot=(12 - 12 * j, -14 + 14 * j, 0))
    # post, braces, and the board the box sits on
    box(c, p, tint("wood"), (0.15, 0.15, Zb - 0.05), loc=(0, 0, (Zb - 0.05) / 2), bevel=0.012)
    for s in (-1, 1):
        rod(c, p, tint("wood"), (0, s * 0.06, Zb - 0.42), (0, s * 0.34, Zb - 0.06), r=0.024, verts=8)
    box(c, p, tint("wood"), (W + 0.08, L * 0.82, 0.05), loc=(0, 0.02, Zb - 0.025), bevel=0.01)
    # the box: one hollow tunnel with a back wall, two raised ribs round it
    body = slab(c, p, paper(), _tunnel(W, Hr, Zb), L, loc=(0, L / 2, 0), rot=(90, 0, 0), bevel=0.012)
    hollow = slab(c, p, None, _tunnel(W - 0.06, Hr - 0.03, Zb + 0.03), L, loc=(0, L / 2 - 0.05, 0), rot=(90, 0, 0), bevel=0)
    subtract(body, hollow)
    for y0 in (-0.3, 0.32):
        rib = slab(c, p, paper(), _tunnel(W + 0.035, Hr + 0.005, Zb - 0.012), 0.04, loc=(0, y0 + 0.02, 0), rot=(90, 0, 0), bevel=0.006)
        core = slab(c, p, None, _tunnel(W - 0.004, Hr, Zb - 0.05), 0.3, loc=(0, y0 + 0.15, 0), rot=(90, 0, 0), bevel=0)
        subtract(rib, core)
    box(c, p, paper(), (0.014, 0.3, 0.13), loc=(-W / 2 - 0.012, 0.12, Zb + 0.17), bevel=0.012)     # a blank name plate
    # the door, on its hinge along the bottom front edge
    hinge = _empty(c, p, "hinge", loc=(0, -L / 2, Zb))
    slab(c, hinge, paper(), _tunnel(W - 0.01, Hr - 0.005, 0.005), 0.03, loc=(0, 0, 0), rot=(90, 0, 0), bevel=0.008)
    slab(c, hinge, paper(), _tunnel(W - 0.16, Hr - 0.09, 0.07), 0.012, loc=(0, -0.03, 0), rot=(90, 0, 0), bevel=0.004)   # its panel
    cyl(c, hinge, paper(), 0.035, 0.07, loc=(0, -0.07, Hr + W / 2 - 0.07), rot=(90, 0, 0), verts=20, bevel=0.006)      # the latch
    # the flag, on its pivot at the side
    piv = (W / 2 + 0.035, 0.3, Zb + 0.2)
    cyl(c, p, paper(), 0.05, 0.04, loc=piv, rot=(0, 90, 0), verts=20, bevel=0.005)
    arm = _empty(c, p, "flagarm", loc=(piv[0] + 0.03, piv[1], piv[2]))
    rod(c, arm, accent(), (0, 0, 0), (0, 0, 0.66), r=0.026, verts=10)
    slab(c, arm, accent(), [(0, 0), (0.36, 0), (0.3, 0.1), (0.36, 0.2), (0, 0.2)], 0.035, loc=(0.0175, 0.0, 0.44), rot=(90, 0, -90), bevel=0.006)
    # the letter
    let = _empty(c, p, "letter", loc=(0, 0, 0))
    box(c, let, paper(), (0.3, 0.42, 0.014), loc=(0, 0, 0), bevel=0.004)
    mesh(c, let, paper(), [(-0.15, -0.21, 0.009), (0.15, -0.21, 0.009), (0, -0.04, 0.009)], [[0, 1, 2]], thick=0.004)
    # framing: the frame holds the letter's start, the open door and the raised flag
    _bound(c, p, (-1.2, -L / 2 - 0.5, Zb + 0.66))
    _bound(c, p, (0, -L / 2 - 0.6, Zb - 0.1))
    _bound(c, p, (piv[0], piv[1], piv[2] + 0.75))

    # the move, 26 frames at 24fps
    for f, ang in ((1, 0), (4, 0), (9, 102), (14, 102), (19, 0), (21, 5), (23, 0)):
        _key(hinge, "rotation_euler", f, (math.radians(ang), 0, 0), index=0)
    for f, xyz, rot in ((1, (-1.05, -L / 2 - 0.45, Zb + 0.52), (-10, 24, -55)),
                        (5, (-0.62, -L / 2 - 0.62, Zb + 0.4), (-6, 12, -30)),
                        (10, (0, -L / 2 - 0.34, Zb + 0.17), (0, 0, 0)),
                        (14, (0, 0.05, Zb + 0.12), (0, 0, 0))):
        _key(let, "location", f, xyz)
        _key(let, "rotation_euler", f, tuple(math.radians(a) for a in rot))
    for f, ang in ((1, 92), (17, 92), (22, -10), (24, 4), (26, 0)):
        _key(arm, "rotation_euler", f, (math.radians(ang), 0, 0), index=0)
    bpy.context.scene.frame_set(1)


def _shown(o, frames_on):
    """Key an object's visibility: frames_on is [(frame, visible), ...] (constant steps)."""
    for f, on in frames_on:
        o.hide_render = not on
        o.keyframe_insert("hide_render", frame=f)


def _strip(c, p):
    """A chunky paper power strip lying on the ground, its socket at the left end and its rocker switch on top.
    Returns the two rockers: paper (off) and lime (on), for the scene to show one or the other."""
    _ground(c, p, 2.9, 1.4, x=-0.2)
    box(c, p, paper(), (1.3, 0.62, 0.4), loc=(0.35, 0, 0.2), bevel=0.06)
    for y in (-0.12, 0.12):
        box(c, p, ink(), (0.03, 0.06, 0.15), loc=(-0.305, y, 0.21), bevel=0.004)          # the socket's slots
    box(c, p, paper(), (0.38, 0.3, 0.05), loc=(0.68, 0, 0.42), bevel=0.01)                # switch housing
    off = box(c, p, paper(), (0.3, 0.22, 0.09), loc=(0.68, 0, 0.47), rot=(0, 14, 0), bevel=0.015)
    on = box(c, p, accent(), (0.3, 0.22, 0.09), loc=(0.68, 0, 0.47), rot=(0, -14, 0), bevel=0.015)
    _curve(c, p, paper(), lambda t: (1.0 + 0.55 * t, 0.42 * t ** 1.5, 0.2 * (1 - t) + 0.05), r=0.06)
    return off, on


def _plug(c, p, m, loc, yaw, prongs):
    """A chunky plug with its cable (the cable rides with it)."""
    pl = _empty(c, p, "plug", loc=loc, rot=(0, 0, yaw))
    box(c, pl, m, (0.5, 0.44, 0.38), loc=(0, 0, 0), bevel=0.08)
    if prongs:
        for y in (-0.12, 0.12):
            box(c, pl, paper(), (0.24, 0.05, 0.11), loc=(0.36, y, 0.0), bevel=0.008)
    box(c, pl, m, (0.14, 0.24, 0.22), loc=(-0.31, 0, 0), bevel=0.04)                     # the strain relief
    drop = loc[2] - 0.05
    _curve(c, pl, paper(), lambda t: (-0.38 - 0.7 * t, -0.5 * math.sin(t * 1.4), -drop * (1 - (1 - t) ** 2)), r=0.06)
    return pl


def _move(o, keys):
    """keys: [(frame, (x, y, z), yaw_degrees), ...]"""
    for f, xyz, yaw in keys:
        _key(o, "location", f, xyz)
        _key(o, "rotation_euler", f, (0, 0, math.radians(yaw)))


def build_guardian_linked(c, p):
    """A plug slides into a power strip and its lime switch clicks on: you're connected (animated)."""
    off, on = _strip(c, p)
    pl = _plug(c, p, paper(), (-0.55, 0, 0.2), 0, prongs=False)
    _bound(c, p, (-2.25, -1.0, 0.45))
    _move(pl, [(1, (-1.4, -0.38, 0.2), 24), (11, (-0.5, 0, 0.2), 0), (13, (-0.55, 0, 0.2), 0)])
    _shown(off, [(1, True), (14, False)])
    _shown(on, [(1, False), (14, True)])
    for f, a in ((14, -2), (16, -19), (18, -14)):
        _key(on, "rotation_euler", f, (0, math.radians(a), 0))
    bpy.context.scene.frame_set(1)


def build_link_failed(c, p):
    """The lime plug lunges at the socket, falls short and drops back: that didn't connect, try again (animated)."""
    off, on = _strip(c, p)
    _shown(on, [(1, False)])
    pl = _plug(c, p, accent(), (-1.15, -0.4, 0.2), 20, prongs=True)
    _bound(c, p, (-2.1, -1.1, 0.45))
    _move(pl, [(1, (-1.15, -0.4, 0.2), 20), (8, (-0.84, -0.1, 0.2), 4), (10, (-0.9, -0.15, 0.2), 9),
               (16, (-1.15, -0.4, 0.2), 22), (18, (-1.13, -0.38, 0.2), 18), (20, (-1.15, -0.4, 0.2), 20)])
    bpy.context.scene.frame_set(1)


def _socket(c, p):
    box(c, p, paper(), (0.95, 0.12, 0.95), loc=(0, 0.35, 0.55), bevel=0.03)          # the wall plate, standing
    for x in (-0.13, 0.13):
        box(c, p, ink(), (0.05, 0.02, 0.16), loc=(x, 0.285, 0.58), bevel=0.004)     # its two slots
    box(c, p, paper(), (1.4, 0.25, 0.08), loc=(0, 0.35, 0.04), bevel=0.01)           # its foot


def build_device_paired(c, p):
    """A paper plug pushes home in its socket and a lime glow pops at the join: paired (animated)."""
    _ground(c, p, 2.0, 1.8, y=-0.2)
    _socket(c, p)
    dp = _empty(c, p, "dplug", loc=(0, 0.08, 0.58))
    box(c, dp, paper(), (0.42, 0.38, 0.42), loc=(0, 0, 0), bevel=0.06)
    _curve(c, dp, paper(), lambda t: (0.25 * math.sin(t * 2.2), -0.19 - 0.9 * t, -0.5 * t), r=0.05)
    glow = ring(c, p, accent(), 0.33, 0.035, loc=(0, 0.27, 0.58), rot=(90, 0, 0))
    _bound(c, p, (0, -1.0, 0.4))
    for f, y in ((1, -0.72), (11, 0.11), (13, 0.08)):
        _key(dp, "location", f, (0, y, 0.58))
    for f, k in ((1, 0.001), (12, 0.001), (16, 1.25), (19, 1.0)):
        _key(glow, "scale", f, (k, k, k))
    bpy.context.scene.frame_set(1)


def build_device_empty(c, p):
    """The socket waiting, its plug lying in front, its small lime light blinking: ready when you are (animated)."""
    _ground(c, p, 2.0, 1.8, y=-0.2)
    _socket(c, p)
    light = ball(c, p, accent(), 0.055, loc=(0.32, 0.28, 0.9))                         # the waiting light
    _shown(light, [(1, True), (5, False), (9, True), (13, False), (17, True)])
    plug = _empty(c, p, "plug", loc=(-0.25, -0.45, 0.17), rot=(0, 0, 35))
    box(c, plug, paper(), (0.42, 0.38, 0.3), loc=(0, 0, 0), bevel=0.06)
    for x in (-0.13, 0.13):
        box(c, plug, paper(), (0.05, 0.2, 0.05), loc=(x, 0.28, 0.0), bevel=0.006)    # its prongs
    _curve(c, p, paper(), lambda t: (-0.4 - 0.45 * t + 0.2 * math.sin(t * 5), -0.6 - 0.35 * t, 0.17 * (1 - t) + 0.05), r=0.05)
    bpy.context.scene.frame_set(1)


def build_profile_start(c, p):
    """A blank luggage tag on its string, the lime eyelet: your tag for the journey (it swings as it appears)."""
    p["layer_order"] = "tag"
    _ground(c, p, 1.8, 1.2, y=0.1)
    m = _mark()
    tag = _empty(c, p, "tag", loc=(0, 0, 0.6), rot=(72, 0, -18))
    pts = [(-0.55, -0.32), (0.4, -0.32), (0.62, -0.12), (0.62, 0.12), (0.4, 0.32), (-0.55, 0.32)]
    plate = slab(c, tag, paper(), pts, 0.03, bevel=0.006)
    hole = cyl(c, tag, None, 0.06, 0.3, loc=(0.42, 0, 0))
    subtract(plate, hole)
    ring(c, tag, accent(), 0.085, 0.028, loc=(0.42, 0, 0.03), scale=(1, 1, 0.6))
    for y in (-0.12, 0.0, 0.12):
        box(c, tag, paper(), (0.62, 0.012, 0.01), loc=(-0.15, y, 0.035), bevel=0)    # blank lines to fill in
    _layer("tag", m)
    bpy.context.view_layer.update()
    eye = p.matrix_world.inverted() @ (tag.matrix_world @ Vector((0.42, 0, 0.03)))
    _empty(c, p, "pt_profile_eye", loc=tuple(eye))
    _curve(c, p, ink(), lambda t: (eye.x + 0.5 * t, eye.y - 0.15 * math.sin(t * math.pi), max(0.04, eye.z + 0.25 * math.sin(t * math.pi) - eye.z * t)), r=0.012)


def build_invite_parent(c, p):
    """A lime card slides up out of an open paper envelope: an invitation."""
    p["layer_order"] = "card,pocket"
    _ground(c, p, 2.0, 1.4, y=0.35)
    env = _empty(c, p, "env", loc=(0, 0, 0.02), rot=(62, 0, 0))
    W, H = 1.5, 0.95
    box(c, env, paper(), (W, H, 0.04), loc=(0, H / 2, 0), bevel=0.008)                # the body
    mesh(c, env, paper(), [(-W / 2, H, -0.01), (W / 2, H, -0.01), (0, H + 0.5, -0.2)], [[0, 1, 2]], thick=0.012)   # flap, open
    m = _mark()
    box(c, env, accent(), (W - 0.18, H * 0.95, 0.02), loc=(0, H * 0.82, 0.035), bevel=0.006)   # the card, half out
    for y in (0.95, 1.07):
        box(c, env, paper(), (W * 0.5, 0.025, 0.006), loc=(-0.1, y, 0.047), bevel=0)  # blank lines on the card
    _layer("card", m)
    m = _mark()
    mesh(c, env, paper(), [(-W / 2, 0, 0.06), (W / 2, 0, 0.06), (0, H * 0.5, 0.06)], [[0, 1, 2]], thick=0.012)
    mesh(c, env, paper(), [(-W / 2, 0, 0.06), (-W / 2, H, 0.06), (0, H * 0.5, 0.06)], [[0, 1, 2]], thick=0.012)
    mesh(c, env, paper(), [(W / 2, 0, 0.06), (W / 2, H, 0.06), (0, H * 0.5, 0.06)], [[0, 1, 2]], thick=0.012)
    _layer("pocket", m)


def build_times_up(c, p):
    """A paper candle burned low, its lime flame still lit (it flickers): time's up, calmly."""
    cyl(c, p, paper(), 0.62, 0.06, loc=(0, 0, 0.03), verts=48, bevel=0.01)             # the dish
    ring(c, p, paper(), 0.62, 0.035, loc=(0, 0, 0.07))
    ring(c, p, paper(), 0.14, 0.035, loc=(0.72, 0, 0.06), rot=(90, 0, 0))              # its handle
    cyl(c, p, paper(), 0.24, 0.22, loc=(0, 0, 0.17), verts=40, bevel=0.012)            # the candle, short now
    ball(c, p, paper(), 0.07, loc=(0.2, -0.12, 0.2), scale=(0.7, 0.7, 1.4))            # a drip
    rod(c, p, ink(), (0, 0, 0.28), (0.01, 0, 0.36), r=0.012, verts=8)                  # wick
    ball(c, p, accent(), 0.08, loc=(0.01, 0, 0.47), scale=(1, 1, 1.9))                 # flame
    cone(c, p, accent(), 0.07, 0.0, 0.16, loc=(0.01, 0, 0.6))
    _empty(c, p, "pt_times_wick", loc=(0.01, 0, 0.34))


def build_unanswered(c, p):
    """A row of paper envelopes, sealed in lime, two still open: a few left."""
    W, H = 0.62, 0.42
    for i in range(5):
        x = -1.4 + i * 0.7
        e = _empty(c, p, f"env{i}", loc=(x, 0.06 * (i % 2), 0.02), rot=(0, 0, -6 + 3 * i))
        box(c, e, paper(), (W, H, 0.03), loc=(0, 0, 0.015), bevel=0.006)
        if i in (1, 3):
            mesh(c, e, paper(), [(-W / 2, H / 2, 0.03), (W / 2, H / 2, 0.03), (0, H / 2 + 0.05, 0.36)], [[0, 1, 2]], thick=0.01)
        else:
            mesh(c, e, paper(), [(-W / 2, H / 2, 0.035), (W / 2, H / 2, 0.035), (0, -0.05, 0.035)], [[0, 1, 2]], thick=0.01)
            cyl(c, e, accent(), 0.07, 0.025, loc=(0, -0.05, 0.05), verts=32, bevel=0.005)


def build_no_subjects(c, p):
    """A paper signpost, one lime arm pointing ahead (it swings round as it appears): connect a school to start."""
    cyl(c, p, paper(), 0.85, 0.06, loc=(0, 0, 0.03), verts=64, bevel=0.01)
    box(c, p, paper(), (0.12, 0.12, 1.7), loc=(0, 0, 0.88), bevel=0.01)
    def arm(m, z, rot, length):
        a = _empty(c, p, "arm", loc=(0, 0, z), rot=(0, 0, rot))
        pts = [(0.0, -0.13), (length, -0.13), (length + 0.17, 0.0), (length, 0.13), (0.0, 0.13)]
        slab(c, a, m, pts, 0.05, loc=(0.02, 0.06, 0), rot=(90, 0, 0), bevel=0.006)
    arm(accent(), 1.45, 25, 0.75)
    arm(paper(), 1.12, 160, 0.55)
    _empty(c, p, "pt_nosubjects_arm", loc=(0, 0, 1.45))


def build_streak_up(c, p):
    """A paper chain; the newest link, lime, swings in and snaps on: another day in a row (animated)."""
    n = 5
    for i in range(n):
        x = i * 0.6
        z = 0.5 + 0.35 * math.sin(i / (n - 1) * math.pi * 0.9)
        rot = (90 if i % 2 else 25, -20 + i * 10, 0)
        if i < n - 1:
            ring(c, p, paper(), 0.33, 0.12, loc=(x, 0, z), rot=rot, scale=(1.4, 1, 1))
            continue
        link = ring(c, p, accent(), 0.33, 0.12, loc=(x, 0, z), rot=rot, scale=(1.4, 1, 1))
        _bound(c, p, (x + 0.75, 0, z + 0.7))
        r0 = tuple(math.radians(a) for a in rot)
        for f, dx, dz, k, twist in ((1, 0.6, 0.5, 0.45, 70), (10, 0.0, 0.0, 1.1, -6), (13, 0.0, 0.0, 0.95, 3), (15, 0, 0, 1.0, 0)):
            _key(link, "location", f, (x + dx, 0, z + dz))
            _key(link, "scale", f, (1.4 * k, k, k))
            _key(link, "rotation_euler", f, (r0[0], r0[1], r0[2] + math.radians(twist)))
    bpy.context.scene.frame_set(1)


def build_streak_record(c, p):
    """The paper trophy; its lime ribbon drops over it and ties tight, and it gives a proud little hop: your best run
    yet (animated)."""
    trophy = _empty(c, p, "trophy")
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.25, radius2=0.62, depth=0.75, end_fill_type="NOTHING")
    cup = bpy.context.active_object
    _finish(cup, c, paper(), (0, 0, 1.12), (0, 0, 22.5), (1, 1, 1), trophy, 0)
    cup.modifiers.new("solid", "SOLIDIFY").thickness = 0.03
    for side in (-1, 1):
        ring(c, trophy, paper(), 0.2, 0.04, loc=(side * 0.6, 0, 1.18), rot=(90, 0, 0), scale=(0.8, 1, 1.2))
    cyl(c, trophy, paper(), 0.08, 0.4, loc=(0, 0, 0.55), verts=8)
    cyl(c, trophy, paper(), 0.45, 0.14, loc=(0, 0, 0.3), verts=8, bevel=0.01)
    cyl(c, trophy, paper(), 0.55, 0.1, loc=(0, 0, 0.08), verts=8, bevel=0.01)
    band = _empty(c, trophy, "band", loc=(0, 0, 1.0))
    ring(c, band, accent(), 0.43, 0.05, loc=(0, 0, 0), scale=(1, 1, 0.6))
    tails = _empty(c, band, "tails", loc=(0, -0.43, -0.02))
    for side in (-1, 1):
        _tris(c, tails, accent(), [((0.05 * side, 0.01, 0.0), (0.22 * side, -0.04, -0.36), (0.08 * side, -0.03, -0.32))], thick=0.02)
    _bound(c, p, (0.75, 0.75, 1.95))
    _bound(c, p, (-0.75, -0.75, 1.95))
    for f, z, k in ((1, 1.75, 1.65), (12, 1.0, 0.98), (14, 1.0, 0.92), (16, 1.0, 1.0)):
        _key(band, "location", f, (0, 0, z))
        _key(band, "scale", f, (k, k, k))
    for f, k in ((1, 0.001), (14, 0.001), (19, 1.12), (21, 1.0)):
        _key(tails, "scale", f, (k, k, k))
    for f, z in ((1, 0.0), (15, 0.0), (18, 0.12), (21, 0.0), (23, 0.02), (24, 0.0)):
        _key(trophy, "location", f, (0, 0, z))
    bpy.context.scene.frame_set(1)


# Pop-ups and confirmations, rendered as layers (into public/student/moments): slot -> (builder, size, elevation, margin)
POPUPS = {
    "profile-start": (build_profile_start, (512, 512), 30, 0.08),
    "invite-parent": (build_invite_parent, (512, 512), 22, 0.08),
    "times-up": (build_times_up, (512, 512), 22, 0.08),
    "unanswered": (build_unanswered, (640, 512), 34, 0.08),
    "no-subjects": (build_no_subjects, (512, 512), 18, 0.08),
}


# ---------------------------------------------------------------- subject dioramas
# Each subject is a small paper world on the same folded plinth, so the row reads as a set; its one lime part is
# the subject's spark (and its hover layer). No letters or numbers as decoration.
def _tufts(c, p, r, z, n=7, seed=0.0):
    """Little paper grass tufts round an island's rim."""
    for k in range(n):
        a = seed + 2 * math.pi * k / n + 0.3 * math.sin(k * 2.1)
        x, y = math.cos(a) * r, math.sin(a) * r
        for j in range(3):
            cone(c, p, mat("logo_dark"), 0.022, 0.0, 0.11 + 0.04 * j, loc=(x + 0.03 * (j - 1), y + 0.02 * (j - 1), z + 0.05 + 0.02 * j),
                 rot=(14 * (j - 1), -10 * (j - 1), 0), verts=5)


def _plinth(c, p, r=1.25):
    """The shared base: a low octagonal paper plinth, its top folded layer grass green, tufts round the rim."""
    cyl(c, p, paper(), r, 0.16, loc=(0, 0, 0.08), verts=8, bevel=0.012).rotation_euler = (0, 0, math.radians(22.5))
    cyl(c, p, mat("grass"), r - 0.1, 0.05, loc=(0, 0, 0.185), verts=8, bevel=0.006).rotation_euler = (0, 0, math.radians(22.5))
    _tufts(c, p, r - 0.22, 0.21, seed=0.4)
    return 0.21                                                          # the top surface


def _book(c, p, w, d, h, loc, yaw=0.0, m=None):
    """A closed book lying flat: its cover, and the page block showing on the open side."""
    b = _empty(c, p, "book", loc=loc, rot=(0, 0, yaw))
    box(c, b, m or paper(), (w, d, h), loc=(0, 0, h / 2), bevel=0.01)
    box(c, b, paper(), (w * 0.9, d * 0.94, h * 0.72), loc=(w * 0.07, 0, h / 2), bevel=0.004)
    return b


def build_english_b(c, p):
    """Pop-up story stage: an open book whose pages fold up into a little paper theatre, its lime curtains parting."""
    z = _plinth(c, p)
    for s in (-1, 1):                                                    # the open book, a shallow V
        box(c, p, paper(), (0.92, 1.2, 0.06), loc=(s * 0.47, 0, z + 0.06), rot=(0, s * -6, 0), bevel=0.01)
        box(c, p, paper(), (0.86, 1.14, 0.03), loc=(s * 0.46, 0, z + 0.1), rot=(0, s * -6, 0), bevel=0.004)
    zf = z + 0.12
    box(c, p, paper(), (1.1, 0.5, 0.06), loc=(0, -0.2, zf + 0.03), bevel=0.008)                 # the stage floor
    arch = ([(-0.55, 0)] + [(0.55 * math.cos(math.pi - math.pi * i / 16), 0.95 + 0.25 * math.sin(math.pi * i / 16)) for i in range(17)] + [(0.55, 0)])[::-1]
    back = slab(c, p, paper(), [(-0.62, 0), (0.62, 0), (0.62, 1.32), (-0.62, 1.32)], 0.05, loc=(0, 0.08, zf), rot=(90, 0, 0), bevel=0.006)
    hole = slab(c, p, None, arch, 0.4, loc=(0, 0.3, zf + 0.06), rot=(90, 0, 0), bevel=0)
    subtract(back, hole)
    slab(c, p, paper(), [(-0.5, 0), (0.5, 0), (0.5, 0.8), (-0.5, 0.8)], 0.03, loc=(0, 0.45, zf), rot=(90, 0, 0), bevel=0.004)   # backdrop
    for x in (-0.2, 0.25):                                               # backdrop hills
        cone(c, p, paper(), 0.22, 0.0, 0.32, loc=(x, 0.38, zf + 0.16), verts=4)
    for s in (-1, 1):                                                    # wings
        box(c, p, paper(), (0.06, 0.3, 0.9), loc=(s * 0.66, -0.05, zf + 0.45), rot=(0, 0, s * 18), bevel=0.006)
        def curtain(u, v, s=s):
            x = s * (0.56 - (0.34 - 0.14 * v) * u)                         # gathered low, full at the top
            return (x, -0.02 + 0.035 * math.sin(u * 11), zf + 0.06 + v * 1.12)
        sheet(c, p, accent(), curtain, nu=40, nv=3, thick=0.012)
    ball(c, p, paper(), 0.07, loc=(0.05, -0.22, zf + 0.13), scale=(1, 1, 1.4))                   # a little actor
    cone(c, p, paper(), 0.07, 0.0, 0.14, loc=(0.05, -0.22, zf + 0.28))


def build_english_c(c, p):
    """Word tree: a paper tree whose leaves are folded tiles, one lime leaf unfolding."""
    z = _plinth(c, p)
    cone(c, p, paper(), 0.14, 0.07, 1.0, loc=(0, 0, z + 0.5), verts=10)
    branches = [((0, 0, z + 0.7), (-0.45, 0.05, z + 1.15)), ((0, 0, z + 0.8), (0.42, -0.05, z + 1.25)), ((0, 0, z + 0.95), (0.05, 0.1, z + 1.45))]
    for a, b in branches:
        rod(c, p, paper(), a, b, r=0.035, verts=8)
    pts = []
    for i in range(26):
        a = i * 2.4
        rr = 0.18 + 0.42 * ((i * 7) % 9) / 8
        pts.append((math.cos(a) * rr * 1.15, math.sin(a) * rr * 0.65, z + 1.0 + 0.6 * ((i * 5) % 11) / 10 - 0.25 * (rr - 0.2)))
    for i, (x, y, zz) in enumerate(pts):
        m = accent() if i == 9 else paper()
        s = 0.2 if i != 9 else 0.26
        tile = _empty(c, p, "leaf", loc=(x, y, zz), rot=(20 + (i * 37) % 40, (i * 53) % 60 - 30, (i * 71) % 180))
        fold = 18 if i != 9 else 50
        mesh(c, tile, m, [(0, -s, 0), (s, 0, 0), (0, s, 0)], [[0, 1, 2]], thick=0.012)
        mesh(c, tile, m, [(0, -s, 0), (0, s, 0), (-s * math.cos(math.radians(fold)), 0, s * math.sin(math.radians(fold)))], [[0, 1, 2]], thick=0.012)
    for k in range(3):                                                   # fallen tiles at the foot
        mesh(c, p, paper(), [(-0.5 + k * 0.4, -0.55, z + 0.01), (-0.38 + k * 0.4, -0.5, z + 0.01), (-0.45 + k * 0.4, -0.4, z + 0.01)], [[0, 1, 2]], thick=0.01)


def build_maths_a(c, p):
    """Shape town: houses built from paper solids, and an arch gateway whose lime keystone completes it."""
    z = _plinth(c, p)
    box(c, p, paper(), (0.42, 0.42, 0.42), loc=(-0.6, 0.25, z + 0.21), bevel=0.01)              # cube house
    cone(c, p, paper(), 0.34, 0.0, 0.32, loc=(-0.6, 0.25, z + 0.58), rot=(0, 0, 45), verts=4)
    box(c, p, paper(), (0.08, 0.02, 0.14), loc=(-0.6, 0.035, z + 0.07), bevel=0)               # door
    cyl(c, p, paper(), 0.17, 0.75, loc=(0.55, 0.35, z + 0.375), verts=24)                       # cylinder tower
    cone(c, p, paper(), 0.21, 0.0, 0.3, loc=(0.55, 0.35, z + 0.9), verts=24)
    pr = cyl(c, p, paper(), 0.2, 0.5, loc=(0.0, 0.5, z + 0.1), rot=(90, -90, 0), verts=3, bevel=0.008)   # prism shed
    cyl(c, p, paper(), 0.04, 0.3, loc=(0.85, -0.25, z + 0.15), verts=10)                       # sphere tree
    ball(c, p, paper(), 0.2, loc=(0.85, -0.25, z + 0.45))
    cyl(c, p, paper(), 0.035, 0.25, loc=(-0.95, -0.2, z + 0.12), verts=10)
    cone(c, p, paper(), 0.17, 0.0, 0.42, loc=(-0.95, -0.2, z + 0.42), verts=12)                 # cone tree
    # the arch gateway at the front: two pillars, two voussoirs, the lime keystone on top
    for s in (-1, 1):
        box(c, p, paper(), (0.2, 0.22, 0.62), loc=(s * 0.36, -0.45, z + 0.31), bevel=0.01)
        box(c, p, paper(), (0.26, 0.22, 0.14), loc=(s * 0.23, -0.45, z + 0.69), rot=(0, s * -24, 0), bevel=0.01)
    mesh(c, p, accent(), [(-0.12, -0.56, z + 0.88), (0.12, -0.56, z + 0.88), (0.075, -0.56, z + 0.7), (-0.075, -0.56, z + 0.7)], [[0, 1, 2, 3]], thick=0.22)


def build_science_c(c, p):
    """Terrarium lab: a seedling under a paper bell jar, its lime leaf opening, a magnifier leaning beside."""
    z = _plinth(c, p)
    cyl(c, p, paper(), 0.55, 0.06, loc=(-0.15, 0.05, z + 0.03), verts=40, bevel=0.006)          # jar base
    for k in range(6):                                                   # the bell jar's ribs (reads as glass)
        a = math.pi * k / 6
        def rib(u, vv, a=a):
            t = math.pi * u
            r = 0.5
            return (-0.15 + math.cos(t) * r * math.cos(a), 0.05 + math.cos(t) * r * math.sin(a), z + 0.06 + math.sin(t) * 0.75)
        sheet(c, p, paper(), rib, nu=30, nv=1, thick=0.012)
    ring(c, p, paper(), 0.5, 0.02, loc=(-0.15, 0.05, z + 0.08))
    ball(c, p, paper(), 0.05, loc=(-0.15, 0.05, z + 0.84))
    _open = cone(c, p, paper(), 0.14, 0.18, 0.2, loc=(-0.15, 0.05, z + 0.16), verts=20)        # pot
    rod(c, p, paper(), (-0.15, 0.05, z + 0.26), (-0.13, 0.05, z + 0.55), r=0.018, verts=6)
    def leaf(m, ang, size, h):
        lf = _empty(c, p, "leaf", loc=(-0.14, 0.05, z + h), rot=(0, -35, ang))
        def shape(u, vv):
            w = math.sin(math.pi * u) * 0.35 * size
            return (u * size, (vv - 0.5) * 2 * w, 0.12 * size * math.sin(math.pi * u * 0.8))
        sheet(c, lf, m, shape, nu=16, nv=4, thick=0.012)
    leaf(paper(), 20, 0.24, 0.42)
    leaf(paper(), 200, 0.22, 0.38)
    leaf(accent(), 100, 0.28, 0.55)
    mg = _empty(c, p, "magnifier", loc=(0.72, -0.25, z + 0.35), rot=(0, 20, 30))
    ring(c, mg, paper(), 0.2, 0.035, rot=(90, 0, 0))
    rod(c, mg, paper(), (0, 0, -0.2), (0, 0, -0.55), r=0.035, verts=10)
    for k in range(2):                                                   # notes on the bench
        box(c, p, paper(), (0.32, 0.24, 0.015), loc=(0.55 - k * 0.05, 0.45, z + 0.01 + k * 0.016), rot=(0, 0, 12 - k * 20), bevel=0)


def _waves(c, p, z, r, n=6, seed=0.0):
    """Little paper wave curls lapping round a plinth's edge."""
    for k in range(n):
        a = seed + 2 * math.pi * k / n
        x, y = math.cos(a) * r, math.sin(a) * r
        def curl(u, v, x=x, y=y, a=a):
            t = math.pi * 1.25 * u
            return (x + math.cos(a + math.pi / 2) * (u - 0.5) * 0.34, y + math.sin(a + math.pi / 2) * (u - 0.5) * 0.34 + (v - 0.5) * 0.02,
                    z + 0.06 * math.sin(t))
        sheet(c, p, paper(), curl, nu=14, nv=1, thick=0.02)


def _bird(c, p, loc, s=0.12, yaw=0.0):
    """A folded paper bird: two wing triangles meeting at a keel."""
    b = _empty(c, p, "bird", loc=loc, rot=(0, 0, yaw))
    for side in (-1, 1):
        mesh(c, b, paper(), [(0, -s * 0.6, 0), (0, s * 0.6, 0), (side * s, 0.1 * s, s * 0.35)], [[0, 1, 2]], thick=0.008)
    return b


def _peg(c, p, loc, m=None):
    """A little paper game piece (a pawn, no face): it climbs the steps."""
    x, y, zz = loc
    cone(c, p, m or paper(), 0.06, 0.035, 0.14, loc=(x, y, zz + 0.07), verts=16)
    ball(c, p, m or paper(), 0.045, loc=(x, y, zz + 0.18))


def _plinth_small(c, p, r=0.95):
    """A slimmer plinth for the subject dioramas, so the subject, not the base, fills the card."""
    cyl(c, p, paper(), r, 0.12, loc=(0, 0, 0.06), verts=8, bevel=0.01).rotation_euler = (0, 0, math.radians(22.5))
    cyl(c, p, mat("grass"), r - 0.08, 0.04, loc=(0, 0, 0.14), verts=8, bevel=0.005).rotation_euler = (0, 0, math.radians(22.5))
    _tufts(c, p, r - 0.18, 0.16, seed=0.4)
    return 0.16


def _subject_box(c, p, z):
    """The frame every subject diorama shares: one box round the plinth and the sky above it, the same for English,
    Mathematics and Science, so the card renders come out at one scale, with one plinth size and one ground line
    (each scene used to be fitted to its own outline: a low, wide one came out small and floating)."""
    for x in (-1.3, 1.3):
        for y in (-1.3, 1.3):
            for zz in (0.0, z + 2.05):
                _bound(c, p, (x, y, zz))


def build_maths_b(c, p):
    """Growing staircase. Moves on hover: the pawn hops up a step, the lime cube drops onto the top."""
    p["layer_order"] = "pawn,accent"
    z = _plinth_small(c, p)
    s = 0.24
    for k, (ox, oy) in enumerate(((-0.5, -0.15), (-0.1, 0.02), (0.38, 0.16))):
        n = k + 1
        for i in range(n):
            for j in range(n):
                for h in range(n):
                    box(c, p, paper(), (s * 0.95, s * 0.95, s * 0.95),
                        loc=(ox + (i - (n - 1) / 2) * s, oy + (j - (n - 1) / 2) * s, z + s / 2 + h * s), bevel=0.012)
    box(c, p, accent(), (s * 0.95, s * 0.95, s * 0.95), loc=(0.38, 0.16, z + s / 2 + 3 * s + 0.1), rot=(5, -7, 12), bevel=0.012)
    _empty(c, p, "pt_maths_cube", loc=(0.38, 0.16, z + 3 * s))
    m = _mark()
    _peg(c, p, (-0.14, -0.1, z + 2 * s))
    _layer("pawn", m)
    _empty(c, p, "pt_maths_pawn", loc=(-0.14, -0.1, z + 2 * s))


def build_science_b(c, p):
    """Volcano island. Moves on hover: the lime plume puffs up, the palm sways."""
    p["layer_order"] = "palm,accent"
    z = _plinth_small(c, p)
    v = cone(c, p, paper(), 0.72, 0.2, 0.85, loc=(-0.08, 0.1, z + 0.425), verts=10)
    for poly in v.data.polygons:
        poly.use_smooth = False
    cyl(c, p, paper(), 0.17, 0.04, loc=(-0.08, 0.1, z + 0.83), verts=10)
    for k in range(3):
        a = math.radians(-80 + k * 32)
        def groove(u, vv, a=a):
            r = 0.2 + 0.48 * u
            return (-0.08 + math.cos(a) * r + (vv - 0.5) * 0.07, 0.1 + math.sin(a) * r, z + 0.85 - 0.78 * u + 0.02)
        sheet(c, p, paper(), groove, nu=14, nv=1, thick=0.025)
    for (x, y, zz, r, sq) in [(-0.07, 0.1, 0.97, 0.15, 0.8), (0.08, 0.06, 1.12, 0.13, 0.85), (-0.16, 0.14, 1.2, 0.11, 0.85),
                              (0.04, 0.1, 1.33, 0.14, 0.75), (-0.08, 0.12, 1.48, 0.11, 0.8)]:
        ball(c, p, accent(), r, loc=(x, y, z + zz), scale=(1.25, 1, sq))
    _empty(c, p, "pt_science_crater", loc=(-0.08, 0.1, z + 0.86))
    m = _mark()
    rod(c, p, paper(), (0.62, -0.28, z), (0.7, -0.3, z + 0.65), r=0.04, verts=8)
    for k in range(5):
        a = 2 * math.pi * k / 5
        def frond(u, vv, a=a):
            return (0.7 + math.cos(a) * 0.4 * u, -0.3 + math.sin(a) * 0.4 * u + (vv - 0.5) * 0.13 * (1 - u), z + 0.67 - 0.24 * u * u)
        sheet(c, p, paper(), frond, nu=12, nv=2, thick=0.014)
    _layer("palm", m)
    _empty(c, p, "pt_science_palm", loc=(0.62, -0.28, z))


def _hardcover(c, p, w, d, h, loc, yaw=0.0, band=False, ribbon=False, cover=None):
    """A hardcover book lying flat, spine to the left: two cover boards overhanging the page block, a rounded spine,
    the pages showing as layered edges, an optional raised spine band and ribbon bookmark."""
    b = _empty(c, p, "book", loc=loc, rot=(0, 0, yaw))
    t = 0.024                                                            # board thickness
    for zz in (t / 2, h - t / 2):                                        # covers, a touch bigger than the pages
        box(c, b, cover or paper(), (w, d, t), loc=(0, 0, zz), bevel=0.006)
    inner = h - 2 * t
    for k in range(3):                                                   # page block, in three leaves: the edges read as pages
        hh = inner / 3 - 0.004
        box(c, b, paper(), (w - 0.07, d - 0.05, hh), loc=(0.02, 0, t + 0.002 + k * (inner / 3) + hh / 2), bevel=0.003)
    r = h / 2
    cx = -w / 2 + r * 0.55
    def spine(u, v):                                                     # a rounded spine: an open half-tube, no end caps
        a = math.pi / 2 + math.pi * u
        return (cx + math.cos(a) * r, (v - 0.5) * d, r + math.sin(a) * r)
    sheet(c, b, cover or paper(), spine, nu=16, nv=2, thick=0.018)
    if band:                                                             # two raised bands across the spine
        for vv in (0.28, 0.72):
            def bnd(u, v, vv=vv):
                a = math.pi / 2 + math.pi * u
                return (cx + math.cos(a) * (r + 0.008), (vv - 0.5) * d + (v - 0.5) * 0.03, r + math.sin(a) * (r + 0.008))
            sheet(c, b, cover or paper(), bnd, nu=16, nv=1, thick=0.012)
    if ribbon:
        def rib(u, v):
            return (w * 0.25 + (v - 0.5) * 0.05, -d / 2 - 0.03 * u, h * 0.6 - 0.26 * u + 0.03 * math.sin(u * 5))
        sheet(c, b, paper(), rib, nu=10, nv=1, thick=0.01)
    return b


def _pie(r, missing, steps=24):
    """A circle with a slice cut out (a fraction): `missing` is the cut-out share, 0..1. Counter-clockwise."""
    a0 = 2 * math.pi * missing
    pts = [(0.0, 0.0)] + [(r * math.cos(a0 + (2 * math.pi - a0) * i / steps), r * math.sin(a0 + (2 * math.pi - a0) * i / steps)) for i in range(steps + 1)]
    return pts


def _parent_keep(o, parent):
    """Parent o to parent without moving it."""
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_world = mw


def _shown_keys(o, keys):
    """Visibility keys on o and everything under it: [(frame, visible), ...]."""
    targets = [o] + list(o.children_recursive)
    for t in targets:
        for f, on in keys:
            t.hide_render = not on
            t.keyframe_insert("hide_render", frame=f)


def build_english_a(c, p):
    """Lighthouse of books: hardcovers in the logo's own colours (deep green, leaf green, gold) with stone-sage pages,
    a railed lamp room, rocks and waves. Hover: the beam (the logo's yellow) sweeps round the lamp, the birds loop and flap, the
    waves bob (keyframed for the rendered hover; layered for the still)."""
    p["layer_order"] = "waves,accent,birds"
    z = _plinth_small(c, p)
    m = _mark()
    before = _mark()
    _waves(c, p, z, 0.8, n=6, seed=0.3)
    waves = [o for o in bpy.data.objects if o.name not in before and o.type == "MESH"]
    _layer("waves", m)
    for (x, y, r) in ((-0.62, 0.4, 0.11), (0.66, 0.36, 0.09)):
        ball(c, p, paper(), r, loc=(x, y, z + r * 0.45), scale=(1.3, 1, 0.75))
    covers = ("logo_dark", "logo_lime", "logo_gold", "logo_dark", "logo_gold", "logo_lime")
    sizes = [(0.92, 0.68, 0.2), (0.84, 0.62, 0.18), (0.78, 0.58, 0.21), (0.72, 0.54, 0.17), (0.66, 0.5, 0.2), (0.6, 0.46, 0.17)]
    for i, (w, d, h) in enumerate(sizes):
        _hardcover(c, p, w, d, h, (0.02 * (i % 2), 0, z), yaw=(-9 if i % 2 else 8) + i * 2, band=i % 2 == 0, ribbon=i == 2, cover=mat(covers[i]))
        z += h
    cyl(c, p, paper(), 0.26, 0.05, loc=(0, 0, z + 0.025), verts=24, bevel=0.005)
    ring(c, p, paper(), 0.25, 0.014, loc=(0, 0, z + 0.17))
    for k in range(10):
        a = 2 * math.pi * k / 10
        rod(c, p, paper(), (0.25 * math.cos(a), 0.25 * math.sin(a), z + 0.05), (0.25 * math.cos(a), 0.25 * math.sin(a), z + 0.17), r=0.011, verts=5)
    cyl(c, p, paper(), 0.14, 0.3, loc=(0, 0, z + 0.2), verts=20)
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.6
        box(c, p, paper(), (0.06, 0.03, 0.14), loc=(0.145 * math.cos(a), 0.145 * math.sin(a), z + 0.22), rot=(0, 0, math.degrees(a) + 90), bevel=0.004)
    cone(c, p, paper(), 0.3, 0.02, 0.26, loc=(0, 0, z + 0.48), verts=16)
    rod(c, p, paper(), (0, 0, z + 0.6), (0, 0, z + 0.76), r=0.012, verts=6)
    ball(c, p, paper(), 0.035, loc=(0, 0, z + 0.62))
    lamp = Vector((0, 0, z + 0.22))
    _empty(c, p, "pt_english_lamp", loc=tuple(lamp))
    # the light: a pale lamp yellow and kept short, so it glows rather than outweighing the other subjects' art
    beam = cone(c, p, mat("flame_core"), 0.06, 0.26, 0.72, loc=(0, 0, 0), verts=28)
    beam.name = "card_beam"
    d = Vector((1.0, -0.55, 0.0)).normalized()
    beam.location = (0.47, -0.25, z + 0.22)
    beam.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    m = _mark()
    birds = [_bird(c, p, (0.85, -0.7, z + 0.5), s=0.2, yaw=30), _bird(c, p, (0.5, -0.85, z + 0.8), s=0.15, yaw=10)]
    _layer("birds", m)
    _subject_box(c, p, 0.16)
    if not ANIMATE:
        return
    piv = _empty(c, p, "beam_pivot", loc=tuple(lamp))
    _parent_keep(beam, piv)
    for f, a in ((1, 0), (9, -42), (20, 30), (30, 0)):
        _key(piv, "rotation_euler", f, (0, 0, math.radians(a)), index=2)
    tip = Vector(beam.location) + d * 0.68 - lamp
    for a in (-42, 30):                                                  # keep the swept beam in frame
        r = math.radians(a)
        _bound(c, p, tuple(lamp + Vector((tip.x * math.cos(r) - tip.y * math.sin(r), tip.x * math.sin(r) + tip.y * math.cos(r), tip.z))))
    for b in birds:                                                      # a little loop, wings flapping
        base = Vector(b.location)
        for f, off in ((1, (0, 0, 0)), (10, (-0.3, 0.12, 0.12)), (20, (-0.08, 0.28, 0.04)), (30, (0, 0, 0))):
            _key(b, "location", f, tuple(base + Vector(off)))
        for f in range(1, 31, 3):
            _key(b, "scale", f, (1, 1, 0.35 if (f // 3) % 2 else 1.0))
    for i, w in enumerate(waves):
        base = w.location.z
        for f in (1, 8, 15, 22, 30):
            _key(w, "location", f, (w.location.x, w.location.y, base + (0 if f in (1, 30) else 0.03 * math.sin(f * 0.6 + i))))
    bpy.context.scene.frame_set(1)


def build_maths_c(c, p):
    """Abacus bridge over a pond of mathematics (circle ripples, fraction lily pads, a cube, a pyramid, a tangram fish).
    Hover: the lime bead slides out along its rod and clicks back home, a bottom bead answers, the fish swims a loop,
    the ripples spread (keyframed for the rendered hover; layered for the still)."""
    p["layer_order"] = "ripples,fish,beads,sky,accent"
    z = _plinth_small(c, p)
    cyl(c, p, mat("logo_pale"), 0.78, 0.03, loc=(0, -0.05, z + 0.015), verts=48, bevel=0.004)
    m = _mark()
    ripples = [ring(c, p, mat("logo_dark"), r, 0.008, loc=(0.32, -0.42, z + 0.036), scale=(1, 0.75, 1)) for r in (0.12, 0.22, 0.32)]
    _layer("ripples", m)
    _empty(c, p, "pt_maths_ripple", loc=(0.32, -0.42, z + 0.036))
    slab(c, p, mat("logo_lime"), _pie(0.13, 0.25), 0.02, loc=(-0.48, -0.4, z + 0.035), rot=(0, 0, 20), bevel=0.003)
    slab(c, p, mat("logo_lime"), _pie(0.1, 0.5), 0.02, loc=(-0.25, -0.58, z + 0.035), rot=(0, 0, -40), bevel=0.003)
    slab(c, p, mat("logo_lime"), _pie(0.08, 0.0), 0.02, loc=(0.58, -0.12, z + 0.035), bevel=0.003)
    box(c, p, mat("logo_dark"), (0.09, 0.09, 0.09), loc=(-0.6, -0.12, z + 0.06), rot=(0, 0, 25), bevel=0.006)
    cone(c, p, mat("logo_gold"), 0.08, 0.0, 0.1, loc=(0.12, -0.62, z + 0.08), rot=(0, 0, 45), verts=4)
    m = _mark()
    fish = _empty(c, p, "fish", loc=(-0.05, -0.32, z + 0.045), rot=(0, 0, 160))
    for tri in (((0, 0, 0), (0.16, 0.08, 0), (0.16, -0.08, 0)), ((0.16, 0.08, 0), (0.16, -0.08, 0), (0.26, 0, 0)),
                ((0, 0, 0), (-0.09, 0.07, 0), (-0.09, -0.07, 0))):
        mesh(c, fish, mat("logo_gold"), list(tri), [[0, 1, 2]], thick=0.02)
    _layer("fish", m)
    def deck(u, v):
        return (-0.75 + 1.5 * u, (v - 0.5) * 0.44, z + 0.06 + 0.42 * math.sin(math.pi * u))
    sheet(c, p, mat("logo_lime"), deck, nu=40, nv=2, thick=0.07)
    for k in range(9):
        u = (k + 0.5) / 9
        a = math.pi * u
        box(c, p, mat("logo_dark"), (0.012, 0.012, 0.07), loc=(-0.75 + 1.5 * u, -0.226, z + 0.06 + 0.42 * math.sin(a) - 0.05),
            rot=(0, -math.degrees(math.atan2(0.42 * math.pi * math.cos(a), 1.5)), 0), bevel=0)
    def rail(u, v):
        return (-0.75 + 1.5 * u, -0.2 + (v - 0.5) * 0.03, z + 0.21 + 0.42 * math.sin(math.pi * u))
    sheet(c, p, mat("logo_gold"), rail, nu=30, nv=1, thick=0.025)
    for k in range(8):
        u = (k + 0.5) / 8
        x, zz = -0.75 + 1.5 * u, z + 0.1 + 0.42 * math.sin(math.pi * u)
        rod(c, p, mat("logo_dark"), (x, -0.2, zz), (x, -0.2, zz + 0.11), r=0.013, verts=5)
    for x in (-0.82, 0.82):
        box(c, p, mat("logo_dark"), (0.18, 0.5, 0.12), loc=(x, 0, z + 0.06), bevel=0.008)
        rod(c, p, mat("logo_dark"), (x, -0.2, z + 0.12), (x, -0.2, z + 0.5), r=0.016, verts=6)
        cone(c, p, mat("logo_gold"), 0.055, 0.02, 0.08, loc=(x, -0.2, z + 0.55), verts=8)
    for (x, y) in ((-0.72, 0.38), (-0.66, 0.42), (0.72, 0.36)):
        rod(c, p, mat("logo_dark"), (x, y, z + 0.03), (x + 0.03, y, z + 0.3), r=0.01, verts=5)
    # the abacus: a tall frame of three rods standing over the bridge (it gives the scene the height of the
    # lighthouse and the observatory)
    top, rows = 1.5, (1.3, 1.1, 0.9)
    for x in (-0.6, 0.6):
        rod(c, p, mat("logo_dark"), (x, 0.24, z + 0.08), (x, 0.24, z + top), r=0.035, verts=8)
        ball(c, p, mat("logo_gold"), 0.06, loc=(x, 0.24, z + top + 0.04))
        box(c, p, mat("logo_dark"), (0.14, 0.14, 0.08), loc=(x, 0.24, z + 0.04), bevel=0.006)
    rod(c, p, mat("logo_dark"), (-0.66, 0.24, z + top - 0.03), (0.66, 0.24, z + top - 0.03), r=0.034, verts=8)
    rod(c, p, mat("logo_dark"), (-0.6, 0.24, z + 0.76), (0.6, 0.24, z + 0.76), r=0.026, verts=8)
    for zz in rows:
        rod(c, p, ink(), (-0.6, 0.24, z + zz), (0.6, 0.24, z + zz), r=0.011, verts=6)
    bead = lambda mm, x, zz: ring(c, p, mm, 0.05, 0.042, loc=(x, 0.24, zz), rot=(0, 90, 0), scale=(1, 1, 1.25))
    m = _mark()
    for k in range(4):
        bead(mat("logo_gold"), -0.5 + k * 0.11, z + rows[0])
    bottom = [bead(mat("logo_dark"), -0.5 + k * 0.11, z + rows[1]) for k in range(6)]
    for k in range(3):
        bead(paper(), -0.5 + k * 0.11, z + rows[2])
    _layer("beads", m)
    lime = bead(accent(), -0.5 + 4 * 0.11, z + rows[0])
    # the maths sky (as the lighthouse has its birds and the observatory its moon and stars): a paper set square
    # and plus and times signs, floating
    m = _mark()
    tri = [(0, 0), (0.34, 0), (0, 0.24)]
    sq = slab(c, p, mat("logo_gold"), tri, 0.02, loc=(-1.02, 0.05, z + 1.62), rot=(80, 0, 18), bevel=0.003)
    slab(c, sq, paper(), [(0.06, 0.05), (0.2, 0.05), (0.06, 0.15)], 0.024, loc=(0, 0, 0.002), bevel=0.002)
    signs = []
    for (x, zz, r, turn) in ((0.95, 1.62, 0.07, 0), (0.72, 1.86, 0.05, 45), (-0.55, 1.88, 0.045, 0)):
        sgn = _empty(c, p, "sign", loc=(x, -0.1, z + zz), rot=(80, 0, 0))    # facing the camera; "turn" spins it in its own plane
        box(c, sgn, paper(), (r * 2, r * 0.55, 0.02), rot=(0, 0, turn), bevel=0.003)
        box(c, sgn, paper(), (r * 0.55, r * 2, 0.02), rot=(0, 0, turn), bevel=0.003)
        signs.append(sgn)
    _layer("sky", m)
    _subject_box(c, p, 0.16)
    if not ANIMATE:
        return
    x0 = lime.location.x                                                 # beads move along x only: along their rods
    for f, x in ((1, x0), (10, 0.52), (14, 0.52), (23, x0 - 0.012), (26, x0), (36, x0)):
        _key(lime, "location", f, (x, lime.location.y, lime.location.z))
    lb = bottom[-1]
    bx = lb.location.x
    for f, x in ((1, bx), (6, bx), (14, 0.52), (22, 0.52), (31, bx - 0.01), (34, bx), (36, bx)):
        _key(lb, "location", f, (x, lb.location.y, lb.location.z))
    cx, cy = -0.05, -0.2                                                 # the fish swims a loop round a lily pad
    fx, fy = fish.location.x, fish.location.y
    r0 = math.hypot(fx - cx, fy - cy)
    a0 = math.atan2(fy - cy, fx - cx)
    for i, f in enumerate((1, 7, 13, 19, 25, 31, 36)):
        a = a0 + 2 * math.pi * i / 6
        _key(fish, "location", f, (cx + math.cos(a) * r0, cy + math.sin(a) * r0, fish.location.z))
        _key(fish, "rotation_euler", f, (0, 0, a + math.pi / 2 + math.pi), index=-1)
    for i, rr in enumerate(ripples):
        for f, k in ((1, 1.0), (8 + i * 4, 1.0), (18 + i * 4, 1.28), (30 + i * 2, 1.0), (36, 1.0)):
            _key(rr, "scale", f, (k, 0.75 * k, 1))
    for i, sgn in enumerate([sq] + signs):                                # the sky bobs gently, the signs turning a little
        base = Vector(sgn.location)
        for f, dz in ((1, 0), (12, 0.05), (24, -0.02), (36, 0)):
            _key(sgn, "location", f, tuple(base + Vector((0, 0, dz * (1 if i % 2 else -1)))))
    bpy.context.scene.frame_set(1)


def build_science_a(c, p):
    """Paper observatory: a panelled dome, slit, steps and window, a telescope on a pivot; a crescent moon, stars, and
    the planet on its dotted orbit. Hover: the planet steps back to paper like the stars; the telescope swings to
    the moon, which turns lime and grows; the moon settles back to paper as the telescope swings to the planet,
    which turns lime and grows, and stays there (keyframed for the rendered hover; layered for the still)."""
    p["layer_order"] = "stars,moon,scope,accent"
    z = _plinth_small(c, p)
    cyl(c, p, paper(), 0.48, 0.48, loc=(-0.1, 0.1, z + 0.24), verts=32, bevel=0.008)
    ring(c, p, paper(), 0.485, 0.02, loc=(-0.1, 0.1, z + 0.48))
    ball(c, p, mat("logo_dark"), 0.48, loc=(-0.1, 0.1, z + 0.48), scale=(1, 1, 0.8))
    for k in range(6):
        a = math.pi * k / 6
        def seam(u, v, a=a):
            t = math.pi * u
            return (-0.1 + math.cos(t) * 0.484 * math.cos(a), 0.1 + math.cos(t) * 0.484 * math.sin(a), z + 0.48 + math.sin(t) * 0.388)
        sheet(c, p, mat("logo_dark"), seam, nu=20, nv=1, thick=0.012)
    box(c, p, ink(), (0.12, 0.03, 0.36), loc=(0.02, -0.27, z + 0.72), rot=(-38, 0, 18), bevel=0)
    box(c, p, mat("logo_dark"), (0.11, 0.02, 0.22), loc=(-0.1, -0.385, z + 0.11), bevel=0.003)
    for k in range(2):
        box(c, p, paper(), (0.26, 0.1, 0.035), loc=(-0.1, -0.45 - k * 0.08, z + 0.035 - k * 0.018), bevel=0.004)
    box(c, p, paper(), (0.09, 0.03, 0.09), loc=(-0.47, -0.12, z + 0.3), rot=(0, 0, -62), bevel=0.004)
    planet_at = Vector((0.68, -0.15, z + 1.5))
    moon_at = Vector((-0.7, 0.25, z + 1.42))
    # the telescope, on a pivot at its foot so it can turn to look at things
    d_rest = Vector((0.55, -0.35, 0.75)).normalized()
    centre = Vector((0.16, -0.12, z + 0.92))
    foot = centre - d_rest * 0.39
    m = _mark()
    scope = _empty(c, p, "scope", loc=tuple(foot))
    scope.rotation_mode = "QUATERNION"
    scope.rotation_quaternion = d_rest.to_track_quat("Z", "Y")
    cyl(c, scope, mat("logo_gold"), 0.075, 0.78, loc=(0, 0, 0.39), verts=20, bevel=0.005)
    ring(c, scope, mat("logo_dark"), 0.085, 0.018, loc=(0, 0, 0.77))
    cyl(c, scope, paper(), 0.036, 0.12, loc=(0, 0, -0.05), verts=12)
    _layer("scope", m)
    _empty(c, p, "pt_science_scope", loc=tuple(foot))
    cr = [(0.17 * math.cos(t), 0.17 * math.sin(t)) for t in [math.radians(a) for a in range(-110, 111, 10)]]
    cr += [(0.065 + 0.13 * math.cos(t), 0.13 * math.sin(t)) for t in [math.radians(a) for a in range(110, -111, -10)]]
    m = _mark()
    moon = _empty(c, p, "moon", loc=tuple(moon_at))
    moon_paper = slab(c, moon, paper(), cr, 0.035, rot=(80, 0, 200), bevel=0.003)
    _layer("moon", m)
    _empty(c, p, "pt_science_moon", loc=tuple(moon_at))
    m = _mark()
    stars = []
    for (x, y, zz, r) in ((-0.42, 0.0, 1.8, 0.07), (-0.08, 0.3, 1.92, 0.06), (0.25, 0.2, 1.98, 0.05), (-0.95, -0.1, 1.15, 0.045)):
        stars.append(slab(c, p, mat("logo_gold"), star_pts(5, r, r * 0.45), 0.02, loc=(x, y, z + zz), rot=(80, 0, 0), bevel=0.002))
    _layer("stars", m)
    planet = _empty(c, p, "planet", loc=tuple(planet_at))
    for k in range(20):                                                  # its dotted orbit, scaling with it
        a = 2 * math.pi * k / 20
        ball(c, planet, ink(), 0.011, loc=(math.cos(a) * 0.5, math.sin(a) * 0.1, math.sin(a) * 0.18))
    lime_planet = _empty(c, planet, "planet_lime")
    ball(c, lime_planet, accent(), 0.22)
    ring(c, lime_planet, accent(), 0.36, 0.028, rot=(70, 15, 0))
    _empty(c, p, "pt_science_planet", loc=tuple(planet_at))
    _bound(c, p, tuple(moon_at + Vector((-0.12, 0, 0.14))))
    _bound(c, p, tuple(planet_at + Vector((0.35, 0, 0.32))))
    _subject_box(c, p, z)
    if not ANIMATE:
        return
    paper_planet = _empty(c, planet, "planet_paper")                    # while the moon has the telescope: gold, like the stars
    ball(c, paper_planet, mat("logo_gold"), 0.22)
    ring(c, paper_planet, mat("logo_gold"), 0.36, 0.028, rot=(70, 15, 0))
    moon_lime = slab(c, moon, accent(), cr, 0.035, rot=(80, 0, 200), bevel=0.003)
    q_planet = (planet_at - foot).normalized().to_track_quat("Z", "Y")
    q_moon = (moon_at - foot).normalized().to_track_quat("Z", "Y")
    q_rest = scope.rotation_quaternion.copy()
    for f, q in ((1, q_rest), (5, q_rest), (16, q_moon), (26, q_moon), (38, q_planet), (48, q_planet)):
        scope.rotation_quaternion = q
        scope.keyframe_insert("rotation_quaternion", frame=f)
    _shown_keys(lime_planet, [(1, True), (5, False), (37, True)])           # the planet: lime, then paper like the stars, lime again
    _shown_keys(paper_planet, [(1, False), (5, True), (37, False)])
    # out of focus the planet shrinks to a star's size (gold, like them); in focus it grows past its rest size
    for f, k in ((1, 1.0), (5, 1.0), (10, 0.3), (36, 0.3), (44, 1.34), (46, 1.28), (48, 1.3)):
        _key(planet, "scale", f, (k, k, k))
    _shown_keys(moon_lime, [(1, False), (15, True), (28, False)])          # the moon: lime while it is looked at
    _shown_keys(moon_paper, [(1, True), (15, False), (28, True)])
    for f, k in ((1, 1.0), (15, 1.0), (22, 1.38), (26, 1.34), (30, 1.0), (48, 1.0)):
        _key(moon, "scale", f, (k, k, k))
    for i, s_ in enumerate(stars):                                       # stars twinkle
        for f in range(1, 49, 6):
            k = 1.0 if (f // 6 + i) % 2 == 0 else 0.7
            _key(s_, "scale", f, (k, k, k))
    bpy.context.scene.frame_set(1)


def build_social(c, p):
    """A folded map: an accordion of paper panels with hills and a road, a lime pin marking where you are."""
    z = _plinth(c, p)
    n, w, d = 4, 0.42, 1.0
    for k in range(n):
        x0 = -0.84 + k * w
        tilt = 10 if k % 2 else -10
        box(c, p, paper(), (w, d, 0.03), loc=(x0 + w / 2, 0, z + 0.05 + (0.035 if k % 2 else 0)), rot=(0, tilt, 0), bevel=0.004)
    for (x, y, r, h) in ((-0.6, 0.2, 0.18, 0.25), (-0.45, 0.25, 0.13, 0.18), (0.45, -0.2, 0.16, 0.22)):
        cone(c, p, paper(), r, 0.0, h, loc=(x, y, z + 0.08 + h / 2), verts=6)
    for k in range(6):                                                   # the road, dashed across the panels
        box(c, p, ink(), (0.11, 0.03, 0.006), loc=(-0.7 + k * 0.27, -0.25 + 0.08 * math.sin(k * 1.3), z + 0.1), rot=(0, 0, 10 * math.sin(k)), bevel=0)
    cyl(c, p, paper(), 0.07, 0.04, loc=(0.6, 0.3, z + 0.1), verts=12)                           # a town
    box(c, p, paper(), (0.08, 0.08, 0.1), loc=(0.62, 0.32, z + 0.15), bevel=0.004)
    cone(c, p, accent(), 0.08, 0.0, 0.3, loc=(0.05, -0.12, z + 0.25), rot=(180, 0, 0), verts=20)
    ball(c, p, accent(), 0.13, loc=(0.05, -0.12, z + 0.47))


def build_history(c, p):
    """A paper fort gate: two crenellated towers round an arched gateway, a lime banner flying above."""
    z = _plinth(c, p)
    for s in (-1, 1):
        box(c, p, paper(), (0.42, 0.42, 1.0), loc=(s * 0.55, 0.05, z + 0.5), bevel=0.01)
        for i in range(2):
            for j in range(2):
                box(c, p, paper(), (0.12, 0.12, 0.12), loc=(s * 0.55 + (i - 0.5) * 0.28, 0.05 + (j - 0.5) * 0.28, z + 1.06), bevel=0.005)
        box(c, p, ink(), (0.05, 0.02, 0.14), loc=(s * 0.55, -0.165, z + 0.7), bevel=0)           # arrow slit
    wall = slab(c, p, paper(), [(-0.35, 0), (0.35, 0), (0.35, 0.85), (-0.35, 0.85)], 0.3, loc=(0, 0.2, z), rot=(90, 0, 0), bevel=0.008)
    arch = ([(-0.2, -0.05)] + [(0.2 * math.cos(math.pi - math.pi * i / 14), 0.42 + 0.2 * math.sin(math.pi * i / 14)) for i in range(15)] + [(0.2, -0.05)])[::-1]
    hole = slab(c, p, None, arch, 0.6, loc=(0, 0.45, z), rot=(90, 0, 0), bevel=0)
    subtract(wall, hole)
    for k in range(3):
        box(c, p, paper(), (0.14, 0.3, 0.1), loc=(-0.24 + k * 0.24, 0.05, z + 0.9), bevel=0.005)
    rod(c, p, paper(), (0.55, 0.05, z + 1.12), (0.55, 0.05, z + 1.75), r=0.02, verts=8)
    def banner(u, v):
        return (0.55 - 0.02 + 0.45 * u, 0.05 + 0.04 * math.sin(u * 7), z + 1.72 - v * 0.24 + 0.05 * math.sin(u * 4))
    sheet(c, p, accent(), banner, nu=30, nv=3, thick=0.012)
    box(c, p, paper(), (0.32, 0.4, 0.02), loc=(0, -0.45, z + 0.01), bevel=0)                    # the path out


def build_geography(c, p):
    """A faceted paper globe on its stand, one lime continent standing out."""
    import bmesh
    z = _plinth(c, p)
    cyl(c, p, paper(), 0.38, 0.08, loc=(0, 0, z + 0.04), verts=8, bevel=0.008)
    rod(c, p, paper(), (0, 0, z + 0.08), (0, 0, z + 0.32), r=0.05, verts=10)
    gz = z + 1.0
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.6)
    g = bpy.context.active_object
    _finish(g, c, paper(), (0, 0, gz), (0, 0, 0), (1, 1, 1), p, 0)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.625)
    land = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(land.data)
    t1 = Vector((-0.35, -0.85, 0.35)).normalized()
    t2 = Vector((-0.1, -0.9, -0.25)).normalized()
    t3 = Vector((-0.65, -0.6, 0.15)).normalized()
    drop = [f for f in bm.faces if max(f.normal.dot(t1), f.normal.dot(t2) - 0.03, f.normal.dot(t3) - 0.06) < 0.9]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(land.data)
    bm.free()
    _finish(land, c, accent(), (0, 0, gz), (0, 0, 0), (1, 1, 1), p, 0)
    land.modifiers.new("solid", "SOLIDIFY").thickness = 0.02
    meridian = ring(c, p, paper(), 0.72, 0.03, loc=(0, 0, gz), rot=(90, 0, 23))
    rod(c, p, paper(), (0, 0, gz - 0.72), (0, 0, z + 0.32), r=0.03, verts=8)


def build_hindi(c, p):
    """A paper boat (kaagaz ki kashti) on a puddle, its lime sail up."""
    z = _plinth(c, p)
    cyl(c, p, paper(), 0.95, 0.02, loc=(0, 0, z + 0.01), verts=48)                              # the puddle
    for k, (r, x) in enumerate(((0.55, -0.1), (0.75, -0.05))):
        ring(c, p, paper(), r, 0.012, loc=(x, 0, z + 0.03), scale=(1.2, 0.7, 1))                 # ripples
    hull = [(-0.62, 0.0), (0.62, 0.0), (0.42, -0.22), (-0.42, -0.22)]
    bt = _empty(c, p, "boat", loc=(0, 0, z + 0.33), rot=(0, 0, -12))
    bt.scale = (1.45, 1.45, 1.45)
    for y in (-0.18, 0.18):
        mesh(c, bt, paper(), [(x, y, zz) for x, zz in hull], [[0, 1, 2, 3]], thick=0.02)
    mesh(c, bt, paper(), [(-0.42, -0.18, -0.22), (0.42, -0.18, -0.22), (0.42, 0.18, -0.22), (-0.42, 0.18, -0.22)], [[0, 1, 2, 3]], thick=0.02)
    for x in (-1, 1):
        mesh(c, bt, paper(), [(x * 0.62, -0.18, 0), (x * 0.62, 0.18, 0), (x * 0.42, 0.18, -0.22), (x * 0.42, -0.18, -0.22)], [[0, 1, 2, 3]], thick=0.02)
    mesh(c, bt, accent(), [(-0.32, 0.0, 0.0), (0.32, 0.0, 0.0), (0.0, 0.0, 0.62)], [[0, 1, 2]], thick=0.025)   # sail
    mesh(c, bt, paper(), [(-0.32, 0.0, 0.0), (0.0, 0.0, 0.62), (0.0, -0.17, 0.0)], [[0, 1, 2]], thick=0.015)
    for (x, y) in ((0.75, 0.45), (-0.8, -0.4)):                          # a fallen leaf and a pebble
        ball(c, p, paper(), 0.07, loc=(x, y, z + 0.04), scale=(1.3, 1, 0.6))


def build_fallback(c, p):
    """A small paper bookshelf, one lime book tipping out: something to read."""
    z = _plinth(c, p)
    W, D, H = 1.3, 0.4, 1.1
    for x in (-W / 2, W / 2):
        box(c, p, paper(), (0.06, D, H), loc=(x, 0, z + H / 2), bevel=0.006)
    for zz in (0.0, 0.52, 1.04):
        box(c, p, paper(), (W + 0.06, D, 0.05), loc=(0, 0, z + zz + 0.025), bevel=0.006)
    box(c, p, paper(), (W, 0.03, H), loc=(0, D / 2, z + H / 2), bevel=0.004)
    x = -W / 2 + 0.07
    for k, (w, h) in enumerate(((0.1, 0.4), (0.08, 0.36), (0.12, 0.42), (0.09, 0.3), (0.1, 0.38), (0.11, 0.41))):
        lean = 14 if k == 5 else 0
        box(c, p, paper(), (w, D * 0.8, h), loc=(x + w / 2, 0, z + 0.05 + h / 2), rot=(0, lean, 0), bevel=0.006)
        x += w + 0.015
    x = -W / 2 + 0.07
    for k, (w, h) in enumerate(((0.09, 0.38), (0.12, 0.42), (0.1, 0.34))):
        box(c, p, paper(), (w, D * 0.8, h), loc=(x + w / 2, 0, z + 0.57 + h / 2), bevel=0.006)
        x += w + 0.015
    box(c, p, accent(), (0.11, D * 0.85, 0.42), loc=(x + 0.12, -0.12, z + 0.57 + 0.2), rot=(-8, 0, 22), bevel=0.006)
    _book(c, p, 0.42, 0.3, 0.07, (0.35, -0.1, z + 0.57), yaw=6)


# Subject dioramas (into public/student/subjects), rendered as base + accent like the stats:
# slot -> (builder, size, elevation, margin, line weight)
# ---------------------------------------------------------------- progress: the camp
# The dashboard's three progress numbers as one small expedition, each a diorama on the subject cards' grass base:
# the streak is a campfire kept burning, chapters finished a summit with its flag, time spent an hourglass at camp.
# Each is the same whatever the number; the lime part is the hover move.
def _smoke(c, p, x, y, z, n=3, s=0.07):
    """Little paper smoke puffs rising, each a bit bigger and further off."""
    for k in range(n):
        ball(c, p, paper(), s * (1 + 0.45 * k), loc=(x + 0.05 * k, y + 0.02 * k, z + 0.17 * k), scale=(1.15, 1, 0.9))


def _wisp(c, p, h, turns=1.1, reach=0.09, width=0.075, phase=0.0, m=None):
    """A curling smoke wisp: one thin paper ribbon rising from its foot (p's origin), its centre line curling round
    and drifting wider as it climbs, the band narrow at the foot, fullest low down and tapering to a point at the top,
    turning as it goes, so it reads as smoke rising, not a stack of balls."""
    def surf(u, v):
        t = u
        a = phase + 2 * math.pi * turns * t
        r = reach * (0.35 + t)
        cx, cy = r * math.sin(a), r * math.cos(a) * 0.55
        w = width * math.sin(math.pi * t ** 0.62) * (1 - 0.35 * t)
        # the band keeps its face to the camera (across the view, at the render's azimuth), rocking a little as it
        # rises so its edge shows here and there like a fold
        tw = math.radians(AZIMUTH) + 0.45 * math.sin(phase + 2 * math.pi * 0.8 * t)
        off = (v - 0.5) * w
        return (cx + off * math.cos(tw), cy + off * math.sin(tw), h * t + off * 0.3)
    o = sheet(c, p, m or mat("smoke"), surf, nu=56, nv=1, thick=0.006)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def _pine(c, p, x, y, z, s=1.0, m=None):
    """A small faceted pine: two stacked cones on a stub of trunk."""
    rod(c, p, mat("log"), (x, y, z), (x, y, z + 0.06 * s), r=0.018 * s, verts=5)
    for i, (r, h, zz) in enumerate(((0.11, 0.2, 0.05), (0.08, 0.17, 0.15))):
        o = cone(c, p, m or mat("logo_deep"), r * s, 0.0, h * s, loc=(x, y, z + (zz + h / 2) * s), verts=6)
        for poly in o.data.polygons:
            poly.use_smooth = False


def build_camp_fire(c, p):
    """A campfire kept burning: a square crib of logs (pale cut ends), flames rising from inside it in the logo's
    yellow with a pale-yellow heart (warm, no lime), embers, a curling smoke wisp; a kettle on a stone, a log seat with a backpack against it, river
    stones round the fire, pines. Hover: the flames leap and the smoke curls round as it climbs."""
    z = _plinth_small(c, p, r=1.05)
    for k in range(12):                                                  # the stone ring
        a = 2 * math.pi * k / 12
        r = 0.068 + 0.012 * math.sin(k * 2.3)
        ball(c, p, mat("stone"), r, loc=(math.cos(a) * 0.42, math.sin(a) * 0.42, z + r * 0.6), scale=(1.25, 1, 0.75))
    ball(c, p, mat("logo_deep"), 0.36, loc=(0, 0, z + 0.004), scale=(1, 1, 0.05))  # scorched ground
    L, r_ = 0.44, 0.042
    for layer in range(3):                                               # the crib: three layers of crossed logs
        zz = z + 0.045 + layer * 0.075
        for side in (-1, 1):
            if layer % 2 == 0:
                a_, b_ = Vector((-L / 2, side * 0.15, zz)), Vector((L / 2, side * 0.15, zz))
            else:
                a_, b_ = Vector((side * 0.15, -L / 2, zz)), Vector((side * 0.15, L / 2, zz))
            rod(c, p, mat("log"), a_, b_, r=r_, verts=10)
            for e in (a_, b_):                                           # pale cut ends
                d = (b_ - a_).normalized() * (1 if e is b_ else -1)
                o = cyl(c, p, mat("wood"), r_ * 0.86, 0.008, loc=tuple(e + d * 0.004), verts=12)
                o.rotation_mode = "QUATERNION"
                o.rotation_quaternion = d.to_track_quat("Z", "Y")
    for (x, y) in ((0.24, -0.2), (-0.2, -0.26), (0.08, -0.33), (-0.3, 0.06)):   # embers
        ball(c, p, mat("logo_gold"), 0.022, loc=(x, y, z + 0.02))
    m = _mark()
    flame = _empty(c, p, "flame", loc=(0, 0, z + 0.2))

    def tongue(mm, R, h, loc, bend=0.0, yaw=0.0, wave=0.0):
        """A soft flame tongue: a round belly that narrows into a tip curling to one side (a surface of revolution
        whose centre line bends and wavers), smooth-shaded, so it reads as fire, not a spike."""
        x0, y0, z0 = loc
        cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        def surf(u, v):
            t = u
            r = R * 2.1 * math.sqrt(max(t * (1 - t), 0.0)) * (1 - t) ** 0.55
            th = 2 * math.pi * v
            off = bend * t * t + wave * math.sin(t * math.pi * 2) * t
            lx, ly = off + r * math.cos(th), r * math.sin(th) * 0.82
            return (x0 + lx * cy - ly * sy, y0 + lx * sy + ly * cy, z0 + h * t)
        o = sheet(c, flame, mm, surf, nu=28, nv=24, thick=0.004)
        for poly in o.data.polygons:
            poly.use_smooth = True
        return o
    tongue(mat("logo_gold"), 0.17, 0.62, (0, 0.03, -0.04), bend=0.05, wave=0.03, yaw=10)
    tongue(mat("logo_gold"), 0.12, 0.46, (0.12, 0.05, -0.04), bend=0.12, yaw=-10, wave=-0.02)
    tongue(mat("logo_gold"), 0.12, 0.42, (-0.12, 0.0, -0.04), bend=-0.12, yaw=20, wave=0.02)
    tongue(mat("logo_gold"), 0.09, 0.3, (0.02, 0.15, -0.04), bend=-0.06, yaw=80)
    tongue(mat("flame_core"), 0.11, 0.36, (0.0, -0.09, -0.02), bend=-0.04, wave=0.025)
    tongue(mat("flame_core"), 0.07, 0.22, (0.1, -0.07, 0.0), bend=0.07)
    tongue(mat("logo_gold"), 0.035, 0.1, (0.03, 0.02, 0.66), bend=0.02)   # a lick of flame breaking free above
    for (x, y, zz, r) in ((0.14, -0.02, 0.9, 0.024), (0.2, -0.05, 1.04, 0.017)):   # sparks, off to one side of the smoke
        ball(c, flame, mat("logo_gold"), r, loc=(x, y, zz))
    # smoke: a curling paper wisp rising from the flame tips, a fainter second one beside it
    smoke = _empty(c, p, "smoke", loc=(-0.04, 0.06, z + 0.86))
    _wisp(c, smoke, 0.5, turns=0.85, reach=0.07, width=0.15, phase=0.4)
    _wisp(c, smoke, 0.3, turns=0.7, reach=0.05, width=0.09, phase=2.6)
    if ANIMATE:                                                          # hover: the flames leap twice and settle
        for f, (sx, sz) in ((1, (1, 1)), (5, (1.08, 1.28)), (9, (0.96, 0.92)), (13, (1.06, 1.2)), (17, (0.98, 0.96)), (21, (1.02, 1.05)), (24, (1, 1))):
            _key(flame, "scale", f, (sx, sx, sz))
        for f, a in ((1, 0), (7, 4), (13, -3), (19, 2), (24, 0)):
            _key(flame, "rotation_euler", f, (math.radians(a), 0, 0))
        for f, (dz, k, a) in ((1, (0, 1.0, 0)), (8, (0.02, 1.05, 14)), (16, (0.04, 1.08, 26)), (24, (0, 1.0, 0))):
            _key(smoke, "location", f, (smoke.location.x, smoke.location.y, z + 0.86 + dz))   # the wisp curls round and climbs
            _key(smoke, "scale", f, (1, 1, k))
            _key(smoke, "rotation_euler", f, (0, 0, math.radians(a)))
        _bound(c, p, (0, 0, z + 1.42))
    # a kettle warming on a flat stone
    ball(c, p, mat("stone"), 0.11, loc=(0.56, -0.18, z + 0.05), scale=(1.3, 1.1, 0.5))
    ket = _empty(c, p, "kettle", loc=(0.56, -0.18, z + 0.1))
    ball(c, ket, mat("logo_dark"), 0.1, loc=(0, 0, 0.08), scale=(1, 1, 0.85))
    cyl(c, ket, mat("logo_dark"), 0.05, 0.04, loc=(0, 0, 0.17), verts=12)
    rod(c, ket, mat("logo_dark"), (0.08, 0, 0.08), (0.17, 0, 0.15), r=0.014, verts=6)
    ring(c, ket, mat("log"), 0.075, 0.008, loc=(0, 0, 0.18), rot=(90, 0, 0), scale=(1, 1, 0.9))
    # a log seat, a backpack leaning on it
    rod(c, p, mat("log"), (-0.72, 0.18, z + 0.075), (-0.32, 0.62, z + 0.075), r=0.075, verts=12)
    for e, d in (((-0.72, 0.18, z + 0.075), Vector((-0.4, -0.44, 0))), ((-0.32, 0.62, z + 0.075), Vector((0.4, 0.44, 0)))):
        o = cyl(c, p, mat("wood"), 0.064, 0.008, loc=tuple(Vector(e) + d.normalized() * 0.004), verts=14)
        o.rotation_mode = "QUATERNION"
        o.rotation_quaternion = d.normalized().to_track_quat("Z", "Y")
    pack = _empty(c, p, "pack", loc=(-0.62, -0.08, z), rot=(0, 0, 40))
    box(c, pack, mat("logo_lime"), (0.2, 0.13, 0.26), loc=(0, 0, 0.13), bevel=0.03)
    box(c, pack, mat("logo_dark"), (0.16, 0.05, 0.11), loc=(0, -0.08, 0.1), bevel=0.02)
    rod(c, pack, mat("log"), (-0.11, 0.06, 0.27), (0.11, 0.06, 0.27), r=0.035, verts=8)   # rolled mat
    for (x, y, s) in ((0.6, 0.42, 1.1), (0.74, 0.18, 0.85), (-0.1, 0.78, 0.9), (0.28, 0.7, 1.2)):
        _pine(c, p, x, y, z, s=s)
    p.rotation_euler = (0, 0, math.radians(12))


def _mountain(c, p, m, base_r, height, loc, seed=0, sides=9, snow=None, snow_line=0.66):
    """A folded-paper mountain: rings of points round a peak, each pushed in or out at random so ridges and gullies
    run down it, flat-shaded so every fold catches the light its own way. With `snow`, a cap of that material over
    the top (the same folds, lifted a hair, cut along a slightly tilted line)."""
    import random
    import bmesh
    rnd = random.Random(seed)
    rings = [(0.0, 1.0), (0.3, 0.74), (0.58, 0.47), (0.82, 0.22)]
    jit = [rnd.uniform(0.78, 1.18) for _ in range(sides)]                # ridges run the whole height
    verts, faces = [], []
    for zi, (t, rr) in enumerate(rings):
        for k in range(sides):
            a = 2 * math.pi * k / sides + rnd.uniform(-0.12, 0.12)
            r = base_r * rr * (jit[k] * (0.7 + 0.3 * rnd.uniform(0.8, 1.2)))
            verts.append((math.cos(a) * r, math.sin(a) * r, height * t + rnd.uniform(-0.03, 0.03) * height * (zi > 0)))
    apex = len(verts)
    verts.append((rnd.uniform(-0.04, 0.04) * base_r, rnd.uniform(-0.04, 0.04) * base_r, height))
    for zi in range(len(rings) - 1):
        for k in range(sides):
            a0, a1 = zi * sides + k, zi * sides + (k + 1) % sides
            b0, b1 = a0 + sides, a1 + sides
            faces.append([a0, a1, b1, b0])
    top = (len(rings) - 1) * sides
    for k in range(sides):
        faces.append([top + k, top + (k + 1) % sides, apex])
    faces.append(list(range(sides))[::-1])
    me = bpy.data.meshes.new("mountain")
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new("mountain", me)
    c.objects.link(o)
    o.parent = p
    o.location = loc
    o.data.materials.append(m)
    if snow is not None:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.scale(bm, vec=(1.025, 1.025, 1.012), verts=bm.verts)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, height * snow_line), plane_no=(0.12, 0.2, 1.0), clear_inner=True)
        me2 = bpy.data.meshes.new("snow")
        bm.to_mesh(me2)
        bm.free()
        o2 = bpy.data.objects.new("snow", me2)
        c.objects.link(o2)
        o2.parent = p
        o2.location = loc
        o2.data.materials.append(snow)
        sol = o2.modifiers.new("solid", "SOLIDIFY")
        sol.thickness = 0.01
    return o


def build_camp_summit(c, p):
    """A chapter finished is a peak climbed: a folded-paper mountain with ridges and gullies, snow on its top, two
    lower peaks behind; a path of paper steps climbing the face to the summit, where a stone cairn holds a lime flag;
    a signpost at the path's foot, boulders and pines. Hover: the flag unfurls and waves."""
    from mathutils.bvhtree import BVHTree
    z = _plinth_small(c, p, r=1.05)
    _mountain(c, p, mat("logo_lime"), 0.46, 0.8, (0.44, 0.36, z), seed=3, snow=paper(), snow_line=0.7)
    _mountain(c, p, mat("logo_deep"), 0.42, 0.66, (-0.52, 0.4, z), seed=8, snow=paper(), snow_line=0.72)
    main = _mountain(c, p, mat("logo_dark"), 0.8, 1.22, (-0.02, -0.04, z), seed=5, snow=paper(), snow_line=0.66)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(main, dg)
    inv = main.matrix_world.inverted()
    def surface(x, y):
        """The point on the mountain's face above (x, y) in the diorama's space: cast down from above."""
        o_w = p.matrix_world @ Vector((x, y, z + 3))
        d_w = (p.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
        hit = bvh.ray_cast(inv @ o_w, (inv.to_3x3() @ d_w).normalized())
        if hit[0] is None:
            return None
        return p.matrix_world.inverted() @ (main.matrix_world @ hit[0])
    # the path of paper steps: switchbacks up the face toward us
    pts = []
    for k in range(5):
        side = -1 if k % 2 == 0 else 1
        for j in range(7):
            t = (k + j / 7) / 5
            ang = math.radians(-90 + side * (55 - 110 * j / 7))
            rr = 0.74 * (1 - t) + 0.06
            pts.append((-0.02 + math.cos(ang) * rr, -0.04 + math.sin(ang) * rr))
    prev = None
    for (x, y) in pts:
        q = surface(x, y)
        if q is None:
            continue
        if prev is not None and (q - prev).length < 0.055:
            continue
        d = (q - prev) if prev is not None else Vector((1, 0, 0))
        yaw = math.degrees(math.atan2(d.y, d.x))
        box(c, p, mat("wood"), (0.075, 0.055, 0.018), loc=(q.x, q.y, q.z + 0.012), rot=(0, 0, yaw), bevel=0.004)
        prev = q
    top = surface(-0.02, -0.04) or Vector((-0.02, -0.04, z + 1.22))
    # the cairn and the flag on the summit
    for k, (r, zz) in enumerate(((0.06, 0.02), (0.045, 0.07), (0.032, 0.11))):
        ball(c, p, mat("stone"), r, loc=(top.x + 0.005 * k, top.y, top.z - 0.04 + zz), scale=(1.3, 1.1, 0.75))
    rod(c, p, mat("log"), top, top + Vector((0, 0, 0.5)), r=0.016, verts=6)
    ball(c, p, mat("logo_gold"), 0.025, loc=tuple(top + Vector((0, 0, 0.51))))
    m = _mark()
    flag = _empty(c, p, "flag", loc=tuple(top + Vector((0, 0, 0.48))))
    def cloth(u, v):
        return (u * 0.4, 0.035 * math.sin(u * 5.5), -v * 0.24 + 0.035 * math.sin(u * 4.2))
    sheet(c, flag, accent(), cloth, nu=14, nv=2, thick=0.012)
    if ANIMATE:                                                          # hover: the flag unfurls and waves, then rests
        for f, (sx, a) in ((1, (1.0, 0)), (4, (0.55, -10)), (8, (1.18, 16)), (12, (0.9, -12)), (16, (1.1, 10)), (20, (0.96, -4)), (24, (1.0, 0))):
            _key(flag, "scale", f, (sx, 1, 1))
            _key(flag, "rotation_euler", f, (0, 0, math.radians(a)))
        _bound(c, p, tuple(top + Vector((0.5, 0, 0.5))))
    # a signpost at the path's foot, boulders and pines
    sp = _empty(c, p, "signpost", loc=(0.48, -0.62, z), rot=(0, 0, 20))
    rod(c, sp, mat("log"), (0, 0, 0), (0, 0, 0.36), r=0.018, verts=6)
    box(c, sp, mat("wood"), (0.22, 0.025, 0.07), loc=(0.07, 0, 0.3), bevel=0.008)
    mesh(c, sp, mat("wood"), [(0.18, -0.013, 0.335), (0.18, -0.013, 0.265), (0.23, -0.013, 0.3)], [[0, 1, 2]], thick=0.025)
    box(c, sp, mat("wood"), (0.18, 0.025, 0.06), loc=(-0.05, 0, 0.21), bevel=0.008)
    for (x, y, r) in ((0.66, -0.22, 0.1), (-0.64, -0.42, 0.08), (0.2, -0.78, 0.06), (-0.3, -0.72, 0.07)):
        ball(c, p, mat("stone"), r, loc=(x, y, z + r * 0.5), scale=(1.3, 1, 0.8))
    for (x, y, s) in ((0.8, 0.0, 1.0), (-0.8, -0.1, 1.1), (-0.7, 0.7, 0.9), (0.76, 0.62, 0.8), (0.04, -0.84, 0.75)):
        _pine(c, p, x, y, z, s=s)
    p.rotation_euler = (0, 0, math.radians(-8))


def _revolve(c, p, m, profile, z0, z1, nu=40, nv=40, loc=(0, 0, 0), cap_ends=False):
    """A smooth surface of revolution: radius profile(t) for t 0..1 from z0 to z1. With cap_ends, closed with discs."""
    def surf(u, v):
        r = profile(u)
        th = 2 * math.pi * v
        return (loc[0] + r * math.cos(th), loc[1] + r * math.sin(th), loc[2] + z0 + (z1 - z0) * u)
    o = sheet(c, p, m, surf, nu=nu, nv=nv, thick=0.003)
    for poly in o.data.polygons:
        poly.use_smooth = True
    if cap_ends:
        for t, zz in ((0.0, z0), (1.0, z1)):
            r = profile(t)
            if r > 0.004:
                cyl(c, p, m, r, 0.004, loc=(loc[0], loc[1], loc[2] + zz), verts=nv)
    return o


def build_camp_hourglass(c, p):
    """Time at camp: a classic hourglass, glass bulbs swelling from the boards and pinching to a narrow waist, gold
    sand heaped in the lower bulb and a band of it left above, a lime thread of sand running between; a slim wooden
    frame with gold finials; behind it a small paper tent, a lantern glowing on a post, a stump. Hover: the
    hourglass turns over and the sand runs again."""
    z = _plinth_small(c, p, r=1.05)
    tent = _empty(c, p, "tent", loc=(-0.52, 0.5, z), rot=(0, 0, 28))
    w, d, h = 0.24, 0.32, 0.34
    mesh(c, tent, paper(), [(-w, -d, 0), (w, -d, 0), (0, -d, h), (-w, d, 0), (w, d, 0), (0, d, h)],
         [[0, 1, 2], [3, 5, 4], [0, 2, 5, 3], [1, 4, 5, 2]], thick=0.015)
    mesh(c, tent, mat("logo_dark"), [(-0.1, -d - 0.006, 0), (0.1, -d - 0.006, 0), (0, -d - 0.006, 0.22)], [[0, 1, 2]], thick=0.01)
    rod(c, tent, mat("log"), (0, -d - 0.04, 0), (0, -d - 0.04, h + 0.06), r=0.01, verts=5)
    lp = Vector((0.6, 0.44, z))
    rod(c, p, mat("log"), lp, lp + Vector((0, 0, 0.6)), r=0.02, verts=6)
    rod(c, p, mat("log"), lp + Vector((0, 0, 0.58)), lp + Vector((-0.14, 0, 0.58)), r=0.012, verts=5)
    lan = _empty(c, p, "lantern", loc=tuple(lp + Vector((-0.14, 0, 0.42))))
    cyl(c, lan, mat("logo_gold"), 0.05, 0.1, verts=10)
    cone(c, lan, mat("logo_dark"), 0.07, 0.015, 0.05, loc=(0, 0, 0.075), verts=10)
    cyl(c, lan, mat("logo_dark"), 0.055, 0.015, loc=(0, 0, -0.055), verts=10)
    cyl(c, p, mat("log"), 0.12, 0.12, loc=(-0.68, -0.22, z + 0.06), verts=14)
    cyl(c, p, mat("wood"), 0.105, 0.01, loc=(-0.68, -0.22, z + 0.125), verts=14)
    # the hourglass
    m = _mark()
    H, B, R = 0.62, 0.04, 0.125                                          # height, board thickness, bulb radius
    pivot = _empty(c, p, "hourglass_pivot", loc=(0.1, -0.12, z + H))      # its middle (the glass is scaled x2)
    hg = _empty(c, pivot, "hourglass", loc=(0, 0, -H))
    hg.scale = (2.0, 2.0, 2.0)
    if ANIMATE:                                                          # hover: lifts a touch, turns over once, sets down
        for f, a, lift in ((1, 0, 0), (3, 0, 0.06), (17, 360, 0.06), (20, 360, 0.0), (24, 360, 0)):
            _key(pivot, "rotation_euler", f, (0, math.radians(a), 0))
            _key(pivot, "location", f, (0.1, -0.12, z + H + lift))
        for sx in (-1, 1):
            _bound(c, p, (0.1 + sx * (H + 0.05), -0.12, z + H))
    g0, g1 = B, H - B                                                    # the glass runs between the boards
    mid = (g0 + g1) / 2
    def bulb(t):
        """One bulb from its board (t=0) to the waist (t=1): rounded shoulders, then pinching in."""
        neck = 0.62 + 0.38 * math.sin(min(t / 0.12, 1.0) * math.pi / 2)  # a short collar at the board
        body = math.cos(math.pi / 2 * t ** 1.5)
        return R * (0.1 + 0.9 * body) * neck
    glass = bpy.data.materials.get("glass") or bpy.data.materials.new("glass")
    glass.use_nodes = True
    _gn = glass.node_tree.nodes["Principled BSDF"]
    _gn.inputs["Base Color"].default_value = hex_rgb("#EEF6F2") + (1,)
    _set(_gn, ["Alpha"], 0.2)
    _set(_gn, ["Roughness"], 0.15)
    _revolve(c, hg, glass, lambda t: bulb(t), g0, mid)
    _revolve(c, hg, glass, lambda t: bulb(1 - t), mid, g1)
    sand = mat("logo_gold")
    # the heap below: fills the lower bulb to 45%, a soft mound on top
    lo_top = g0 + (mid - g0) * 0.45
    _revolve(c, hg, sand, lambda t: bulb(t * 0.45) * 0.93, g0 + 0.003, lo_top, cap_ends=True)
    _revolve(c, hg, sand, lambda t: bulb(0.45) * 0.93 * (1 - t) ** 0.7, lo_top, lo_top + 0.05)
    # what's left above: from the waist up to 40% of the upper bulb, dished in the middle
    up_top = mid + (g1 - mid) * 0.4
    _revolve(c, hg, sand, lambda t: bulb(1 - (t * 0.4 + 0.0) if False else 1 - t * 0.4) * 0.93, mid + 0.004, up_top, cap_ends=True)
    rod(c, hg, accent(), (0, 0, lo_top + 0.04), (0, 0, mid + 0.01), r=0.0055, verts=6)   # the thread of sand: lime, the moving part
    for zz in (B / 2, H - B / 2):                                        # round boards, bevelled
        cyl(c, hg, mat("log"), R + 0.05, B, loc=(0, 0, zz), verts=32, bevel=0.01)
    for k in range(3):                                                   # slim posts, gold finials
        a = 2 * math.pi * k / 3 + 0.5
        x, y = math.cos(a) * (R + 0.03), math.sin(a) * (R + 0.03)
        rod(c, hg, mat("log"), (x, y, B), (x, y, H - B), r=0.011, verts=8)
        for zz in (-0.012, H + 0.012):
            ball(c, hg, mat("logo_gold"), 0.018, loc=(x, y, zz))
    for (x, y, s) in ((0.8, 0.0, 0.9), (-0.84, 0.2, 1.0), (0.2, 0.8, 0.8), (-0.1, -0.84, 0.7)):
        _pine(c, p, x, y, z, s=s)
    p.rotation_euler = (0, 0, math.radians(-12))


# The camp's hover moves (frame grids; the still is the first frame), into public/student/camp: slot -> (builder,
# frame size, elevation, margin, line weight, frames, grid columns). Rendered only when asked for by name (--only).
CAMP_MOVES = {
    "camp-fire-move": (build_camp_fire, (400, 400), 18, 0.05, 1.2, 24, 6),
    "camp-summit-move": (build_camp_summit, (400, 400), 18, 0.05, 1.2, 24, 6),
    "camp-hourglass-move": (build_camp_hourglass, (400, 400), 18, 0.05, 1.2, 24, 6),
}

# Progress candidates (the camp), rendered only when asked for by name (--only), into public/student/camp.
CAMP = {
    "camp-fire": (build_camp_fire, (480, 480), 18, 0.05, 1.2),
    "camp-summit": (build_camp_summit, (480, 480), 18, 0.05, 1.2),
    "camp-hourglass": (build_camp_hourglass, (480, 480), 18, 0.05, 1.2),
}

SUBJECTS = {
    "english-a": (build_english_a, (600, 600), 18, 0.04, 1.2),
    "english-b": (build_english_b, (600, 600), 20, 0.08, 1.2),
    "english-c": (build_english_c, (600, 600), 16, 0.08, 1.2),
    "maths-a": (build_maths_a, (600, 600), 26, 0.08, 1.2),
    "maths-b": (build_maths_b, (600, 600), 24, 0.04, 1.2),
    "maths-c": (build_maths_c, (600, 600), 18, 0.04, 1.2),
    "science-a": (build_science_a, (600, 600), 16, 0.04, 1.2),
    "science-b": (build_science_b, (600, 600), 20, 0.04, 1.2),
    "science-c": (build_science_c, (600, 600), 18, 0.08, 1.2),
    "social": (build_social, (600, 600), 34, 0.08, 1.2),
    "history": (build_history, (600, 600), 16, 0.08, 1.2),
    "geography": (build_geography, (600, 600), 14, 0.08, 1.2),
    "hindi": (build_hindi, (600, 600), 26, 0.08, 1.2),
    "fallback": (build_fallback, (600, 600), 14, 0.08, 1.2),
}


# The dashboard's renders: slot -> (builder, size, elevation, margin, line weight).
# The stats show at 104-150px, so their lines are drawn heavier.
DASHBOARD = {
    "streak": (build_stat_streak, (512, 512), 22, 0.08, 1.45),
    "chapters": (build_stat_chapters, (512, 512), 40, 0.08, 1.45),
    "longest": (build_stat_longest, (512, 512), 16, 0.08, 1.45),
    "time": (build_stat_time, (512, 512), 34, 0.08, 1.45),
    "empty-recent": (build_empty_recent, (900, 600), 22, 0.07, 1.0),
}
# Rendered as a frame sequence: slot -> (builder, frame size, elevation, margin, line weight, frames). Written as
# <slot>-sprite.webp (the frames side by side, played by MomentArt with CSS steps) and <slot>.webp (the last frame).
ANIMATED = {
    "school-sent": (build_school_sent, (360, 360), 18, 0.07, 1.3, 26),
    "chapter-complete": (build_chapter_complete, (320, 320), 48, 0.09, 1.3, 22),
    "streak-up": (build_streak_up, (360, 360), 22, 0.08, 1.3, 18),
    "streak-record": (build_streak_record, (360, 360), 16, 0.08, 1.3, 24),
    "guardian-linked": (build_guardian_linked, (420, 336), 30, 0.08, 1.3, 22),
    "link-failed": (build_link_failed, (420, 336), 30, 0.08, 1.3, 22),
    "device-paired": (build_device_paired, (360, 360), 20, 0.08, 1.3, 22),
    "device-empty": (build_device_empty, (360, 360), 26, 0.08, 1.3, 20),
}
# Subject hover moves, rendered as frame grids (into public/student/subjects): slot -> (builder, frame size,
# elevation, margin, line weight, frames, grid columns). The still is the first frame: the card at rest.
# The three share one frame box (_subject_box), one camera and one ground line. They render large (704px) and
# scripts/crop-subject-moves.py cuts them all with one shared square crop down to the 480px the card ships, so the
# art fills the card while staying at one scale; the thinner line weight comes out at the old ~2px after the crop.
SUBJECT_MOVES = {
    "english-move": (build_english_a, (704, 704), 18, 0.04, 0.85, 30, 6),
    "maths-move": (build_maths_c, (704, 704), 18, 0.04, 0.85, 36, 6),
    "science-move": (build_science_a, (704, 704), 18, 0.04, 0.85, 48, 8),
}
SETS = {"moments": "moments", "dashboard": "dashboard", "popups": "moments", "animated": "moments", "subjects": "subjects", "subject_moves": "subjects", "camp": "camp", "camp_moves": "camp"}     # set -> folder under public/student

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


def _save_raw(px, w, h, path, quality=90):
    """Write pixel values to a WebP as they are (again no colour management)."""
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.colorspace_settings.name = "Non-Color"
    img.alpha_mode = "STRAIGHT"
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = "WEBP"
    img.save(quality=quality)
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


def render_sprite(sc, folder, slot, frames, cols=None, still="last"):
    """Render frames 1..n into one WebP the page steps through: side by side, or in a grid of `cols` columns (long
    sequences, which would pass WebP's 16k-pixel width), plus one frame on its own as the still (`still`: the last
    frame, or the first for hover moves that start from rest)."""
    import numpy as np
    fmt = sc.render.image_settings.file_format
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    strip = []
    for f in range(1, frames + 1):
        sc.frame_set(f)
        path = os.path.join(bpy.app.tempdir, f"{slot}_f{f:03d}.png")
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        px, w, h = _pixels(path)
        strip.append(px)
        os.remove(path)
    sc.render.image_settings.file_format = fmt
    sc.render.image_settings.color_depth = "8"
    if cols:
        blank = np.zeros_like(strip[0])
        rows = [strip[i:i + cols] + [blank] * (cols - len(strip[i:i + cols])) for i in range(0, frames, cols)]
        # Blender's pixels run bottom-up, so the first row of frames goes last
        sheet = np.concatenate([np.concatenate(r, axis=1) for r in rows][::-1], axis=0)
        _save_raw(sheet, w * cols, h * len(rows), os.path.join(folder, f"{slot}-sprite.webp"), quality=78)   # big grids: lighter
    else:
        sheet = np.concatenate(strip, axis=1)
        _save_raw(sheet, w * frames, h, os.path.join(folder, f"{slot}-sprite.webp"))
    _save_raw(strip[0] if still == "first" else strip[-1], w, h, os.path.join(folder, f"{slot}.webp"))
    sc.frame_set(1)
    print(f"[moments] rendered {folder}/{slot}: {frames} frames")


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
    jobs += [("popups", slot, fn, size, el, margin, 1.0) for slot, (fn, size, el, margin) in POPUPS.items()]
    jobs += [("animated", slot, fn, size, el, margin, weight) for slot, (fn, size, el, margin, weight, _n) in ANIMATED.items()]
    # Subject dioramas render only when asked for by name (--only), so a full run does not re-render the candidates.
    jobs += [("subjects", slot, *spec) for slot, spec in SUBJECTS.items() if slot in ONLY]
    jobs += [("camp", slot, *spec) for slot, spec in CAMP.items() if slot in ONLY]
    jobs += [("subject_moves", slot, fn, size, el, margin, weight) for slot, (fn, size, el, margin, weight, _n, _c) in SUBJECT_MOVES.items() if slot in ONLY]
    jobs += [("camp_moves", slot, fn, size, el, margin, weight) for slot, (fn, size, el, margin, weight, _n, _c) in CAMP_MOVES.items() if slot in ONLY]
    built = []
    for set_, slot, fn, size, el, margin, weight in jobs:
        if ONLY and slot not in ONLY:
            continue
        coll = bpy.data.collections.new(f"{set_}:{slot}")
        sc.collection.children.link(coll)
        root = bpy.data.objects.new(f"{slot}_root", None)
        coll.objects.link(root)
        global ANIMATE
        ANIMATE = set_ in ("subject_moves", "camp_moves")
        fn(coll, root)
        ANIMATE = False
        normalise(coll, root)
        built.append((coll, set_, slot, size, el, margin, weight))

    for coll, set_, slot, size, el, margin, weight in built:
        for other, *_ in built:
            other.hide_render = other is not coll
        frame(sc, coll, size, el, margin, weight)
        folder = os.path.join(OUT_ROOT, SETS[set_])
        os.makedirs(folder, exist_ok=True)
        if set_ in ("subject_moves", "camp_moves"):
            _f, _s, _e, _m, _w, n_frames, cols = (SUBJECT_MOVES if set_ == "subject_moves" else CAMP_MOVES)[slot]
            sc.frame_set(1)
            frame(sc, coll, size, el, margin, weight)
            render_sprite(sc, folder, slot, n_frames, cols=cols, still="first")
        elif set_ == "animated":
            sc.frame_set(1)
            frame(sc, coll, size, el, margin, weight)
            render_sprite(sc, folder, slot, ANIMATED[slot][5])
        elif set_ in ("dashboard", "popups", "subjects", "camp"):
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

# Run as a script (blender -P); render-hero-subject.py imports this file for its builders and helpers.
if __name__ == "__main__":
    main()
