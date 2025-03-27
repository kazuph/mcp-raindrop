import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Removed logging of environment variables for local development

const configSchema = z.object({
  // port: z.preprocess((val) => Number(val), z.number().default(3000)), // Removed
  // transportType: z.enum(['stdio', 'sse']).default('stdio'), // Removed
  raindropAccessToken: z.string({
    required_error: 'RAINDROP_ACCESS_TOKEN is required',
  }),
  // rateLimitWindowMs: z.preprocess((val) => Number(val), z.number().default(60000)), // Removed
  // rateLimitMaxRequests: z.preprocess((val) => Number(val), z.number().default(120)), // Removed
});

const config = configSchema.parse({
  // port: process.env.PORT, // Removed
  // transportType: process.env.TRANSPORT_TYPE || 'stdio', // Removed
  raindropAccessToken: process.env.RAINDROP_ACCESS_TOKEN,
  // rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS, // Removed
  // rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS, // Removed
});

export default config;