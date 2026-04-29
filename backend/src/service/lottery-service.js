import { fetchDrawNotices } from '../repository/cwl-repository.js';

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function buildNumberInsights(draws, scope) {
  const maxNumber = scope === 'red' ? 33 : 16;
  const recentWindow = Math.min(scope === 'red' ? 12 : 8, draws.length);
  const counters = Array.from({ length: maxNumber }, (_, index) => ({
    number: index + 1,
    hits: 0,
    recentHits: 0,
    lastSeenIndex: draws.length
  }));

  draws.forEach((draw, drawIndex) => {
    const selectedNumbers = scope === 'red' ? draw.redNumbers : [draw.blueNumber];
    selectedNumbers.forEach((value) => {
      const bucket = counters[value - 1];
      bucket.hits += 1;
      if (drawIndex < recentWindow) {
        bucket.recentHits += 1;
      }
      bucket.lastSeenIndex = Math.min(bucket.lastSeenIndex, drawIndex);
    });
  });

  const rawScores = counters.map((bucket) => {
    const hitScore = bucket.hits / Math.max(draws.length, 1);
    const recentScore = bucket.recentHits / Math.max(recentWindow, 1);
    const missScore = 1 - Math.min(bucket.lastSeenIndex, draws.length) / Math.max(draws.length, 1);
    return hitScore * 0.55 + recentScore * 0.2 + missScore * 0.25;
  });

  const minScore = Math.min(...rawScores);
  const maxScore = Math.max(...rawScores);

  return counters.map((bucket, index) => {
    const score = rawScores[index];
    const normalizedScore = maxScore === minScore ? 0.5 : (score - minScore) / (maxScore - minScore);
    const relativeProbability = round(35 + normalizedScore * 65, 1);
    let label = 'warm';
    if (normalizedScore >= 0.66) {
      label = 'hot';
    } else if (normalizedScore <= 0.33) {
      label = 'cold';
    }

    return {
      number: bucket.number,
      hits: bucket.hits,
      recentHits: bucket.recentHits,
      missSpan: bucket.lastSeenIndex,
      score: round(score, 4),
      relativeProbability,
      label
    };
  });
}

function chunkByZone(numbers) {
  const zones = [0, 0, 0];
  numbers.forEach((number) => {
    if (number <= 11) {
      zones[0] += 1;
    } else if (number <= 22) {
      zones[1] += 1;
    } else {
      zones[2] += 1;
    }
  });
  return zones.join(':');
}

function createMetrics(redNumbers, blueNumber, redInsights) {
  const hotLookup = new Set(redInsights.filter((item) => item.label === 'hot').map((item) => item.number));
  const coldLookup = new Set(redInsights.filter((item) => item.label === 'cold').map((item) => item.number));
  const oddCount = redNumbers.filter((number) => number % 2 === 1).length;
  return {
    sum: redNumbers.reduce((total, number) => total + number, 0) + blueNumber,
    span: redNumbers[redNumbers.length - 1] - redNumbers[0],
    oddEvenRatio: `${oddCount}:${redNumbers.length - oddCount}`,
    zoneRatio: chunkByZone(redNumbers),
    hotCount: redNumbers.filter((number) => hotLookup.has(number)).length,
    coldCount: redNumbers.filter((number) => coldLookup.has(number)).length
  };
}

function pickBalancedNumbers(orderedPool, size, existing = [], preferredZoneOrder = [0, 1, 2]) {
  const selected = [...existing];
  const zoneLimits = [2, 2, 2];

  const zoneIndexFor = (value) => {
    if (value <= 11) {
      return 0;
    }
    if (value <= 22) {
      return 1;
    }
    return 2;
  };

  const counts = [0, 0, 0];
  selected.forEach((value) => {
    counts[zoneIndexFor(value)] += 1;
  });

  for (const zone of preferredZoneOrder) {
    const zoneItems = orderedPool.filter((item) => zoneIndexFor(item.number) === zone);
    for (const candidate of zoneItems) {
      if (selected.length >= size) {
        break;
      }
      if (selected.includes(candidate.number)) {
        continue;
      }
      const nextOddCount = [...selected, candidate.number].filter((number) => number % 2 === 1).length;
      const nextEvenCount = selected.length + 1 - nextOddCount;
      if (counts[zone] >= zoneLimits[zone]) {
        continue;
      }
      if (nextOddCount > 4 || nextEvenCount > 4) {
        continue;
      }
      selected.push(candidate.number);
      counts[zone] += 1;
    }
  }

  for (const candidate of orderedPool) {
    if (selected.length >= size) {
      break;
    }
    if (!selected.includes(candidate.number)) {
      selected.push(candidate.number);
    }
  }

  return selected.sort((left, right) => left - right);
}

