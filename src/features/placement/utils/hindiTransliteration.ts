/**
 * Best-effort romanized-Hindi → Devanagari transliteration, hand-rolled
 * rather than pulling in a transliteration package: the one real npm option
 * (`@indic-transliteration/sanscript`) drags in a vulnerable, unpatched
 * `toml` dependency (prototype pollution / uncontrolled recursion advisories)
 * for ~50 scripts this form only ever needs one of. This covers exactly the
 * ITRANS-style scheme below and nothing else.
 *
 * This is a deterministic scheme converter, not a statistical one (what
 * Google Input Tools actually uses) — it cannot guess a student's intent,
 * only apply fixed rules. Three consequences worth knowing, in increasing
 * order of how fixable they are:
 *
 *  - Long vowels and retroflex consonants need their ITRANS spelling
 *    (`aa`/`ii`/`uu` for दीर्घ vowels, capital `T`/`D`/`N` for the retroflex
 *    row) — a casual typist who doesn't know that will get a plausible but
 *    not letter-perfect result. Fixable by the student, once shown the
 *    convention.
 *  - Nukta sounds (ड़, ढ़, ज़, फ़, क़, ग़) only appear from their explicit
 *    tokens (`.D`, `.Dh`, `z`, `f`, `q`, `G`) — plain `d`/`j`/`k`/`g` always
 *    produce the non-nukta letter, since nobody types the special notation
 *    unprompted. Fixable the same way, in principle, but unrealistic to
 *    expect from a grade-3 student.
 *  - Genuinely unfixable by any rule: this scheme inserts a virama between
 *    two consonants with no vowel between them, which is exactly right for
 *    a real conjunct ("namaste" → "नमस्ते") and exactly wrong for an
 *    ordinary schwa-deletion word ("ladke" → "लद्के", not "लड़के" — Hindi
 *    spelling keeps ड़'s own bare vowel there, virama-free, purely by
 *    orthographic convention with nothing in the romanized input to derive
 *    that from). No deterministic rule can tell these two cases apart;
 *    only a dictionary or a statistical model (what real phonetic Hindi
 *    keyboards actually use) can.
 *
 * All three are exactly why grading on the backend needs real leeway on
 * these items — normalizing away nukta dots and virama placement before
 * comparing, not just accepting a list of alternate spellings (see the
 * open issue on Hindi fill_blank input). This widget helps a student
 * produce Devanagari at all; it cannot be relied on for letter-perfect
 * output.
 */

// Longest-token-first matching — order within each length band doesn't
// matter, but a shorter token must never shadow a longer one that starts
// with it ("t" before "th" would break every aspirate).
const CONSONANTS = ([
  [".Dh", "ढ़"],
  [".D", "ड़"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["ch", "च"],
  ["Ch", "छ"],
  ["chh", "छ"],
  ["jh", "झ"],
  ["Th", "ठ"],
  ["Dh", "ढ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["sh", "श"],
  ["Sh", "ष"],
  ["shh", "ष"],
  ["~n", "ञ"],
  ["~N", "ङ"],
  ["k", "क"],
  ["q", "क़"],
  ["g", "ग"],
  ["G", "ग़"],
  ["j", "ज"],
  ["z", "ज़"],
  ["T", "ट"],
  ["D", "ड"],
  ["N", "ण"],
  ["t", "त"],
  ["d", "द"],
  ["n", "न"],
  ["p", "प"],
  ["f", "फ़"],
  ["b", "ब"],
  ["m", "म"],
  ["y", "य"],
  ["r", "र"],
  ["l", "ल"],
  ["v", "व"],
  ["w", "व"],
  ["s", "स"],
  ["h", "ह"],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

const VOWELS = ([
  // [token, independent form, dependent matra ("" for the inherent 'a')
  ["aa", "आ", "ा"],
  ["A", "आ", "ा"],
  ["ai", "ऐ", "ै"],
  ["au", "औ", "ौ"],
  ["ii", "ई", "ी"],
  ["ee", "ई", "ी"],
  ["I", "ई", "ी"],
  ["uu", "ऊ", "ू"],
  ["oo", "ऊ", "ू"],
  ["U", "ऊ", "ू"],
  ["RRi", "ऋ", "ृ"],
  ["a", "अ", ""],
  ["i", "इ", "ि"],
  ["u", "उ", "ु"],
  ["e", "ए", "े"],
  ["o", "ओ", "ो"],
] as [string, string, string][]).sort((a, b) => b[0].length - a[0].length);

const VIRAMA = "्";

/** True once any character in the string is already Devanagari (U+0900–U+097F). */
export function isDevanagari(text: string): boolean {
  return /[ऀ-ॿ]/.test(text);
}

/**
 * Converts romanized ("ITRANS-lite") Hindi to Devanagari. Text that's
 * already Devanagari (or has no Latin letters at all — punctuation,
 * digits) passes through unchanged, so re-running this on its own output,
 * or on text typed with a native Devanagari keyboard, is always safe.
 */
export function transliterateToDevanagari(input: string): string {
  if (!input || isDevanagari(input)) return input;

  let out = "";
  let pendingConsonant = false; // true while the last emitted letter still carries an unresolved inherent "a"
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);
    const consonant = CONSONANTS.find(([token]) => rest.startsWith(token));
    const vowel = !consonant && VOWELS.find(([token]) => rest.startsWith(token));

    if (consonant) {
      const [token, devanagari] = consonant;
      if (pendingConsonant) out += VIRAMA;
      out += devanagari;
      pendingConsonant = true;
      i += token.length;
      continue;
    }

    if (vowel) {
      const [token, independent, matra] = vowel;
      out += pendingConsonant ? matra : independent;
      pendingConsonant = false;
      i += token.length;
      continue;
    }

    if (rest[0] === "M") {
      out += "ं"; // anusvara
      pendingConsonant = false;
    } else if (rest[0] === "H") {
      out += "ः"; // visarga
      pendingConsonant = false;
    } else {
      // Punctuation, digits, spaces — end whatever conjunct was pending and
      // pass the character through untouched.
      out += rest[0];
      pendingConsonant = false;
    }
    i += 1;
  }

  return out;
}
