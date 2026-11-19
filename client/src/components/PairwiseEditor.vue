<!-- Редактор матриці попарних порівнянь (шкала Сааті) з перевіркою та живим розрахунком узгодженості -->
<script setup>
import { ref, computed } from "vue";
import { computeWeights } from "../../../server/src/ahp/classicAhp.js";
import { fmt, fracText, parseFraction, inSaatyScale } from "../utils/format.js";

const props = defineProps({ labels: Array, matrix: Array, title: String });
const message = ref("");

// Зміна елемента (i;j) автоматично задає зворотний елемент (j;i) = 1 / a(i;j)
function change(i, j, event) {
  const v = parseFraction(event.target.value);
  if (!inSaatyScale(v)) {
    message.value = `Значення «${event.target.value}» некоректне: допустимі числа від 1/9 до 9 (шкала Сааті).`;
    event.target.value = fracText(props.matrix[i][j]);
    return;
  }
  message.value = "";
  props.matrix[i][j] = v;
  props.matrix[j][i] = 1 / v;
  event.target.value = fracText(v);
}
const diag = computed(() => { try { return computeWeights(props.matrix); } catch (e) { return null; } });
</script>

<template>
  <div>
    <div class="scroll">
      <table class="pw">
        <thead><tr><th>{{ title }}</th><th v-for="l in labels" :key="l">{{ l }}</th><th>Вага</th></tr></thead>
        <tbody>
          <tr v-for="(row, i) in matrix" :key="i">
            <th class="left">{{ labels[i] }}</th>
            <td v-for="(v, j) in row" :key="j" :class="{ auto: j < i, diag: j === i }">
              <input v-if="j > i" :value="fracText(v)" @change="change(i, j, $event)" />
              <span v-else>{{ fracText(v) }}</span>
            </td>
            <td><b>{{ diag ? fmt(diag.weights[i], 4) : "—" }}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="message" class="err">{{ message }}</p>
    <p v-if="diag" class="cons" :class="diag.consistent ? 'ok' : 'bad'">
      λmax = {{ fmt(diag.lambdaMax, 3) }}; CI = {{ fmt(diag.CI, 3) }}; RI = {{ diag.RI }}; <b>CR = {{ fmt(diag.CR, 3) }}</b> —
      {{ diag.consistent ? "судження узгоджені (CR ≤ 0,10)" : "судження НЕ узгоджені (CR > 0,10): перегляньте оцінки" }}
    </p>
    <p class="hint">Заповнюйте елементи над діагоналлю (1 — рівнозначні, 3 — помірна перевага, 5 — суттєва, 7 — значна, 9 — абсолютна; дроби: 1/3, 1/5). Нижня частина обчислюється автоматично.</p>
  </div>
</template>
