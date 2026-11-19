// server/src/services/analysisService.js — валідація даних і повний аналіз (МАІ + ЛП для обох методів)
import { CRITERIA } from "../ahp/criteria.js";
import { classicAhp } from "../ahp/classicAhp.js";
import { modifiedAhp, validateModParams } from "../ahp/modifiedAhp.js";
import { solveAssortment } from "../lp/assortmentModel.js";

// Правила перевірки полів товару: [поле, підпис, мінімум, максимум, чи суворо більше мінімуму]
const FIELD_RULES = [
  ["cost", "закупівельна ціна", 0, Infinity, true], ["price", "ціна продажу", 0, Infinity, true],
  ["demand", "прогнозований попит", 0, Infinity, true], ["area", "габарити (площа на одиницю)", 0, Infinity, true],
  ["storage", "складські витрати", 0, Infinity, false], ["leadTime", "строк постачання", 0, Infinity, false],
  ["turnover", "оборотність", 0, Infinity, true], ["seasonal", "сезонний коефіцієнт", 0, 5, true],
  ["supplyReliability", "надійність постачання", 0, 1, true], ["strategic", "стратегічна важливість", 0, 10, true],
  ["forecastReliability", "достовірність прогнозу", 0, 1, false], ["shortageRisk", "ризик дефіциту", 0, 1, false],
  ["supplierCap", "місткість постачання", 0, Infinity, false], ["minQty", "мінімальна представленість", 0, Infinity, false]
];

export function validateProducts(products) {
  if (!Array.isArray(products) || products.length < 2) throw new Error("Потрібно щонайменше два товари.");
  const names = new Set();
  products.forEach((p, i) => {
    const label = `Товар №${i + 1}`;
    if (!p || typeof p.name !== "string" || !p.name.trim()) throw new Error(`${label}: вкажіть назву.`);
    if (names.has(p.name.trim())) throw new Error(`Назва «${p.name}» повторюється — назви мають бути унікальними.`);
    names.add(p.name.trim());
    for (const [f, caption, min, max, strict] of FIELD_RULES) {
      const v = p[f];
      if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`«${p.name}»: поле «${caption}» має бути числом (порожні значення недопустимі).`);
      if (strict ? v <= min : v < min) throw new Error(`«${p.name}»: поле «${caption}» має бути ${strict ? "більше" : "не менше"} ${min}.`);
      if (v > max) throw new Error(`«${p.name}»: поле «${caption}» не може перевищувати ${max}.`);
    }
  });
}

export function validateConstraints(c) {
  for (const [k, caption] of [["budget", "закупівельний бюджет"], ["warehouse", "складська місткість"], ["logistics", "місткість постачання"]])
    if (!c || typeof c[k] !== "number" || !Number.isFinite(c[k]) || c[k] <= 0) throw new Error(`Обмеження «${caption}» має бути додатним числом.`);
}

const prep = products => products.map(p => ({ ...p, name: p.name.trim() }));

// Крок 1: класичний і модифікований МАІ
export function runAhp(input) {
  const { criteriaMatrix, altMatrices, params = {} } = input ?? {};
  validateProducts(input?.products);
  const products = prep(input.products);
  validateModParams({ gamma: 1, lambda: 0.5, ...params });
  const classic = classicAhp({ criteria: CRITERIA, criteriaMatrix, altMatrices, n: products.length });
  const modified = modifiedAhp({ classic, products, params });
  return {
    products: products.map(p => p.name),
    criteria: CRITERIA.map((c, k) => ({ key: c.key, name: c.name, weight: classic.criteriaWeights[k] })),
    classic, modified
  };
}

// Крок 2: МАІ + задача ЛП для обох методів на ОДНАКОВИХ даних і обмеженнях
export function runAnalysis(input) {
  validateConstraints(input?.constraints);
  const ahp = runAhp(input);
  const products = prep(input.products);
  const beta = typeof input.params?.beta === "number" ? input.params.beta : 1;
  if (!Number.isFinite(beta) || beta < 0 || beta > 5) throw new Error("Вплив пріоритетів β має бути числом від 0 до 5.");
  const solve = pr => solveAssortment({ products, constraints: input.constraints, priorities: pr, beta });
  const lp = { classic: solve(ahp.classic.priorities), modified: solve(ahp.modified.priorities) };

  let comparison = null;
  if (lp.classic.status === "optimal" && lp.modified.status === "optimal") {
    const diff = lp.classic.x.map((v, i) => lp.modified.x[i] - v);
    comparison = {
      quantityDiff: diff, planChanged: diff.some(d => Math.abs(d) > 1e-6),
      profitDiff: lp.modified.expectedProfit - lp.classic.expectedProfit,
      objectiveDiff: lp.modified.objective - lp.classic.objective,
      spendDiff: lp.modified.spend - lp.classic.spend,
      topClassic: products[ahp.classic.ranks.indexOf(1)].name, topModified: products[ahp.modified.ranks.indexOf(1)].name
    };
  }
  return { ahp, lp, comparison, constraints: input.constraints, params: { ...ahp.modified.params, beta } };
}