function createSchemes(redInsights, blueInsights) {
  const hotReds = redInsights.filter((item) => item.label === 'hot').sort((left, right) => right.score - left.score);
  const warmReds = redInsights.filter((item) => item.label === 'warm').sort((left, right) => right.score - left.score);
  const coldReds = redInsights
    .filter((item) => item.label === 'cold')
    .sort((left, right) => right.missSpan - left.missSpan || right.score - left.score);
  const hotBlues = [...blueInsights].sort((left, right) => right.score - left.score);

  const momentumReds = pickBalancedNumbers([...hotReds, ...warmReds], 6);
  const balancedReds = pickBalancedNumbers([...warmReds, ...hotReds, ...coldReds], 6, [8, 15, 24]);
  const reboundReds = pickBalancedNumbers([...coldReds, ...warmReds, ...hotReds], 6, [], [2, 0, 1]);

  return [
    {
      id: 'momentum-wave',
      title: '热号延续',
      tone: '跟随最近 12 期的活跃号，偏向延续强势分布。',
      confidence: 74,
      redNumbers: momentumReds,
      blueNumber: hotBlues[0]?.number ?? 8,
      reasons: [
        '红球优先选择近期命中率和出现频率同时靠前的号码。',
        '三区保持均衡，避免热号扎堆在同一段位。',
        '蓝球使用近 8 期最强势号码，适合作为进攻型方案。'
      ],
      metrics: createMetrics(momentumReds, hotBlues[0]?.number ?? 8, redInsights)
    },
    {
      id: 'balanced-grid',
      title: '均衡回归',
      tone: '控制奇偶、跨度与三区比，追求稳定结构。',
      confidence: 69,
      redNumbers: balancedReds,
      blueNumber: hotBlues[2]?.number ?? hotBlues[0]?.number ?? 6,
      reasons: [
        '红球以温号为主轴，配少量热号维持上限。',
        '方案约束在 2:2:2 的三区分布，结构更稳。',
        '适合与热号方案组合，降低单一趋势失效风险。'
      ],
      metrics: createMetrics(balancedReds, hotBlues[2]?.number ?? hotBlues[0]?.number ?? 6, redInsights)
    },
    {
      id: 'cold-rebound',
      title: '冷号反弹',
      tone: '拉入长遗漏号，博弈回补窗口。',
      confidence: 63,
      redNumbers: reboundReds,
      blueNumber: hotBlues[hotBlues.length - 1]?.number ?? 12,
      reasons: [
        '优先使用遗漏跨度较长但历史基线不差的号码。',
        '保留少量温号作为锚点，避免全冷组合波动过大。',
        '更适合小比例配置，不建议单独重仓。'
      ],
      metrics: createMetrics(reboundReds, hotBlues[hotBlues.length - 1]?.number ?? 12, redInsights)
    }
  ];
}

function buildPatternSnapshot(draws) {
  const trendSeries = draws
    .slice(0, 18)
    .map((draw) => {
      const redSum = draw.redNumbers.reduce((total, number) => total + number, 0);
      const oddCount = draw.redNumbers.filter((number) => number % 2 === 1).length;
      return {
        issue: draw.issue,
        redSum,
        blue: draw.blueNumber,
        oddCount,
        span: draw.redNumbers[draw.redNumbers.length - 1] - draw.redNumbers[0]
      };
    })
    .reverse();

  const oddEvenDistribution = draws.reduce((result, draw) => {
    const oddCount = draw.redNumbers.filter((number) => number % 2 === 1).length;
    const key = `${oddCount}:${draw.redNumbers.length - oddCount}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

  const zoneDistribution = draws.reduce((result, draw) => {
    const key = chunkByZone(draw.redNumbers);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

  return {
    trendSeries,
    oddEvenDistribution,
    zoneDistribution
  };
}

export async function getHistory(issueCount) {
  return fetchDrawNotices(issueCount);
}

export async function getDashboard(issueCount) {
  const history = await fetchDrawNotices(issueCount);
  const redInsights = buildNumberInsights(history, 'red');
  const blueInsights = buildNumberInsights(history, 'blue');
  const latestDraw = history[0];
  const hotReds = [...redInsights].sort((left, right) => right.score - left.score).slice(0, 6);
  const coldReds = [...redInsights].sort((left, right) => right.missSpan - left.missSpan).slice(0, 6);
  const hotBlues = [...blueInsights].sort((left, right) => right.score - left.score).slice(0, 4);
  const avgRedSum = round(
    history.reduce((total, draw) => total + draw.redNumbers.reduce((sum, number) => sum + number, 0), 0) /
      Math.max(history.length, 1),
    1
  );
  const avgSales = Math.round(history.reduce((total, draw) => total + draw.sales, 0) / Math.max(history.length, 1));
  const schemes = createSchemes(redInsights, blueInsights);

  return {
    updatedAt: new Date().toISOString(),
    latestDraw,
    overview: {
      sampleSize: history.length,
      avgRedSum,
      avgSales,
      poolMoney: latestDraw.poolMoney,
      headline: `基于最近 ${history.length} 期官方开奖数据生成的结构化预测。`
    },
    stats: {
      redNumbers: redInsights,
      blueNumbers: blueInsights,
      hotReds,
      coldReds,
      hotBlues,
      patterns: buildPatternSnapshot(history)
    },
    schemes,
    history: history.slice(0, 24)
  };
}
