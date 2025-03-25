import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3000),
  transportType: z.enum(['stdio', 'sse']).default('stdio'), // Add transport type
 
  raindropAccessToken: z.string({
    required_error: 'RAINDROP_ACCESS_TOKEN is required',
  }),
  rateLimitWindowMs: z.number().default(60000),
  rateLimitMaxRequests: z.number().default(120),
});

const config = configSchema.parse({
  port: Number(process.env.PORT),
  transportType: process.env.TRANSPORT_TYPE || 'stdio', // Read from environment
  raindropAccessToken: process.env.RAINDROP_ACCESS_TOKEN,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS),
});

export default config;