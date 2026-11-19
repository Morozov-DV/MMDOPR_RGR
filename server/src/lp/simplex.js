// server/src/lp/simplex.js
// Симплекс-метод для задачі: max c·y, A·y ≤ b, y ≥ 0 (b ≥ 0 -> початковий базис із додаткових змінних).
// Повертає розв'язок, значення цільової функції та ДВОЇСТІ ОЦІНКИ обмежень (з рядка цільової функції
// кінцевої симплекс-таблиці під додатковими змінними). Правило Бленда запобігає зациклюванню.
export function simplexMax(c, A, b, { eps = 1e-9, maxIter = 20000 } = {}) {
  const m = A.length, n = c.length;
  if (b.some(v => v < -eps)) return { status: "infeasible", message: "Від’ємна права частина обмеження: система несумісна." };
  const last = n + m;
  const T = A.map((row, i) => [...row, ...Array.from({ length: m }, (_, k) => (k === i ? 1 : 0)), b[i]]);
  T.push([...c.map(v => -v), ...Array(m).fill(0), 0]);
  const basis = Array.from({ length: m }, (_, i) => n + i);

  for (let iter = 0; iter < maxIter; iter++) {
    const col = T[m].findIndex((v, j) => j < last && v < -eps);       // ведучий стовпець
    if (col < 0) {                                                    // оптимум
      const y = Array(n).fill(0);
      basis.forEach((bj, i) => { if (bj < n) y[bj] = T[i][last]; });
      return { status: "optimal", y, z: T[m][last], duals: T[m].slice(n, last), reducedCosts: T[m].slice(0, n),
               slack: A.map((row, i) => b[i] - row.reduce((s, a, j) => s + a * y[j], 0)), iterations: iter };
    }
    let row = -1, best = Infinity;
    for (let i = 0; i < m; i++) if (T[i][col] > eps) {
      const ratio = T[i][last] / T[i][col];
      if (ratio < best - eps || (Math.abs(ratio - best) <= eps && basis[i] < basis[row])) { best = ratio; row = i; }
    }
    if (row < 0) return { status: "unbounded", message: "Цільова функція необмежена." };
    const piv = T[row][col];
    T[row] = T[row].map(v => v / piv);
    for (let i = 0; i <= m; i++) if (i !== row) { const f = T[i][col]; if (f !== 0) T[i] = T[i].map((v, j) => v - f * T[row][j]); }
    basis[row] = col;
  }
  return { status: "error", message: "Перевищено ліміт ітерацій симплекс-методу." };
}
