/**
 * Between the maths field (MathLive, which holds LaTeX) and what the lesson sends:
 *
 *  - chat: the tutor reads Markdown with `$…$` maths, so words stay words and maths becomes `$…$`;
 *  - answers: the checker (backend `gened_assessment/expressions.py`) reads only numbers, single-letter names and
 *    `+ - * / ^ ( )`, with no implied multiplication, so `2x` must go as `2*x` and `\frac{3}{4}` as `3/4`.
 *
 * Pure functions, no MathLive import, so they are tested on their own.
 */

/** Characters LaTeX text mode escapes, and how `\text{…}` spells them. */
const TEXT_ESCAPES: Array<[string, string]> = [
  ["\\textbackslash{}", "\\"],
  ["\\textbackslash", "\\"],
  ["\\{", "{"],
  ["\\}", "}"],
  ["\\$", "$"],
  ["\\%", "%"],
  ["\\&", "&"],
  ["\\_", "_"],
  ["\\#", "#"],
  ["\\textasciitilde{}", "~"],
  ["\\textasciicircum{}", "^"],
];

function unescapeText(s: string): string {
  let out = s;
  for (const [from, to] of TEXT_ESCAPES) out = out.split(from).join(to);
  return out.replace(/~/g, " ");
}


/** The index just past the `}` matching the `{` at `open`, or -1. */
function closingBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * The chat field's value as a chat message. The field starts in text, so MathLive gives words (LaTeX-escaped: `\%`,
 * `\$`…) with each maths run between `$ … $`; the message keeps the words as typed and the maths as `$…$`.
 * `The line $ \overleftrightarrow{AB} $ is 100\% long` → `The line $\overleftrightarrow{AB}$ is 100% long`.
 * A `\text{…}` run (from a maths-first value) is words too.
 */
