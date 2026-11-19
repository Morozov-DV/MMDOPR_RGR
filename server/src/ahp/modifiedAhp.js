// server/src/ahp/modifiedAhp.js
// Модифікований МАІ для інтернет-магазину. Працює над результатом класичного МАІ й коригує пріоритети
// у три послідовні кроки (після кожного кроку вектор нормується до суми 1):
//   1) ДОСТОВІРНІСТЬ ПРОГНОЗУ ПОПИТУ. Локальні ваги за критерієм «Прогнозований попит» стискаються до середнього:
//        l'_i = ρ_i · l_i + (1 − ρ_i) / n,  ρ_i — достовірність прогнозу попиту товару i (0..1).
//      Чим менш надійний прогноз, тим менше він впливає на пріоритет. Глобальні пріоритети синтезуються заново.
//   2) СЕЗОННІСТЬ. p_i ← p_i · s_i^γ,  s_i — сезонний коефіцієнт поточного періоду, γ — чутливість до сезонності.
//   3) РИЗИК ДЕФІЦИТУ. p_i ← p_i · (1 − λ · r_i),  r_i — ризик дефіциту (0..1), λ — штраф за ризик.
// Параметри γ, λ задає користувач; при γ = 0, λ = 0 і ρ_i = 1 результат збігається з класичним МАІ.
import { ranksOf, synthesize } from "./classicAhp.js";
import { CRITERIA } from "./criteria.js";

export const DEFAULT_MOD_PARAMS = { gamma: 1, lambda: 0.5, useForecastReliability: true };

export function validateModParams(p) {
  if (!p || typeof p.gamma !== "number" || !Number.isFinite(p.gamma) || p.gamma < 0 || p.gamma > 3)
    throw new Error("Чутливість до сезонності γ має бути числом від 0 до 3.");
  if (typeof p.lambda !== "number" || !Number.isFinite(p.lambda) || p.lambda < 0 || p.lambda > 1)
    throw new Error("Штраф за ризик дефіциту λ має бути числом від 0 до 1.");
}

const normalize = v => { const s = v.reduce((a, b) => a + b, 0); return v.map(x => x / s); };

export function modifiedAhp({ classic, products, params }) {
  const p = { ...DEFAULT_MOD_PARAMS, ...params };
  validateModParams(p);
  const n = products.length;

  // Крок 1: стиснення локальних ваг за критерієм попиту відповідно до достовірності прогнозу
  const locals = CRITERIA.map(c => classic.locals[c.key]);
  const demandIdx = CRITERIA.findIndex(c => c.key === "demand");
  const adjustedLocals = locals.map((l, k) => (k === demandIdx && p.useForecastReliability
    ? normalize(l.map((x, i) => products[i].forecastReliability * x + (1 - products[i].forecastReliability) / n)) : l));
  const step1 = normalize(synthesize(classic.criteriaWeights, adjustedLocals));
  // Крок 2: сезонні коефіцієнти
  const step2 = normalize(step1.map((x, i) => x * Math.pow(products[i].seasonal, p.gamma)));
  // Крок 3: ризик дефіциту
  const step3 = normalize(step2.map((x, i) => x * Math.max(0, 1 - p.lambda * products[i].shortageRisk)));

  const base = classic.priorities;
  const ranks = ranksOf(step3);
  return {
    params: p, priorities: step3, ranks,
    steps: { classic: base, reliability: step1, season: step2, risk: step3 },
    effects: {                                       // внесок кожного кроку у зміну пріоритету
      reliability: step1.map((x, i) => x - base[i]),
      season: step2.map((x, i) => x - step1[i]),
      risk: step3.map((x, i) => x - step2[i]),
      total: step3.map((x, i) => x - base[i])
    },
    rankShift: ranks.map((r, i) => classic.ranks[i] - r)   // > 0 — товар піднявся в рейтингу
  };
}
