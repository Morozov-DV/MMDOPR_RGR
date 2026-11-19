// server/src/ahp/classicAhp.js
// Класичний метод аналізу ієрархій (МАІ, Т. Сааті): матриці попарних порівнянь, ваги методом власного вектора,
// індекс (CI) та відношення (CR) узгодженості, синтез глобальних пріоритетів.

// Випадковий індекс узгодженості Сааті (RI) для n = 1..15
const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49, 11: 1.51, 12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59 };
export const CR_LIMIT = 0.1;                       // допустиме відношення узгодженості

// Перевірка матриці за шкалою Сааті: квадратна, додатна, значення в [1/9; 9], діагональ = 1, a_ji = 1/a_ij
export function validatePairwise(m, name = "Матриця") {
  if (!Array.isArray(m) || m.length < 2) throw new Error(`${name}: потрібна матриця розміром щонайменше 2×2.`);
  const n = m.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(m[i]) || m[i].length !== n) throw new Error(`${name}: матриця має бути квадратною (${n}×${n}).`);
    for (let j = 0; j < n; j++) {
      const a = m[i][j];
      if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) throw new Error(`${name}: елемент (${i + 1};${j + 1}) має бути додатним числом.`);
      if (a < 1 / 9 - 1e-9 || a > 9 + 1e-9) throw new Error(`${name}: елемент (${i + 1};${j + 1}) = ${a} виходить за шкалу Сааті [1/9; 9].`);
    }
    if (Math.abs(m[i][i] - 1) > 1e-9) throw new Error(`${name}: діагональний елемент (${i + 1};${i + 1}) має дорівнювати 1.`);
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    if (Math.abs(m[i][j] * m[j][i] - 1) > 1e-6) throw new Error(`${name}: порушено зворотну симетрію a(${j + 1};${i + 1}) = 1 / a(${i + 1};${j + 1}).`);
}

// Ваги методом власного вектора (степеневий метод) + показники узгодженості
export function computeWeights(m, name) {
  validatePairwise(m, name);
  const n = m.length;
  let w = Array(n).fill(1 / n);
  for (let it = 0; it < 2000; it++) {
    const v = m.map(row => row.reduce((s, a, j) => s + a * w[j], 0));
    const sum = v.reduce((a, b) => a + b, 0);
    const next = v.map(x => x / sum);
    const diff = Math.max(...next.map((x, i) => Math.abs(x - w[i])));
    w = next;
    if (diff < 1e-13) break;
  }
  const lambdaMax = m.map((row, i) => row.reduce((s, a, j) => s + a * w[j], 0) / w[i]).reduce((a, b) => a + b, 0) / n;
  const ri = RI[n] ?? 1.59;
  const CI = n > 2 ? Math.max(0, (lambdaMax - n) / (n - 1)) : 0;   // для 2×2 матриця завжди узгоджена
  const CR = ri > 0 ? CI / ri : 0;
  return { weights: w, lambdaMax, CI, RI: ri, CR, consistent: CR <= CR_LIMIT };
}

// Синтез: глобальний пріоритет альтернативи i = Σ_k (вага критерію k × локальна вага альтернативи i за критерієм k)
export function synthesize(criteriaWeights, locals) {
  const n = locals[0].length;
  return Array.from({ length: n }, (_, i) => locals.reduce((s, l, k) => s + criteriaWeights[k] * l[i], 0));
}

// Ранги (1 — найкращий); однакові значення отримують однаковий ранг
export function ranksOf(values) {
  return values.map(v => 1 + values.filter(x => x > v + 1e-12).length);
}

/**
 * Повний розрахунок класичного МАІ.
 * criteria: [{key, name}], criteriaMatrix: m×m, altMatrices: { [key]: n×n }
 */
export function classicAhp({ criteria, criteriaMatrix, altMatrices, n }) {
  const crit = computeWeights(criteriaMatrix, "Матриця критеріїв");
  const locals = {}, altConsistency = {};
  criteria.forEach(c => {
    const m = altMatrices?.[c.key];
    if (!m) throw new Error(`Не задано матрицю порівнянь товарів за критерієм «${c.name}».`);
    if (m.length !== n) throw new Error(`Матриця за критерієм «${c.name}» має розмір ${m.length}×${m.length}, а товарів ${n}.`);
    const r = computeWeights(m, `Матриця за критерієм «${c.name}»`);
    locals[c.key] = r.weights;
    altConsistency[c.key] = { lambdaMax: r.lambdaMax, CI: r.CI, CR: r.CR, consistent: r.consistent };
  });
  const priorities = synthesize(crit.weights, criteria.map(c => locals[c.key]));
  const warnings = [];
  if (!crit.consistent) warnings.push(`Матриця критеріїв неузгоджена (CR = ${crit.CR.toFixed(3)} > ${CR_LIMIT}).`);
  criteria.forEach(c => { if (!altConsistency[c.key].consistent) warnings.push(`Матриця за критерієм «${c.name}» неузгоджена (CR = ${altConsistency[c.key].CR.toFixed(3)} > ${CR_LIMIT}).`); });
  return {
    criteriaWeights: crit.weights,
    criteriaConsistency: { lambdaMax: crit.lambdaMax, CI: crit.CI, RI: crit.RI, CR: crit.CR, consistent: crit.consistent },
    locals, altConsistency, priorities, ranks: ranksOf(priorities), warnings
  };
}
