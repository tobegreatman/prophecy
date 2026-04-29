import { defineStore } from 'pinia';

import { fetchDashboard, fetchHistory } from '../services/lottery';
import type { DashboardData, LotteryDraw, PredictionScheme } from '../types/lottery';

interface LotteryState {
  dashboard: DashboardData | null;
  history: LotteryDraw[];
  selectedSchemeId: string | null;
  issueWindow: number;
  historyWindow: number;
  dashboardLoading: boolean;
  historyLoading: boolean;
  dashboardError: string | null;
  historyError: string | null;
}

export const useLotteryStore = defineStore('lottery', {
  state: (): LotteryState => ({
    dashboard: null,
    history: [],
    selectedSchemeId: null,
    issueWindow: 80,
    historyWindow: 30,
    dashboardLoading: false,
    historyLoading: false,
    dashboardError: null,
    historyError: null
  }),
  getters: {
    selectedScheme(state): PredictionScheme | null {
      if (!state.dashboard) {
        return null;
      }
      return (
        state.dashboard.schemes.find((scheme) => scheme.id === state.selectedSchemeId) ??
        state.dashboard.schemes[0] ??
        null
      );
    }
  },
  actions: {
    async loadDashboard(issueCount = this.issueWindow) {
      this.dashboardLoading = true;
      this.dashboardError = null;
      this.issueWindow = issueCount;
      try {
        const data = await fetchDashboard(issueCount);
        this.dashboard = data;
        const hasSelected = data.schemes.some((scheme) => scheme.id === this.selectedSchemeId);
        this.selectedSchemeId = hasSelected ? this.selectedSchemeId : data.schemes[0]?.id ?? null;
      } catch (error) {
        this.dashboardError = error instanceof Error ? error.message : '获取预测失败';
      } finally {
        this.dashboardLoading = false;
      }
    },
    async loadHistory(issueCount = this.historyWindow) {
      this.historyLoading = true;
      this.historyError = null;
      this.historyWindow = issueCount;
      try {
        this.history = await fetchHistory(issueCount);
      } catch (error) {
        this.historyError = error instanceof Error ? error.message : '获取历史数据失败';
      } finally {
        this.historyLoading = false;
      }
    },
    selectScheme(schemeId: string) {
      this.selectedSchemeId = schemeId;
    }
  }
});
