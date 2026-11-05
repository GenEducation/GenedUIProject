/** A number of the lesson payload's grammar ("12", "0.5", "-3", "3/4") as a JS number, or NaN. Display and stepping only: the
 *  backend scores the exact value of what is sent. */
export function toNumber(text: string): number {
  const m = text.trim().match(/^([+-]?)(\d+)\s*\/\s*(\d+)$/);
  if (m) return (m[1] === "-" ? -1 : 1) * (Number(m[2]) / Number(m[3]));
  return Number(text);
}

/** The text sent for a value on a line: a decimal with at most six places, no trailing zeros (an exact step like 1/8 stays exact). */
export function valueText(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** The value after `delta` steps from `current`, kept on the line's grid (from `min`) and between `min` and `max`. */
export function stepped(current: number, delta: number, min: number, max: number, step: number): number {
  const index = Math.round((current - min) / step) + delta;
  return Math.min(max, Math.max(min, min + index * step));
}

/** The tick values to label along a line: both ends and up to nine evenly spaced steps between, never more than ~11 labels. */
export function ticks(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  const every = Math.max(1, Math.ceil(count / 10));
  const out: number[] = [];
  for (let i = 0; i <= count; i += every) out.push(min + i * step);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}
