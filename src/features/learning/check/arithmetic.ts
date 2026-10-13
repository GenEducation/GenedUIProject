/**
 * A school calculator for typed answers: "540 * 40" → 21600, "√144" → 12, "2^10" → 1024, "20% of 150" → 30,
 * "sin 30" → 0.5. A hand-written parser, never eval; anything it doesn't understand returns null.
 *
 *  - + − × ÷ (also as - * / x · ÷), brackets, decimals, and 1,000-style thousands
 *  - powers: 2^3, 2**3, 5², 5³ · roots: √16, sqrt(16), ∛27, cbrt(27)
 *  - log (base 10), ln · sin, cos, tan in degrees, as school uses them
 *  - π (pi), e · factorial 5! · percent 20% and "20% of 150"
 *  - implied multiplication: 2π, 3(4 + 5), 2√9, (1 + 2)(3 + 4)
 *
 * Results that aren't real numbers (√−4, log 0, tan 90, 0!…-style nonsense, ÷0) are null, never NaN or Infinity.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" }
  | { t: "post"; v: "!" | "%" | "²" | "³" }
  | { t: "open" }
  | { t: "close" }
  | { t: "fn"; v: Fn }
  | { t: "const"; v: number };

type Fn = "sqrt" | "cbrt" | "log" | "ln" | "sin" | "cos" | "tan";

const FUNCTIONS: Record<string, Fn> = {
  sqrt: "sqrt", "√": "sqrt",
  cbrt: "cbrt", "∛": "cbrt",
  log: "log", lg: "log",
  ln: "ln",
  sin: "sin", cos: "cos", tan: "tan",
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, "π": Math.PI, e: Math.E };

const DEG = Math.PI / 180;
const EPS = 1e-12;

function tokenize(input: string): Token[] | null {
  const src = input
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // thousands separators
    .replace(/\*\*/g, "^")
    .replace(/[×·∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .toLowerCase();
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    const num = /^(\d+(\.\d*)?|\.\d+)/.exec(src.slice(i));
    if (num) { out.push({ t: "num", v: Number(num[0]) }); i += num[0].length; continue; }
    if ("+-*/^".includes(c)) { out.push({ t: "op", v: c as "+" }); i += 1; continue; }
    if ("!%²³".includes(c)) { out.push({ t: "post", v: c as "!" }); i += 1; continue; }
    if (c === "(" || c === "[") { out.push({ t: "open" }); i += 1; continue; }
    if (c === ")" || c === "]") { out.push({ t: "close" }); i += 1; continue; }
    if (c === "√" || c === "∛") { out.push({ t: "fn", v: FUNCTIONS[c] }); i += 1; continue; }
    if (c === "π") { out.push({ t: "const", v: Math.PI }); i += 1; continue; }
    const word = /^[a-z]+/.exec(src.slice(i));
    if (word) {
      const w = word[0];
      if (w in FUNCTIONS) out.push({ t: "fn", v: FUNCTIONS[w] });
      else if (w in CONSTANTS) out.push({ t: "const", v: CONSTANTS[w] });
      else if (w === "of") out.push({ t: "op", v: "*" }); // 20% of 150
      else if (w === "x" && isTimes(out, src.slice(i + 1))) out.push({ t: "op", v: "*" }); // 5 x 3
      else return null; // a variable or a word: not a calculation
      i += w.length;
      continue;
    }
    return null;
  }
  return out;
}

/**
 * "x" means times only between two values ("5 x 3", "(2) x 4"); anywhere else it's a variable ("2x + 3"), which
 * makes the input algebra rather than a calculation.
 */
