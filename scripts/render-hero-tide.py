"""The Continue card's full-bleed scene: a noria on a river, for the hero's tide animation.

One wide river valley across the whole card (1440x400): calm water and far bank on the left behind the text, the
noria (wooden wheel, clay pots, one glazed lime) on the right, a green bamboo trough on crossed sticks carrying
water to an old wooden bucket with iron hoops on the near bank. The river's surface is an Ocean-modifier
displacement (a real wave spectrum), so the water reads as water.

Style stills, for choosing a look:

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/render-hero-tide.py -- \\
        --style stylized|realistic|painted --out /path/still.png [--samples 64] [--blend save.blend]
"""

import math
import os
import random
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


STYLE = _arg("--style", "stylized")
OUT = os.path.abspath(_arg("--out", "/tmp/hero.png"))
SAMPLES = int(_arg("--samples", "64"))
SAVE_BLEND = _arg("--blend")
W, H = 1440, 400
rnd = random.Random(11)

# ---------------------------------------------------------------- colours (sRGB hex), tuned per style
BASE = {
    "sky_top": "#F6F2E2", "sky_low": "#E7EFCB",
    "wood": "#9A6A3E", "wood_dark": "#6B4526", "wood_light": "#C08A55",
    "clay": "#C26A3F", "clay_dark": "#9B4E2C", "lime": "#A6CF08",
    "bamboo": "#8FB043", "bamboo_node": "#6E8B2C",
    "grass": "#6FA33A", "grass_dark": "#4E8A2A", "earth": "#8A6A45", "rock": "#A9A391",
    "water": "#3E8F8A", "water_deep": "#245F66", "foam": "#F4F7F2",
    "iron": "#3B3A36", "rope": "#C9A66B",
    "leaf1": "#4E9A2A", "leaf2": "#287624", "leaf3": "#86B83A", "trunk": "#7A5634",
    "hill": "#A9C79A", "hill2": "#C4D8B0",
}
TUNE = {
    "stylized": {},
    "realistic": {"grass": "#5E8C34", "water": "#2F6E68", "water_deep": "#1B4A4F", "hill": "#93AE8C", "clay": "#B5603A"},
    "painted": {"grass": "#7DB04A", "water": "#4C9E99", "hill": "#B8D2A6", "sky_low": "#EDF3D2"},
}
C = {**BASE, **TUNE.get(STYLE, {})}


