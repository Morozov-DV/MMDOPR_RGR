<!-- Результати МАІ: ваги критеріїв, діагностика узгодженості, ранжування товарів, вплив модифікації -->
<script setup>
import { computed } from "vue";
import BarChart from "./BarChart.vue";
import { fmt, signed } from "../utils/format.js";

const props = defineProps({ ahp: Object });
const COLORS = { classic: "#2457d6", modified: "#e07b00" };
const arrow = d => (d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : "—");
const altRows = computed(() => props.ahp.criteria.map(c => ({ name: c.name, ...props.ahp.classic.altConsistency[c.key] })));
</script>

<template>
  <section class="card">
    <h2>Результати МАІ</h2>
    <div class="grid2">
      <div>
        <h3>Ваги критеріїв (класичний МАІ)</h3>
        <table>
          <thead><tr><th>Критерій</th><th>Вага</th><th></th></tr></thead>
          <tbody>
            <tr v-for="c in ahp.criteria" :key="c.key">
              <td class="left">{{ c.name }}</td><td>{{ fmt(c.weight, 4) }}</td>
              <td><span class="bar"><i :style="{ width: c.weight * 100 + '%' }"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3>Панель діагностики узгодженості</h3>
        <table>
          <thead><tr><th>Матриця</th><th>λmax</th><th>CI</th><th>CR</th><th>Стан</th></tr></thead>
          <tbody>
            <tr :class="ahp.classic.criteriaConsistency.consistent ? '' : 'badrow'">
              <td class="left">Критерії</td><td>{{ fmt(ahp.classic.criteriaConsistency.lambdaMax, 3) }}</td>
              <td>{{ fmt(ahp.classic.criteriaConsistency.CI, 3) }}</td><td><b>{{ fmt(ahp.classic.criteriaConsistency.CR, 3) }}</b></td>
              <td>{{ ahp.classic.criteriaConsistency.consistent ? "✔ узгоджена" : "✘ неузгоджена" }}</td>
            </tr>
            <tr v-for="r in altRows" :key="r.name" :class="r.consistent ? '' : 'badrow'">
              <td class="left">Товари: {{ r.name }}</td><td>{{ fmt(r.lambdaMax, 3) }}</td><td>{{ fmt(r.CI, 3) }}</td>
              <td><b>{{ fmt(r.CR, 3) }}</b></td><td>{{ r.consistent ? "✔ узгоджена" : "✘ неузгоджена" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-for="w in ahp.classic.warnings" :key="w" class="warn">{{ w }}</p>
      </div>
    </div>

    <h3>Ранжування товарів: класичний і модифікований МАІ</h3>
    <div class="scroll">
      <table>
        <thead>
          <tr><th rowspan="2">Товар</th><th colspan="2">Класичний</th><th colspan="2">Модифікований</th><th rowspan="2">Зміна рангу</th>
              <th colspan="3">Внесок кроків модифікації у пріоритет</th></tr>
          <tr><th>Пріоритет</th><th>Ранг</th><th>Пріоритет</th><th>Ранг</th><th>Достовірність прогнозу</th><th>Сезонність</th><th>Ризик дефіциту</th></tr>
        </thead>
        <tbody>
          <tr v-for="(name, i) in ahp.products" :key="name">
            <td class="left">{{ name }}</td>
            <td>{{ fmt(ahp.classic.priorities[i], 4) }}</td><td>{{ ahp.classic.ranks[i] }}</td>
            <td>{{ fmt(ahp.modified.priorities[i], 4) }}</td><td>{{ ahp.modified.ranks[i] }}</td>
            <td :class="ahp.modified.rankShift[i] > 0 ? 'ok' : ahp.modified.rankShift[i] < 0 ? 'bad' : ''">{{ arrow(ahp.modified.rankShift[i]) }}</td>
            <td>{{ signed(ahp.modified.effects.reliability[i], 4) }}</td><td>{{ signed(ahp.modified.effects.season[i], 4) }}</td><td>{{ signed(ahp.modified.effects.risk[i], 4) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="hint">
      Модифікація (γ = {{ ahp.modified.params.gamma }}, λ = {{ ahp.modified.params.lambda }}): 1) локальні ваги за критерієм попиту стискаються до середнього
      пропорційно до недостовірності прогнозу; 2) пріоритет множиться на сезонний коефіцієнт^γ; 3) пріоритет множиться на (1 − λ·ризик дефіциту); після кожного кроку вектор нормується.
    </p>

    <BarChart title="Пріоритети товарів: класичний та модифікований МАІ" :labels="ahp.products" :decimals="3"
              :series="[{ name: 'Класичний МАІ', values: ahp.classic.priorities, color: COLORS.classic },
                        { name: 'Модифікований МАІ', values: ahp.modified.priorities, color: COLORS.modified }]" />
  </section>
</template>
