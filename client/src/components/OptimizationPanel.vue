<!-- Результати оптимізації асортименту: таблиці закупівель, ресурси, двоїсті оцінки, діаграми, порівняння методів -->
<script setup>
import { ref, computed } from "vue";
import BarChart from "./BarChart.vue";
import { fmt, signed } from "../utils/format.js";

const props = defineProps({ analysis: Object, products: Array });
const view = ref("classic");                                    // який метод показано в детальних таблицях
const COLORS = { classic: "#2457d6", modified: "#e07b00", demand: "#9aa5b8" };
const NAMES = { classic: "Класичний МАІ", modified: "Модифікований МАІ" };
const names = computed(() => props.analysis.ahp.products);
const ok = k => props.analysis.lp[k].status === "optimal";
const okKeys = computed(() => ["classic", "modified"].filter(ok));
const curKey = computed(() => (ok(view.value) ? view.value : okKeys.value[0] ?? view.value));   // якщо вибраний метод без розв’язку — показуємо інший
const cur = computed(() => props.analysis.lp[curKey.value]);
const turnoverOf = i => props.products[i]?.turnover;
const demandOf = i => props.products[i]?.demand;

const volumeSeries = computed(() => [{ name: "Прогнозований попит", values: props.products.map(p => p.demand), color: COLORS.demand },
  ...okKeys.value.map(k => ({ name: NAMES[k], values: props.analysis.lp[k].x, color: COLORS[k] }))]);
const resourceSeries = computed(() => okKeys.value.map(k => ({ name: NAMES[k], values: props.analysis.lp[k].resources.map(r => r.percent), color: COLORS[k] })));
const structureSeries = computed(() => okKeys.value.map(k => ({ name: NAMES[k], values: props.analysis.lp[k].items.map(i => i.share), color: COLORS[k] })));
const resourceLabels = computed(() => (okKeys.value.length ? props.analysis.lp[okKeys.value[0]].resources.map(r => r.name) : []));
const statusText = s => ({ infeasible: "Допустимого розв’язку немає", unbounded: "Цільова функція необмежена", error: "Помилка розв’язувача" }[s] || s);
</script>

