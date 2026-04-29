import { z } from 'zod';

export const issueCountQuerySchema = z.object({
  issueCount: z.coerce.number().int().min(20).max(200).default(80)
});

export const historyQuerySchema = z.object({
  issueCount: z.coerce.number().int().min(10).max(120).default(30)
});
