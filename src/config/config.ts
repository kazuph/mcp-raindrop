import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Removed logging of environment variables for local development

const configSchema = z.object({
  port: z.preprocess((val) => Number(val), z.number().default(3000)),
  transportType: z.enum(['stdio', 'sse']).default('stdio'),
  raindropAccessToken: z.string({
    required_error: 'RAINDROP_ACCESS_TOKEN is required',
  }),
  rateLimitWindowMs: z.preprocess((val) => Number(val), z.number().default(60000)),
  rateLimitMaxRequests: z.preprocess((val) => Number(val), z.number().default(120)),
});

const config = configSchema.parse({
  port: process.env.PORT,
  transportType: process.env.TRANSPORT_TYPE || 'stdio',
  raindropAccessToken: process.env.RAINDROP_ACCESS_TOKEN,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
});

export default config;