/**
 * Payload handling for the Desmos widget.
 *
 * These two functions run *inside* the sandboxed graph iframe — MathWidget
 * injects their source into the frame — but they live here as ordinary
 * functions so they can be unit tested instead of being buried in an
 * unreadable template string.
 *
 * Keep them dependency-free and ES5-ish: they are stringified verbatim into a
 * plain <script>, so anything the bundler would normally resolve (imports,
 * helpers, closures over module scope) would not exist at runtime.
 */

export interface MathBounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

/**
 * Splits a payload into individual expressions on top-level commas and latex
 * line breaks (`\\`).
 *
 * Desmos's `setExpression` draws exactly one expression. The tutor routinely
 * sends a comma-separated list — twenty circles for "count the coconuts" — and
 * passing that whole list as a single latex string made Desmos reject it
 * silently, leaving an empty grid.
 *
 * Depth tracking keeps separators nested inside (), [] or {} from splitting a
 * term that legitimately contains a comma, such as a list or an interval.
 */
export function splitExpressions(src: string): string[] {
  if (!src) return [];

  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    // A latex line break, i.e. two backslash characters.
    if (ch === '\\' && src[i + 1] === '\\' && depth === 0) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  parts.push(current);

  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Best-effort guess at where the drawing actually sits, so the camera can be
 * pointed at it.
 *
 * Without this the calculator keeps whatever viewport it had when it was
 * built, which is how a graph ended up spanning -300..300 — circles of radius
 * 0.3 sitting at x=2..5 were drawn sub-pixel: present, but invisible.
 *
 * Centres are read from `(x ± n)` / `(y ± n)` groups, the shape of the point
 * and circle plots the tutor generates. Returns null when the expressions
 * aren't in that shape, so the caller can fall back to a plain default view.
 */
export function contentBounds(expressions: string[]): MathBounds | null {
  const xs: number[] = [];
  const ys: number[] = [];
  const joined = expressions.join(' ');
  const re = /\(\s*([xy])\s*([+-])\s*([0-9]*\.?[0-9]+)\s*\)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(joined)) !== null) {
    const value = parseFloat(m[3]);
    if (!isFinite(value)) continue;
    // "(x - 2)" is centred at +2.
    const centre = m[2] === '-' ? value : -value;
    (m[1] === 'x' ? xs : ys).push(centre);
  }

  if (xs.length === 0 || ys.length === 0) return null;

  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxY = Math.max.apply(null, ys);

  // Pad so the plotted shapes aren't flush against the edge, with a floor for
  // the degenerate case where every point shares a coordinate.
  const padX = Math.max((maxX - minX) * 0.25, 1.5);
  const padY = Math.max((maxY - minY) * 0.25, 1.5);

  return { left: minX - padX, right: maxX + padX, bottom: minY - padY, top: maxY + padY };
}