export function chatTextFromLatex(latex: string): string {
  let out = "";
  let i = 0;
  while (i < latex.length) {
    const c = latex[i];
    if (c === "\\") {
      if (latex.startsWith("\\text{", i) || latex.startsWith("\\textrm{", i)) {
        const open = latex.indexOf("{", i);
        const end = closingBrace(latex, open);
        if (end < 0) break;
        out += unescapeText(latex.slice(open + 1, end - 1));
        i = end;
        continue;
      }
      const escape = TEXT_ESCAPES.find(([from]) => latex.startsWith(from, i));
      if (escape) {
        out += escape[1];
        i += escape[0].length;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (c === "$") {
      // A maths run, to the next unescaped `$`.
      let end = i + 1;
      while (end < latex.length && !(latex[end] === "$" && latex[end - 1] !== "\\")) end++;
      const math = latex.slice(i + 1, end).trim();
      if (math) out += `$${math}$`;
      i = end + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/** Words as the chat field takes them: LaTeX-escaped, so `100%` or `$5` stays as typed. */
export function escapeForField(text: string): string {
  return text.replace(/[\\{}$%&_#^~]/g, (c) =>
    c === "\\" ? "\\textbackslash{}" : c === "~" ? "\\textasciitilde{}" : c === "^" ? "\\textasciicircum{}" : `\\${c}`,
  );
}

/** A chat message (words with `$…$` maths) as the chat field's value, so a message can move back into the field. */
export function latexFromChatText(text: string): string {
  return splitMath(text)
    .map((part) => (part.math ? `$${part.value}$` : escapeForField(part.value)))
    .join("");
}

/** A message split into plain words and `$…$` maths, for rendering. Unpaired `$` stays a dollar sign. */
export function splitMath(text: string): Array<{ math: boolean; value: string }> {
  const parts: Array<{ math: boolean; value: string }> = [];
  // As Pandoc reads it: maths doesn't start or end beside a space, and a closing `$` isn't followed by a digit, so
  // "I paid $5 for $2 of…" stays money.
  const re = /\$(?=\S)([^$\n]*?\S)\$(?!\d)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ math: false, value: text.slice(last, m.index) });
    parts.push({ math: true, value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, value: text.slice(last) });
  return parts;
}

// ─────────────────────────────────────────────────────────
// ANSWERS — LaTeX to the checker's grammar
// ─────────────────────────────────────────────────────────

type Piece = { kind: "atom"; text: string; number?: boolean } | { kind: "op"; text: string } | { kind: "open" } | { kind: "close" } | { kind: "comma" };

const SPACING = /\\(left|right|displaystyle|textstyle|,|;|:|!| )|~/g;
const TIMES = /\\(times|cdot|ast)(?![a-zA-Z])/g;
const DIVIDE = /\\div(?![a-zA-Z])/g;

/** The braced group (or the single character) after `at`, and where it ends. */
function argument(s: string, at: number): { body: string; end: number } | null {
  let i = at;
  while (s[i] === " ") i++;
  if (i >= s.length) return null;
  if (s[i] === "{") {
    const end = closingBrace(s, i);
    return end < 0 ? null : { body: s.slice(i + 1, end - 1), end };
  }
  return { body: s[i], end: i + 1 };
}

const simple = (t: string) => /^(\d+(\.\d+)?|[A-Za-z])$/.test(t);

/**
 * The maths field's LaTeX as a checker answer, or null when it holds something outside the checker's grammar (a root,
 * a function, a symbol), so the caller can send it unchanged and let the checker say so.
 *
 * `2x+1` → `2*x+1` · `\frac{3}{4}` → `3/4` · `2\frac{1}{2}` → `(2+1/2)` · `x^{2}` → `x^2` · `(a+b)(a-b)` → `(a+b)*(a-b)`
 */
export function answerFromLatex(latex: string): string | null {
  const pieces = toPieces(latex.replace(SPACING, "").replace(TIMES, "*").replace(DIVIDE, "/").replace(/−/g, "-").trim());
  if (!pieces) return null;
  let out = "";
  let prev: Piece | null = null;
  for (const p of pieces) {
    const endsValue = prev && (prev.kind === "atom" || prev.kind === "close");
    const startsValue = p.kind === "atom" || p.kind === "open";
    if (endsValue && startsValue) out += "*"; // implied multiplication made explicit
    out += p.kind === "atom" || p.kind === "op" ? p.text : p.kind === "open" ? "(" : p.kind === "close" ? ")" : ",";
    prev = p;
  }
  return out || null;
}

function toPieces(s: string): Piece[] | null {
  const out: Piece[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    const num = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (num) {
      // A whole number straight before a number fraction is a mixed number: 2½ is 2 + 1/2, never 2 × 1/2.
      const after = s.slice(i + num[0].length);
      const mixed = /^\\[dt]?frac/.exec(after);
      if (mixed && !num[0].includes(".")) {
        const fracAt = i + num[0].length + mixed[0].length;
        const n = argument(s, fracAt);
        const d = n && argument(s, n.end);
        if (n && d && /^\d+$/.test(n.body.trim()) && /^\d+$/.test(d.body.trim())) {
          out.push({ kind: "atom", text: `(${num[0]}+${n.body.trim()}/${d.body.trim()})` });
          i = d.end;
          continue;
        }
      }
      out.push({ kind: "atom", text: num[0], number: true });
      i += num[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) { out.push({ kind: "atom", text: c }); i++; continue; }
    if ("+-*/".includes(c)) { out.push({ kind: "op", text: c }); i++; continue; }
    if (c === "(" || c === "[") { out.push({ kind: "open" }); i++; continue; }
    if (c === ")" || c === "]") { out.push({ kind: "close" }); i++; continue; }
    if (c === ",") { out.push({ kind: "comma" }); i++; continue; }
    if (c === "{" || c === "}") { i++; continue; } // grouping braces carry no meaning here
    if (c === "^") {
      const e = argument(s, i + 1);
      if (!e) return null;
      const exp = answerFromLatex(e.body);
      if (exp === null) return null;
      out.push({ kind: "op", text: simple(exp) ? `^${exp}` : `^(${exp})` });
      i = e.end;
      continue;
    }
    if (c === "\\") {
      const cmd = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (cmd && /^[dt]?frac$/.test(cmd[1])) {
        const n = argument(s, i + cmd[0].length);
        const d = n && argument(s, n.end);
        if (!n || !d) return null;
        const top = answerFromLatex(n.body);
        const bottom = answerFromLatex(d.body);
        if (top === null || bottom === null) return null;
        const text = `${simple(top) ? top : `(${top})`}/${simple(bottom) ? bottom : `(${bottom})`}`;
        // A fraction is one value: bracketed whenever it sits next to anything, so `x\frac12` stays x*(1/2).
        out.push({ kind: "atom", text: `(${text})` });
        i = d.end;
        continue;
      }
      return null; // \sqrt, \pi, \angle…: outside the checker's grammar
    }
    return null;
  }
  // A lone fraction needs no outer brackets: `(3/4)` reads as `3/4`.
  if (out.length === 1 && out[0].kind === "atom" && wrapsWhole(out[0].text)) {
    out[0] = { kind: "atom", text: out[0].text.slice(1, -1) };
  }
  return out;
}

/** Whether `t` is one bracketed group from its first character to its last: `(x+1)/(2)` is not, `((x+1)/2)` is. */
function wrapsWhole(t: string): boolean {
  if (!t.startsWith("(") || !t.endsWith(")")) return false;
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "(") depth++;
    else if (t[i] === ")" && --depth === 0 && i < t.length - 1) return false;
  }
  return true;
}

/**
 * A maths lesson's answer box as the answer sent: what was typed stays as typed (`30, 20, 10`, `seven`), and each maths
 * run picked from the `/` menu goes in the checker's form (`$\frac{3}{4}$` → `3/4`), or as written when the checker
 * can't read it.
 */
export function answerFromField(latex: string): string {
  return splitMath(chatTextFromLatex(latex))
    .map((part) => (part.math ? answerFromLatex(part.value) ?? part.value : part.value))
    .join("")
    .trim();
}

/** The same box as its calculator reads it: typed words as they are, maths runs with `sqrt()`, `pi` and `^`. */
export function calcTextFromField(latex: string): string {
  return splitMath(chatTextFromLatex(latex))
    .map((part) => (part.math ? calcTextFromLatex(part.value) : part.value))
    .join("")
    .trim();
}

/**
 * The maths field's LaTeX as the answer box's calculator reads it (`check/arithmetic.ts`: `sqrt()`, `pi`, `^`, `*`),
 * so `\sqrt{144}` shows "= 12" even though the checker itself has no roots. Anything it can't read stays unreadable.
 */
export function calcTextFromLatex(latex: string): string {
  let s = latex.replace(SPACING, "").replace(TIMES, "*").replace(DIVIDE, "/").replace(/\\pi(?![a-zA-Z])/g, "pi");
  // Innermost first, so nested groups unwrap cleanly.
  for (let guard = 0; guard < 32; guard++) {
    const next = s
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\sqrt\[3\]\{([^{}]*)\}/g, "cbrt($1)")
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))")
      .replace(/\\[dt]?frac(\d)(\d)/g, "($1/$2)")
      .replace(/\^\{([^{}]*)\}/g, "^($1)")
      .replace(/\{([^{}]*)\}/g, "($1)");
    if (next === s) break;
    s = next;
  }
  return s;
}
