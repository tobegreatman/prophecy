<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

import { useLotteryStore } from './stores/lottery';

const route = useRoute();
const store = useLotteryStore();

onMounted(() => {
  if (!store.dashboard && !store.dashboardLoading) {
    void store.loadDashboard();
  }
});

const latestIssue = computed(() => store.dashboard?.latestDraw.issue ?? '加载中');
const updatedAt = computed(() => {
  if (!store.dashboard) {
    return '等待同步';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(store.dashboard.updatedAt));
});
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__backdrop"></div>
    <header class="app-header glass-panel">
      <div class="brand-lockup">
        <p>Prophecy</p>
        <span>双色球概率分析系统</span>
      </div>
      <nav class="top-nav">
        <RouterLink to="/prediction" :class="{ active: route.path === '/prediction' }">概率预测</RouterLink>
        <RouterLink to="/history" :class="{ active: route.path === '/history' }">历史数据</RouterLink>
      </nav>
      <div class="header-meta">
        <span>最新期号 {{ latestIssue }}</span>
        <span>更新于 {{ updatedAt }}</span>
      </div>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
}

.app-shell__backdrop {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(212, 163, 88, 0.18), transparent 28%),
    radial-gradient(circle at 85% 12%, rgba(40, 86, 176, 0.2), transparent 20%),
    linear-gradient(180deg, #fbf8f2 0%, #eef1f8 52%, #edf1f6 100%);
  z-index: -2;
}

.app-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  margin: 0 auto;
}

.brand-lockup p {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
}

.brand-lockup span,
.header-meta span {
  color: var(--ink-muted);
  font-size: 0.88rem;
}

.top-nav {
  display: flex;
  justify-content: center;
  gap: 0.65rem;
}

.top-nav a {
  border-radius: 999px;
  padding: 0.7rem 1rem;
  color: var(--ink-soft);
  text-decoration: none;
  transition: background 180ms ease, color 180ms ease;
}

.top-nav a.active,
.top-nav a:hover {
  background: rgba(18, 63, 146, 0.92);
  color: #fff;
}

.header-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: end;
}

@media (max-width: 960px) {
  .app-header {
    grid-template-columns: 1fr;
  }

  .top-nav,
  .header-meta {
    justify-content: start;
  }
}
</style>
