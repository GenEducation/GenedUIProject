"""Slims a hover-move sprite grid already shipped (e.g. the dashboard's camp cards): keeps every STEP-th frame (and
always the last), scales the frames to --cell px, re-lays them --cols across, and writes the still (its first frame).
For sprites whose source renders are gone; where the renders are at hand, rebuild from them instead. Needs Pillow:

    python3 scripts/resample-sprite.py --in public/student/camp/camp-fire-move-sprite.webp --frames 24 --cols 6 \\
        --cell 264 [--step 2] [--out-cols 6] --out /path/camp-fire-move-sprite.webp --still /path/camp-fire-move.webp
"""

import os
import sys

from PIL import Image

argv = sys.argv[1:]


def _arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


SRC, OUT, STILL = _arg("--in"), _arg("--out"), _arg("--still")
FRAMES, COLS = int(_arg("--frames")), int(_arg("--cols"))
CELL, STEP = int(_arg("--cell")), int(_arg("--step", "2"))
OUT_COLS = int(_arg("--out-cols", str(COLS)))

sheet = Image.open(SRC).convert("RGBA")
w = sheet.width // COLS
frames = [sheet.crop(((i % COLS) * w, (i // COLS) * w, (i % COLS + 1) * w, (i // COLS + 1) * w)) for i in range(FRAMES)]
picked = frames[::STEP] + ([frames[-1]] if (FRAMES - 1) % STEP else [])
cells = [f.resize((CELL, CELL), Image.LANCZOS) for f in picked]
rows = -(-len(cells) // OUT_COLS)
grid = Image.new("RGBA", (CELL * OUT_COLS, CELL * rows), (0, 0, 0, 0))
for i, c in enumerate(cells):
    grid.paste(c, ((i % OUT_COLS) * CELL, (i // OUT_COLS) * CELL))
grid.save(OUT, "WEBP", quality=84, method=6)
cells[0].save(STILL, "WEBP", quality=90, method=6)
print(f"[resample] {OUT}: {len(cells)} frames, {OUT_COLS} cols, {CELL}px  {os.path.getsize(OUT) / 1e3:.0f} KB "
      f"(was {os.path.getsize(SRC) / 1e3:.0f} KB, {FRAMES} frames at {w}px)")
