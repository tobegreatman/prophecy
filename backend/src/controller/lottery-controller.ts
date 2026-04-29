import type { Context } from 'koa';

import { getDashboard, getHistory } from '../service/lottery-service.js';
import { historyQuerySchema, issueCountQuerySchema } from '../validators/query.js';

export async function getHealth(ctx: Context) {
  ctx.body = {
    code: 0,
    message: 'ok',
    data: {
      status: 'healthy',
      now: new Date().toISOString()
    },
    requestId: ctx.state.requestId
  };
}

export async function getDashboardController(ctx: Context) {
  const query = issueCountQuerySchema.parse(ctx.query);
  const data = await getDashboard(query.issueCount);
  ctx.body = {
    code: 0,
    message: 'ok',
    data,
    requestId: ctx.state.requestId
  };
}

export async function getHistoryController(ctx: Context) {
  const query = historyQuerySchema.parse(ctx.query);
  const data = await getHistory(query.issueCount);
  ctx.body = {
    code: 0,
    message: 'ok',
    data,
    requestId: ctx.state.requestId
  };
}