function isTimes(before: Token[], after: string): boolean {
  const prev = before[before.length - 1];
  const prevIsValue = !!prev && (prev.t === "num" || prev.t === "close" || prev.t === "const" || prev.t === "post");
  return prevIsValue && /^\s*[\d.(√∛π[]/.test(after);
}

function factorial(n: number): number | null {
  if (!Number.isInteger(n) || n < 0 || n > 170) return null;
  let f = 1;
  for (let k = 2; k <= n; k += 1) f *= k;
  return f;
}

function apply(fn: Fn, x: number): number | null {
  switch (fn) {
    case "sqrt": return x < 0 ? null : Math.sqrt(x);
    case "cbrt": return Math.cbrt(x);
    case "log": return x <= 0 ? null : Math.log10(x);
    case "ln": return x <= 0 ? null : Math.log(x);
    case "sin": return Math.sin(x * DEG);
    case "cos": return Math.cos(x * DEG);
    case "tan": return Math.abs(Math.cos(x * DEG)) < EPS ? null : Math.tan(x * DEG);
  }
}

/** The value of a typed calculation, or null when it isn't one we can work out. */
export function evaluateArithmetic(input: string): number | null {
  const parsed = tokenize(input);
  if (!parsed || parsed.length === 0) return null;
  const tokens: Token[] = parsed;
  let i = 0;
  const peek = () => tokens[i];
  /** Can this token begin a value? (Then two values side by side multiply: 2π, 3(4+5).) */
  const startsValue = (t: Token | undefined) => !!t && (t.t === "num" || t.t === "open" || t.t === "fn" || t.t === "const");

  // primary := number | constant | ( expr ) | fn argument
  function primary(): number | null {
    const t = tokens[i++];
    if (!t) return null;
    if (t.t === "num" || t.t === "const") return t.v;
    if (t.t === "open") {
      const v = expr();
      return v !== null && tokens[i++]?.t === "close" ? v : null;
    }
    if (t.t === "fn") {
      // sin(30), sin 30, √16, √(9+16), √2² is √(2²)
      const arg = unary();
      return arg === null ? null : apply(t.v, arg);
    }
    return null;
  }

  // postfix := primary ( ! | % | ² | ³ )*
  function postfix(): number | null {
    let v = primary();
    while (v !== null && peek()?.t === "post") {
      const p = (tokens[i++] as { v: string }).v;
      v = p === "!" ? factorial(v) : p === "%" ? v / 100 : p === "²" ? v * v : v * v * v;
    }
    return v;
  }

  // power := postfix ( ^ unary )?   (right-associative: 2^3^2 = 2^9)
  function power(): number | null {
    const base = postfix();
    if (base === null) return null;
    const t = peek();
    if (t?.t === "op" && t.v === "^") {
      i += 1;
      const exp = unary();
      if (exp === null) return null;
      const v = Math.pow(base, exp);
      return Number.isFinite(v) ? v : null;
    }
    return base;
  }

  // unary := (+|-) unary | power      (so −2² = −4, as on a calculator)
  function unary(): number | null {
    const t = peek();
    if (t?.t === "op" && (t.v === "-" || t.v === "+")) {
      i += 1;
      const v = unary();
      return v === null ? null : t.v === "-" ? -v : v;
    }
    return power();
  }

  // term := unary ( (* | / | implied) unary )*
  function term(): number | null {
    let v = unary();
    while (v !== null) {
      const t = peek();
      if (t?.t === "op" && (t.v === "*" || t.v === "/")) {
        i += 1;
        const r = unary();
        if (r === null || (t.v === "/" && r === 0)) return null;
        v = t.v === "*" ? v * r : v / r;
      } else if (startsValue(t) && !(t!.t === "num" && tokens[i - 1]?.t === "num")) {
        // implied multiplication, but never two bare numbers ("2 3" is a typo, not 6)
        const r = unary();
        if (r === null) return null;
        v *= r;
      } else break;
    }
    return v;
  }

  // expr := term ( (+|-) term )*
  function expr(): number | null {
    let v = term();
    while (v !== null) {
      const t = peek();
      if (t?.t === "op" && (t.v === "+" || t.v === "-")) {
        i += 1;
        const r = term();
        if (r === null) return null;
        v = t.v === "+" ? v + r : v - r;
      } else break;
    }
    return v;
  }

  const value = expr();
  return value !== null && i === tokens.length && Number.isFinite(value) ? value : null;
}

/** A result as a calculator shows it: up to 6 decimal places, no "-0", no float dust (0.1 + 0.2 → 0.3). */
export function formatResult(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Object.is(rounded, -0) || rounded === 0) return "0";
  return Math.abs(rounded) >= 1e15 ? value.toPrecision(10).replace(/\.?0+e/, "e") : String(rounded);
}

/** The result to show after "=", only for an actual calculation, not a plain number like "21600" or "-3". */
export function calculation(input: string): string | null {
  const tokens = tokenize(input);
  if (!tokens) return null;
  const plain =
    (tokens.length === 1 && tokens[0].t === "num") ||
    (tokens.length === 2 && tokens[0].t === "op" && tokens[0].v === "-" && tokens[1].t === "num");
  if (plain) return null;
  const value = evaluateArithmetic(input);
  return value === null ? null : formatResult(value);
}
