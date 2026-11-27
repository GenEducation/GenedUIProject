"""Cuts the subject card renders (english-move, maths-move, science-move from render-student-moments.py) with one
shared square crop and scales them to the 480px cells the card ships, so the three keep one scale, one plinth size
and one ground line while filling the frame. The crop is the union of every frame of all three hover moves, padded,
and centred on the frame's middle (the plinths stand there). Prints each picture's ground (the plinth's bottom, as %
down) for SUBJECT_ART in src/features/subjects/subjectPresentation.ts. Needs Pillow:

    python3 scripts/crop-subject-moves.py --src /path/to/renders/subjects --out public/student/subjects
"""

import os
import sys

from PIL import Image

argv = sys.argv[1:]
SRC = os.path.abspath(argv[argv.index("--src") + 1])
OUT = os.path.abspath(argv[argv.index("--out") + 1])
# 408px frames: 1.5x the card's largest art (272px), sharp on 1.5x screens without unpacking more than it needs
CELL, PAD = 408, 10
# Every STEP-th frame ships (the card plays them at 30 / STEP fps): half the download and memory; the last frame always
# ships, as a move ends on it (Science holds it)
STEP = 2
FILL, GROUND = 0.84, 0.88
MOVES = {"english-move": (30, 6), "maths-move": (36, 6), "science-move": (48, 8)}


def frames(name):
    frames_, cols = MOVES[name]
    sheet = Image.open(os.path.join(SRC, f"{name}-sprite.webp")).convert("RGBA")
    w = sheet.width // cols
    return [sheet.crop(((i % cols) * w, (i // cols) * w, (i % cols + 1) * w, (i // cols + 1) * w)) for i in range(frames_)], w


def alpha_box(im):
    return im.getchannel("A").point(lambda a: 255 if a > 6 else 0).getbbox()


def main():
    allf = {n: frames(n) for n in MOVES}
    size = next(iter(allf.values()))[1]
    boxes = [alpha_box(f) for fs, _ in allf.values() for f in fs]
    boxes = [b for b in boxes if b]
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    # the card's proportions: the art about FILL of the picture's height (room round it for the card's shadow and
    # text), the plinths' bottom at GROUND down it, centred across on the frame's middle
    mid = size / 2
    half = max(mid - x0 + PAD, x1 - mid + PAD, (y1 - y0) / FILL / 2)
    top = y1 - GROUND * 2 * half
    crop = (round(mid - half), round(top), round(mid + half), round(top + 2 * half))
    print(f"[crop] shared crop {crop} of {size}px")
    os.makedirs(OUT, exist_ok=True)
    for name, (fs, _) in allf.items():
        n, cols = MOVES[name]
        picked = fs[::STEP] + ([fs[-1]] if (len(fs) - 1) % STEP else [])
        cells = [f.crop(crop).resize((CELL, CELL), Image.LANCZOS) for f in picked]
        n = len(cells)
        rows = -(-n // cols)
        grid = Image.new("RGBA", (CELL * cols, CELL * rows), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            grid.paste(c, ((i % cols) * CELL, (i // cols) * CELL))
        grid.save(os.path.join(OUT, f"{name}-sprite.webp"), "WEBP", quality=80, method=6)
        cells[0].save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=90, method=6)
        ground = alpha_box(cells[0])[3] / CELL * 100
        print(f"[crop] {name}: ground {ground:.1f}%  {n} frames, {cols} cols  sprite {os.path.getsize(os.path.join(OUT, f'{name}-sprite.webp')) / 1e3:.0f} KB")


main()
