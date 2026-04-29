import Router from '@koa/router';

import { getDashboardController, getHealth, getHistoryController } from '../controller/lottery-controller.js';

export function createRouter() {
  const router = new Router();

  router.get('/api/health', getHealth);
  router.get('/api/ssq/dashboard', getDashboardController);
  router.get('/api/ssq/history', getHistoryController);

  return router;
}
