<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    option: EChartsOption;
    height?: number;
  }>(),
  {
    height: 320,
    subtitle: ''
  }
);

const container = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

function renderChart() {
  if (!container.value) {
    return;
  }

  if (!chart) {
    chart = echarts.init(container.value);
  }

  chart.setOption(props.option, true);
}

function handleResize() {
  chart?.resize();
}

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

watch(
  () => props.option,
  () => {
    renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <section class="chart-panel">
    <div class="chart-panel__head">
      <div>
        <p class="chart-panel__eyebrow">实时观察</p>
        <h3>{{ title }}</h3>
      </div>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div ref="container" class="chart-panel__body" :style="{ height: `${height}px` }"></div>
  </section>
</template>

<style scoped>
.chart-panel {
  border-radius: 1.75rem;
  border: 1px solid rgba(123, 127, 142, 0.16);
  background: rgba(255, 255, 255, 0.74);
  padding: 1.3rem;
  box-shadow: 0 18px 32px rgba(30, 36, 56, 0.08);
}

.chart-panel__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chart-panel__head h3 {
  margin: 0.45rem 0 0;
  font-size: 1.2rem;
}

.chart-panel__head p:last-child {
  max-width: 16rem;
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.chart-panel__eyebrow {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.chart-panel__body {
  width: 100%;
}

@media (max-width: 720px) {
  .chart-panel__head {
    flex-direction: column;
    align-items: start;
  }
}
</style>
