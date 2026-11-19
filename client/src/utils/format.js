// client/src/utils/format.js — форматування чисел і введення дробів шкали Сааті
export const fmt = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "—"
  : Number(v).toLocaleString("uk-UA", { maximumFractionDigits: d }));
export const pct = (v, d = 1) => fmt(v * 100, d) + " %";
export const signed = (v, d = 2) => (v > 0 ? "+" : "") + fmt(v, d);

const trim = v => String(Number(v.toFixed(3)));
// 0.3333 -> "1/3", 3 -> "3"
export function fracText(v) {
  if (Math.abs(v - 1) < 1e-9) return "1";
  if (v > 1) return trim(v);
  const inv = 1 / v;
  return Math.abs(inv - Math.round(inv)) < 1e-9 ? `1/${Math.round(inv)}` : trim(v);
}
// "1/3", "0,5", "7" -> число (NaN, якщо введено некоректно)
export function parseFraction(text) {
  const s = String(text).trim().replace(",", ".");
  if (!s) return NaN;
  if (s.includes("/")) { const [a, b] = s.split("/").map(Number); return b ? a / b : NaN; }
  return Number(s);
}
export const inSaatyScale = v => Number.isFinite(v) && v >= 1 / 9 - 1e-9 && v <= 9 + 1e-9;
