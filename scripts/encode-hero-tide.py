"""Encodes the hero tide frames (from render-hero-tide.py --frames DIR) into the files the Continue card ships.

Each RGBA frame is laid over the card's own gradient (so the video's sky is the card's background exactly), then
written out through Blender's sequencer, with no view transform, so colours pass through untouched:

    public/student/hero/tide-1440.mp4 / .webm    desktop, 1440x400
    public/student/hero/tide-960.mp4  / .webm    phones, 960x268
    public/student/hero/tide-1440.webp / -960.webp   the last frame, shown at once as the poster
    public/student/hero/tide.json                the crest's position across the card per frame (for the text)

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/encode-hero-tide.py -- \\
        --frames /path/to/frames

The subject heroes (render-hero-subject.py --mode frames) go through it too, into their own folder under another
name, desktop size only (phones show their own poster):

        --frames DIR --out public/student/hero/english --name scene --no-small
"""

import json
import os
import shutil
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRAMES = os.path.abspath(_arg("--frames"))
OUT = os.path.abspath(_arg("--out", os.path.join(ROOT, "public", "student", "hero")))
NAME = _arg("--name", "tide")
SMALL = "--no-small" not in argv
TOP, BOTTOM = (0xF4, 0xF8, 0xE6), (0xE3, 0xEE, 0xC4)   # the card's gradient (ContinueLearningCard's SKY)


def load_raw(path):
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4), w, h


def save_raw(px, w, h, path, fmt="PNG", quality=90):
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = fmt
    img.save(quality=quality) if fmt == "WEBP" else img.save()
    bpy.data.images.remove(img)


def resize(px, w, h, nw, nh):
    img = bpy.data.images.new("rs", w, h, alpha=True)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(px.ravel())
    img.scale(nw, nh)
    out = np.empty(nw * nh * 4, dtype=np.float32)
    img.pixels.foreach_get(out)
    bpy.data.images.remove(img)
    return out.reshape(nh, nw, 4)


def composite_frames(work):
    names = sorted(f for f in os.listdir(FRAMES) if f.startswith("f") and f.endswith(".png"))
    grad = None
    last = None
    for n in names:
        px, w, h = load_raw(os.path.join(FRAMES, n))
        if grad is None:
            # Blender images are stored bottom-up: row 0 is the bottom of the picture
            t = np.linspace(1, 0, h)[:, None]
            grad = np.zeros((h, w, 4), dtype=np.float32)
            for c in range(3):
                grad[..., c] = (BOTTOM[c] + (TOP[c] - BOTTOM[c]) * t) / 255
            grad[..., 3] = 1
        a = px[..., 3:4]
        out = grad.copy()
        out[..., :3] = px[..., :3] * a + grad[..., :3] * (1 - a)
        save_raw(out, w, h, os.path.join(work, n))
        last = (out, w, h)
    return names, last


def encode(work, names, size, container, codec, path):
    sc = bpy.data.scenes.new(f"enc_{size[0]}_{container}")
    sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.fps = 30
    sc.frame_start, sc.frame_end = 1, len(names)
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    if hasattr(sc, "sequencer_colorspace_settings"):
        sc.sequencer_colorspace_settings.name = "Non-Color"
    se = sc.sequence_editor_create()
    strips = se.strips if hasattr(se, "strips") else se.sequences
    strip = strips.new_image("frames", os.path.join(work, names[0]), channel=1, frame_start=1)
    for n in names[1:]:
        strip.elements.append(n)
    strip.colorspace_settings.name = "Non-Color"
    strip.transform.scale_x = size[0] / 1440
    strip.transform.scale_y = size[1] / 400
    if hasattr(sc.render.image_settings, "media_type"):
        sc.render.image_settings.media_type = "VIDEO"
    sc.render.image_settings.file_format = "FFMPEG"
    ff = sc.render.ffmpeg
    ff.format = container
    ff.codec = codec
    ff.constant_rate_factor = "MEDIUM"
    ff.ffmpeg_preset = "BEST"
    ff.gopsize = 30
    ff.audio_codec = "NONE"
    sc.render.filepath = path
    sc.render.use_file_extension = False
    with bpy.context.temp_override(scene=sc):
        bpy.ops.render.render(animation=True, scene=sc.name)
    print(f"[encode] {path}  {os.path.getsize(path) / 1e6:.2f} MB")


def main():
    os.makedirs(OUT, exist_ok=True)
    work = os.path.join(bpy.app.tempdir, "tide_comp")
    os.makedirs(work, exist_ok=True)
    names, (last, w, h) = composite_frames(work)
    save_raw(last, w, h, os.path.join(OUT, f"{NAME}-1440.webp"), "WEBP", 86)
    sizes = [(1440, 400)]
    if SMALL:
        save_raw(resize(last, w, h, 960, 268), 960, 268, os.path.join(OUT, f"{NAME}-960.webp"), "WEBP", 84)
        sizes.append((960, 268))
    for size in sizes:
        encode(work, names, size, "MPEG4", "H264", os.path.join(OUT, f"{NAME}-{size[0]}.mp4"))
        encode(work, names, size, "WEBM", "WEBM", os.path.join(OUT, f"{NAME}-{size[0]}.webm"))
    for track in ("crest.json", "track.json"):                            # the reveal front, per frame
        if os.path.exists(os.path.join(FRAMES, track)):
            shutil.copy(os.path.join(FRAMES, track), os.path.join(OUT, f"{NAME}.json"))
    shutil.rmtree(work, ignore_errors=True)


main()
