<!-- Стовпчикова діаграма (SVG) для згрупованих рядів; будується з фактично обчислених даних -->
<script setup>
import { computed } from "vue";
const props = defineProps({
  title: String, labels: Array, series: Array,          // series: [{ name, values, color }]
  unit: { type: String, default: "" }, decimals: { type: Number, default: 2 }
});
const W = 720, H = 330, L = 64, R = 12, T = 16, B = 84;
const niceMax = v => { if (v <= 0) return 1; const e = 10 ** Math.floor(Math.log10(v)), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; };
const maxVal = computed(() => niceMax(Math.max(0, ...props.series.flatMap(s => s.values))));
const band = computed(() => (W - L - R) / props.labels.length);
const barW = computed(() => Math.min(46, (band.value * 0.8) / props.series.length));
const y = v => T + (1 - v / maxVal.value) * (H - T - B);
const ticks = computed(() => Array.from({ length: 6 }, (_, k) => (maxVal.value * k) / 5));
const xBar = (i, k) => L + i * band.value + band.value / 2 - (barW.value * props.series.length) / 2 + k * barW.value;
const showValues = computed(() => props.labels.length * props.series.length <= 15);
const f = v => Number(v).toLocaleString("uk-UA", { maximumFractionDigits: props.decimals });
</script>

<template>
  <figure class="chart-box">
    <figcaption>{{ title }}</figcaption>
    <div class="scroll">
      <svg :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" :aria-label="title">
        <g v-for="t in ticks" :key="t">
          <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" class="grid" />
          <text :x="L - 6" :y="y(t) + 4" text-anchor="end" class="tick">{{ f(t) }}</text>
        </g>
        <g v-for="(s, k) in series" :key="s.name">
          <g v-for="(v, i) in s.values" :key="i">
            <rect :x="xBar(i, k)" :y="y(v)" :width="barW - 2" :height="Math.max(0, H - B - y(v))" :fill="s.color" rx="2" />
            <text v-if="showValues" :x="xBar(i, k) + (barW - 2) / 2" :y="y(v) - 4" text-anchor="middle" class="val">{{ f(v) }}</text>
          </g>
        </g>
        <text v-for="(l, i) in labels" :key="l" :x="L + i * band + band / 2" :y="H - B + 16" text-anchor="end" class="tick"
              :transform="`rotate(-28 ${L + i * band + band / 2} ${H - B + 16})`">{{ l }}</text>
        <text v-if="unit" :x="12" :y="12" class="tick">{{ unit }}</text>
      </svg>
    </div>
    <div class="legend"><span v-for="s in series" :key="s.name"><i :style="{ background: s.color }"></i>{{ s.name }}</span></div>
  </figure>
</template>
