import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import axios from 'axios';
import { z } from 'zod';

import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 60 * 1000;
const SHARED_FETCH_COUNT = 160;
const FALLBACK_DATA_DIRECTORY_URL = new URL('../../data/', import.meta.url);
const FALLBACK_DATA_URL = new URL('../../data/cwl-ssq-fallback.json', import.meta.url);
const drawNoticeCache = new Map();
const drawNoticeInflight = new Map();
let fallbackDrawsPromise = null;
const OFFICIAL_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/javascript, */*; q=0.01',
  Referer: 'https://www.cwl.gov.cn/ygkj/wqkjgg/ssq/',
  Origin: 'https://www.cwl.gov.cn',
  'X-Requested-With': 'XMLHttpRequest'
};

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
  headers: OFFICIAL_HEADERS
});

async function fetchByPowerShell(issueCount) {
  const endpoint = `${env.CWL_BASE_URL}/front/cwlkj/search/kjxx/findDrawNotice?name=ssq&issueCount=${issueCount}`;
  const command = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$OutputEncoding = [System.Text.Encoding]::UTF8',
    "$headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'; 'Accept' = 'application/json, text/javascript, */*; q=0.01'; 'Referer' = 'https://www.cwl.gov.cn/ygkj/wqkjgg/ssq/'; 'Origin' = 'https://www.cwl.gov.cn'; 'X-Requested-With' = 'XMLHttpRequest' }",
    `Invoke-RestMethod -Uri '${endpoint}' -Headers $headers | ConvertTo-Json -Depth 10 -Compress`
  ].join('; ');
  const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', command], {
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024
  });

  return JSON.parse(stdout);
}

async function requestOfficialData(issueCount) {
  try {
    const response = await client.get('/front/cwlkj/search/kjxx/findDrawNotice', {
      params: {
        name: 'ssq',
        issueCount
      }
    });

    return response.data;
  } catch (error) {
    if (process.platform === 'win32') {
      try {
        return await fetchByPowerShell(issueCount);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

function toNumberList(value) {
  return value
    .split(',')
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

function normalizeDraw(item) {
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

function getCachedDraws(issueCount) {
  const now = Date.now();
  const candidates = [...drawNoticeCache.entries()]
    .filter(([cachedIssueCount, cached]) => cachedIssueCount >= issueCount && now - cached.cachedAt < CACHE_TTL_MS)
    .sort((left, right) => left[0] - right[0]);

  return candidates[0]?.[1] ?? null;
}

function getStaleCachedDraws(issueCount) {
  const candidates = [...drawNoticeCache.entries()]
    .filter(([cachedIssueCount]) => cachedIssueCount >= issueCount)
    .sort((left, right) => left[0] - right[0]);

  return candidates[0]?.[1] ?? null;
}

function setCachedDraws(issueCount, draws) {
  drawNoticeCache.set(issueCount, {
    draws,
    cachedAt: Date.now()
  });
}

async function getFallbackDraws() {
  if (!fallbackDrawsPromise) {
    fallbackDrawsPromise = readFile(FALLBACK_DATA_URL, 'utf8')
      .then((content) => {
        const payload = JSON.parse(content);
        const parsed = drawNoticeSchema.parse(payload);
        return parsed.result.map((item) => normalizeDraw(item));
      })
      .catch(() => null);
  }

  return fallbackDrawsPromise;
}

async function persistFallbackPayload(payload, draws) {
  fallbackDrawsPromise = Promise.resolve(draws);

  try {
    await mkdir(FALLBACK_DATA_DIRECTORY_URL, { recursive: true });
    await writeFile(FALLBACK_DATA_URL, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch {
    // Ignore snapshot persistence failures and continue serving live data.
  }
}

function resolveFetchIssueCount(issueCount) {
  if (issueCount <= SHARED_FETCH_COUNT) {
    return SHARED_FETCH_COUNT;
  }

  return issueCount;
}

async function fetchAndCacheDraws(issueCount) {
  const inflightRequest = drawNoticeInflight.get(issueCount);
  if (inflightRequest) {
    return inflightRequest;
  }

  const request = (async () => {
    const payload = await requestOfficialData(issueCount);
    const parsed = drawNoticeSchema.parse(payload);
    const draws = parsed.result.map((item) => normalizeDraw(item));
    setCachedDraws(issueCount, draws);
    await persistFallbackPayload(payload, draws);
    return draws;
  })();

  drawNoticeInflight.set(issueCount, request);

  try {
    return await request;
  } finally {
    drawNoticeInflight.delete(issueCount);
  }
}

export async function fetchDrawNotices(issueCount) {
  const cached = getCachedDraws(issueCount);
  if (cached) {
    return cached.draws.slice(0, issueCount);
  }

  const fetchIssueCount = resolveFetchIssueCount(issueCount);

  try {
    const draws = await fetchAndCacheDraws(fetchIssueCount);
    return draws.slice(0, issueCount);
  } catch {
    const staleCached = getStaleCachedDraws(issueCount);
    if (staleCached) {
      return staleCached.draws.slice(0, issueCount);
    }

    const fallbackDraws = await getFallbackDraws();
    if (fallbackDraws?.length) {
      setCachedDraws(fallbackDraws.length, fallbackDraws);
      return fallbackDraws.slice(0, issueCount);
    }

    throw new HttpError(502, 50201, 'failed to fetch official lottery data');
  }
}
