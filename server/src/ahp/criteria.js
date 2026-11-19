// server/src/ahp/criteria.js — критерії варіанта 14 та автоматична побудова матриць попарних порівнянь з даних каталогу
// Усі шість критеріїв — «вигідні» (чим більше значення, тим краще для пріоритету товару).
export const CRITERIA = [
  { key: "margin",      name: "Маржинальність",        value: p => (p.price - p.cost) / p.price },
  { key: "demand",      name: "Прогнозований попит",   value: p => p.demand },
  { key: "turnover",    name: "Оборотність запасів",   value: p => p.turnover },
  { key: "seasonality", name: "Сезонність (коеф.)",    value: p => p.seasonal },
  { key: "supply",      name: "Надійність постачання", value: p => p.supplyReliability },
  { key: "strategic",   name: "Стратегічна важливість", value: p => p.strategic }
];

// Відображення відношення значень на шкалу Сааті (логарифмічне масштабування: найбільше відношення -> 9)
export function buildMatrixFromValues(values) {
  const pos = values.map(v => Math.max(Number(v) || 0, 1e-9));
  const L = Math.log(Math.max(...pos) / Math.min(...pos));
  return pos.map(a => pos.map(b => {
    if (L < 1e-12) return 1;
    const t = Math.log(a / b) / L;                 // від -1 до 1
    const s = Math.round(1 + 8 * Math.abs(t));     // 1..9
    return t >= 0 ? s : 1 / s;
  }));
}

export function buildAlternativeMatrices(products) {
  return Object.fromEntries(CRITERIA.map(c => [c.key, buildMatrixFromValues(products.map(c.value))]));
}
