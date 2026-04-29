import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CWL_BASE_URL: z.string().url().default('https://www.cwl.gov.cn/cwl_admin'),
  FRONTEND_DIST: z.string().default('../frontend')
});

export const env = envSchema.parse(process.env);
