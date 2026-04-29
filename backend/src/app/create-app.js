import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import pino from 'pino';

import { env } from '../config/env.js';
import { errorHandler } from '../middleware/error-handler.js';
import { requestId } from '../middleware/request-id.js';
import { createRouter } from '../router/index.js';

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info'
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, '../..');
const defaultFrontendDist = path.resolve(packageRoot, env.FRONTEND_DIST);

export function createApp() {
  const app = new Koa();
  const router = createRouter();
  const frontendDist = path.resolve(defaultFrontendDist);

  app.on('error', (error, ctx) => {
    logger.error({ error, requestId: ctx.state.requestId }, 'request failed');
  });

  app.use(errorHandler);
  app.use(requestId);
  app.use(
    cors({
      origin: '*'
    })
  );
  app.use(bodyParser());
  app.use(async (ctx, next) => {
    const startAt = Date.now();
    await next();
    logger.info(
      {
        requestId: ctx.state.requestId,
        method: ctx.method,
        path: ctx.path,
        status: ctx.status,
        duration: Date.now() - startAt
      },
      'request completed'
    );
  });
  app.use(router.routes());
  app.use(router.allowedMethods());

  if (fs.existsSync(frontendDist)) {
    app.use(serve(frontendDist));
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api')) {
        await next();
        return;
      }

      ctx.type = 'html';
      ctx.body = fs.createReadStream(path.join(frontendDist, 'index.html'));
    });
  }

  return app;
}
