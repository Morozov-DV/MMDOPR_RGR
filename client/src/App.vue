<!-- Головний компонент: каталог, обмеження, матриці порівнянь, запуск МАІ та оптимізації, експорт TSV -->
<script setup>
import { reactive, ref, watch, onMounted } from "vue";
import { loadDefault, generateMatrices, calcAhp, calcAnalysis, exportTsv, apiStatus } from "./api/shopApi.js";
import { CRITERIA } from "../../server/src/ahp/criteria.js";
import ProductsTable from "./components/ProductsTable.vue";
import ConstraintsForm from "./components/ConstraintsForm.vue";
import PairwiseEditor from "./components/PairwiseEditor.vue";
import AhpPanel from "./components/AhpPanel.vue";
import OptimizationPanel from "./components/OptimizationPanel.vue";

const model = reactive({ products: [], criteriaMatrix: [], altMatrices: {}, constraints: {}, params: {} });
const ahp = ref(null), analysis = ref(null);
const error = ref(""), notice = ref(""), busy = ref(false), stale = ref(false), ready = ref(false);
const tab = ref("criteria");

const clone = o => JSON.parse(JSON.stringify(o));
function assign(d) {
  const c = clone(d);
  model.products = c.products; model.criteriaMatrix = c.criteriaMatrix; model.altMatrices = c.altMatrices;
  model.constraints = c.constraints; model.params = c.params;
}
// Будь-яка зміна даних робить показані результати застарілими
watch(model, () => { if (ready.value) stale.value = true; }, { deep: true });

async function guard(fn) {
  error.value = ""; notice.value = ""; busy.value = true;
  try { await fn(); } catch (e) { error.value = e.message; }    // помилка даних не ламає інтерфейс
  busy.value = false;
}

const runAhp = () => guard(async () => { ahp.value = await calcAhp(model); stale.value = false; });
const runOptimize = () => guard(async () => { analysis.value = await calcAnalysis(model); ahp.value = analysis.value.ahp; stale.value = false; });
const download = () => guard(async () => {
  const { filename, content } = await exportTsv(model);
  const blob = new Blob(["\uFEFF" + content], { type: "text/tab-separated-values;charset=utf-8" });   // BOM — щоб Excel коректно відкрив кирилицю
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
});
async function reset() {
  await guard(async () => { assign(await loadDefault()); ahp.value = null; analysis.value = null; await runOptimizeInner(); });
}
async function runOptimizeInner() { analysis.value = await calcAnalysis(model); ahp.value = analysis.value.ahp; stale.value = false; }

const regenerate = () => guard(async () => { model.altMatrices = await generateMatrices(model); notice.value = "Матриці порівнянь товарів перебудовано з даних каталогу."; });
function addProduct() {
  const n = model.products.length + 1;
  model.products.push({ name: `Новий товар ${n}`, cost: 100, price: 150, demand: 50, area: 0.05, storage: 5, leadTime: 7, turnover: 4, seasonal: 1,
    supplyReliability: 0.8, strategic: 5, forecastReliability: 0.8, shortageRisk: 0.2, supplierCap: 50, minQty: 0 });
  regenerate();                                                   // розмір матриць змінився — будуємо їх з даних
}
function removeProduct(i) {
  if (model.products.length <= 2) return;
  model.products.splice(i, 1);
  for (const k of Object.keys(model.altMatrices))               // видаляємо рядок і стовпець видаленого товару
    model.altMatrices[k] = model.altMatrices[k].filter((_, r) => r !== i).map(row => row.filter((_, c) => c !== i));
}

onMounted(async () => {
  await guard(async () => { assign(await loadDefault()); await runOptimizeInner(); });
  ready.value = true; stale.value = false;
});
</script>

<template>
  <main class="container">
    <h1>Оптимізація асортименту інтернет-магазину</h1>
    <p class="sub">Варіант 14. Класичний і модифікований МАІ → задача лінійного програмування з двоїстими оцінками ресурсів. Дані навчальні (період — місяць).</p>

    <p v-if="apiStatus.mode === 'local'" class="warn">
      Сервер API недоступний — розрахунки виконуються в браузері тими самими модулями (результати однакові). Причина: {{ apiStatus.reason }}
    </p>
    <p v-if="error" class="err" role="alert">Помилка: {{ error }}</p>
    <p v-if="notice" class="note">{{ notice }}</p>

    <section class="card">
      <h2>1. Каталог товарів</h2>
      <ProductsTable :products="model.products" @add="addProduct" @remove="removeProduct" />
    </section>

    <section class="card">
      <h2>2. Обмеження та параметри моделі</h2>
      <ConstraintsForm v-if="model.params.gamma !== undefined" :constraints="model.constraints" :params="model.params" />
    </section>

    <section class="card">
      <h2>3. Матриці попарних порівнянь</h2>
      <div class="tabs">
        <button :class="{ active: tab === 'criteria' }" @click="tab = 'criteria'">Критерії</button>
        <button v-for="c in CRITERIA" :key="c.key" :class="{ active: tab === c.key }" @click="tab = c.key">{{ c.name }}</button>
      </div>
      <PairwiseEditor v-if="tab === 'criteria' && model.criteriaMatrix.length" title="Критерії" :labels="CRITERIA.map(c => c.name)" :matrix="model.criteriaMatrix" />
      <PairwiseEditor v-else-if="model.altMatrices[tab]" :title="'Товари: ' + (CRITERIA.find(c => c.key === tab)?.name || '')" :labels="model.products.map(p => p.name)" :matrix="model.altMatrices[tab]" />
      <button @click="regenerate">Заповнити матриці товарів з даних каталогу</button>
    </section>

    <section class="card actions">
      <button class="primary" :disabled="busy" @click="runAhp">Розрахувати пріоритети (МАІ)</button>
      <button class="primary" :disabled="busy" @click="runOptimize">Оптимізувати асортимент</button>
      <button :disabled="busy" @click="download">Експорт TSV</button>
      <button :disabled="busy" @click="reset">Скинути до початкових даних</button>
      <span v-if="stale" class="warn inline">Дані змінено — перерахуйте результати.</span>
    </section>

    <AhpPanel v-if="ahp" :ahp="ahp" />
    <OptimizationPanel v-if="analysis" :analysis="analysis" :products="model.products" />
  </main>
</template>
