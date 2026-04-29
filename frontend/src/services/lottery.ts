import { http, unwrapResponse } from './http';
import type { DashboardData, LotteryDraw } from '../types/lottery';

export function fetchDashboard(issueCount: number) {
  return unwrapResponse<DashboardData>(
    http.get('/api/ssq/dashboard', {
      params: { issueCount }
    })
  );
}

export function fetchHistory(issueCount: number) {
  return unwrapResponse<LotteryDraw[]>(
    http.get('/api/ssq/history', {
      params: { issueCount }
    })
  );
}
