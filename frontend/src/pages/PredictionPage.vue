<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { EChartsOption } from 'echarts';

import ChartPanel from '../components/ChartPanel.vue';
import NumberBall from '../components/NumberBall.vue';
import SchemeCard from '../components/SchemeCard.vue';
import { useLotteryStore } from '../stores/lottery';
import type { DashboardData, NumberInsight } from '../types/lottery';

const issueWindows = [60, 80, 120, 160];
const store = useLotteryStore();
type TrendPoint = DashboardData['stats']['patterns']['trendSeries'][number];

onMounted(() => {
  if (!store.dashboard && !store.dashboardLoading) {
    void store.loadDashboard();
  }
});

const dashboard = computed(() => store.dashboard);
const selectedScheme = computed(() => store.selectedScheme);

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

const redProbabilityOption = computed<EChartsOption>(() => {
  const numbers: NumberInsight[] = dashboard.value?.stats.redNumbers ?? [];
  return {
    grid: { left: 24, right: 16, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: numbers.map((item) => item.number.toString().padStart(2, '0')),
      axisLine: { lineStyle: { color: '#b8bfca' } },
      axisLabel: { color: '#687287' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(104, 114, 135, 0.14)' } },
      axisLabel: { color: '#687287', formatter: '{value}%' }
    },
    series: [
      {
        type: 'bar',
        data: numbers.map((item) => item.relativeProbability),
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
          color: (params: { dataIndex: number }) => {
            const label = numbers[params.dataIndex]?.label;
            if (label === 'hot') {
              return '#d43841';
            }
            if (label === 'cold') {
              return '#7d8798';
            }
            return '#d2a258';
          }
        }
      }
    ]
  };
});

const trendOption = computed<EChartsOption>(() => {
  const series: TrendPoint[] = dashboard.value?.stats.patterns.trendSeries ?? [];
  return {
    grid: { left: 16, right: 16, top: 18, bottom: 24, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 0,
      textStyle: { color: '#687287' }
    },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.issue.slice(-3)),
      axisLine: { lineStyle: { color: '#b8bfca' } },
      axisLabel: { color: '#687287' }
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { color: '#687287' },
        splitLine: { lineStyle: { color: 'rgba(104, 114, 135, 0.14)' } }
      },
      {
        type: 'value',
        axisLabel: { color: '#687287' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '红球和值',
        type: 'line',
        smooth: true,
        data: series.map((item) => item.redSum),
        lineStyle: { color: '#d43841', width: 3 },
        areaStyle: { color: 'rgba(212, 56, 65, 0.12)' },
        itemStyle: { color: '#d43841' }
      },
      {
        name: '跨度',
        type: 'bar',
        yAxisIndex: 1,
        data: series.map((item) => item.span),
        itemStyle: { color: 'rgba(18, 63, 146, 0.7)', borderRadius: [8, 8, 0, 0] }
      }
    ]
  };
});
</script>

