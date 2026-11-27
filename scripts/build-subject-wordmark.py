"""Assembles the chapter page's subject word-marks (from render-subject-wordmark.py --mode enter / hover) into the
sprites the page ships, in public/student/wordmarks/:

    <subject>-enter.webp   the entrance (the letters folding up, the props popping in), frames in a grid; its last
                           frame is the word-mark at rest
    <subject>-hover.webp   the hover loop (a wave along the letters, the sky bobbing), frames in a grid

Every frame of every subject is cut to the same height (the same rows of the render: the subjects share one camera and
baseline), so the letters stay one size from subject to subject; across, each subject is cut to the union of its own
frames. Prints the sizes for src/features/student/theme/wordmarkArt.ts. Needs Pillow:

    python3 scripts/build-subject-wordmark.py --src /path/to/frames --out public/student/wordmarks

where --src holds <subject>-enter/e0001.png.. and <subject>-hover/h0001.png.. for science, english and maths.
"""

import json
import os
import sys

from PIL import Image

argv = sys.argv[1:]
SRC = os.path.abspath(argv[argv.index("--src") + 1])
OUT = os.path.abspath(argv[argv.index("--out") + 1])
SUBJECTS = ("science", "english", "maths")
COLS = 6
PAD = 6
QUALITY, ALPHA = 78, 75
# Every STEP-th frame ships (the page plays them at 30 / STEP fps): half the frames is half the download and half the
# memory a browser unpacks the sheet into, and the motion is short and quick enough not to lose anything at 15fps
STEP = 2


def frames(folder, keep_last=False):
    names = sorted(f for f in os.listdir(folder) if f.endswith(".png"))
    picked = names[::STEP]
    if keep_last and picked[-1] != names[-1]:                            # the entrance must end on the word-mark at rest
        picked.append(names[-1])
    return [Image.open(os.path.join(folder, f)).convert("RGBA") for f in picked]


def box(im):
    return im.getchannel("A").point(lambda a: 255 if a > 6 else 0).getbbox()


def grid(cells, path):
    w, h = cells[0].size
    rows = -(-len(cells) // COLS)
    cols = min(COLS, len(cells))
    out = Image.new("RGBA", (w * cols, h * rows), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        out.paste(c, ((i % cols) * w, (i // cols) * h))
    out.save(path, "WEBP", quality=QUALITY, alpha_quality=ALPHA, method=6)
    return {"frames": len(cells), "cols": cols, "rows": rows, "kb": round(os.path.getsize(path) / 1e3)}


def main():
    os.makedirs(OUT, exist_ok=True)
    loaded = {s: {m: frames(os.path.join(SRC, f"{s}-{m}"), keep_last=m == "enter") for m in ("enter", "hover")} for s in SUBJECTS}
    boxes = {s: [b for m in loaded[s].values() for f in m if (b := box(f))] for s in SUBJECTS}
    y0 = min(b[1] for bs in boxes.values() for b in bs) - PAD
    y1 = max(b[3] for bs in boxes.values() for b in bs) + PAD
    meta = {}
    for s in SUBJECTS:
        x0 = min(b[0] for b in boxes[s]) - PAD
        x1 = max(b[2] for b in boxes[s]) + PAD
        cut = lambda f: f.crop((x0, y0, x1, y1))
        meta[s] = {"width": x1 - x0, "height": y1 - y0,
                   "enter": grid([cut(f) for f in loaded[s]["enter"]], os.path.join(OUT, f"{s}-enter.webp")),
                   "hover": grid([cut(f) for f in loaded[s]["hover"]], os.path.join(OUT, f"{s}-hover.webp"))}
        print(f"[wordmark] {s}: {meta[s]}")
    print(json.dumps({"fps": 30 // STEP, **meta}))


main()
