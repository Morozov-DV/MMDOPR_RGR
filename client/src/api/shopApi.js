// client/src/api/shopApi.js — запити до Express API з автоматичним запасним режимом.
// Якщо сервер недоступний, ті самі модулі (МАІ, симплекс, TSV) виконуються прямо в браузері.
import { reactive } from "vue";
import { getDefaultData } from "../../../server/src/defaultData.js";
import { buildAlternativeMatrices } from "../../../server/src/ahp/criteria.js";
import { runAhp, runAnalysis, validateProducts } from "../../../server/src/services/analysisService.js";
import { buildTsv } from "../../../server/src/export/tsv.js";

const BASE = import.meta.env.VITE_API_URL || "";
export const apiStatus = reactive({ mode: "unknown", reason: "" });   // "server" | "local"

async function request(path, options) {
  let res;
  try { res = await fetch(`${BASE}/api${path}`, { headers: { "Content-Type": "application/json" }, ...options }); }
  catch { throw Object.assign(new Error("Сервер API не відповідає (мережева помилка)."), { offline: true }); }
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* не JSON */ }
  if (!data || typeof data.ok !== "boolean")
    throw Object.assign(new Error(`Сервер API недоступний: HTTP ${res.status}. Перевірте, що запущено сервер (порт 3000).`), { offline: true });
  if (!res.ok || !data.ok) throw new Error(data.message || "Помилка запиту");   // помилка даних — показуємо користувачу
  return data.result;
}

// Спочатку сервер; за його відсутності — локальна функція
async function call(path, body, local) {
  try {
    const r = await request(path, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
    apiStatus.mode = "server"; apiStatus.reason = "";
    return r;
  } catch (e) {
    if (!e.offline) throw e;
    apiStatus.mode = "local"; apiStatus.reason = e.message;
    return local();
  }
}

const num = v => (v === "" || v === null || v === undefined ? null : Number(v));
const FIELDS = ["cost", "price", "demand", "area", "storage", "leadTime", "turnover", "seasonal", "supplyReliability", "strategic", "forecastReliability", "shortageRisk", "supplierCap", "minQty"];

// Стан форми -> дані для сервера (порожні клітинки -> null, сервер поверне зрозумілу помилку)
export function toPayload(model) {
  return {
    products: model.products.map(p => ({ name: String(p.name ?? ""), ...Object.fromEntries(FIELDS.map(f => [f, num(p[f])])) })),
    criteriaMatrix: model.criteriaMatrix, altMatrices: model.altMatrices,
    constraints: { budget: num(model.constraints.budget), warehouse: num(model.constraints.warehouse), logistics: num(model.constraints.logistics) },
    params: { gamma: num(model.params.gamma), lambda: num(model.params.lambda), beta: num(model.params.beta), useForecastReliability: !!model.params.useForecastReliability }
  };
}

export const loadDefault = () => call("/default", undefined, () => getDefaultData());
export const generateMatrices = model => { const b = { products: toPayload(model).products }; return call("/matrices", b, () => { validateProducts(b.products); return buildAlternativeMatrices(b.products); }); };
export const calcAhp = model => { const b = toPayload(model); return call("/ahp", b, () => runAhp(b)); };
export const calcAnalysis = model => { const b = toPayload(model); return call("/analyze", b, () => runAnalysis(b)); };
export const exportTsv = model => { const b = toPayload(model); return call("/export", b, () => ({ filename: "assortment-optimization.tsv", content: buildTsv(b, runAnalysis(b)) })); };
