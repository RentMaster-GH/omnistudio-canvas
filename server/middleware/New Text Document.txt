import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'omnistudio-secret-key-change-in-prod';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: 'free' | 'pro' | 'enterprise';
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Fallback default guest user in free tier
    req.user = { id: 'guest', email: 'guest@omnistudio.com', tier: 'free' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      req.user = { id: 'guest', email: 'guest@omnistudio.com', tier: 'free' };
      return next();
    }
    req.user = user;
    next();
  });
}

export function requireProTier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.tier !== 'pro' && req.user?.tier !== 'enterprise') {
    return res.status(403).json({
      error: 'Pro Subscription Required',
      message: 'Upgrade to OmniStudio Pro to unlock Unlimited AI Transcriptions & 4K MP4 Exports.',
      upgradeUrl: '/checkout',
    });
  }
  next();
}