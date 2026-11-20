"""One-off rebrand codemod: GenEd's Deep Ocean + Citron palette -> the Zoovi palette (the logo's green, lime and yellow on
paper, as the marketing site uses them: src/features/marketing/styles/tokens.css).

    python3 scripts/zoovi-recolor.py            # rewrites src/ in place (skips the marketing pages, already Zoovi)
    python3 scripts/zoovi-recolor.py --dry-run  # counts only

Hex colours are matched case-insensitively and only as whole 6-digit values; rgba() forms of the two brand colours too.
Colours outside the old brand family (subject colours, warnings, dangers, white) are left alone.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src"
SKIP = ("features/marketing/",)

HEX = {
    # ink and brand
    "122D30": "1D6315",  # ink / navy / primary-ink      -> Zoovi ink
    "075E63": "287624",  # deep ocean / primary / tutor  -> Zoovi green
    "064E52": "22661F",  # emerald-600
    "064C50": "22661F",  # primary hover
    "053C40": "1B521A",  # primary active
    "0B474B": "22661F",  # navy-700
    "042F32": "143E13", "032528": "10320F",
    "1F7A7E": "3A8A2E", "2F7A7E": "3A8A2E", "4F9690": "6AA83A",
    "3C8A8E": "4E9A2A",  # tutor light
    "5FA8A3": "86B83A",  # tutor soft
    "82B7AF": "A6CB6A", "9CC5C1": "BFD88E",
    # citron -> lime
    "D9F279": "A6CF08",  # accent
    "B8D63F": "8DB000",  # accent deep
    "D7EA7C": "D4E98A",
    # ocean-tinted light surfaces -> lime-tinted paper
    "DCEBE7": "E8F0CC", "E8F2EF": "EEF4DD", "EAF2EF": "EFF4DF", "E3EEEA": "E9F0D6", "E4F5EE": "ECF5D8",
    "EEF5F3": "F3F6E6", "F5FAF9": "F8F9EF", "EEF4F1": "F2F5E5", "E1EAE6": "E6EDD3", "D3E6E2": "DDEBC1",
    "CCDED8": "D8E6BA", "C9DFD8": "D5E6B5", "A9CCC7": "C2DA94", "B0D2CC": "C5DC9A",
    # neutrals -> paper greys
    "F6F7F2": "F7F4EA",  # canvas / page
    "FBFBF8": "FBF9F2", "FBFCFB": "FCFBF6",
    "E3E8E2": "E7E2D2",  # border
    "E4E9E3": "E8E3D3", "CFD9D3": "DAD5C2", "C5D1CF": "CDD3BF",
    "3E5558": "3B5533",  # text mid
    "5E7477": "5A6E52",  # muted
    "7F9295": "7D8C73", "8FA1A3": "94A28A",
    # the auth pages' older navy
    "042E5C": "1D6315",
    # the parent portal's own mint / teal / sky set (home/theme.ts, the loader's backdrop washes)
    "0E7C55": "22661F", "059F6D": "3A8A2E", "115A60": "1D6315",
    "CDEEDF": "DDEBC1", "F3FBFA": "F7F8EC", "9FE3C4": "C9E88A", "BBD7FF": "FBEA9A",
    # the student sidebar's grey-teal text and hairline
    "4C6366": "4F6646", "E7ECE6": "E9E5D6",
}
RGB = {
    (7, 94, 99): (40, 118, 36),      # deep ocean
    (18, 45, 48): (29, 99, 21),      # ink
    (205, 222, 218): (226, 236, 205),  # light text on the dark ink ground
    (4, 46, 92): (29, 99, 21),         # the auth pages' older navy
    (19, 41, 61): (29, 72, 21),        # the parent portal's navy shadows
    (159, 227, 196): (201, 232, 138),  # the parent loader's mint wash
}

hex_re = re.compile(r"#(" + "|".join(HEX) + r")(?![0-9A-Fa-f])", re.I)
rgb_re = re.compile(r"(rgba?\()(\s*)(\d+)(\s*,\s*)(\d+)(\s*,\s*)(\d+)")

def recolor(text):
    n = 0
    def h(m):
        nonlocal n; n += 1
        old = m.group(1)
        new = HEX[old.upper()]
        return "#" + (new.lower() if old.islower() else new)
    text = hex_re.sub(h, text)
    def r(m):
        # keeps the original spacing: inside a Tailwind class (shadow-[0_2px_rgba(1,2,3,0.1)]) a space would split it
        nonlocal n
        fn, s0, x, s1, y, s2, z = m.groups()
        k = (int(x), int(y), int(z))
        if k not in RGB: return m.group(0)
        n += 1
        a, b, c = RGB[k]
        return f"{fn}{s0}{a}{s1}{b}{s2}{c}"
    text = rgb_re.sub(r, text)
    return text, n

dry = "--dry-run" in sys.argv
total = files = 0
for p in ROOT.rglob("*"):
    if p.suffix not in {".ts", ".tsx", ".css", ".js", ".mjs", ".svg"} or any(s in p.as_posix() for s in SKIP):
        continue
    src = p.read_text(encoding="utf8")
    out, n = recolor(src)
    if n:
        files += 1; total += n
        if not dry: p.write_text(out, encoding="utf8")
print(f"{'would change' if dry else 'changed'} {total} colours in {files} files")
