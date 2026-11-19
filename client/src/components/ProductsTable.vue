<!-- Каталог товарів: редагування всіх характеристик -->
<script setup>
defineProps({ products: Array });
const emit = defineEmits(["add", "remove"]);
// [поле, заголовок, крок, підказка]
const COLS = [
  ["cost", "Закупівельна ціна, грн", 1, "Закупівельна ціна одиниці"], ["price", "Ціна продажу, грн", 1, "Ціна продажу одиниці"],
  ["demand", "Попит, од.", 1, "Прогнозований попит на період"], ["area", "Габарити, м²/од.", 0.01, "Складська площа, яку займає одиниця"],
  ["storage", "Склад. витрати, грн/од.", 1, "Складські витрати на одиницю"], ["leadTime", "Постачання, днів", 1, "Строк постачання"],
  ["turnover", "Оборотність", 0.1, "Оборотність запасів (разів за період)"], ["seasonal", "Сезонний коеф.", 0.05, "Сезонний коефіцієнт поточного періоду"],
  ["supplyReliability", "Надійність (0–1)", 0.05, "Надійність постачання"], ["strategic", "Стратегічність (1–10)", 1, "Стратегічна важливість категорії"],
  ["forecastReliability", "Достовірність прогнозу (0–1)", 0.05, "Достовірність прогнозу попиту"], ["shortageRisk", "Ризик дефіциту (0–1)", 0.05, "Ризик дефіциту товару"],
  ["supplierCap", "Місткість постачання, од.", 1, "Максимум, який може поставити постачальник"], ["minQty", "Мін. представленість, од.", 1, "Мінімальний обсяг ключової категорії (0 — не ключова)"]
];
</script>

<template>
  <div class="scroll">
    <table class="wide">
      <thead><tr><th>№</th><th>Назва товару</th><th v-for="c in COLS" :key="c[0]" :title="c[3]">{{ c[1] }}</th><th></th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in products" :key="i">
          <td>{{ i + 1 }}</td>
          <td><input class="name" v-model="p.name" /></td>
          <td v-for="c in COLS" :key="c[0]"><input type="number" :step="c[2]" v-model.number="p[c[0]]" /></td>
          <td><button :disabled="products.length <= 2" title="Видалити товар" @click="emit('remove', i)">✕</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <button @click="emit('add')">+ Додати товар</button>
</template>
