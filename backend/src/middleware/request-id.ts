import { randomUUID } from 'node:crypto';

import type { Context, Next } from 'koa';

export async function requestId(ctx: Context, next: Next) {
  const id = ctx.get('x-request-id') || randomUUID();
  ctx.state.requestId = id;
  ctx.set('x-request-id', id);
  await next();
}
