import { z } from 'zod';

const configSchema = z.object({
  raindropAccessToken: z.string({
    required_error: 'RAINDROP_ACCESS_TOKEN is required',
  }),
});

const config = configSchema.parse({
  raindropAccessToken: process.env.RAINDROP_ACCESS_TOKEN,
});

export default config;