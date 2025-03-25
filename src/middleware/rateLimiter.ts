import type{ Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config/config';

const rateLimiter = new RateLimiterMemory({
  points: config.rateLimitMaxRequests,
  duration: config.rateLimitWindowMs / 1000, // convert to seconds
});

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