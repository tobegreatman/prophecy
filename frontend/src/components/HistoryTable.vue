<script setup lang="ts">
import NumberBall from './NumberBall.vue';
import type { LotteryDraw } from '../types/lottery';

defineProps<{
  draws: LotteryDraw[];
}>();

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}
</script>

<template>
  <div class="history-table-wrap">
    <table class="history-table">
      <thead>
        <tr>
          <th>期号</th>
          <th>开奖日期</th>
          <th>红球</th>
          <th>蓝球</th>
          <th>销量</th>
          <th>奖池</th>
          <th>摘要</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="draw in draws" :key="draw.issue">
          <td class="issue">{{ draw.issue }}</td>
          <td>{{ draw.drawDate }}</td>
          <td>
            <div class="history-table__balls">
              <NumberBall v-for="number in draw.redNumbers" :key="`${draw.issue}-${number}`" :value="number" tone="red" size="sm" />
            </div>
          </td>
          <td>
            <NumberBall :value="draw.blueNumber" tone="blue" size="sm" />
          </td>
          <td>{{ formatCurrency(draw.sales) }}</td>
          <td>{{ formatCurrency(draw.poolMoney) }}</td>
          <td>
            <a :href="draw.detailUrl" target="_blank" rel="noreferrer">{{ draw.summary }}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.history-table-wrap {
  overflow-x: auto;
  border-radius: 1.75rem;
  border: 1px solid rgba(123, 127, 142, 0.16);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 32px rgba(30, 36, 56, 0.08);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.history-table th,
.history-table td {
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(123, 127, 142, 0.14);
  text-align: left;
  vertical-align: top;
}

.history-table th {
  color: var(--ink-muted);
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.history-table tbody tr:hover {
  background: rgba(236, 239, 247, 0.62);
}

.history-table__balls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.issue {
  font-weight: 800;
  color: var(--ink-strong);
}

a {
  color: inherit;
  text-decoration: none;
}
</style>
