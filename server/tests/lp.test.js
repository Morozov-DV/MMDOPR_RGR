// server/tests/lp.test.js — тести симплекс-методу, моделі асортименту, сервісу та експорту
import { describe, it, expect } from "vitest";
import { simplexMax } from "../src/lp/simplex.js";
import { solveAssortment } from "../src/lp/assortmentModel.js";
import { runAnalysis, runAhp } from "../src/services/analysisService.js";
import { buildTsv } from "../src/export/tsv.js";
import { getDefaultData } from "../src/defaultData.js";

describe("Симплекс-метод", () => {
  it("класична задача: x = (2; 6), z = 36, двоїсті оцінки (0; 1.5; 1)", () => {
    const r = simplexMax([3, 5], [[1, 0], [0, 2], [3, 2]], [4, 12, 18]);
    expect(r.status).toBe("optimal");
    expect(r.y[0]).toBeCloseTo(2, 8); expect(r.y[1]).toBeCloseTo(6, 8); expect(r.z).toBeCloseTo(36, 8);
    expect(r.duals[0]).toBeCloseTo(0, 8); expect(r.duals[1]).toBeCloseTo(1.5, 8); expect(r.duals[2]).toBeCloseTo(1, 8);
  });
  it("сильна двоїстість: b·u = c·x", () => {
    const b = [4, 12, 18], r = simplexMax([3, 5], [[1, 0], [0, 2], [3, 2]], b);
    expect(b.reduce((s, v, i) => s + v * r.duals[i], 0)).toBeCloseTo(r.z, 8);
  });
  it("необмежена задача виявляється", () => {
    expect(simplexMax([1, 0], [[-1, 1]], [1]).status).toBe("unbounded");
  });
  it("від’ємна права частина -> недопустимо", () => {
    expect(simplexMax([1], [[1]], [-1]).status).toBe("infeasible");
  });
});

describe("Модель асортименту", () => {
  const d = getDefaultData();
  const pr = Array(6).fill(1 / 6);
  it("оптимальний план дотримується всіх обмежень і мінімальної представленості", () => {
    const r = solveAssortment({ products: d.products, constraints: d.constraints, priorities: pr, beta: 1 });
    expect(r.status).toBe("optimal");
    expect(r.spend).toBeLessThanOrEqual(d.constraints.budget + 1e-3);
    r.items.forEach((it, i) => {
      expect(it.quantity).toBeGreaterThanOrEqual(d.products[i].minQty - 1e-6);
      expect(it.quantity).toBeLessThanOrEqual(Math.min(d.products[i].demand, d.products[i].supplierCap) + 1e-6);
    });
    r.resources.forEach(x => expect(x.used).toBeLessThanOrEqual(x.limit + 1e-3));
  });
  it("двоїста оцінка бюджету додатна, коли бюджет активний, і дорівнює 0 для неактивного ресурсу", () => {
    const r = solveAssortment({ products: d.products, constraints: { ...d.constraints, warehouse: 1000 }, priorities: pr, beta: 1 });
    const budget = r.resources.find(x => x.key === "budget"), wh = r.resources.find(x => x.key === "warehouse");
    expect(budget.binding).toBe(true); expect(budget.dual).toBeGreaterThan(0);
    expect(wh.binding).toBe(false); expect(wh.dual).toBe(0);
  });
  it("двоїста оцінка прогнозує приріст цільової функції при збільшенні бюджету", () => {
    const base = solveAssortment({ products: d.products, constraints: d.constraints, priorities: pr, beta: 1 });
    const more = solveAssortment({ products: d.products, constraints: { ...d.constraints, budget: d.constraints.budget + 1000 }, priorities: pr, beta: 1 });
    const dual = base.resources.find(x => x.key === "budget").dual;
    expect(more.objective - base.objective).toBeCloseTo(dual * 1000, 0);
  });
  it("недопустима модель: мінімум перевищує бюджет, попит або постачання", () => {
    const tight = solveAssortment({ products: d.products, constraints: { ...d.constraints, budget: 1000 }, priorities: pr, beta: 1 });
    expect(tight.status).toBe("infeasible"); expect(tight.message).toMatch(/бюджет/);
    const bad = d.products.map((p, i) => (i === 0 ? { ...p, minQty: 100 } : p));
    const r2 = solveAssortment({ products: bad, constraints: d.constraints, priorities: pr, beta: 1 });
    expect(r2.status).toBe("infeasible"); expect(r2.message).toMatch(/попит/);
  });
});

describe("Сервіс і експорт", () => {
  it("повний аналіз: обидва методи на однакових даних, плани відрізняються", () => {
    const r = runAnalysis(getDefaultData());
    expect(r.lp.classic.status).toBe("optimal"); expect(r.lp.modified.status).toBe("optimal");
    expect(r.comparison.planChanged).toBe(true);
  });
  it("валідація даних: порожнє поле, дублікат назви, неповна матриця", () => {
    const d = getDefaultData();
    expect(() => runAhp({ ...d, products: d.products.map((p, i) => (i ? p : { ...p, price: null })) })).toThrow(/числом/);
    expect(() => runAhp({ ...d, products: d.products.map((p, i) => (i === 1 ? { ...p, name: "Смартфони" } : p)) })).toThrow(/унікальними/);
    expect(() => runAhp({ ...d, altMatrices: { ...d.altMatrices, margin: [[1, 2], [0.5, 1]] } })).toThrow(/розмір/);
  });
  it("TSV містить розділи, однакову кількість стовпців у таблицях і двоїсті оцінки", () => {
    const d = getDefaultData(), tsv = buildTsv(d, runAnalysis(d));
    expect(tsv).toContain("# Товарні позиції");
    expect(tsv).toContain("Двоїста оцінка");
    expect(tsv).toContain("# Оптимальні закупівлі — Модифікований МАІ");
    const lines = tsv.split("\n"), i = lines.indexOf("# Товарні позиції");
    expect(lines[i + 1].split("\t")).toHaveLength(15); expect(lines[i + 2].split("\t")).toHaveLength(15);
  });
});
