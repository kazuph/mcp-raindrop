<<<<<<< HEAD
=======
import type{ Request, Response, NextFunction } from 'express';
>>>>>>> fb3f079 (Initial commit of Raindrop MCP server project)
import { RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config/config';

const rateLimiter = new RateLimiterMemory({
  points: config.rateLimitMaxRequests,
  duration: config.rateLimitWindowMs / 1000, // convert to seconds
});

<<<<<<< HEAD
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
=======
export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await rateLimiter.consume(req.ip ?? '0.0.0.0');
    next();
  } catch (error) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Please try again later',
    });
  }
};
>>>>>>> fb3f079 (Initial commit of Raindrop MCP server project)
