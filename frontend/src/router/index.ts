import { createRouter, createWebHistory } from 'vue-router';

import HistoryPage from '../pages/HistoryPage.vue';
import PredictionPage from '../pages/PredictionPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/prediction'
    },
    {
      path: '/prediction',
      component: PredictionPage
    },
    {
      path: '/history',
      component: HistoryPage
    }
  ]
});
