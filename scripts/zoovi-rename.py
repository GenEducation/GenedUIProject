"""One-off rebrand codemod: the product name "GenEd" -> "Zoovi" in what users read, while "GenEd" stays wherever it
means the company (copyright, the payment merchant, contact consent, the admin console, and the partner portal's
"the GenEd team will look at / fix this" lines).

    python3 scripts/zoovi-rename.py [--dry-run]

Tests get the same treatment so they keep matching the screens.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = ("src/features/marketing/", "src/features/admin/", "src/app/admin/")

# Phrases where GenEd is the company: protected before the rename, restored after.
KEEP = [
    r"GenEd\. All rights reserved",
    r"name: \"GenEd\"",                       # payment merchant name (Razorpay)
    r"agree GenEd can contact you",
    r"'GenEd Admin'",                         # a partner account's name in the data
    r"GenEd will look at",
    r"GenEd needs to fix this",
    r"until GenEd fixes it",
    r"GenEd must fix this",
    r"ask\s+GenEd\s+to\s+(?:check|look)",
    r"on GenEd(?:&rsquo;|’|')s\s+side",
    r"GenEd(?:&apos;|&rsquo;|’|')s\s+servers;\s+only you and\s+GenEd",
    r"Technical details for GenEd",
    r"notes for GenEd",
    r"GenEd \(global\)", r"GenEd \(default\)", r"GenEd administrators",
    r"GenEd Green",
]
keep_re = re.compile("|".join(f"(?:{k})" for k in KEEP))
WORD = re.compile(r"\bGenEducation\b|\bGenEd\b")

def rename(text):
    held = []
    def hold(m):
        held.append(m.group(0)); return f"\x00{len(held) - 1}\x00"
    text = keep_re.sub(hold, text)
    text, n = WORD.subn("Zoovi", text)
    text = re.sub(r"\x00(\d+)\x00", lambda m: held[int(m.group(1))], text)
    return text, n

dry = "--dry-run" in sys.argv
total = 0
targets = [p for p in (ROOT / "src").rglob("*") if p.suffix in {".ts", ".tsx", ".css"}] + [ROOT / "public/demo-tutorial-preview.html"]
for p in targets:
    rel = p.relative_to(ROOT).as_posix()
    if any(rel.startswith(s) for s in SKIP):
        continue
    t = p.read_text(encoding="utf8")
    if "GenEd" not in t:
        continue
    out, n = rename(t)
    if n:
        total += n
        print(f"{n:4d}  {rel}")
        if not dry:
            p.write_text(out, encoding="utf8")
print(("would rename " if dry else "renamed ") + str(total))
