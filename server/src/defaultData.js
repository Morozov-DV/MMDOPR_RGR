// server/src/defaultData.js — вхідні дані за замовчуванням (навчальний приклад; період — місяць)
import { buildAlternativeMatrices } from "./ahp/criteria.js";
import { DEFAULT_MOD_PARAMS } from "./ahp/modifiedAhp.js";

// cost — закупівельна ціна, price — ціна продажу (грн); demand — прогноз попиту (од.); area — габарити (складська площа на одиницю, м²);
// storage — складські витрати на одиницю (грн); leadTime — строк постачання (днів); turnover — оборотність (разів/період);
// seasonal — сезонний коефіцієнт; supplyReliability (0..1); strategic (1..10); forecastReliability — достовірність прогнозу попиту (0..1);
// shortageRisk — ризик дефіциту (0..1); supplierCap — місткість постачання (од.); minQty — мінімальна представленість (од.)
export const defaultProducts = [
  { name: "Смартфони", cost: 14000, price: 17500, demand: 40, area: 0.02, storage: 150, leadTime: 5, turnover: 6, seasonal: 1.2, supplyReliability: 0.8, strategic: 9, forecastReliability: 0.85, shortageRisk: 0.25, supplierCap: 35, minQty: 8 },
  { name: "Ноутбуки", cost: 24000, price: 28500, demand: 25, area: 0.06, storage: 300, leadTime: 10, turnover: 4, seasonal: 1.1, supplyReliability: 0.75, strategic: 8, forecastReliability: 0.7, shortageRisk: 0.35, supplierCap: 20, minQty: 5 },
  { name: "Побутова техніка", cost: 2800, price: 3900, demand: 80, area: 0.3, storage: 200, leadTime: 14, turnover: 3, seasonal: 0.9, supplyReliability: 0.9, strategic: 6, forecastReliability: 0.9, shortageRisk: 0.15, supplierCap: 70, minQty: 10 },
  { name: "Аксесуари", cost: 250, price: 520, demand: 500, area: 0.01, storage: 8, leadTime: 4, turnover: 12, seasonal: 1.0, supplyReliability: 0.95, strategic: 5, forecastReliability: 0.85, shortageRisk: 0.1, supplierCap: 450, minQty: 100 },
  { name: "Одяг (сезонний)", cost: 600, price: 1350, demand: 220, area: 0.04, storage: 30, leadTime: 21, turnover: 5, seasonal: 1.35, supplyReliability: 0.7, strategic: 7, forecastReliability: 0.55, shortageRisk: 0.4, supplierCap: 200, minQty: 0 },
  { name: "Іграшки", cost: 400, price: 780, demand: 160, area: 0.05, storage: 25, leadTime: 12, turnover: 7, seasonal: 0.75, supplyReliability: 0.85, strategic: 4, forecastReliability: 0.75, shortageRisk: 0.2, supplierCap: 150, minQty: 0 }
];

// Матриця попарних порівнянь критеріїв (шкала Сааті). Порядок: маржинальність, попит, оборотність, сезонність, надійність, стратегічність
export const defaultCriteriaMatrix = [
  [1, 2, 3, 4, 3, 2],
  [1 / 2, 1, 2, 3, 2, 2],
  [1 / 3, 1 / 2, 1, 2, 2, 1],
  [1 / 4, 1 / 3, 1 / 2, 1, 1, 1 / 2],
  [1 / 3, 1 / 2, 1 / 2, 1, 1, 1 / 2],
  [1 / 2, 1 / 2, 1, 2, 2, 1]
];

export function getDefaultData() {
  return {
    products: defaultProducts,
    criteriaMatrix: defaultCriteriaMatrix,
    altMatrices: buildAlternativeMatrices(defaultProducts),     // побудовані з даних каталогу; користувач може їх редагувати
    constraints: { budget: 800000, warehouse: 22, logistics: 900 },
    params: { ...DEFAULT_MOD_PARAMS, gamma: 1.5, beta: 2 }
  };
}
