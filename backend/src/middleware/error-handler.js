import { ZodError } from 'zod';

import { HttpError } from '../utils/http-error.js';

export async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof HttpError) {
      ctx.status = error.status;
      ctx.body = {
        code: error.code,
        message: error.message,
        data: null,
        requestId: ctx.state.requestId
      };
      return;
    }

    if (error instanceof ZodError) {
      ctx.status = 400;
      ctx.body = {
        code: 40001,
        message: error.issues.map((issue) => issue.message).join('; '),
        data: null,
        requestId: ctx.state.requestId
      };
      return;
    }

    ctx.app.emit('error', error, ctx);
    ctx.status = 500;
    ctx.body = {
      code: 50000,
      message: 'internal server error',
      data: null,
      requestId: ctx.state.requestId
    };
  }
}
