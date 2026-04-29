<script setup lang="ts">
import { computed, onMounted } from 'vue';

import HistoryTable from '../components/HistoryTable.vue';
import NumberBall from '../components/NumberBall.vue';
import { useLotteryStore } from '../stores/lottery';

const historyWindows = [30, 60, 120];
const store = useLotteryStore();

onMounted(() => {
  if (!store.history.length && !store.historyLoading) {
    void store.loadHistory();
  }
  if (!store.dashboard && !store.dashboardLoading) {
    void store.loadDashboard();
  }
});

const latestDraw = computed(() => store.history[0] ?? store.dashboard?.latestDraw ?? null);
</script>

<template>
  <section class="page history-page">
    <div class="history-page__hero glass-panel">
      <div>
        <p class="section-eyebrow">Archive</p>
        <h1>回看往期开奖，校准你对趋势和结构的判断。</h1>
        <p class="history-copy">所有记录均来自福彩中心官网接口，适合快速核对近期走势、销量与奖池变化。</p>
      </div>
      <div class="history-page__actions">
        <div class="window-switcher">
          <button
            v-for="window in historyWindows"
            :key="window"
            :class="{ active: window === store.historyWindow }"
            @click="store.loadHistory(window)"
          >
            最近 {{ window }} 期
          </button>
        </div>
      </div>
    </div>

    <div class="history-summary-grid">
      <article class="glass-panel history-summary-card">
        <p>当前载入</p>
        <strong>{{ store.history.length || store.historyWindow }} 期</strong>
        <span>便于快速检索与核对开奖号。</span>
      </article>
      <article class="glass-panel history-summary-card" v-if="latestDraw">
        <p>最新开奖</p>
        <strong>{{ latestDraw.issue }}</strong>
        <div class="latest-balls">
          <NumberBall v-for="number in latestDraw.redNumbers" :key="`history-${number}`" :value="number" tone="red" size="sm" />
          <NumberBall :value="latestDraw.blueNumber" tone="blue" size="sm" />
        </div>
      </article>
      <article class="glass-panel history-summary-card" v-if="store.dashboard">
        <p>热号参考</p>
        <strong>{{ store.dashboard.stats.hotReds.map((item) => item.number.toString().padStart(2, '0')).join(' · ') }}</strong>
        <span>蓝球高热 {{ store.dashboard.stats.hotBlues.map((item) => item.number.toString().padStart(2, '0')).join(' / ') }}</span>
      </article>
    </div>

    <div v-if="store.historyError" class="feedback-panel error">{{ store.historyError }}</div>
    <div v-else-if="store.historyLoading && !store.history.length" class="feedback-panel">正在拉取官方开奖档案...</div>
    <HistoryTable v-else :draws="store.history" />
  </section>
</template>

<style scoped>
.history-page {
  display: grid;
  gap: 1.35rem;
}

.history-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) auto;
  gap: 1rem;
  align-items: end;
}

.history-copy {
  color: var(--ink-muted);
  font-size: 1.02rem;
  line-height: 1.7;
}

.history-page__actions {
  display: flex;
  justify-content: end;
}

.window-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.window-switcher button {
  border: 1px solid rgba(123, 127, 142, 0.18);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  padding: 0.75rem 1rem;
  color: var(--ink-soft);
}

.window-switcher button.active {
  background: linear-gradient(135deg, rgba(27, 60, 127, 0.98), rgba(15, 31, 73, 0.98));
  color: white;
}

.history-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.history-summary-card {
  display: grid;
  gap: 0.5rem;
}

.history-summary-card p,
.history-summary-card span {
  margin: 0;
  color: var(--ink-muted);
}

.history-summary-card strong {
  font-size: 1.3rem;
  line-height: 1.45;
}

.latest-balls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

@media (max-width: 1100px) {
  .history-page__hero,
  .history-summary-grid {
    grid-template-columns: 1fr;
  }

  .history-page__actions {
    justify-content: start;
  }
}
</style>
