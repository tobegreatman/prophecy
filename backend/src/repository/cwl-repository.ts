import axios from 'axios';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { LotteryDraw, RawDrawNotice } from '../types/lottery.js';
import { HttpError } from '../utils/http-error.js';

const drawNoticeSchema = z.object({
  state: z.number(),
  message: z.string(),
  result: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      detailsLink: z.string(),
      date: z.string(),
      week: z.string(),
      red: z.string(),
      blue: z.string(),
      sales: z.string(),
      poolmoney: z.string(),
      content: z.string(),
      prizegrades: z.array(
        z.object({
          type: z.number(),
          typenum: z.string(),
          typemoney: z.string()
        })
      )
    })
  )
});

const client = axios.create({
  baseURL: env.CWL_BASE_URL,
  timeout: 10000,
  headers: {
    'User-Agent': 'prophecy-lottery-dashboard/1.0'
  }
});

function toNumberList(value: string) {
  return value
    .split(',')
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

function normalizeDraw(item: RawDrawNotice): LotteryDraw {
  return {
    issue: item.code,
    drawDate: item.date,
    week: item.week,
    redNumbers: toNumberList(item.red).sort((left, right) => left - right),
    blueNumber: Number.parseInt(item.blue, 10),
    sales: Number.parseInt(item.sales, 10),
    poolMoney: Number.parseInt(item.poolmoney, 10),
    summary: item.content,
    detailUrl: new URL(item.detailsLink, 'https://www.cwl.gov.cn').toString(),
    prizeGrades: item.prizegrades
  };
}

export async function fetchDrawNotices(issueCount: number) {
  try {
    const response = await client.get('/front/cwlkj/search/kjxx/findDrawNotice', {
      params: {
        name: 'ssq',
        issueCount
      }
    });

    const parsed = drawNoticeSchema.parse(response.data);
    return parsed.result.map((item) => normalizeDraw(item));
  } catch (error) {
    throw new HttpError(502, 50201, 'failed to fetch official lottery data');
  }
}
