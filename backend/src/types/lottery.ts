export interface RawPrizeGrade {
  type: number;
  typenum: string;
  typemoney: string;
}

export interface RawDrawNotice {
  name: string;
  code: string;
  detailsLink: string;
  date: string;
  week: string;
  red: string;
  blue: string;
  sales: string;
  poolmoney: string;
  content: string;
  prizegrades: RawPrizeGrade[];
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
  prizeGrades: RawPrizeGrade[];
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
