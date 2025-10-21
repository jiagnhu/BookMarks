import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser { id: number; username: string }

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow app-level public allowlist to bypass auth
  if ((req as any).__publicAllowed) return next();
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthUser;
    req.user = { id: payload.id, username: (payload as any).username };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
