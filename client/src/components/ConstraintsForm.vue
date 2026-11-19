<!-- Ресурсні обмеження та параметри моделі -->
<script setup>
defineProps({ constraints: Object, params: Object });
</script>

<template>
  <div class="form-grid">
    <label>Закупівельний бюджет, грн <input type="number" step="1000" v-model.number="constraints.budget" /></label>
    <label>Складська місткість, м² <input type="number" step="1" v-model.number="constraints.warehouse" /></label>
    <label>Місткість постачання (всього), од. <input type="number" step="10" v-model.number="constraints.logistics" /></label>
    <label title="Чутливість модифікованого МАІ до сезонних коефіцієнтів">γ — чутливість до сезонності (0–3) <input type="number" step="0.1" v-model.number="params.gamma" /></label>
    <label title="Штраф за ризик дефіциту в модифікованому МАІ">λ — штраф за ризик дефіциту (0–1) <input type="number" step="0.05" v-model.number="params.lambda" /></label>
    <label title="Наскільки сильно пріоритети МАІ змінюють коефіцієнти цільової функції; 0 — чистий прибуток">β — вплив пріоритетів на ЦФ (0–5) <input type="number" step="0.1" v-model.number="params.beta" /></label>
    <label class="check"><input type="checkbox" v-model="params.useForecastReliability" /> Враховувати достовірність прогнозу попиту</label>
  </div>
</template>
