// server/src/export/tsv.js — формування TSV-файлу (текст, значення розділені табуляцією)
import { CRITERIA } from "../ahp/criteria.js";

const clean = v => (typeof v === "number" ? (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)))) : String(v ?? "").replace(/[\t\r\n]+/g, " "));
const line = cells => cells.map(clean).join("\t");

export function buildTsv(input, analysis) {
  const { products, criteriaMatrix, altMatrices } = input;
  const { ahp, lp, constraints, params } = analysis;
  const names = products.map(p => p.name);
  const out = [];
  const section = title => { if (out.length) out.push(""); out.push(`# ${title}`); };

  section("Товарні позиції");
  out.push(line(["Назва", "Закупівельна ціна", "Ціна продажу", "Попит", "Габарити (площа/од.)", "Складські витрати", "Строк постачання", "Оборотність", "Сезонний коеф.", "Надійність постачання", "Стратегічність", "Достовірність прогнозу", "Ризик дефіциту", "Місткість постачання", "Мін. представленість"]));
  products.forEach(p => out.push(line([p.name, p.cost, p.price, p.demand, p.area, p.storage, p.leadTime, p.turnover, p.seasonal, p.supplyReliability, p.strategic, p.forecastReliability, p.shortageRisk, p.supplierCap, p.minQty])));

  section("Критерії та ваги критеріїв (класичний МАІ)");
  out.push(line(["Критерій", "Вага"]));
  CRITERIA.forEach((c, k) => out.push(line([c.name, ahp.classic.criteriaWeights[k]])));
  const cc = ahp.classic.criteriaConsistency;
  out.push(line(["λmax", cc.lambdaMax])); out.push(line(["CI", cc.CI])); out.push(line(["CR", cc.CR]));

  section("Матриця попарних порівнянь критеріїв");
  out.push(line(["", ...CRITERIA.map(c => c.name)]));
  criteriaMatrix.forEach((row, i) => out.push(line([CRITERIA[i].name, ...row])));

  CRITERIA.forEach(c => {
    section(`Матриця попарних порівнянь товарів за критерієм: ${c.name} (CR = ${Number(ahp.classic.altConsistency[c.key].CR.toFixed(4))})`);
    out.push(line(["", ...names]));
    altMatrices[c.key].forEach((row, i) => out.push(line([names[i], ...row])));
  });

  section("Пріоритети товарів");
  out.push(line(["Товар", "Класичний МАІ", "Ранг (класичний)", "Модифікований МАІ", "Ранг (модифікований)", "Зміна рангу", "Вплив достовірності прогнозу", "Вплив сезонності", "Вплив ризику дефіциту"]));
  names.forEach((n, i) => out.push(line([n, ahp.classic.priorities[i], ahp.classic.ranks[i], ahp.modified.priorities[i], ahp.modified.ranks[i], ahp.modified.rankShift[i], ahp.modified.effects.reliability[i], ahp.modified.effects.season[i], ahp.modified.effects.risk[i]])));

  section("Параметри моделі");
  out.push(line(["Параметр", "Значення"]));
  [["Бюджет, грн", constraints.budget], ["Складська місткість", constraints.warehouse], ["Місткість постачання, од.", constraints.logistics],
   ["γ (чутливість до сезонності)", params.gamma], ["λ (штраф за ризик дефіциту)", params.lambda], ["β (вплив пріоритетів на ЦФ)", params.beta]].forEach(r => out.push(line(r)));

  [["classic", "Класичний МАІ"], ["modified", "Модифікований МАІ"]].forEach(([key, title]) => {
    const r = lp[key];
    section(`Оптимальні закупівлі — ${title} (статус: ${r.status})`);
    if (r.status !== "optimal") { out.push(line(["Повідомлення", r.message])); return; }
    out.push(line(["Товар", "Обсяг закупівлі", "Вартість закупівлі", "Очікуваний прибуток", "Площа", "Дефіцит", "Задоволення попиту, %", "Частка бюджету, %", "Коеф. цільової функції"]));
    r.items.forEach((it, i) => out.push(line([it.name, it.quantity, it.purchaseCost, it.profit, it.areaUsed, it.deficit, it.coverage, it.share, r.objectiveCoefficients[i]])));
    out.push(line(["Значення цільової функції", r.objective])); out.push(line(["Очікуваний прибуток", r.expectedProfit]));
    out.push(line(["Витрати на закупівлю", r.spend])); out.push(line(["Середня оборотність", r.avgTurnover]));
    out.push(""); out.push(line(["Ресурс", "Використано", "Ліміт", "Використання, %", "Двоїста оцінка"]));
    r.resources.forEach(x => out.push(line([x.name, x.used, x.limit, x.percent, x.dual])));
    out.push(""); out.push(line(["Товар", "Двоїста оцінка обмеження попиту", "Двоїста оцінка обмеження постачальника"]));
    r.bounds.forEach(b => out.push(line([b.name, b.demandDual, b.supplierDual])));
  });

  if (analysis.comparison) {
    section("Порівняння методів");
    out.push(line(["Показник", "Значення"]));
    out.push(line(["План змінився", analysis.comparison.planChanged ? "так" : "ні"]));
    out.push(line(["Різниця очікуваного прибутку (мод. − клас.)", analysis.comparison.profitDiff]));
    out.push(line(["Різниця цільової функції (мод. − клас.)", analysis.comparison.objectiveDiff]));
    out.push(line(["Лідер класичного МАІ", analysis.comparison.topClassic])); out.push(line(["Лідер модифікованого МАІ", analysis.comparison.topModified]));
  }
  return out.join("\n") + "\n";
}
