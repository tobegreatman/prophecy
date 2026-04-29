<script setup lang="ts">
const props = defineProps<{
  value: number;
  tone?: 'red' | 'blue' | 'neutral';
  size?: 'sm' | 'md';
}>();

const toneClass = props.tone ?? 'neutral';
const sizeClass = props.size ?? 'md';
</script>

<template>
  <span class="number-ball" :class="[`tone-${toneClass}`, `size-${sizeClass}`]">
    {{ value.toString().padStart(2, '0') }}
  </span>
</template>

<style scoped>
.number-ball {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 10px 24px rgba(28, 20, 20, 0.16);
}

.size-md {
  width: 2.9rem;
  height: 2.9rem;
  font-size: 0.95rem;
}

.size-sm {
  width: 2.1rem;
  height: 2.1rem;
  font-size: 0.78rem;
}

.tone-red {
  color: #fffaf7;
  background: linear-gradient(145deg, #f95c56 0%, #c81837 100%);
}

.tone-blue {
  color: #f7fbff;
  background: linear-gradient(145deg, #4c93f1 0%, #123f92 100%);
}

.tone-neutral {
  color: var(--ink-strong);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(235, 236, 241, 0.92));
}
</style>
