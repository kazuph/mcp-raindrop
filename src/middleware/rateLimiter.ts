import { RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config/config';

const rateLimiter = new RateLimiterMemory({
  points: config.rateLimitMaxRequests,
  duration: config.rateLimitWindowMs / 1000, // convert to seconds
});

export class RateLimiterService {
  async consume(identifier: string): Promise<boolean> {
    try {
      await rateLimiter.consume(identifier || '0.0.0.0');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const rateLimiterService = new RateLimiterService();