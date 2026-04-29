import {
  computed,
  createApp,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.9.0/+esm';

const issueWindows = [60, 80, 120, 160];
const historyWindows = [30, 60, 120];
const exportModes = [
  { value: 'brief', label: '单行转发' },
  { value: 'detailed', label: '多行留档' }
];
const probabilityFilters = [
  { value: 'all', label: '全部' },
  { value: 'hot', label: '热' },
  { value: 'warm', label: '温' },
  { value: 'cold', label: '冷' }
];

const api = axios.create({
  baseURL: '/',
  timeout: 12000
});

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatNumber(value) {
  return String(value).padStart(2, '0');
}

function formatSigned(value, digits = 1) {
  const fixed = Number(value).toFixed(digits);
  return `${value >= 0 ? '+' : ''}${fixed}`;
}

function formatSignedInteger(value) {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
}

function joinNumberList(list) {
  return list.length ? list.join(' · ') : '--';
}

function createDeltaChip(label, tone) {
  return { label, tone };
}

function summarizeWindow(data) {
  const leadScheme = data.schemes[0] ?? null;
  const hotRedsList = data.stats.hotReds.slice(0, 3).map((item) => formatNumber(item.number));
  const leadingSchemeNumberList = leadScheme?.redNumbers.map((number) => formatNumber(number)) ?? [];
  return {
    issueWindow: data.overview.sampleSize,
    latestIssue: data.latestDraw.issue,
    avgRedSum: data.overview.avgRedSum,
    avgSales: data.overview.avgSales,
    hotRedsList,
    hotReds: joinNumberList(hotRedsList),
    topBlue: formatNumber(leadScheme?.blueNumber ?? data.stats.hotBlues[0]?.number ?? 0),
    leadingSchemeTitle: leadScheme?.title ?? '暂无方案',
    leadingSchemeConfidence: leadScheme?.confidence ?? 0,
    leadingSchemeNumberList,
    leadingSchemeNumbers: leadingSchemeNumberList.length ? leadingSchemeNumberList.join(' ') : '--'
  };
}

function buildComparisonCards(rows) {
  const orderedRows = rows
    .slice()
    .sort((left, right) => issueWindows.indexOf(left.issueWindow) - issueWindows.indexOf(right.issueWindow));

  return orderedRows.map((row, index) => {
    if (index === 0) {
      return {
        ...row,
        deltaTitle: '基线窗口',
        deltaNumberChips: [createDeltaChip('首个样本窗口，作为后续比较基准。', 'neutral')],
        deltaMetricChips: [
          createDeltaChip(`和值均值 ${row.avgRedSum}`, 'neutral'),
          createDeltaChip(`销量均值 ${formatCurrency(row.avgSales)}`, 'neutral')
        ],
        deltaHotChips: [createDeltaChip(`热号基线 ${row.hotReds}`, 'neutral')]
      };
    }

    const previous = orderedRows[index - 1];
    const addedNumbers = row.leadingSchemeNumberList.filter((number) => !previous.leadingSchemeNumberList.includes(number));
    const removedNumbers = previous.leadingSchemeNumberList.filter((number) => !row.leadingSchemeNumberList.includes(number));
    const hotAdded = row.hotRedsList.filter((number) => !previous.hotRedsList.includes(number));
    const hotRemoved = previous.hotRedsList.filter((number) => !row.hotRedsList.includes(number));

    const deltaNumberChips = [];
    if (addedNumbers.length) {
      deltaNumberChips.push(createDeltaChip(`新增 ${joinNumberList(addedNumbers)}`, 'positive'));
    }
    if (removedNumbers.length) {
      deltaNumberChips.push(createDeltaChip(`移出 ${joinNumberList(removedNumbers)}`, 'negative'));
    }

    const deltaHotChips = [];
    if (hotAdded.length) {
      deltaHotChips.push(createDeltaChip(`热号新增 ${joinNumberList(hotAdded)}`, 'positive'));
    }
    if (hotRemoved.length) {
      deltaHotChips.push(createDeltaChip(`热号回落 ${joinNumberList(hotRemoved)}`, 'negative'));
    }

    const avgRedSumDelta = row.avgRedSum - previous.avgRedSum;
    const avgSalesDelta = row.avgSales - previous.avgSales;

    return {
      ...row,
      deltaTitle: `对比 ${previous.issueWindow} 期`,
      deltaNumberChips: deltaNumberChips.length
        ? deltaNumberChips
        : [createDeltaChip('领先方案号码未发生变化。', 'neutral')],
      deltaMetricChips: [
        createDeltaChip(`和值均值 ${formatSigned(avgRedSumDelta)}`, avgRedSumDelta >= 0 ? 'positive' : 'negative'),
        createDeltaChip(`销量均值 ${formatSignedInteger(avgSalesDelta)}`, avgSalesDelta >= 0 ? 'positive' : 'negative')
      ],
      deltaHotChips: deltaHotChips.length
        ? deltaHotChips
        : [createDeltaChip('热号组合保持稳定。', 'neutral')]
    };
  });
}

function buildSchemeExportText({ scheme, latestDraw, issueWindow, exportMode }) {
  const redNumbers = scheme.redNumbers.map((number) => formatNumber(number)).join(' ');
  const latestDrawNumbers = `${latestDraw.redNumbers.map((number) => formatNumber(number)).join(' ')} + ${formatNumber(latestDraw.blueNumber)}`;

  if (exportMode === 'brief') {
    return [
      `Prophecy 双色球`,
      `${issueWindow}期样本`,
      `${scheme.title} ${scheme.confidence}%`,
      `红球 ${redNumbers}`,
      `蓝球 ${formatNumber(scheme.blueNumber)}`,
      `结构 奇偶${scheme.metrics.oddEvenRatio} / 三区${scheme.metrics.zoneRatio} / 跨度${scheme.metrics.span} / 和值${scheme.metrics.sum}`,
      `参考 ${latestDraw.issue}`
    ].join(' | ');
  }

  return [
    `Prophecy 双色球预测方案`,
    `样本窗口：最近 ${issueWindow} 期`,
    `参考期号：${latestDraw.issue} (${latestDraw.drawDate})`,
    `方案：${scheme.title} | ${scheme.tone}`,
    `置信度：${scheme.confidence}%`,
    `红球：${redNumbers}`,
    `蓝球：${formatNumber(scheme.blueNumber)}`,
    `结构：奇偶 ${scheme.metrics.oddEvenRatio} / 三区 ${scheme.metrics.zoneRatio} / 跨度 ${scheme.metrics.span} / 和值 ${scheme.metrics.sum}`,
    `热冷：热号 ${scheme.metrics.hotCount} / 冷号 ${scheme.metrics.coldCount}`,
    `推荐理由：${scheme.reasons.join('；')}`,
    `最近开奖：${latestDrawNumbers}`,
    `开奖摘要：${latestDraw.summary}`
  ].join('\n');
}

function buildAllSchemesExportText({ schemes, latestDraw, issueWindow, exportMode }) {
  if (!schemes.length) {
    return '';
  }

  if (exportMode === 'brief') {
    const schemeSummary = schemes
      .map((scheme) => `${scheme.title} ${scheme.confidence}% ${scheme.redNumbers.map((number) => formatNumber(number)).join(' ')} + ${formatNumber(scheme.blueNumber)}`)
      .join(' || ');

    return [
      `Prophecy 双色球`,
      `${issueWindow}期样本`,
      `参考 ${latestDraw.issue}`,
      schemeSummary
    ].join(' | ');
  }

  return [
    `Prophecy 双色球当前窗口全部方案`,
    `样本窗口：最近 ${issueWindow} 期`,
    `参考期号：${latestDraw.issue} (${latestDraw.drawDate})`,
    ...schemes.map((scheme, index) => {
      return [
        ``,
        `方案 ${index + 1}：${scheme.title}`,
        `调性：${scheme.tone}`,
        `置信度：${scheme.confidence}%`,
        `红球：${scheme.redNumbers.map((number) => formatNumber(number)).join(' ')}`,
        `蓝球：${formatNumber(scheme.blueNumber)}`,
        `结构：奇偶 ${scheme.metrics.oddEvenRatio} / 三区 ${scheme.metrics.zoneRatio} / 跨度 ${scheme.metrics.span} / 和值 ${scheme.metrics.sum}`,
        `热冷：热号 ${scheme.metrics.hotCount} / 冷号 ${scheme.metrics.coldCount}`,
        `推荐理由：${scheme.reasons.join('；')}`
      ].join('\n');
    }),
    ``,
    `最近开奖：${latestDraw.redNumbers.map((number) => formatNumber(number)).join(' ')} + ${formatNumber(latestDraw.blueNumber)}`,
    `开奖摘要：${latestDraw.summary}`
  ].join('\n');
}

function buildHistoryInsights(draws) {
  if (!draws.length) {
    return null;
  }

  const redSums = draws.map((draw) => draw.redNumbers.reduce((sum, number) => sum + number, 0));
  const spans = draws.map((draw) => Math.max(...draw.redNumbers) - Math.min(...draw.redNumbers));
  const averageRedSum = (redSums.reduce((sum, value) => sum + value, 0) / redSums.length).toFixed(1);
  const averageSpan = (spans.reduce((sum, value) => sum + value, 0) / spans.length).toFixed(1);
  const highestSalesDraw = draws.reduce((current, draw) => (draw.sales > current.sales ? draw : current), draws[0]);

  const blueCounts = draws.reduce((counts, draw) => {
    const key = formatNumber(draw.blueNumber);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());

  const topBlue = Array.from(blueCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? ['--', 0];
  const latestOverlap = draws[1]
    ? draws[0].redNumbers.filter((number) => draws[1].redNumbers.includes(number)).map((number) => formatNumber(number))
    : [];

  return [
    {
      key: 'structural-balance',
      title: '和值与跨度',
      value: `和值均值 ${averageRedSum}`,
      detail: `跨度均值 ${averageSpan}`,
      filterHint: '筛出和值和跨度都不低于当前均值的期次',
      matches: draws
        .filter((draw, index) => redSums[index] >= Number(averageRedSum) && spans[index] >= Number(averageSpan))
        .map((draw) => draw.issue)
    },
    {
      key: 'top-blue',
      title: '高频蓝球',
      value: topBlue[0],
      detail: `在最近 ${draws.length} 期出现 ${topBlue[1]} 次`,
      filterHint: `筛出蓝球为 ${topBlue[0]} 的期次`,
      matches: draws.filter((draw) => formatNumber(draw.blueNumber) === topBlue[0]).map((draw) => draw.issue)
    },
    {
      key: 'peak-sales',
      title: '单期销量峰值',
      value: highestSalesDraw.issue,
      detail: `销量 ${formatCurrency(highestSalesDraw.sales)}`,
      filterHint: '定位销量最高的当期记录',
      matches: [highestSalesDraw.issue]
    },
    {
      key: 'recent-overlap',
      title: '最近两期重号',
      value: latestOverlap.length ? latestOverlap.join(' · ') : '暂无重号',
      detail: latestOverlap.length ? `重叠 ${latestOverlap.length} 个红球` : '连续两期结构切换较快',
      filterHint: latestOverlap.length ? `筛出包含 ${latestOverlap.join(' · ')} 的期次` : '当前没有可筛选的重号记录',
      matches: latestOverlap.length
        ? draws
            .filter((draw) => draw.redNumbers.some((number) => latestOverlap.includes(formatNumber(number))))
            .map((draw) => draw.issue)
        : []
    }
  ];
}

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', 'true');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.select();
  document.execCommand('copy');
  document.body.removeChild(helper);
}

function escapeSvgText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildLinePath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function createBarChartMarkup({
  width,
  height,
  items,
  getLabel,
  getValue,
  getColor,
  valueSuffix = '',
  yTicks = 4
}) {
  const margin = { top: 56, right: 16, bottom: 42, left: 42 };
  const plotWidth = Math.max(width - margin.left - margin.right, 120);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 120);
  const maxValue = Math.max(...items.map((item) => getValue(item)), 1);
  const step = plotWidth / items.length;
  const barWidth = Math.max(Math.min(step * 0.72, 18), 6);
  const labelEvery = Math.max(1, Math.ceil(items.length / 11));
  const valueFontSize = items.length > 25 ? 8 : 9;

  const gridLines = Array.from({ length: yTicks + 1 }, (_, index) => {
    const value = (maxValue / yTicks) * index;
    const y = margin.top + plotHeight - (value / maxValue) * plotHeight;
    return `
      <line x1="${margin.left}" y1="${y.toFixed(1)}" x2="${(margin.left + plotWidth).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(104, 114, 135, 0.16)" stroke-width="1" />
      <text x="${margin.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#687287">${value.toFixed(0)}${valueSuffix}</text>
    `;
  }).join('');

  const bars = items.map((item, index) => {
    const value = getValue(item);
    const x = margin.left + index * step + (step - barWidth) / 2;
    const centerX = x + barWidth / 2;
    const barHeight = (value / maxValue) * plotHeight;
    const y = margin.top + plotHeight - barHeight;
    const label = getLabel(item);
    const showLabel = index % labelEvery === 0 || index === items.length - 1;
    const valueY = Math.max(y - 6, 18);
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(barHeight, 2).toFixed(1)}" rx="6" fill="${getColor(item)}" />
      <text x="${centerX.toFixed(1)}" y="${valueY.toFixed(1)}" transform="rotate(-62 ${centerX.toFixed(1)} ${valueY.toFixed(1)})" text-anchor="end" font-size="${valueFontSize}" fill="#546074">${Number(value).toFixed(1)}</text>
      ${showLabel ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 14}" text-anchor="middle" font-size="10" fill="#687287">${escapeSvgText(label)}</text>` : ''}
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
      ${gridLines}
      <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#b8bfca" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

function createDualMetricChartMarkup({
  width,
  height,
  items,
  getLabel,
  getLineValue,
  getBarValue,
  lineColor,
  lineAreaColor,
  barColor,
  leftSuffix = '',
  rightSuffix = '',
  lineLegend,
  barLegend,
  overlayFormatter
}) {
  const margin = { top: 24, right: 42, bottom: 44, left: 42 };
  const plotWidth = Math.max(width - margin.left - margin.right, 120);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 120);
  const leftMax = Math.max(...items.map((item) => getLineValue(item)), 1);
  const rightMax = Math.max(...items.map((item) => getBarValue(item)), 1);
  const step = plotWidth / Math.max(items.length - 1, 1);
  const barWidth = Math.max(Math.min(plotWidth / Math.max(items.length, 1) * 0.5, 18), 8);
  const labelEvery = Math.max(1, Math.ceil(items.length / 8));
  const linePoints = items.map((item, index) => ({
    x: margin.left + step * index,
    y: margin.top + plotHeight - (getLineValue(item) / leftMax) * plotHeight
  }));
  const areaPath = `${buildLinePath(linePoints)} L ${linePoints[linePoints.length - 1].x.toFixed(1)} ${(margin.top + plotHeight).toFixed(1)} L ${linePoints[0].x.toFixed(1)} ${(margin.top + plotHeight).toFixed(1)} Z`;

  const leftGrid = Array.from({ length: 5 }, (_, index) => {
    const value = (leftMax / 4) * index;
    const y = margin.top + plotHeight - (value / leftMax) * plotHeight;
    return `
      <line x1="${margin.left}" y1="${y.toFixed(1)}" x2="${(margin.left + plotWidth).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(104, 114, 135, 0.14)" stroke-width="1" />
      <text x="${margin.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#687287">${value.toFixed(0)}${leftSuffix}</text>
    `;
  }).join('');

  const rightLabels = Array.from({ length: 5 }, (_, index) => {
    const value = (rightMax / 4) * index;
    const y = margin.top + plotHeight - (value / rightMax) * plotHeight;
    return `<text x="${margin.left + plotWidth + 8}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#687287">${value.toFixed(0)}${rightSuffix}</text>`;
  }).join('');

  const bars = items.map((item, index) => {
    const value = getBarValue(item);
    const x = margin.left + step * index - barWidth / 2;
    const barHeight = (value / rightMax) * plotHeight;
    const y = margin.top + plotHeight - barHeight;
    const label = getLabel(item);
    const showLabel = index % labelEvery === 0 || index === items.length - 1;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(barHeight, 2).toFixed(1)}" rx="6" fill="${barColor}" opacity="0.78" />
      ${showLabel ? `<text x="${(margin.left + step * index).toFixed(1)}" y="${height - 14}" text-anchor="middle" font-size="10" fill="#687287">${escapeSvgText(label)}</text>` : ''}
    `;
  }).join('');

  const points = linePoints.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5" fill="${lineColor}" />`).join('');
  const overlays = overlayFormatter
    ? items.map((item, index) => {
        const nextX = index === items.length - 1 ? margin.left + plotWidth : margin.left + step * (index + 0.5);
        const previousX = index === 0 ? margin.left : margin.left + step * (index - 0.5);
        const x = index === 0 ? margin.left : previousX;
        const overlayWidth = index === 0 ? nextX - margin.left : nextX - previousX;
        return `<rect x="${x.toFixed(1)}" y="${margin.top}" width="${overlayWidth.toFixed(1)}" height="${plotHeight.toFixed(1)}" fill="transparent" data-overlay-index="${index}" aria-label="${escapeSvgText(overlayFormatter(item))}"></rect>`;
      }).join('')
    : '';

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
      ${leftGrid}
      ${rightLabels}
      <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#b8bfca" stroke-width="1" />
      <path d="${areaPath}" fill="${lineAreaColor}" opacity="0.95"></path>
      ${bars}
      <path d="${buildLinePath(linePoints)}" fill="none" stroke="${lineColor}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></path>
      ${points}
      <g>${overlays}</g>
      <g transform="translate(${margin.left}, 10)">
        <circle cx="8" cy="8" r="4" fill="${lineColor}"></circle>
        <text x="18" y="12" font-size="11" fill="#687287">${escapeSvgText(lineLegend)}</text>
        <rect x="112" y="3" width="10" height="10" rx="3" fill="${barColor}" opacity="0.78"></rect>
        <text x="130" y="12" font-size="11" fill="#687287">${escapeSvgText(barLegend)}</text>
      </g>
    </svg>
  `;
}

const NumberBall = {
  props: {
    value: { type: Number, required: true },
    tone: { type: String, default: 'neutral' },
    size: { type: String, default: 'md' }
  },
  template: `
    <span class="number-ball" :class="['tone-' + tone, 'size-' + size]">
      {{ String(value).padStart(2, '0') }}
    </span>
  `
};

const SchemeCard = {
  components: { NumberBall },
  props: {
    scheme: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  emits: ['select'],
  template: `
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
  `
};

createApp({
  components: {
    NumberBall,
    SchemeCard
  },
  setup() {
    const currentView = ref('prediction');
    const dashboard = ref(null);
    const history = ref([]);
    const activeHistoryInsightKey = ref('');
    const hoveredHistoryIssue = ref('');
    const lockedHistoryIssue = ref('');
    const issueWindow = ref(80);
    const historyWindow = ref(30);
    const selectedSchemeId = ref(null);
    const dashboardLoading = ref(false);
    const historyLoading = ref(false);
    const dashboardError = ref('');
    const historyError = ref('');
    const comparisonRows = ref([]);
    const comparisonLoading = ref(false);
    const comparisonError = ref('');
    const exportMode = ref('brief');
    const activeProbabilityFilter = ref('all');
    const exportFeedback = ref('');
    const exportFeedbackTone = ref('neutral');
    const comparisonFocusActive = ref(false);
    const comparisonBoardEl = ref(null);
    const detailFocusActive = ref(false);
    const detailSectionEl = ref(null);
    const historyTrendChartEl = ref(null);
    const redChartEl = ref(null);
    const trendChartEl = ref(null);
    let historyChartHoverCleanup = null;
    let exportFeedbackTimer = null;
    let comparisonFocusTimer = null;
    let detailFocusTimer = null;

    const selectedScheme = computed(() => {
      if (!dashboard.value) {
        return null;
      }

      return dashboard.value.schemes.find((scheme) => scheme.id === selectedSchemeId.value) ?? dashboard.value.schemes[0] ?? null;
    });

    const latestIssue = computed(() => dashboard.value?.latestDraw.issue ?? '加载中');
    const updatedAt = computed(() => {
      if (!dashboard.value) {
        return '等待同步';
      }

      return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dashboard.value.updatedAt));
    });

    const latestHistoryDraw = computed(() => history.value[0] ?? dashboard.value?.latestDraw ?? null);
    const hotRedLabel = computed(() =>
      dashboard.value?.stats.hotReds.map((item) => String(item.number).padStart(2, '0')).join(' · ') ?? ''
    );
    const hotBlueLabel = computed(() =>
      dashboard.value?.stats.hotBlues.map((item) => formatNumber(item.number)).join(' / ') ?? ''
    );
    const redProbabilityCards = computed(() =>
      dashboard.value?.stats.redNumbers
        ?.slice()
        .sort((left, right) => right.relativeProbability - left.relativeProbability || left.number - right.number)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          formattedNumber: formatNumber(item.number),
          formattedProbability: `${item.relativeProbability.toFixed(1)}%`
        })) ?? []
    );
    const probabilityFilterCards = computed(() =>
      probabilityFilters.map((filter) => ({
        ...filter,
        count:
          filter.value === 'all'
            ? redProbabilityCards.value.length
            : redProbabilityCards.value.filter((item) => item.label === filter.value).length
      }))
    );
    const filteredRedProbabilityCards = computed(() => {
      if (activeProbabilityFilter.value === 'all') {
        return redProbabilityCards.value;
      }

      return redProbabilityCards.value.filter((item) => item.label === activeProbabilityFilter.value);
    });
    const historyInsights = computed(() => buildHistoryInsights(history.value));
    const activeHistoryInsight = computed(
      () => historyInsights.value?.find((item) => item.key === activeHistoryInsightKey.value) ?? null
    );
    const effectiveHistoryIssue = computed(() => lockedHistoryIssue.value || hoveredHistoryIssue.value);
    const effectiveHistoryDraw = computed(() => history.value.find((draw) => draw.issue === effectiveHistoryIssue.value) ?? null);
    const filteredHistory = computed(() => {
      if (!activeHistoryInsight.value?.matches?.length) {
        return history.value;
      }

      const issueSet = new Set(activeHistoryInsight.value.matches);
      return history.value.filter((draw) => issueSet.has(draw.issue));
    });

    const comparisonCards = computed(() => buildComparisonCards(comparisonRows.value));
    const activeComparisonCard = computed(
      () => comparisonCards.value.find((item) => item.issueWindow === issueWindow.value) ?? null
    );

    async function request(path, params) {
      const response = await api.get(path, { params });
      if (response.data.code !== 0) {
        throw new Error(response.data.message);
      }
      return response.data.data;
    }

    async function loadDashboard(window = issueWindow.value) {
      issueWindow.value = window;
      dashboardLoading.value = true;
      dashboardError.value = '';
      try {
        dashboard.value = await request('/api/ssq/dashboard', { issueCount: window });
        activeProbabilityFilter.value = 'all';
        selectedSchemeId.value = dashboard.value.schemes[0]?.id ?? null;
        upsertComparisonRow(summarizeWindow(dashboard.value));
        await nextTick();
        renderCharts();
        return dashboard.value;
      } catch (error) {
        dashboardError.value = error.message || '获取预测失败';
        return null;
      } finally {
        dashboardLoading.value = false;
      }
    }

    function upsertComparisonRow(summary) {
      const nextRows = comparisonRows.value.filter((item) => item.issueWindow !== summary.issueWindow);
      nextRows.push(summary);
      comparisonRows.value = nextRows;
    }

    async function loadWindowComparison(preloadedDashboard = null) {
      comparisonLoading.value = true;
      comparisonError.value = '';

      const requests = issueWindows.map((window) => {
        if (preloadedDashboard && preloadedDashboard.overview.sampleSize === window) {
          return Promise.resolve(preloadedDashboard);
        }

        return request('/api/ssq/dashboard', { issueCount: window });
      });

      const results = await Promise.allSettled(requests);
      const successRows = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => summarizeWindow(result.value));

      comparisonRows.value = successRows;

      const failedCount = results.length - successRows.length;
      if (!successRows.length) {
        comparisonError.value = '多窗口对比加载失败。';
      } else if (failedCount > 0) {
        comparisonError.value = `已有 ${failedCount} 个窗口样本暂时未能完成分析。`;
      }

      comparisonLoading.value = false;
    }

    async function loadHistory(window = historyWindow.value) {
      historyWindow.value = window;
      historyLoading.value = true;
      historyError.value = '';
      activeHistoryInsightKey.value = '';
      hoveredHistoryIssue.value = '';
      lockedHistoryIssue.value = '';
      try {
        history.value = await request('/api/ssq/history', { issueCount: window });
        await nextTick();
        renderHistoryChart();
      } catch (error) {
        historyError.value = error.message || '获取历史失败';
      } finally {
        historyLoading.value = false;
      }
    }

    function clearLockedHistoryIssue() {
      lockedHistoryIssue.value = '';
    }

    function toggleHistoryInsight(key) {
      activeHistoryInsightKey.value = activeHistoryInsightKey.value === key ? '' : key;
    }

    function focusDetailPanel() {
      detailFocusActive.value = true;
      detailSectionEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (detailFocusTimer) {
        window.clearTimeout(detailFocusTimer);
      }
      detailFocusTimer = window.setTimeout(() => {
        detailFocusActive.value = false;
      }, 1800);
    }

    function focusComparisonBoard() {
      comparisonFocusActive.value = true;
      comparisonBoardEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (comparisonFocusTimer) {
        window.clearTimeout(comparisonFocusTimer);
      }
      comparisonFocusTimer = window.setTimeout(() => {
        comparisonFocusActive.value = false;
      }, 1800);
    }

    async function selectComparisonWindow(window) {
      const data = await loadDashboard(window);
      if (!data) {
        return;
      }
      await nextTick();
      focusDetailPanel();
    }

    function renderCharts() {
      if (!dashboard.value || !redChartEl.value || !trendChartEl.value) {
        return;
      }

      const redNumbers = dashboard.value.stats.redNumbers;
      const trendSeries = dashboard.value.stats.patterns.trendSeries;

      const redWidth = Math.max(redChartEl.value.clientWidth || 0, 320);
      redChartEl.value.innerHTML = createBarChartMarkup({
        width: redWidth,
        height: 320,
        items: redNumbers,
        getLabel: (item) => formatNumber(item.number),
        getValue: (item) => item.relativeProbability,
        getColor: (item) => {
          if (item.label === 'hot') {
            return '#d43841';
          }
          if (item.label === 'cold') {
            return '#7d8798';
          }
          return '#d2a258';
        },
        valueSuffix: '%'
      });

      const trendWidth = Math.max(trendChartEl.value.clientWidth || 0, 320);
      trendChartEl.value.innerHTML = createDualMetricChartMarkup({
        width: trendWidth,
        height: 320,
        items: trendSeries,
        getLabel: (item) => item.issue.slice(-3),
        getLineValue: (item) => item.redSum,
        getBarValue: (item) => item.span,
        lineColor: '#d43841',
        lineAreaColor: 'rgba(212, 56, 65, 0.12)',
        barColor: 'rgba(18, 63, 146, 0.72)',
        lineLegend: '红球和值',
        barLegend: '跨度'
      });
    }

    function renderHistoryChart() {
      if (!history.value.length || !historyTrendChartEl.value) {
        return;
      }

      const series = history.value
        .slice()
        .reverse()
        .map((draw) => ({
          issue: draw.issue,
          redSum: draw.redNumbers.reduce((sum, number) => sum + number, 0),
          blueNumber: draw.blueNumber
        }));

      const toggleHistoryChartIssue = (issue) => {
        if (!issue) {
          return;
        }

        lockedHistoryIssue.value = lockedHistoryIssue.value === issue ? '' : issue;
        hoveredHistoryIssue.value = issue;
      };

      if (historyChartHoverCleanup) {
        historyChartHoverCleanup();
      }

      const historyWidth = Math.max(historyTrendChartEl.value.clientWidth || 0, 320);
      historyTrendChartEl.value.innerHTML = createDualMetricChartMarkup({
        width: historyWidth,
        height: 320,
        items: series,
        getLabel: (item) => item.issue.slice(-3),
        getLineValue: (item) => item.redSum,
        getBarValue: (item) => item.blueNumber,
        lineColor: '#d43841',
        lineAreaColor: 'rgba(212, 56, 65, 0.1)',
        barColor: 'rgba(18, 63, 146, 0.72)',
        lineLegend: '红球和值',
        barLegend: '蓝球号码',
        overlayFormatter: (item) => item.issue
      });

      const overlays = Array.from(historyTrendChartEl.value.querySelectorAll('[data-overlay-index]'));
      const cleanupEntries = overlays.map((overlay) => {
        const index = Number.parseInt(overlay.dataset.overlayIndex ?? '-1', 10);
        const issue = series[index]?.issue ?? '';

        const handleMouseEnter = () => {
          if (!lockedHistoryIssue.value) {
            hoveredHistoryIssue.value = issue;
          }
        };

        const handleMouseLeave = () => {
          if (!lockedHistoryIssue.value) {
            hoveredHistoryIssue.value = '';
          }
        };

        const handleClick = () => {
          toggleHistoryChartIssue(issue);
        };

        overlay.addEventListener('mouseenter', handleMouseEnter);
        overlay.addEventListener('mouseleave', handleMouseLeave);
        overlay.addEventListener('click', handleClick);

        return () => {
          overlay.removeEventListener('mouseenter', handleMouseEnter);
          overlay.removeEventListener('mouseleave', handleMouseLeave);
          overlay.removeEventListener('click', handleClick);
        };
      });

      historyChartHoverCleanup = () => {
        cleanupEntries.forEach((cleanup) => cleanup());
      };
    }

    function resizeCharts() {
      if (currentView.value === 'history') {
        renderHistoryChart();
        return;
      }

      renderCharts();
    }

    watch(
      dashboard,
      async () => {
        await nextTick();
        renderCharts();
      },
      { deep: true }
    );

    watch(
      history,
      async () => {
        await nextTick();
        renderHistoryChart();
      },
      { deep: true }
    );

    watch(currentView, async (view) => {
      await nextTick();
      if (view === 'history') {
        renderHistoryChart();
        return;
      }

      if (view === 'prediction') {
        renderCharts();
      }
    });

    function switchView(view) {
      currentView.value = view;
      if (view === 'history' && !history.value.length && !historyLoading.value) {
        loadHistory();
      }
    }

    function showExportFeedback(message, tone = 'neutral') {
      exportFeedback.value = message;
      exportFeedbackTone.value = tone;
      if (exportFeedbackTimer) {
        window.clearTimeout(exportFeedbackTimer);
      }
      exportFeedbackTimer = window.setTimeout(() => {
        exportFeedback.value = '';
      }, 2800);
    }

    async function copySelectedScheme() {
      if (!selectedScheme.value || !dashboard.value) {
        showExportFeedback('当前没有可导出的方案。', 'negative');
        return;
      }

      const exportText = buildSchemeExportText({
        scheme: selectedScheme.value,
        latestDraw: dashboard.value.latestDraw,
        issueWindow: issueWindow.value,
        exportMode: exportMode.value
      });

      try {
        await writeToClipboard(exportText);
        showExportFeedback(exportMode.value === 'brief' ? '单行简报已复制到剪贴板。' : '多行方案已复制到剪贴板。', 'positive');
      } catch (error) {
        showExportFeedback(error?.message || '复制失败，请稍后重试。', 'negative');
      }
    }

    async function copyAllSchemes() {
      if (!dashboard.value?.schemes?.length) {
        showExportFeedback('当前窗口没有可导出的方案。', 'negative');
        return;
      }

      const exportText = buildAllSchemesExportText({
        schemes: dashboard.value.schemes,
        latestDraw: dashboard.value.latestDraw,
        issueWindow: issueWindow.value,
        exportMode: exportMode.value
      });

      try {
        await writeToClipboard(exportText);
        showExportFeedback(exportMode.value === 'brief' ? '全部方案简报已复制到剪贴板。' : '全部方案明细已复制到剪贴板。', 'positive');
      } catch (error) {
        showExportFeedback(error?.message || '复制失败，请稍后重试。', 'negative');
      }
    }

    onMounted(() => {
      void loadDashboard().then((data) => {
        void loadWindowComparison(data);
      });
      window.addEventListener('resize', resizeCharts);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', resizeCharts);
      if (exportFeedbackTimer) {
        window.clearTimeout(exportFeedbackTimer);
      }
      if (comparisonFocusTimer) {
        window.clearTimeout(comparisonFocusTimer);
      }
      if (detailFocusTimer) {
        window.clearTimeout(detailFocusTimer);
      }
      historyChartHoverCleanup?.();
    });

    return {
      currentView,
      dashboard,
      history,
      issueWindows,
      historyWindows,
      issueWindow,
      historyWindow,
      dashboardLoading,
      historyLoading,
      dashboardError,
      historyError,
      comparisonCards,
      activeComparisonCard,
      probabilityFilters: probabilityFilterCards,
      activeProbabilityFilter,
      filteredRedProbabilityCards,
      comparisonLoading,
      comparisonError,
      comparisonFocusActive,
      comparisonBoardEl,
      detailFocusActive,
      detailSectionEl,
      exportMode,
      exportModes,
      exportFeedback,
      exportFeedbackTone,
      filteredHistory,
      activeHistoryInsight,
      activeHistoryInsightKey,
      effectiveHistoryDraw,
      effectiveHistoryIssue,
      hoveredHistoryIssue,
      lockedHistoryIssue,
      historyInsights,
      redProbabilityCards,
      selectedScheme,
      latestIssue,
      updatedAt,
      latestHistoryDraw,
      hotRedLabel,
      hotBlueLabel,
      historyTrendChartEl,
      redChartEl,
      trendChartEl,
      formatCurrency,
      formatNumber,
      switchView,
      loadDashboard,
      loadHistory,
      clearLockedHistoryIssue,
      toggleHistoryInsight,
      selectComparisonWindow,
      focusComparisonBoard,
      copySelectedScheme,
      copyAllSchemes,
      setSelectedScheme: (schemeId) => {
        selectedSchemeId.value = schemeId;
      }
    };
  },
  template: `
    <div class="app-shell">
      <div class="app-shell__backdrop"></div>
      <header class="app-header glass-panel">
        <div class="brand-lockup">
          <p>Prophecy</p>
          <span>双色球概率分析系统</span>
        </div>
        <nav class="top-nav">
          <button :class="{ active: currentView === 'prediction' }" @click="switchView('prediction')">概率预测</button>
          <button :class="{ active: currentView === 'history' }" @click="switchView('history')">历史数据</button>
        </nav>
        <div class="header-meta">
          <span>最新期号 {{ latestIssue }}</span>
          <span>更新于 {{ updatedAt }}</span>
        </div>
      </header>

      <main class="app-main">
        <section v-if="currentView === 'prediction'" class="page prediction-page">
          <div class="prediction-page__hero glass-panel">
            <div>
              <p class="section-eyebrow">Probability Desk</p>
              <h5>用官方开奖数据生成下一期结构化选号视图。</h5>
              <p class="hero-copy">
                {{ dashboard?.overview.headline || '正在连接福彩中心官网接口，加载近期开奖样本与预测方案。' }}
              </p>
            </div>
            <div class="prediction-page__actions">
              <span class="status-pill">官方接口</span>
              <div class="window-switcher">
                <button v-for="window in issueWindows" :key="window" :class="{ active: window === issueWindow }" @click="loadDashboard(window)">
                  {{ window }} 期样本
                </button>
              </div>
            </div>
          </div>

          <div v-if="dashboardError" class="feedback-panel error">{{ dashboardError }}</div>
          <div v-else-if="dashboardLoading && !dashboard" class="feedback-panel">正在分析概率曲线与近期开奖特征...</div>
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

            <section ref="comparisonBoardEl" class="comparison-board glass-panel" :class="{ 'comparison-board-focused': comparisonFocusActive }">
              <div class="comparison-board__head">
                <div>
                  <p class="section-eyebrow">Window Compare</p>
                  <h2>60 / 80 / 120 / 160 期对比</h2>
                  <div v-if="activeComparisonCard" class="comparison-board__current">
                    <span>当前分析窗口</span>
                    <strong>{{ activeComparisonCard.issueWindow }} 期</strong>
                    <em>{{ activeComparisonCard.leadingSchemeTitle }}</em>
                  </div>
                </div>
                <p>快速观察不同样本窗口下的领先方案、热号聚集和均值变化。</p>
              </div>
              <div v-if="comparisonError" class="feedback-panel error comparison-board__feedback">{{ comparisonError }}</div>
              <div v-else-if="comparisonLoading && !comparisonCards.length" class="feedback-panel comparison-board__feedback">正在汇总多窗口样本...</div>
              <div v-else class="comparison-grid">
                <button
                  v-for="item in comparisonCards"
                  :key="item.issueWindow"
                  class="comparison-card"
                  :class="{ active: item.issueWindow === issueWindow }"
                  @click="selectComparisonWindow(item.issueWindow)"
                >
                  <div class="comparison-card__topline">
                    <p>{{ item.issueWindow }} 期</p>
                    <div class="comparison-card__topmeta">
                      <span v-if="item.issueWindow === issueWindow" class="comparison-card__status">当前分析</span>
                      <span>最新 {{ item.latestIssue }}</span>
                    </div>
                  </div>
                  <strong>{{ item.leadingSchemeTitle }}</strong>
                  <div class="comparison-card__confidence">
                    <span>置信 {{ item.leadingSchemeConfidence }}%</span>
                    <span>蓝球 {{ item.topBlue }}</span>
                  </div>
                  <div class="comparison-card__numbers">{{ item.leadingSchemeNumbers }}</div>
                  <div class="comparison-card__meta">
                    <span>和值均值 {{ item.avgRedSum }}</span>
                    <span>销量均值 {{ formatCurrency(item.avgSales) }}</span>
                  </div>
                  <div class="comparison-card__hot">热号 {{ item.hotReds }}</div>
                  <div class="comparison-card__delta">
                    <p>{{ item.deltaTitle }}</p>
                    <div class="comparison-card__delta-row">
                      <span
                        v-for="chip in item.deltaNumberChips"
                        :key="item.issueWindow + '-number-' + chip.label"
                        class="comparison-chip"
                        :class="'tone-' + chip.tone"
                      >
                        {{ chip.label }}
                      </span>
                    </div>
                    <div class="comparison-card__delta-row">
                      <span
                        v-for="chip in item.deltaMetricChips"
                        :key="item.issueWindow + '-metric-' + chip.label"
                        class="comparison-chip"
                        :class="'tone-' + chip.tone"
                      >
                        {{ chip.label }}
                      </span>
                    </div>
                    <div class="comparison-card__delta-row">
                      <span
                        v-for="chip in item.deltaHotChips"
                        :key="item.issueWindow + '-hot-' + chip.label"
                        class="comparison-chip"
                        :class="'tone-' + chip.tone"
                      >
                        {{ chip.label }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </section>

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
                    @select="setSelectedScheme"
                  />
                </div>
              </aside>

              <section ref="detailSectionEl" class="analysis-layout__detail glass-panel" :class="{ 'detail-focused': detailFocusActive }" v-if="selectedScheme">
                <div class="detail-header">
                  <div>
                    <p class="section-eyebrow">Selected Scheme</p>
                    <h2>{{ selectedScheme.title }}</h2>
                  </div>
                  <div class="detail-actions">
                    <div class="export-mode-switcher">
                      <button
                        v-for="mode in exportModes"
                        :key="mode.value"
                        type="button"
                        :class="{ active: exportMode === mode.value }"
                        @click="exportMode = mode.value"
                      >
                        {{ mode.label }}
                      </button>
                    </div>
                    <span class="confidence-badge">置信 {{ selectedScheme.confidence }}%</span>
                    <button class="detail-nav-button" @click="focusComparisonBoard">返回窗口对比</button>
                    <button class="export-button secondary" @click="copyAllSchemes">复制全部方案</button>
                    <button class="export-button" @click="copySelectedScheme">复制导出</button>
                  </div>
                </div>
                <p class="detail-tone">{{ selectedScheme.tone }}</p>
                <p v-if="exportFeedback" class="export-feedback" :class="'tone-' + exportFeedbackTone">{{ exportFeedback }}</p>
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
                      <NumberBall v-for="number in dashboard.latestDraw.redNumbers" :key="'latest-' + number" :value="number" tone="neutral" size="sm" />
                      <NumberBall :value="dashboard.latestDraw.blueNumber" tone="blue" size="sm" />
                    </div>
                    <p class="mini-copy">{{ dashboard.latestDraw.summary }}</p>
                  </div>
                </div>
              </section>
            </div>

            <div class="chart-grid">
              <section class="chart-panel">
                <div class="chart-panel__head">
                  <div>
                    <p class="chart-panel__eyebrow">实时观察</p>
                    <h3>红球相对概率</h3>
                  </div>
                  <p>综合色率、近 12 期活跃度与遗漏跨度的加权结果。</p>
                </div>
                <div ref="redChartEl" class="chart-canvas"></div>
                <div class="probability-filter-row" v-if="probabilityFilters.length">
                  <button
                    v-for="filter in probabilityFilters"
                    :key="'probability-filter-' + filter.value"
                    type="button"
                    class="probability-filter-chip"
                    :class="{ active: activeProbabilityFilter === filter.value }"
                    @click="activeProbabilityFilter = filter.value"
                  >
                    {{ filter.label }} {{ filter.count }}
                  </button>
                </div>
                <div class="probability-grid" v-if="filteredRedProbabilityCards.length">
                  <article
                    v-for="item in filteredRedProbabilityCards"
                    :key="'probability-' + item.number"
                    class="probability-card"
                    :class="'tone-' + item.label"
                  >
                    <div class="probability-card__topline">
                      <span>#{{ item.rank }}</span>
                      <strong>{{ item.formattedNumber }}</strong>
                    </div>
                    <p>{{ item.formattedProbability }}</p>
                  </article>
                </div>
              </section>
              <section class="chart-panel">
                <div class="chart-panel__head">
                  <div>
                    <p class="chart-panel__eyebrow">实时观察</p>
                    <h3>近期结构波动</h3>
                  </div>
                  <p>观察和值与跨度共振，识别走势是否持续偏热。</p>
                </div>
                <div ref="trendChartEl" class="chart-canvas"></div>
              </section>
            </div>
          </template>
        </section>

        <section v-else class="page history-page">
          <div class="history-page__hero glass-panel">
            <div>
              <p class="section-eyebrow">Archive</p>
              <h1>回看往期开奖，校准你对趋势和结构的判断。</h1>
              <p class="history-copy">所有记录均来自福彩中心官网接口，适合快速核对近期走势、销量与奖池变化。</p>
            </div>
            <div class="history-page__actions">
              <div class="window-switcher">
                <button v-for="window in historyWindows" :key="window" :class="{ active: window === historyWindow }" @click="loadHistory(window)">
                  最近 {{ window }} 期
                </button>
              </div>
            </div>
          </div>

          <div class="history-summary-grid">
            <article class="glass-panel history-summary-card">
              <p>当前载入</p>
              <strong>{{ history.length || historyWindow }} 期</strong>
              <span>便于快速检索与核对开奖号。</span>
            </article>
            <article class="glass-panel history-summary-card" v-if="latestHistoryDraw">
              <p>最新开奖</p>
              <strong>{{ latestHistoryDraw.issue }}</strong>
              <div class="latest-balls">
                <NumberBall v-for="number in latestHistoryDraw.redNumbers" :key="'history-' + number" :value="number" tone="red" size="sm" />
                <NumberBall :value="latestHistoryDraw.blueNumber" tone="blue" size="sm" />
              </div>
            </article>
            <article class="glass-panel history-summary-card" v-if="dashboard">
              <p>热号参考</p>
              <strong>{{ hotRedLabel }}</strong>
              <span>蓝球高热 {{ hotBlueLabel }}</span>
            </article>
          </div>

          <section v-if="historyInsights?.length" class="history-insight-grid">
            <button
              v-for="item in historyInsights"
              :key="item.key"
              class="glass-panel history-insight-card"
              :class="{ active: activeHistoryInsightKey === item.key }"
              @click="toggleHistoryInsight(item.key)"
            >
              <p>{{ item.title }}</p>
              <strong>{{ item.value }}</strong>
              <span>{{ item.detail }}</span>
              <em>{{ item.filterHint }}</em>
            </button>
          </section>

          <section class="chart-panel history-chart-panel" v-if="history.length">
            <div class="chart-panel__head">
              <div>
                <p class="chart-panel__eyebrow">Archive Trend</p>
                <h3>历史结构趋势</h3>
              </div>
              <p>用最近载入期次观察红球和值与蓝球号码的同步波动。</p>
            </div>
            <div ref="historyTrendChartEl" class="chart-canvas"></div>
            <div v-if="effectiveHistoryDraw" class="history-hover-status" :class="{ locked: !!lockedHistoryIssue }">
              <span>{{ lockedHistoryIssue ? '已锁定' : '图表焦点' }} {{ effectiveHistoryDraw.issue }}</span>
              <strong>蓝球 {{ formatNumber(effectiveHistoryDraw.blueNumber) }}</strong>
              <em>{{ effectiveHistoryDraw.summary }}</em>
              <button v-if="lockedHistoryIssue" type="button" class="detail-nav-button" @click="clearLockedHistoryIssue">解除锁定</button>
            </div>
          </section>

          <div v-if="activeHistoryInsight" class="history-filter-status glass-panel">
            <p>当前筛选</p>
            <strong>{{ activeHistoryInsight.title }}</strong>
            <span>{{ activeHistoryInsight.filterHint }}</span>
            <button type="button" class="detail-nav-button" @click="activeHistoryInsightKey = ''">查看全部</button>
          </div>

          <div v-if="historyError" class="feedback-panel error">{{ historyError }}</div>
          <div v-else-if="historyLoading && !history.length" class="feedback-panel">正在拉取官方开奖档案...</div>
          <div v-else class="history-table-wrap">
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
                <tr
                  v-for="draw in filteredHistory"
                  :key="draw.issue"
                  :class="{
                    'chart-linked': effectiveHistoryIssue === draw.issue,
                    'chart-linked-locked': lockedHistoryIssue === draw.issue
                  }"
                >
                  <td class="issue">{{ draw.issue }}</td>
                  <td>{{ draw.drawDate }}</td>
                  <td>
                    <div class="history-table__balls">
                      <NumberBall v-for="number in draw.redNumbers" :key="draw.issue + '-' + number" :value="number" tone="red" size="sm" />
                    </div>
                  </td>
                  <td>
                    <NumberBall :value="draw.blueNumber" tone="blue" size="sm" />
                  </td>
                  <td>{{ formatCurrency(draw.sales) }}</td>
                  <td>{{ formatCurrency(draw.poolMoney) }}</td>
                  <td><a :href="draw.detailUrl" target="_blank" rel="noreferrer">{{ draw.summary }}</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  `
}).mount('#app');