<template>
  <section class="page prediction-page">
    <div class="prediction-page__hero glass-panel">
      <div>
        <p class="section-eyebrow">Probability Desk</p>
        <h5>用官方开奖数据生成下一期结构化选号视图。</h5>
        <p class="hero-copy">
          {{ dashboard?.overview.headline ?? '正在连接福彩中心官方数据接口，加载近期开奖样本与预测方案。' }}
        </p>
      </div>
      <div class="prediction-page__actions">
        <span class="status-pill">官方接口</span>
        <div class="window-switcher">
          <button
            v-for="window in issueWindows"
            :key="window"
            :class="{ active: window === store.issueWindow }"
            @click="store.loadDashboard(window)"
          >
            {{ window }} 期样本
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.dashboardError" class="feedback-panel error">{{ store.dashboardError }}</div>
    <div v-else-if="store.dashboardLoading && !dashboard" class="feedback-panel">正在分析概率曲线与近期开奖特征...</div>
    <template v-else-if="dashboard">
      <div class="stats-grid">
        <article class="stat-card glass-panel">
          <p>最新期号</p>
          <strong>{{ dashboard.latestDraw.issue }}</strong>
          <span>{{ dashboard.latestDraw.drawDate }}</span>
        </article>
        <article class="stat-card glass-panel">
          <p>样本规模</p>
          <strong>{{ dashboard.overview.sampleSize }} 期</strong>
          <span>平均红球和值 {{ dashboard.overview.avgRedSum }}</span>
        </article>
        <article class="stat-card glass-panel">
          <p>单期销量均值</p>
          <strong>{{ formatCurrency(dashboard.overview.avgSales) }}</strong>
          <span>奖池 {{ formatCurrency(dashboard.overview.poolMoney) }}</span>
        </article>
      </div>

      <div class="analysis-layout">
        <aside class="analysis-layout__sidebar glass-panel">
          <div class="sidebar-head">
            <p class="section-eyebrow">Schemes</p>
            <h2>预测方案</h2>
          </div>
          <div class="scheme-list">
            <SchemeCard
              v-for="scheme in dashboard.schemes"
              :key="scheme.id"
              :scheme="scheme"
              :active="scheme.id === selectedScheme?.id"
              @select="store.selectScheme"
            />
          </div>
        </aside>

        <section class="analysis-layout__detail glass-panel" v-if="selectedScheme">
          <div class="detail-header">
            <div>
              <p class="section-eyebrow">Selected Scheme</p>
              <h2>{{ selectedScheme.title }}</h2>
            </div>
            <span class="confidence-badge">置信 {{ selectedScheme.confidence }}%</span>
          </div>
          <p class="detail-tone">{{ selectedScheme.tone }}</p>
          <div class="selected-numbers">
            <NumberBall v-for="number in selectedScheme.redNumbers" :key="number" :value="number" tone="red" />
            <NumberBall :value="selectedScheme.blueNumber" tone="blue" />
          </div>
          <div class="metric-pills">
            <span>奇偶 {{ selectedScheme.metrics.oddEvenRatio }}</span>
            <span>三区 {{ selectedScheme.metrics.zoneRatio }}</span>
            <span>跨度 {{ selectedScheme.metrics.span }}</span>
            <span>和值 {{ selectedScheme.metrics.sum }}</span>
            <span>热号 {{ selectedScheme.metrics.hotCount }}</span>
            <span>冷号 {{ selectedScheme.metrics.coldCount }}</span>
          </div>
          <div class="detail-columns">
            <div>
              <p class="section-eyebrow">Reasons</p>
              <ul class="reason-list">
                <li v-for="reason in selectedScheme.reasons" :key="reason">{{ reason }}</li>
              </ul>
            </div>
            <div>
              <p class="section-eyebrow">Latest Draw</p>
              <div class="mini-draw">
                <NumberBall v-for="number in dashboard.latestDraw.redNumbers" :key="`latest-${number}`" :value="number" tone="neutral" size="sm" />
                <NumberBall :value="dashboard.latestDraw.blueNumber" tone="blue" size="sm" />
              </div>
              <p class="mini-copy">{{ dashboard.latestDraw.summary }}</p>
            </div>
          </div>
        </section>
      </div>

      <div class="chart-grid">
        <ChartPanel title="红球相对概率" subtitle="综合色率、近 12 期活跃度与遗漏跨度的加权结果。" :option="redProbabilityOption" />
        <ChartPanel title="近期结构波动" subtitle="观察和值与跨度共振，识别走势是否持续偏热。" :option="trendOption" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.prediction-page {
  display: grid;
  gap: 1.35rem;
}

.prediction-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
  gap: 1.5rem;
  align-items: end;
}

.prediction-page__hero h1 {
  max-width: 12ch;
}

.hero-copy {
  max-width: 52rem;
  color: var(--ink-muted);
  font-size: 1.02rem;
  line-height: 1.7;
}

.prediction-page__actions {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 1rem;
}

.window-switcher {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  display: grid;
  gap: 0.45rem;
}

.stat-card p,
.stat-card span {
  margin: 0;
  color: var(--ink-muted);
}

.stat-card strong {
  font-size: clamp(1.55rem, 2vw, 2rem);
}

.analysis-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.92fr) minmax(0, 1.4fr);
  gap: 1rem;
}

.analysis-layout__sidebar,
.analysis-layout__detail {
  min-height: 100%;
}

.sidebar-head h2,
.detail-header h2 {
  margin: 0.4rem 0 0;
}

.scheme-list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.15rem;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.detail-tone {
  color: var(--ink-muted);
  font-size: 1rem;
  line-height: 1.7;
}

.confidence-badge {
  border-radius: 999px;
  padding: 0.72rem 1rem;
  background: rgba(212, 56, 65, 0.08);
  color: #b82037;
  font-weight: 800;
}

.selected-numbers,
.mini-draw {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.metric-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.35rem 0;
}

.metric-pills span,
.status-pill {
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(123, 127, 142, 0.16);
  color: var(--ink-soft);
}

.detail-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.reason-list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--ink-soft);
  line-height: 1.8;
}

.mini-copy {
  margin-bottom: 0;
  color: var(--ink-muted);
  line-height: 1.7;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 1100px) {
  .prediction-page__hero,
  .analysis-layout,
  .chart-grid,
  .detail-columns,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .prediction-page__actions {
    align-items: start;
  }

  .window-switcher {
    justify-content: start;
  }
}
</style>