def lin(h):
    h = h.lstrip("#")
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(f(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def _in(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


# ---------------------------------------------------------------- materials
_M = {}


def mat(key, rough=0.55, metal=0.0, grain=None, bump=0.0, sheen=0.0):
    """A material per colour key, built for the chosen style.

    stylized: clean principled colour with a little variation; realistic: procedural grain/noise colour and bump;
    painted: a toon look (EEVEE Shader-to-RGB into a 3-step ramp) with a painterly noise in the colour."""
    tag = f"{key}_{rough}_{metal}_{grain}_{bump}"
    if tag in _M:
        return _M[tag]
    m = bpy.data.materials.new(tag)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    out = nt.nodes["Material Output"]
    col = lin(C[key])
    dark = tuple(c * 0.62 for c in col[:3]) + (1,)
    light = tuple(min(1, c * 1.25) for c in col[:3]) + (1,)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    tc = nt.nodes.new("ShaderNodeTexCoord")

    def colour_variation(scale, amount):
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = 6
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = tuple(a + (b - a) * (1 - amount) for a, b in zip(dark, col))
        ramp.color_ramp.elements[1].color = tuple(a + (b - a) * (1 - amount) for a, b in zip(light, col))
        nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
        return ramp, n

    if STYLE == "realistic" and grain == "wood":
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.wave_type = "BANDS"
        wave.bands_direction = "Z"
        wave.inputs["Scale"].default_value = 6
        wave.inputs["Distortion"].default_value = 9
        wave.inputs["Detail"].default_value = 6
        nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = dark
        ramp.color_ramp.elements[1].color = light
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        bm = nt.nodes.new("ShaderNodeBump")
        bm.inputs["Strength"].default_value = 0.25
        nt.links.new(wave.outputs["Fac"], bm.inputs["Height"])
        nt.links.new(bm.outputs["Normal"], bsdf.inputs["Normal"])
    elif STYLE == "realistic":
        ramp, n = colour_variation(14 if grain else 6, 0.55)
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        if bump:
            bm = nt.nodes.new("ShaderNodeBump")
            bm.inputs["Strength"].default_value = bump
            nt.links.new(n.outputs["Fac"], bm.inputs["Height"])
            nt.links.new(bm.outputs["Normal"], bsdf.inputs["Normal"])
    elif STYLE == "painted":
        # toon: light as a 3-step ramp from dark to light versions of the colour, broken up by a brushy noise
        s2r = nt.nodes.new("ShaderNodeShaderToRGB")
        diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
        diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
        nt.links.new(diffuse.outputs["BSDF"], s2r.inputs["Shader"])
        bw = nt.nodes.new("ShaderNodeRGBToBW")
        nt.links.new(s2r.outputs["Color"], bw.inputs["Color"])
        brush = nt.nodes.new("ShaderNodeTexNoise")
        brush.inputs["Scale"].default_value = 9
        brush.inputs["Detail"].default_value = 3
        brush.inputs["Distortion"].default_value = 1.4
        nt.links.new(tc.outputs["Object"], brush.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMath")
        mix.operation = "MULTIPLY_ADD"
        mix.inputs[1].default_value = 1.0
        nt.links.new(bw.outputs["Val"], mix.inputs[0])
        sub = nt.nodes.new("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = 0.5
        nt.links.new(brush.outputs["Fac"], sub.inputs[0])
        scale = nt.nodes.new("ShaderNodeMath")
        scale.operation = "MULTIPLY"
        scale.inputs[1].default_value = 0.25
        nt.links.new(sub.outputs[0], scale.inputs[0])
        nt.links.new(scale.outputs[0], mix.inputs[2])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        els = ramp.color_ramp.elements
        els[0].position, els[0].color = 0.0, dark
        els[1].position, els[1].color = 0.28, col
        e = els.new(0.62)
        e.color = light
        nt.links.new(mix.outputs[0], ramp.inputs["Fac"])
        emit = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(ramp.outputs["Color"], emit.inputs["Color"])
        nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    else:
        ramp, n = colour_variation(5, 0.25)
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        _in(bsdf, ["Coat Weight"], 0.05)
    _M[tag] = m
    return m


def water_mat(key="water", inside=False):
    tag = f"water_{key}_{inside}"
    if tag in _M:
        return _M[tag]
    m = bpy.data.materials.new(tag)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    out = nt.nodes["Material Output"]
    if STYLE == "painted":
        # painted water: flat bands from the facing angle, light crests from a layer-weight fresnel
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.35
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        els = ramp.color_ramp.elements
        els[0].color = lin(C["water_deep"])
        els[1].position, els[1].color = 0.45, lin(C["water"])
        e = els.new(0.8)
        e.color = lin(C["foam"])
        nt.links.new(lw.outputs["Facing"], ramp.inputs["Fac"])
        emit = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(ramp.outputs["Color"], emit.inputs["Color"])
        nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    else:
        bsdf.inputs["Base Color"].default_value = lin(C[key])
        bsdf.inputs["Roughness"].default_value = 0.04 if STYLE == "realistic" else 0.08
        if not inside:
            # foam: world height of the surface -> 0..1 between 0.32 m and 0.75 m, broken up by a noise
            geo = nt.nodes.new("ShaderNodeNewGeometry")
            sep = nt.nodes.new("ShaderNodeSeparateXYZ")
            nt.links.new(geo.outputs["Position"], sep.inputs["Vector"])
            noise = nt.nodes.new("ShaderNodeTexNoise")
            noise.inputs["Scale"].default_value = 3.5
            noise.inputs["Detail"].default_value = 4
            nt.links.new(geo.outputs["Position"], noise.inputs["Vector"])
            add = nt.nodes.new("ShaderNodeMath")
            add.operation = "MULTIPLY_ADD"
            add.inputs[1].default_value = 0.35
            nt.links.new(noise.outputs["Fac"], add.inputs[0])
            nt.links.new(sep.outputs["Z"], add.inputs[2])
            mr = nt.nodes.new("ShaderNodeMapRange")
            mr.inputs["From Min"].default_value = 0.5
            mr.inputs["From Max"].default_value = 0.95
            nt.links.new(add.outputs[0], mr.inputs["Value"])
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.inputs[6].default_value = lin(C[key])
            mix.inputs[7].default_value = lin(C["foam"])
            nt.links.new(mr.outputs["Result"], mix.inputs[0])
            nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
            inv = nt.nodes.new("ShaderNodeMath")
            inv.operation = "SUBTRACT"
            inv.inputs[0].default_value = 0.42 if STYLE != "realistic" else 0.92
            nt.links.new(mr.outputs["Result"], inv.inputs[1])
            clamp = nt.nodes.new("ShaderNodeClamp")
            nt.links.new(inv.outputs[0], clamp.inputs["Value"])
            nt.links.new(clamp.outputs["Result"], bsdf.inputs[
                "Transmission Weight" if "Transmission Weight" in bsdf.inputs else "Transmission"])
        bsdf.inputs["IOR"].default_value = 1.333
        _in(bsdf, ["Transmission Weight", "Transmission"], 0.92 if STYLE == "realistic" else 0.42)
        if STYLE == "realistic" and not inside:
            vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
            vol.inputs["Color"].default_value = lin(C["water"])
            vol.inputs["Density"].default_value = 1.6
            nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    _M[tag] = m
    return m


# ---------------------------------------------------------------- primitives
def _link(o, m=None, smooth=False):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    bpy.context.scene.collection.objects.link(o)
    if m is not None:
        o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def bevel(o, w=0.02, seg=2):
    b = o.modifiers.new("bevel", "BEVEL")
    b.width = w
    b.segments = seg
    return o


def box(m, size, loc, rot=(0, 0, 0), bw=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    _link(o, m)
    return bevel(o, bw) if bw else o


def cyl(m, r, depth, loc, rot=(0, 0, 0), verts=32, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth)
    o = bpy.context.active_object
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    return _link(o, m, smooth)


def ball(m, r, loc, scale=(1, 1, 1), sub=3, smooth=True):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r)
    o = bpy.context.active_object
    o.location = loc
    o.scale = scale
    return _link(o, m, smooth)


def torus(m, R, r, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=12)
    o = bpy.context.active_object
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    o.scale = scale
    return _link(o, m, True)


def rod(m, a, b, r=0.03, verts=10):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(m, r, d.length, tuple((a + b) / 2), verts=verts)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o


def lumpy(o, strength=0.12, scale=1.6):
    tex = bpy.data.textures.new(f"lump{len(bpy.data.textures)}", "CLOUDS")
    tex.noise_scale = scale
    d = o.modifiers.new("lump", "DISPLACE")
    d.texture = tex
    d.strength = strength
    return o


def stream_mat(key="stream", calm=False):
    """Running water at card size: bright, clear aqua, white aerated streaks drawn along the flow (the curve's own
    length coordinate), glossy, a touch self-lit so it stays bright in shade."""
    if key in _M:
        return _M[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    # along the flow (the curve's U) stretched long, across it fine: streaks
    mapping.inputs["Scale"].default_value = (2.0 if calm else 1.2, 9.0 if calm else 14.0, 1.0)
    nt.links.new(tc.outputs["UV"], mapping.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 8
    noise.inputs["Distortion"].default_value = 0.6
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.3, lin("#2FA3A6")
    els[1].position, els[1].color = (0.9 if calm else 0.8), lin("#F4FBFA")
    mid = els.new(0.55)
    mid.color = lin("#7FD6D0")
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.06
    bsdf.inputs["IOR"].default_value = 1.333
    _in(bsdf, ["Transmission Weight", "Transmission"], 0.25 if calm else 0.15)
    _in(bsdf, ["Coat Weight"], 0.6)
    _in(bsdf, ["Emission Color", "Emission"], lin("#9FE3DD"))
    _in(bsdf, ["Emission Strength"], 0.12)
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _M[key] = m
    return m


def foam_mat():
    if "foam" in _M:
        return _M["foam"]
    m = bpy.data.materials.new("foam")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin("#FBFDFC")
    b.inputs["Roughness"].default_value = 0.55
    _in(b, ["Subsurface Weight", "Subsurface"], 0.3)
    _in(b, ["Emission Color", "Emission"], lin("#FFFFFF"))
    _in(b, ["Emission Strength"], 0.12)
    _M["foam"] = m
    return m


_PROFILES = {}


def _profile(flat):
    """A bevel profile: a flattened lens, for water lying in a channel."""
    if flat in _PROFILES:
        return _PROFILES[flat]
    cu = bpy.data.curves.new(f"profile{flat}", "CURVE")
    sp = cu.splines.new("NURBS")
    n = 16
    sp.points.add(n - 1)
    for i, p in enumerate(sp.points):
        a = 2 * math.pi * i / n
        p.co = (math.cos(a), math.sin(a) * flat, 0, 1)
    sp.use_cyclic_u = True
    o = bpy.data.objects.new(f"profile{flat}", cu)
    bpy.context.scene.collection.objects.link(o)
    o.hide_render = o.hide_viewport = True
    _PROFILES[flat] = o
    return o


def tube(m, pts, r, res=12, radii=None, flat=1.0):
    """A smooth stream through points: round for falling water, a flat lens (flat < 1) for water lying in a
    channel; radii (one per point) narrow a falling stream as it speeds up."""
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.use_fill_caps = True
    if flat < 1.0:
        cu.bevel_mode = "OBJECT"
        cu.bevel_object = _profile(flat)
        scale = r
    else:
        cu.bevel_depth = r
        cu.bevel_resolution = 4
        scale = 1.0
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for i, (p, q) in enumerate(zip(sp.points, pts)):
        p.co = (q[0], q[1], q[2], 1)
        p.radius = (radii[i] if radii else 1.0) * scale
    sp.use_endpoint_u = True
    sp.order_u = 3
    cu.resolution_u = res
    o = bpy.data.objects.new("tube", cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m)
    return o


# ---------------------------------------------------------------- the scene
def build():
    wood, wood_d, wood_l = mat("wood", 0.7, grain="wood"), mat("wood_dark", 0.75, grain="wood"), mat("wood_light", 0.65, grain="wood")
    grass, grass_d, earth = mat("grass", 0.85, grain="g", bump=0.2), mat("grass_dark", 0.85, grain="g", bump=0.2), mat("earth", 0.9, grain="g", bump=0.3)
    rock = mat("rock", 0.8, grain="g", bump=0.4)
    clay, lime = mat("clay", 0.6, grain="g", bump=0.1), mat("lime", 0.25)
    bamboo, node = mat("bamboo", 0.45), mat("bamboo_node", 0.5)
    iron, rope = mat("iron", 0.45, metal=0.7), mat("rope", 0.9, grain="g")
    leaves = [mat("leaf1", 0.8, grain="g", bump=0.2), mat("leaf2", 0.8, grain="g", bump=0.2), mat("leaf3", 0.8, grain="g", bump=0.2)]
    trunk = mat("trunk", 0.85, grain="wood")
    hill, hill2 = mat("hill", 0.95), mat("hill2", 0.95)

    # river: a dense grid, displaced by an ocean spectrum (the current runs right to left); a "swell" vertex group
    # (1 mid-river, fading to 0 at both banks) lets the tide's wave die down where it meets the banks
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=300, y_subdivisions=90, size=1)
    river = bpy.context.active_object
    river.name = "river"
    river.scale = (42, 11.2, 1)
    bpy.ops.object.transform_apply(scale=True)
    river.location = (0, -0.9, 0.0)
    vg = river.vertex_groups.new(name="swell")
    def smooth(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)
    for v in river.data.vertices:
        y = v.co.y + river.location.y
        vg.add([v.index], smooth((y + 6.1) / 2.4) * smooth((4.3 - y) / 1.6), "REPLACE")
    oc = river.modifiers.new("ocean", "OCEAN")
    oc.geometry_mode = "DISPLACE"
    oc.spatial_size = 30
    oc.resolution = 16
    oc.wave_scale = 0.32
    oc.choppiness = 1.1
    oc.wind_velocity = 6
    oc.wave_alignment = 2.0
    oc.wave_direction = math.pi          # the current runs right to left
    oc.time = 3.0
    _link(river, water_mat(), True)
    box(mat("water_deep", 0.9), (44, 14, 0.2), (0, -0.5, -0.9), bw=0)

    # near bank: grass on an earthen lip, a strip across the bottom of the card
    # near bank: a grassy lip along the very bottom of the card
    box(earth, (44, 8, 0.5), (0, -10.4, -0.2), bw=0.05)
    lumpy(box(grass, (44, 7.8, 0.14), (0, -10.5, 0.08), bw=0.06), 0.06, 2.4)
    # far bank, then low hills and a few trees, kept mostly to the right so the text area stays calm
    lumpy(box(grass_d, (40, 3.0, 0.5), (0, 5.2, 0.05), bw=0.08), 0.08, 2.0)
    for x, y, r, h, m in ((-9, 26, 9, 0.38, hill2), (-1, 30, 12, 0.34, hill2), (8, 24, 8, 0.45, hill), (14, 28, 9, 0.4, hill)):
        ball(m, r, (x, y, -1.5), scale=(1.6, 0.6, h))
    for (x, y, s) in ((1.5, 7.0, 1.0), (2.9, 6.6, 1.3), (7.2, 7.4, 1.5), (8.6, 6.8, 1.1), (10.5, 7.8, 1.4)):
        cyl(trunk, 0.09 * s, 1.2 * s, (x, y, 0.3 + 0.6 * s), verts=10)
        for k in range(3):
            lumpy(ball(leaves[k % 3], 0.55 * s, (x + rnd.uniform(-0.3, 0.3) * s, y + rnd.uniform(-0.2, 0.2), 0.3 + 1.3 * s + k * 0.35 * s), sub=2), 0.15 * s, 1.2)
    for k in range(16):                                              # bushes and reeds along both banks
        x = rnd.uniform(-7.5, 8.5)
        if -1.5 < x < 1.0:
            continue
        lumpy(ball(leaves[k % 3], rnd.uniform(0.25, 0.45), (x, rnd.uniform(3.9, 4.4), 0.35), scale=(1.3, 1, 0.8), sub=2), 0.1, 1.5)
    for k in range(26):
        x = rnd.uniform(-7.5, 7.5)
        side = -6.3 if k % 2 else 3.75
        if side < 0 and x < 1.0:
            continue                                                  # nothing in front of the text
        rod(leaves[1], (x, side, -0.1), (x + rnd.uniform(-0.12, 0.12), side + rnd.uniform(-0.1, 0.1), rnd.uniform(0.5, 0.95)), r=0.018, verts=6)
    for k in range(9):
        x = rnd.uniform(-7, 8)
        lumpy(ball(rock, rnd.uniform(0.12, 0.28), (x, rnd.choice((-6.2, 3.7)), 0.05), scale=(1.3, 1, 0.7), sub=2), 0.05, 2)

    # ---- the noria: two rims of planks, paddles across, spokes, hub, clay pots between the rims
    before_wheel = set(bpy.context.scene.objects)
    cx, cy, R = 5.0, 0.9, 1.55
    hub_z = R - 0.35                                                  # the lowest paddles in the water
    n_seg = 28
    for side in (-0.2, 0.2):
        for k in range(n_seg):
            a0 = 2 * math.pi * k / n_seg
            am = a0 + math.pi / n_seg
            L = 2 * R * math.sin(math.pi / n_seg) * 1.04
            box(wood, (L, 0.06, 0.12), (cx + math.cos(am) * R, cy + side, hub_z + math.sin(am) * R), rot=(0, -math.degrees(am) + 90, 0), bw=0.01)
        for k in range(8):
            a = 2 * math.pi * k / 8 + math.pi / 8
            box(wood_d, (R, 0.07, 0.08), (cx + math.cos(a) * R / 2, cy + side, hub_z + math.sin(a) * R / 2), rot=(0, -math.degrees(a), 0), bw=0.01)
    for k in range(14):                                               # paddles across the rims
        a = 2 * math.pi * k / 14
        box(wood_l, (0.06, 0.5, 0.24), (cx + math.cos(a) * (R + 0.05), cy, hub_z + math.sin(a) * (R + 0.05)), rot=(0, -math.degrees(a), 0), bw=0.01)
    cyl(wood_d, 0.2, 0.6, (cx, cy, hub_z), rot=(90, 0, 0), verts=24)
    wheel_parts = set(bpy.context.scene.objects) - before_wheel
    cyl(iron, 0.06, 1.4, (cx, cy, hub_z), rot=(90, 0, 0), verts=12)
    for sy in (-0.55, 0.55):                                          # A-frame posts on both sides, standing in the river
        for dx in (-0.8, 0.8):
            rod(wood_d, (cx + dx, cy + sy, -0.6), (cx, cy + sy, hub_z + 0.05), r=0.07, verts=8)
        box(wood_d, (0.3, 0.12, 0.2), (cx, cy + sy, hub_z), bw=0.02)
    # pots, mouths facing forward along the clockwise turn, tilted outward; the one just past the top glazed lime
    pour = math.radians(55)
    pot_pos = None
    for k in range(10):
        a = pour + k * 2 * math.pi / 10
        tangent = Vector((math.sin(a), 0, -math.cos(a)))
        outward = Vector((math.cos(a), 0, math.sin(a)))
        mouth = (tangent * math.cos(math.radians(22)) + outward * math.sin(math.radians(22))).normalized()
        c = Vector((cx, cy, hub_z)) + outward * (R + 0.2)
        m = lime if k == 0 else clay
        body = ball(m, 0.17, tuple(c), scale=(1, 1, 1.15), sub=3)
        neck_c = c + mouth * 0.17
        neck = cyl(m, 0.09, 0.1, tuple(neck_c), verts=20)
        lip = torus(m, 0.1, 0.03, tuple(c + mouth * 0.22))
        for o in (neck, lip, body):
            o.rotation_euler = mouth.to_track_quat("Z", "Y").to_euler()
        wheel_parts |= {body, neck, lip}
        if k == 0:
            pot_pos = c + mouth * 0.24

    # ---- bamboo trough on crossed sticks, from under the lime pot to the bucket on the near bank
    t0 = Vector((cx + 1.05, cy - 0.05, hub_z + 1.05))
    t1 = Vector((7.55, -1.75, 0.95))
    d = (t1 - t0).normalized()
    rt = 0.12

    def half_pipe(a, b, r, m):
        a, b = Vector(a), Vector(b)
        L = (b - a).length
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=L, end_fill_type="NOTHING")
        o = bpy.context.active_object
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        for v in o.data.vertices:
            v.select = v.co.x < -0.01                                 # cut away the half that ends up on top, so it opens upward
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.delete(type="VERT")
        bpy.ops.object.mode_set(mode="OBJECT")
        o.location = tuple((a + b) / 2)
        q = (b - a).to_track_quat("Z", "X")
        o.rotation_euler = q.to_euler()
        o.rotation_euler.rotate_axis("Z", math.radians(180))
        _link(o, m, True)
        sol = o.modifiers.new("solid", "SOLIDIFY")
        sol.thickness = 0.02
        return o

    half_pipe(t0, t1, rt, bamboo)
    L = (t1 - t0).length
    for k in range(1, 4):
        q = t0 + (t1 - t0) * (k / 4)
        torus(node, rt + 0.005, 0.018, tuple(q)).rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    for f in (0.45,):
        q = t0 + (t1 - t0) * f
        for s in (-1, 1):
            rod(bamboo, (q.x + s * 0.45, q.y, -0.7), (q.x - s * 0.08, q.y, q.z - 0.04), r=0.04, verts=10)
    # water in the trough, the pour from the pot, the trickle into the bucket
    # water: the pour arcs off the pot's lip and narrows as it falls; in the bamboo it lies as a flat, streaky sheet
    # at the bottom of the channel; off the end it falls in a thin trickle, breaking into drops, into the bucket
    sm = stream_mat()
    lip = pot_pos
    land = t0 + Vector((0.12, 0, -rt * 0.35))
    pour_s = tube(sm, [tuple(lip), tuple(lip + Vector((0.16, 0, 0.03))), tuple(lip.lerp(land, 0.6) + Vector((0.08, 0, 0.02))), tuple(land)],
                  0.075, radii=[1.0, 0.9, 0.75, 0.62])
    level = Vector((0, 0, -rt * 0.3))                                  # water level inside the half-pipe
    trough_s = tube(sm, [tuple(t0 + d * 0.12 + level), tuple(t0.lerp(t1, 0.5) + level), tuple(t1 - d * 0.02 + level)],
                    rt * 0.8, flat=0.32, res=24)
    bucket_c = Vector((7.62, -1.9, 0.28))
    lumpy(ball(rock, 0.62, (bucket_c.x + 0.05, bucket_c.y + 0.05, -0.02), scale=(1.25, 1.05, 0.48), sub=3), 0.06, 2.2)
    lumpy(ball(rock, 0.3, (bucket_c.x + 0.75, bucket_c.y + 0.3, -0.05), scale=(1.2, 1, 0.5), sub=2), 0.05, 2)
    spout = t1 + d * 0.02 + level
    drip_to = bucket_c + Vector((0.02, 0.0, 0.5))
    trickle_s = tube(sm, [tuple(spout), tuple(spout + Vector((0.05, -0.02, -0.06))), tuple(spout.lerp(drip_to, 0.55) + Vector((0.02, 0, 0))), tuple(drip_to)],
                     0.055, radii=[1.0, 0.85, 0.7, 0.5])
    drops = [ball(sm, 0.032, tuple(spout.lerp(drip_to, f) + Vector((0.03 * math.sin(f * 9), 0, 0))), scale=(0.8, 0.8, 1.3), sub=2)
             for f in (0.35, 0.62, 0.86)]
    foam_head = lumpy(ball(foam_mat(), 0.1, tuple(land + Vector((0.02, 0, 0.02))), scale=(1.4, 1.0, 0.45), sub=3), 0.03, 6)
    foam_ring = lumpy(torus(foam_mat(), 0.065, 0.02, tuple(drip_to + Vector((0, 0, 0.004))), scale=(1.0, 1.0, 0.45)), 0.018, 9)

    # ---- the old wooden bucket: tapered staves, two iron hoops, a rope handle, water inside
    n = 18
    for k in range(n):
        a = 2 * math.pi * k / n
        r0 = 0.26
        box(wood_l if k % 3 else wood, (0.095, 0.035, 0.52), (bucket_c.x + math.cos(a) * r0, bucket_c.y + math.sin(a) * r0, bucket_c.z + 0.26),
            rot=(math.degrees(math.sin(a)) * -0.12, math.degrees(math.cos(a)) * 0.12, math.degrees(a) + 90), bw=0.006)
    cyl(wood_d, 0.25, 0.04, (bucket_c.x, bucket_c.y, bucket_c.z + 0.04), verts=28)
    for z in (0.12, 0.42):
        torus(iron, 0.27 + z * 0.06, 0.018, (bucket_c.x, bucket_c.y, bucket_c.z + z))
    torus(rope, 0.3, 0.018, (bucket_c.x, bucket_c.y, bucket_c.z + 0.62), rot=(90, 0, 15), scale=(1, 1, 0.75))
    bucket_w = cyl(stream_mat("bucket_water", calm=True), 0.25, 0.02, (bucket_c.x, bucket_c.y, bucket_c.z + 0.5), verts=28)
    return {"pot": pot_pos, "t0": t0, "t1": t1, "bucket": bucket_c, "hub": Vector((cx, cy, hub_z)),
            "wheel_parts": wheel_parts, "river": river, "pour": pour_s, "trough": trough_s, "trickle": trickle_s, "bucket_water": bucket_w,
            "drops": drops, "foam_head": foam_head, "foam_ring": foam_ring}


# ---------------------------------------------------------------- render setup
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    if STYLE == "painted":
        sc.render.engine = "BLENDER_EEVEE"
    else:
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
    try:
        sc.view_settings.view_transform = "AgX"
        sc.view_settings.look = "AgX - Punchy" if STYLE == "stylized" else ("AgX - Base Contrast" if STYLE == "realistic" else "None")
    except Exception:
        pass
    if STYLE == "painted":
        sc.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    if STYLE == "realistic":
        sky = nt.nodes.new("ShaderNodeTexSky")
        try:
            sky.sky_type = "NISHITA"
            sky.sun_elevation = math.radians(28)
            sky.sun_rotation = math.radians(200)
        except Exception:
            pass
        nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.35
    else:
        # a soft gradient sky in the card's own colours (cream at the top, pale lime low down)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Window"], sep.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = lin(C["sky_low"])
        ramp.color_ramp.elements[1].color = lin(C["sky_top"])
        nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 1.0 if STYLE == "painted" else 1.25
    sc.world = world
    # stylized and painted: the sky is left transparent, so the card's own gradient shows through and the scene
    # sits in the card instead of on it (the world still lights the scene and fills the water's reflections)
    sc.render.film_transparent = STYLE != "realistic"

    sun_d = bpy.data.lights.new("sun", "SUN")
    sun_d.energy = 4.2 if STYLE == "realistic" else 3.0
    sun_d.angle = math.radians(4 if STYLE == "realistic" else 12)
    sun_d.color = (1.0, 0.92, 0.8)
    sun = bpy.data.objects.new("sun", sun_d)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(52), math.radians(8), math.radians(-35))

    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 34
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    cam.location = (0.6, -18.0, 3.4)
    cam.rotation_euler = (math.radians(82), 0, 0)
    cam_d.shift_y = 0.0
    sc.camera = cam
    return sc


# ---------------------------------------------------------------- animation (30 fps, 4.5 s)
FPS, FRAMES = 30, 135
SWELL_START_X, SWELL_SPEED = 12.5, 0.42      # world x where the swell starts (off the right edge), and m per frame


def animate(sc, parts):
    """The tide: a swell rolls in from the right across the river, over the flowing ocean surface; when its
    current reaches the noria the wheel turns clockwise (the bottom is pushed left) and comes to rest with the
    lime pot just past the top; the pot pours into the bamboo, the water runs down to the bucket, and the bucket
    fills."""
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, FRAMES
    river = parts["river"]
    oc = river.modifiers["ocean"]
    prefs = bpy.context.preferences.edit
    prefs.keyframe_new_interpolation_type = "LINEAR"           # the river flows at a steady pace
    oc.time = 3.0
    oc.keyframe_insert("time", frame=1)
    oc.time = 4.4
    oc.keyframe_insert("time", frame=FRAMES)
    prefs.keyframe_new_interpolation_type = "BEZIER"           # everything else eases in and out
    # the swell: a single linear wave travelling along -x (Wave modifier works in the river's local units)
    wv = river.modifiers.new("swell", "WAVE")
    wv.use_x, wv.use_y = True, False
    wv.use_cyclic = False
    wv.height = 1.05
    wv.width = 3.0
    wv.narrowness = 1.2
    wv.start_position_x = SWELL_START_X
    wv.speed = -SWELL_SPEED                                    # negative: the wave travels towards -x (leftwards)
    wv.vertex_group = "swell"                                  # fading out at the banks
    wv.time_offset = 0
    wv.damping_time = 0
    wv.falloff_radius = 0

    # the wheel: everything on it turns about the hub, on the axle (world Y)
    hub = bpy.data.objects.new("wheel_hub", None)
    sc.collection.objects.link(hub)
    hub.location = parts["hub"]
    bpy.context.view_layer.update()
    for o in parts["wheel_parts"]:
        mw = o.matrix_world.copy()
        o.parent = hub
        o.matrix_world = mw
    # current reaches the hub at about frame (12.5 - 5) / 0.42 = 18; spin up, then settle with the lime pot on top
    hub.rotation_euler = (0, math.radians(-405), 0)
    hub.keyframe_insert("rotation_euler", index=1, frame=16)
    hub.rotation_euler = (0, 0, 0)
    hub.keyframe_insert("rotation_euler", index=1, frame=84)

    # water: pour, trough, trickle grow along their length; the bucket's water rises
    for key, f0, f1 in (("pour", 84, 90), ("trough", 89, 101), ("trickle", 100, 107)):
        cu = parts[key].data
        cu.bevel_factor_end = 0.0
        cu.keyframe_insert("bevel_factor_end", frame=f0)
        cu.bevel_factor_end = 1.0
        cu.keyframe_insert("bevel_factor_end", frame=f1)
    def grow(o, f0, f1):
        final = tuple(o.scale)
        o.scale = (0.001, 0.001, 0.001)
        o.keyframe_insert("scale", frame=f0)
        o.scale = final
        o.keyframe_insert("scale", frame=f1)
    grow(parts["foam_head"], 86, 94)                           # foam where the pour lands in the bamboo
    for i, o in enumerate(parts["drops"]):
        grow(o, 101 + i, 104 + i)                              # drops breaking off the trickle
    ring = parts["foam_ring"]
    grow(ring, 106, 112)                                       # a foam ring where the trickle meets the bucket water
    bw = parts["bucket_water"]
    top = bw.location.z
    bw.location.z = top - 0.36
    bw.keyframe_insert("location", index=2, frame=106)
    bw.location.z = top
    bw.keyframe_insert("location", index=2, frame=132)
    rz = ring.location.z                                       # the foam ring rides the rising surface
    ring.location.z = rz - 0.36
    ring.keyframe_insert("location", index=2, frame=106)
    ring.location.z = rz
    ring.keyframe_insert("location", index=2, frame=132)


def crest_track(sc):
    """Where the swell's crest is on screen (0..1 across the card) at each frame, for the page to bring the text
    up as the crest passes it."""
    from bpy_extras.object_utils import world_to_camera_view
    out = []
    for f in range(1, FRAMES + 1):
        x = SWELL_START_X - SWELL_SPEED * f
        v = world_to_camera_view(sc, sc.camera, Vector((x, -1.0, 0.0)))
        out.append(round(v.x, 4))
    return out


def main():
    sc = setup()
    parts = build()
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    frames_dir = _arg("--frames")
    if frames_dir:
        import json
        animate(sc, parts)
        os.makedirs(frames_dir, exist_ok=True)
        with open(os.path.join(frames_dir, "crest.json"), "w") as f:
            json.dump({"fps": FPS, "frames": FRAMES, "crest": crest_track(sc)}, f)
        step = int(_arg("--step", "1"))
        only = _arg("--frame")
        scale = int(_arg("--scale", "100"))
        sc.render.resolution_percentage = scale
        for fr in ([int(only)] if only else range(1, FRAMES + 1, step)):
            sc.frame_set(fr)
            sc.render.filepath = os.path.join(frames_dir, f"f{fr:04d}.png")
            bpy.ops.render.render(write_still=True)
        print(f"[hero] rendered frames into {frames_dir}")
    else:
        sc.render.filepath = OUT
        bpy.ops.render.render(write_still=True)
        print(f"[hero] rendered {OUT}")
    if SAVE_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE_BLEND))


main()
