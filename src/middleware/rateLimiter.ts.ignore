import type { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Hardcoded defaults previously from config
const rateLimiter = new RateLimiterMemory({
  points: 120, // Default: config.rateLimitMaxRequests,
  duration: 60, // Default: config.rateLimitWindowMs / 1000, // convert to seconds
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use a fallback key if req.ip is undefined
    const key = req.ip ?? 'unknown_ip';
    await rateLimiter.consume(key); // consume 1 point per request
    next();
  } catch (rejRes) {
    res.status(429).send('Too Many Requests');
  }
};
