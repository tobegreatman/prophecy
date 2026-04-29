import { randomUUID } from 'node:crypto';

export async function requestId(ctx, next) {
  const id = ctx.get('x-request-id') || randomUUID();
  ctx.state.requestId = id;
  ctx.set('x-request-id', id);
  await next();
}
