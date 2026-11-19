// server/tests/ahp.test.js — тести МАІ (класичний і модифікований)
import { describe, it, expect } from "vitest";
import { computeWeights, validatePairwise, classicAhp, ranksOf } from "../src/ahp/classicAhp.js";
import { buildMatrixFromValues, CRITERIA } from "../src/ahp/criteria.js";
import { modifiedAhp } from "../src/ahp/modifiedAhp.js";
import { getDefaultData } from "../src/defaultData.js";

describe("Класичний МАІ", () => {
  it("ваги та CR для відомої матриці 3×3 (Сааті)", () => {
    const r = computeWeights([[1, 3, 5], [1 / 3, 1, 3], [1 / 5, 1 / 3, 1]]);
    expect(r.weights[0]).toBeCloseTo(0.637, 3);
    expect(r.weights[1]).toBeCloseTo(0.258, 3);
    expect(r.weights[2]).toBeCloseTo(0.105, 3);
    expect(r.lambdaMax).toBeCloseTo(3.039, 3);
    expect(r.CR).toBeCloseTo(0.033, 3);
    expect(r.consistent).toBe(true);
  });
  it("повністю узгоджена матриця має CR = 0", () => {
    const r = computeWeights([[1, 2, 4], [1 / 2, 1, 2], [1 / 4, 1 / 2, 1]]);
    expect(r.CR).toBeCloseTo(0, 8);
    expect(r.weights[0]).toBeCloseTo(4 / 7, 6);
  });
  it("неузгоджена матриця позначається як неузгоджена", () => {
    expect(computeWeights([[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]).consistent).toBe(false);
  });
  it("валідація: зворотна симетрія, шкала, діагональ, форма", () => {
    expect(() => validatePairwise([[1, 3], [3, 1]])).toThrow(/зворотну симетрію/);
    expect(() => validatePairwise([[1, 12], [1 / 12, 1]])).toThrow(/шкалу Сааті/);
    expect(() => validatePairwise([[2, 1], [1, 1]])).toThrow(/діагональний/);
    expect(() => validatePairwise([[1, 2, 3], [0.5, 1]])).toThrow(/квадратною/);
    expect(() => validatePairwise([[1, NaN], [NaN, 1]])).toThrow(/додатним/);
    expect(() => validatePairwise([[1]])).toThrow(/2×2/);
  });
  it("автогенерація матриці з даних є зворотно-симетричною та в межах шкали", () => {
    const m = buildMatrixFromValues([0.2, 0.5, 0.35, 0.9]);
    expect(() => validatePairwise(m)).not.toThrow();
    expect(m[3][0]).toBe(9);
  });
  it("глобальні пріоритети: сума = 1, ранги коректні", () => {
    const d = getDefaultData();
    const r = classicAhp({ criteria: CRITERIA, criteriaMatrix: d.criteriaMatrix, altMatrices: d.altMatrices, n: d.products.length });
    expect(r.priorities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(r.ranks[3]).toBe(1);                      // «Аксесуари» — лідер
    expect(ranksOf([0.2, 0.5, 0.5, 0.1])).toEqual([3, 1, 1, 4]);
  });
});

describe("Модифікований МАІ", () => {
  const d = getDefaultData();
  const classic = classicAhp({ criteria: CRITERIA, criteriaMatrix: d.criteriaMatrix, altMatrices: d.altMatrices, n: d.products.length });
  it("при γ = 0, λ = 0 і вимкненій достовірності збігається з класичним", () => {
    const m = modifiedAhp({ classic, products: d.products, params: { gamma: 0, lambda: 0, useForecastReliability: false } });
    m.priorities.forEach((v, i) => expect(v).toBeCloseTo(classic.priorities[i], 10));
  });
  it("сума пріоритетів = 1; ефекти кроків узгоджені із загальною зміною", () => {
    const m = modifiedAhp({ classic, products: d.products, params: d.params });
    expect(m.priorities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    m.effects.total.forEach((t, i) => expect(t).toBeCloseTo(m.effects.reliability[i] + m.effects.season[i] + m.effects.risk[i], 10));
  });
  it("сезонність і ризик змінюють пріоритети: сезонний товар піднімається, ризиковий знижується", () => {
    const m = modifiedAhp({ classic, products: d.products, params: { gamma: 2, lambda: 0, useForecastReliability: false } });
    expect(m.effects.season[4]).toBeGreaterThan(0);  // «Одяг (сезонний)», коеф. 1.35
    expect(m.effects.season[5]).toBeLessThan(0);     // «Іграшки», коеф. 0.75
    const r = modifiedAhp({ classic, products: d.products, params: { gamma: 0, lambda: 1, useForecastReliability: false } });
    expect(r.effects.risk[4]).toBeLessThan(0);       // ризик дефіциту 0.4
  });
  it("некоректні параметри відхиляються", () => {
    expect(() => modifiedAhp({ classic, products: d.products, params: { gamma: -1, lambda: 0.5 } })).toThrow(/γ/);
    expect(() => modifiedAhp({ classic, products: d.products, params: { gamma: 1, lambda: 2 } })).toThrow(/λ/);
  });
});
