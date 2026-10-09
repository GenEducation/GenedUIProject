/**
 * A tiny calculator for typed answers: "540 * 40" → 21600. Numbers, + − × ÷
 * (as + - * / x × ÷ too), brackets and decimals; anything else is not a sum
 * and returns null. A hand-written parser, never eval.
 */
export function evaluateArithmetic(input: string): number | null {
  const src = input.replace(/,/g, "").replace(/[×xX]/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const matched = src.match(/\d+(?:\.\d+)?|\.\d+|[-+*/()]|\S/g);
  if (!matched) return null;
  const tokens: string[] = matched;
  let i = 0;
  const peek = () => tokens[i];

  function primary(): number | null {
    const t = tokens[i++];
    if (t === undefined) return null;
    if (t === "-") {
      const v = primary();
      return v === null ? null : -v;
    }
    if (t === "(") {
      const v = sum();
      return v !== null && tokens[i++] === ")" ? v : null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function product(): number | null {
    let v = primary();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = tokens[i++];
      const r = primary();
      if (r === null || (op === "/" && r === 0)) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function sum(): number | null {
    let v = product();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = tokens[i++];
      const r = product();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const value = sum();
  return value !== null && i === tokens.length && Number.isFinite(value) ? value : null;
}

/** The result to show after "=" — only for an actual calculation, not a plain number. */
export function calculation(input: string): string | null {
  if (!/\d\s*[-+*/x×÷−]\s*[\d(.]/i.test(input) && !/[()]/.test(input)) return null;
  const value = evaluateArithmetic(input);
  if (value === null) return null;
  return String(Math.round(value * 1e6) / 1e6);
}