<template>
  <section class="card">
    <h2>Результати оптимізації асортименту</h2>
    <div v-for="k in ['classic', 'modified']" :key="k">
      <p v-if="!ok(k)" class="err"><b>{{ NAMES[k] }}:</b> {{ statusText(analysis.lp[k].status) }}. {{ analysis.lp[k].message }}</p>
    </div>

    <div v-if="okKeys.length" class="summary">
      <div v-for="k in okKeys" :key="k" class="sum-card" :style="{ borderColor: COLORS[k] }">
        <h3>{{ NAMES[k] }}</h3>
        <p>Цільова функція (зважена): <b>{{ fmt(analysis.lp[k].objective, 0) }}</b></p>
        <p>Очікуваний прибуток: <b>{{ fmt(analysis.lp[k].expectedProfit, 0) }} грн</b></p>
        <p>Витрати на закупівлю: <b>{{ fmt(analysis.lp[k].spend, 0) }} грн</b></p>
        <p>Виручка: {{ fmt(analysis.lp[k].revenue, 0) }} грн; середня оборотність: {{ fmt(analysis.lp[k].avgTurnover, 2) }}</p>
      </div>
    </div>
    <p v-if="analysis.comparison" class="note">
      <template v-if="analysis.comparison.planChanged">Модифікація змінила оптимальний план: очікуваний прибуток {{ signed(analysis.comparison.profitDiff, 0) }} грн,
        зважена цільова функція {{ signed(analysis.comparison.objectiveDiff, 0) }}.</template>
      <template v-else>Плани закупівель за обома методами збіглися.</template>
      Лідер рейтингу: {{ analysis.comparison.topClassic }} (класичний), {{ analysis.comparison.topModified }} (модифікований).
    </p>

    <div v-if="okKeys.length" class="switch">
      Детальні таблиці для методу:
      <button v-for="k in okKeys" :key="k" :class="{ active: curKey === k }" @click="view = k">{{ NAMES[k] }}</button>
    </div>

    <template v-if="cur.status === 'optimal'">
      <h3>Оптимальний план закупівель — {{ NAMES[curKey] }}</h3>
      <div class="scroll">
        <table>
          <thead><tr><th>Товар</th><th>Обсяг, од.</th><th>Попит</th><th>Вартість закупівлі, грн</th><th>Очікуваний прибуток, грн</th><th>Площа, м²</th>
                <th>Оборотність</th><th>Дефіцит, од.</th><th>Задоволення попиту</th><th>Частка бюджету</th><th>Коеф. ЦФ</th></tr></thead>
          <tbody>
            <tr v-for="(it, i) in cur.items" :key="it.name">
              <td class="left">{{ it.name }}</td><td><b>{{ fmt(it.quantity, 2) }}</b></td><td>{{ fmt(demandOf(i), 0) }}</td>
              <td>{{ fmt(it.purchaseCost, 0) }}</td><td>{{ fmt(it.profit, 0) }}</td><td>{{ fmt(it.areaUsed, 2) }}</td>
              <td>{{ fmt(turnoverOf(i), 1) }}</td><td :class="it.deficit > 0.005 ? 'bad' : ''">{{ fmt(it.deficit, 2) }}</td>
              <td>{{ fmt(it.coverage, 1) }} %</td><td>{{ fmt(it.share, 1) }} %</td><td>{{ fmt(cur.objectiveCoefficients[i], 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid2">
        <div>
          <h3>Використання ресурсів і двоїсті оцінки</h3>
          <table>
            <thead><tr><th>Ресурс</th><th>Використано</th><th>Ліміт</th><th>%</th><th>Двоїста оцінка</th></tr></thead>
            <tbody>
              <tr v-for="r in cur.resources" :key="r.key" :class="r.binding ? 'binding' : ''">
                <td class="left">{{ r.name }}</td><td>{{ fmt(r.used, 2) }}</td><td>{{ fmt(r.limit, 2) }}</td><td>{{ fmt(r.percent, 1) }}</td>
                <td><b>{{ fmt(r.dual, 4) }}</b></td>
              </tr>
            </tbody>
          </table>
          <p class="hint">Двоїста оцінка — зміна зваженої цільової функції при збільшенні ліміту ресурсу на одиницю. Для активного (вичерпаного) ресурсу вона додатна, для невичерпаного дорівнює 0.</p>
          <p v-for="r in cur.resources.filter(x => x.dual > 0)" :key="r.key" class="note">
            Збільшення ресурсу «{{ r.name }}» на {{ r.key === 'budget' ? '10 000 грн' : '1 од.' }} збільшить цільову функцію приблизно на
            {{ fmt(r.dual * (r.key === 'budget' ? 10000 : 1), 0) }}.
          </p>
          <p v-if="!cur.resources.some(x => x.dual > 0)" class="note">Жоден із загальних ресурсів не вичерпано — їхні двоїсті оцінки дорівнюють 0.</p>
        </div>
        <div>
          <h3>Двоїсті оцінки обмежень попиту та постачальників</h3>
          <table>
            <thead><tr><th>Товар</th><th>Попит</th><th>Постачальник</th></tr></thead>
            <tbody>
              <tr v-for="b in cur.bounds" :key="b.name" :class="b.demandDual > 0 || b.supplierDual > 0 ? 'binding' : ''">
                <td class="left">{{ b.name }}</td><td>{{ fmt(b.demandDual, 3) }}</td><td>{{ fmt(b.supplierDual, 3) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="hint">Додатне значення — обмеження вичерпано: додаткова одиниця попиту/місткості постачання підвищила б цільову функцію на цю величину.</p>
        </div>
      </div>
    </template>

    <template v-if="okKeys.length">
      <h3>Порівняння планів двох методів МАІ (однакові дані й обмеження)</h3>
      <div class="scroll">
        <table>
          <thead><tr><th>Товар</th><th v-for="k in okKeys" :key="k">{{ NAMES[k] }}, од.</th><th v-if="analysis.comparison">Різниця</th></tr></thead>
          <tbody>
            <tr v-for="(n, i) in names" :key="n">
              <td class="left">{{ n }}</td><td v-for="k in okKeys" :key="k">{{ fmt(analysis.lp[k].x[i], 2) }}</td>
              <td v-if="analysis.comparison" :class="Math.abs(analysis.comparison.quantityDiff[i]) > 1e-6 ? 'binding' : ''">{{ signed(analysis.comparison.quantityDiff[i], 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <BarChart title="Оптимальні обсяги закупівлі за товарами" :labels="names" :series="volumeSeries" unit="од." :decimals="1" />
      <BarChart title="Використання ресурсів, % від ліміту" :labels="resourceLabels" :series="resourceSeries" unit="%" :decimals="1" />
      <BarChart title="Структура закупівельного бюджету за товарами, %" :labels="names" :series="structureSeries" unit="%" :decimals="1" />
    </template>
  </section>
</template>
