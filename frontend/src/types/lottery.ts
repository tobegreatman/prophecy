export interface PrizeGrade {
  type: number;
  typenum: string;
  typemoney: string;
}

export interface LotteryDraw {
  issue: string;
  drawDate: string;
  week: string;
  redNumbers: number[];
  blueNumber: number;
  sales: number;
  poolMoney: number;
  summary: string;
  detailUrl: string;
  prizeGrades: PrizeGrade[];
}

export interface NumberInsight {
  number: number;
  hits: number;
  recentHits: number;
  missSpan: number;
  score: number;
  relativeProbability: number;
  label: 'hot' | 'warm' | 'cold';
}

export interface PredictionScheme {
  id: string;
  title: string;
  tone: string;
  confidence: number;
  redNumbers: number[];
  blueNumber: number;
  reasons: string[];
  metrics: {
    sum: number;
    span: number;
    oddEvenRatio: string;
    zoneRatio: string;
    hotCount: number;
    coldCount: number;
  };
}

export interface DashboardData {
  updatedAt: string;
  latestDraw: LotteryDraw;
  overview: {
    sampleSize: number;
    avgRedSum: number;
    avgSales: number;
    poolMoney: number;
    headline: string;
  };
  stats: {
    redNumbers: NumberInsight[];
    blueNumbers: NumberInsight[];
    hotReds: NumberInsight[];
    coldReds: NumberInsight[];
    hotBlues: NumberInsight[];
    patterns: {
      trendSeries: Array<{
        issue: string;
        redSum: number;
        blue: number;
        oddCount: number;
        span: number;
      }>;
      oddEvenDistribution: Record<string, number>;
      zoneDistribution: Record<string, number>;
    };
  };
  schemes: PredictionScheme[];
  history: LotteryDraw[];
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}
