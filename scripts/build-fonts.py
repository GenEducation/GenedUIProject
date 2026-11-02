"""Build the self-hosted web fonts in src/fonts/ from the google/fonts repository.

The app used to load these through next/font/google, which downloads them from Google at every build; a failed download
fails the build. They now live in the repo and load through next/font/local. Run this only to update or add a font:

    python3 -m venv /tmp/fv && /tmp/fv/bin/pip install fonttools brotli
    /tmp/fv/bin/python scripts/build-fonts.py

Each font keeps the axes the app asked Google for (weight; Fraunces also its optical size) with the others pinned to
their defaults, as Google serves them, and is cut to the Latin, Latin Extended and (for Mukta and Kalam) Devanagari
characters, the subsets Google served it with.
"""

import io
import pathlib
import urllib.request

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "fonts"
RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

LATIN = (
    "U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+1D00-1DBF,U+1E00-1EFF,U+2000-206F,U+20A0-20C0,"
    "U+2100-21FF,U+2200-22FF,U+25CC,U+2C60-2C7F,U+A720-A7FF,U+FB00-FB06,U+FEFF,U+FFFD"
)
DEVANAGARI = "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+A830-A839,U+A8E0-A8FF"

# (source path in google/fonts, output name, axes kept variable; every other axis is pinned to its default)
FONTS = [
    ("nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf", "NunitoSans-Variable", {"wght"}),
    ("nunito/Nunito[wght].ttf", "Nunito-Variable", {"wght"}),
    ("sourceserif4/SourceSerif4[opsz,wght].ttf", "SourceSerif4-Variable", {"wght"}),
    ("jetbrainsmono/JetBrainsMono[wght].ttf", "JetBrainsMono-Variable", {"wght"}),
    ("fredoka/Fredoka[wdth,wght].ttf", "Fredoka-Variable", {"wght"}),
    ("manrope/Manrope[wght].ttf", "Manrope-Variable", {"wght"}),
    ("fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", "Fraunces-Variable", {"wght", "opsz"}),
    ("fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf", "Fraunces-Italic-Variable", {"wght", "opsz"}),
    ("mukta/Mukta-Regular.ttf", "Mukta-Regular", set()),
    ("mukta/Mukta-Medium.ttf", "Mukta-Medium", set()),
    ("mukta/Mukta-SemiBold.ttf", "Mukta-SemiBold", set()),
    ("mukta/Mukta-Bold.ttf", "Mukta-Bold", set()),
    ("kalam/Kalam-Regular.ttf", "Kalam-Regular", set()),
    ("kalam/Kalam-Bold.ttf", "Kalam-Bold", set()),
]


def unicodes(ranges: str) -> list[int]:
    out: list[int] = []
    for part in ranges.split(","):
        lo, _, hi = part.removeprefix("U+").partition("-")
        out.extend(range(int(lo, 16), int(hi or lo, 16) + 1))
    return out


def build(src: str, name: str, keep: set[str]) -> None:
    with urllib.request.urlopen(RAW + urllib.request.quote(src)) as response:
        font = TTFont(io.BytesIO(response.read()), lazy=False)
    if "fvar" in font:
        pins = {a.axisTag: a.defaultValue for a in font["fvar"].axes if a.axisTag not in keep}
        if pins:
            font = instantiateVariableFont(font, pins, updateFontNames=False)
            # Round-trip, so the subsetter reads tables the instancer rebuilt rather than its partial in-memory state.
            buffer = io.BytesIO()
            font.save(buffer)
            font = TTFont(io.BytesIO(buffer.getvalue()), lazy=False)
    ranges = LATIN + ("," + DEVANAGARI if src.startswith(("mukta/", "kalam/")) else "")
    options = Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.flavor = "woff2"
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=unicodes(ranges))
    subsetter.subset(font)
    path = OUT / f"{name}.woff2"
    font.flavor = "woff2"
    font.save(path)
    print(f"{path.relative_to(OUT.parent.parent)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for args in FONTS:
        build(*args)
