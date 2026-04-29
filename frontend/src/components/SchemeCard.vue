<script setup lang="ts">
import NumberBall from './NumberBall.vue';
import type { PredictionScheme } from '../types/lottery';

defineProps<{
  scheme: PredictionScheme;
  active: boolean;
}>();

defineEmits<{
  select: [schemeId: string];
}>();
</script>

<template>
  <button class="scheme-card" :class="{ active }" @click="$emit('select', scheme.id)">
    <div class="scheme-card__topline">
      <div>
        <p class="eyebrow">方案 {{ scheme.title }}</p>
        <h3>{{ scheme.tone }}</h3>
      </div>
      <strong>{{ scheme.confidence }}%</strong>
    </div>
    <div class="scheme-card__numbers">
      <NumberBall v-for="number in scheme.redNumbers" :key="number" :value="number" tone="red" size="sm" />
      <NumberBall :value="scheme.blueNumber" tone="blue" size="sm" />
    </div>
    <div class="scheme-card__meta">
      <span>奇偶 {{ scheme.metrics.oddEvenRatio }}</span>
      <span>三区 {{ scheme.metrics.zoneRatio }}</span>
      <span>跨度 {{ scheme.metrics.span }}</span>
    </div>
  </button>
</template>

<style scoped>
.scheme-card {
  width: 100%;
  border: 1px solid rgba(123, 127, 142, 0.18);
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.72);
  padding: 1.2rem;
  text-align: left;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.scheme-card:hover,
.scheme-card.active {
  transform: translateY(-2px);
  border-color: rgba(24, 77, 178, 0.32);
  box-shadow: 0 18px 34px rgba(24, 33, 58, 0.1);
}

.scheme-card__topline {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.scheme-card__topline h3 {
  margin: 0.4rem 0 0;
  font-size: 0.97rem;
  line-height: 1.55;
}

.scheme-card__topline strong {
  font-size: 1.15rem;
  color: var(--ink-strong);
}

.eyebrow {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.scheme-card__numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 1rem 0;
}

.scheme-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: var(--ink-muted);
  font-size: 0.85rem;
}
</style>
