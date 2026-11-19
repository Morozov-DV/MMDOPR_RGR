// server/src/lp/assortmentModel.js
// Задача ЛП оптимізації асортименту та обсягів закупівлі.
//   Змінні x_i — обсяг закупівлі товару i (одиниць).
//   Цільова функція (max):  Σ c_i x_i,   c_i = m_i · f_i,
//        m_i = ціна − закупівельна ціна − складські витрати на одиницю (одиничний прибуток),
//        f_i = max(0.1, 1 + β·(n·p_i − 1))  — коефіцієнт пріоритету (p_i — пріоритет МАІ, n·p_i = 1 для «середнього» товару,
//        β — вплив пріоритетів на цільову функцію; β = 0 -> чиста максимізація прибутку).
//   Обмеження:  Σ cost_i x_i ≤ B (бюджет);  Σ area_i x_i ≤ W (складська місткість);  Σ x_i ≤ L (пропускна здатність постачання/логістики);
//               x_i ≤ D_i (попит);  x_i ≤ S_i (місткість постачальника);  x_i ≥ minQty_i (мінімальна представленість ключових категорій).
// Нижні межі усуваються заміною x_i = minQty_i + y_i, y_i ≥ 0 (тоді початковий базис допустимий).
import { simplexMax } from "./simplex.js";

const round = (v, d = 6) => Math.round(v * 10 ** d) / 10 ** d;
const EPS = 1e-7;

export function unitMargin(p) { return p.price - p.cost - p.storage; }

export function solveAssortment({ products, constraints, priorities, beta }) {
  const n = products.length;
  if (priorities.length !== n) throw new Error("Кількість пріоритетів не збігається з кількістю товарів.");
  const { budget, warehouse, logistics } = constraints;
  const lo = products.map(p => p.minQty);
  const ub = products.map(p => Math.min(p.demand, p.supplierCap));
  const m = products.map(unitMargin);
  const factor = priorities.map(p => Math.max(0.1, 1 + beta * (n * p - 1)));
  const c = m.map((v, i) => v * factor[i]);
  const result = { status: "optimal", message: "", objectiveCoefficients: c.map(v => round(v, 4)), priorityFactors: factor.map(v => round(v, 4)) };

  // --- Перевірка допустимості нижніх меж (виявлення відсутності допустимого розв'язку) ---
  const problems = [];
  products.forEach((p, i) => {
    if (lo[i] > p.demand + EPS) problems.push(`Мінімальна представленість «${p.name}» (${lo[i]}) перевищує прогнозований попит (${p.demand}).`);
    if (lo[i] > p.supplierCap + EPS) problems.push(`Мінімальна представленість «${p.name}» (${lo[i]}) перевищує місткість постачання (${p.supplierCap}).`);
  });
  const loCost = products.reduce((s, p, i) => s + p.cost * lo[i], 0);
  const loArea = products.reduce((s, p, i) => s + p.area * lo[i], 0);
  const loUnits = lo.reduce((a, b) => a + b, 0);
  if (loCost > budget + EPS) problems.push(`Мінімальна закупівля ключових товарів (${round(loCost, 2)} грн) перевищує бюджет (${budget} грн).`);
  if (loArea > warehouse + EPS) problems.push(`Мінімальна закупівля потребує ${round(loArea, 3)} складської місткості при ліміті ${warehouse}.`);
  if (loUnits > logistics + EPS) problems.push(`Мінімальна закупівля (${loUnits} од.) перевищує ліміт постачання (${logistics} од.).`);
  if (problems.length) return { ...result, status: "infeasible", message: "Допустимого розв’язку не існує. " + problems.join(" "), problems };

  // --- Побудова обмежень у змінних y_i = x_i − minQty_i ---
  const rows = [], rhs = [], labels = [];
  rows.push(products.map(p => p.cost)); rhs.push(budget - loCost); labels.push({ type: "budget", name: "Закупівельний бюджет" });
  rows.push(products.map(p => p.area)); rhs.push(warehouse - loArea); labels.push({ type: "warehouse", name: "Складська місткість" });
  rows.push(products.map(() => 1)); rhs.push(logistics - loUnits); labels.push({ type: "logistics", name: "Місткість постачання (од.)" });
  products.forEach((p, i) => {
    rows.push(products.map((_, j) => (i === j ? 1 : 0))); rhs.push(p.demand - lo[i]); labels.push({ type: "demand", index: i, name: `Попит: ${p.name}` });
    rows.push(products.map((_, j) => (i === j ? 1 : 0))); rhs.push(p.supplierCap - lo[i]); labels.push({ type: "supplier", index: i, name: `Постачальник: ${p.name}` });
  });

  const sol = simplexMax(c, rows, rhs);
  if (sol.status !== "optimal") {
    const msg = sol.status === "unbounded" ? "Цільова функція необмежена: перевірте обмеження." : sol.message;
    return { ...result, status: sol.status, message: msg };
  }

  const x = sol.y.map((y, i) => lo[i] + y);          // без округлення: усі розрахунки використання ресурсів точні
  const spend = products.reduce((s, p, i) => s + p.cost * x[i], 0);
  const area = products.reduce((s, p, i) => s + p.area * x[i], 0);
  const units = x.reduce((a, b) => a + b, 0);
  const lim = [budget, warehouse, logistics], used = [spend, area, units];
  const duals = sol.duals.map(d => round(d, 6));

  const resources = labels.slice(0, 3).map((l, k) => ({
    key: l.type, name: l.name, used: round(used[k], 3), limit: lim[k], percent: round((used[k] / lim[k]) * 100, 2),
    dual: duals[k], binding: Math.abs(lim[k] - used[k]) < 1e-6 * Math.max(1, lim[k])
  }));
  const bounds = products.map((p, i) => ({
    name: p.name, demandDual: duals[3 + 2 * i], supplierDual: duals[4 + 2 * i],
    demandBinding: Math.abs(x[i] - p.demand) < 1e-6, supplierBinding: Math.abs(x[i] - p.supplierCap) < 1e-6
  }));
  const profit = products.reduce((s, p, i) => s + m[i] * x[i], 0);
  const revenue = products.reduce((s, p, i) => s + p.price * x[i], 0);
  const turnover = spend > 0 ? products.reduce((s, p, i) => s + p.turnover * p.cost * x[i], 0) / spend : 0;

  return {
    ...result, x: x.map(v => round(v, 6)), iterations: sol.iterations,
    objective: round(c.reduce((s, ci, i) => s + ci * x[i], 0), 4),           // зважена цільова функція
    expectedProfit: round(profit, 2), revenue: round(revenue, 2), spend: round(spend, 2), avgTurnover: round(turnover, 3),
    items: products.map((p, i) => ({
      name: p.name, quantity: round(x[i], 6), purchaseCost: round(p.cost * x[i], 2), profit: round(m[i] * x[i], 2),
      areaUsed: round(p.area * x[i], 4), deficit: round(Math.max(0, p.demand - x[i]), 4),
      coverage: p.demand > 0 ? round((x[i] / p.demand) * 100, 2) : 100, share: spend > 0 ? round((p.cost * x[i] / spend) * 100, 2) : 0,
      keyCategoryOk: x[i] + EPS >= p.minQty, reducedCost: round(sol.reducedCosts[i], 6)
    })),
    resources, bounds
  };
}
