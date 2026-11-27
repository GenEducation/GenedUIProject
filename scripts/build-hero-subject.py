"""Assembles a subject hero's progress layers and phone poster (from render-hero-subject.py) into the files the
Continue card ships, in public/student/hero/<subject>/:

    progress.webp        the progress at its 20 states (0..19 of 19), cropped to where it ever appears, in a 5x4 grid
    progress-phone.webp  the same, framed for phones
    phone.webp           the phone poster: the scene without the progress, on the card's own gradient
    moon.webp            (science) the finished scene's moon going round its planet: a strip the card loops
    moon-phone.webp      the same, framed for phones
    progress.json        the grids and each crop's place in its frame (the card positions the layers from it)

The entrance video, its poster and its reveal track come from encode-hero-tide.py (--name scene --no-small).
Needs Pillow:

    python3 scripts/build-hero-subject.py --src /path/to/renders/english --out public/student/hero/english [--quality 84] [--alpha 100]
"""

import json
import os
import sys

from PIL import Image

argv = sys.argv[1:]


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


SRC = os.path.abspath(_arg("--src"))
OUT = os.path.abspath(_arg("--out"))
TOP, BOTTOM = (0xF4, 0xF8, 0xE6), (0xE3, 0xEE, 0xC4)   # the card's gradient (ContinueLearningCard's SKY)
STATES, COLS = 20, 5
QUALITY = int(_arg("--quality", "84"))
# The transparency is kept lossless unless asked: English's layer carries its see-through beam, a soft gradient that
# is costly lossless, so it ships with --alpha 60 (half the size, no visible change at card size)
ALPHA = int(_arg("--alpha", "100"))
PAD = 6


def on_gradient(im):
    w, h = im.size
    grad = Image.new("RGBA", (w, h))
    px = grad.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        col = tuple(round(TOP[c] + (BOTTOM[c] - TOP[c]) * t) for c in range(3)) + (255,)
        for x in range(w):
            px[x, y] = col
    grad.alpha_composite(im)
    return grad.convert("RGB")


def sprite(folder, out_path, prefix="p", count=STATES, cols=COLS):
    frames = [Image.open(os.path.join(folder, f"{prefix}{i:02d}.png")).convert("RGBA") for i in range(count)]
    w, h = frames[0].size
    box = None
    for f in frames:
        b = f.getchannel("A").point(lambda a: 255 if a > 6 else 0).getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    x0, y0 = max(0, box[0] - PAD), max(0, box[1] - PAD)
    x1, y1 = min(w, box[2] + PAD), min(h, box[3] + PAD)
    cw, ch = x1 - x0, y1 - y0
    rows = -(-count // cols)
    grid = Image.new("RGBA", (cw * cols, ch * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        grid.paste(f.crop((x0, y0, x1, y1)), ((i % cols) * cw, (i // cols) * ch))
    grid.save(out_path, "WEBP", quality=QUALITY, alpha_quality=ALPHA, method=6)
    print(f"[build] {out_path}  {os.path.getsize(out_path) / 1e3:.0f} KB  crop {x0},{y0} {cw}x{ch} of {w}x{h}")
    return {"frame": [w, h], "crop": [x0, y0, cw, ch]}


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {"states": STATES, "cols": COLS, "rows": -(-STATES // COLS)}
    meta["lg"] = sprite(os.path.join(SRC, "progress"), os.path.join(OUT, "progress.webp"))
    meta["sm"] = sprite(os.path.join(SRC, "progress-phone"), os.path.join(OUT, "progress-phone.webp"))
    moon = os.path.join(SRC, "moon")
    if os.path.isdir(moon):
        n = len([f for f in os.listdir(moon) if f.startswith("m") and f.endswith(".png")])
        meta["moon"] = {"frames": n,
                        "lg": sprite(moon, os.path.join(OUT, "moon.webp"), "m", n, n),
                        "sm": sprite(os.path.join(SRC, "moon-phone"), os.path.join(OUT, "moon-phone.webp"), "m", n, n)}
    on_gradient(Image.open(os.path.join(SRC, "phone.png")).convert("RGBA")).save(os.path.join(OUT, "phone.webp"), "WEBP", quality=84)
    with open(os.path.join(OUT, "progress.json"), "w") as f:
        json.dump(meta, f)
    print(json.dumps(meta))


main()
