import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { UnauthorizedError } from '../../middleware/errorHandler.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body, {
        userAgent: req.get('user-agent') ?? undefined,
        ipAddress: req.ip,
      });
      res.cookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: REFRESH_MAX_AGE_MS,
        path: '/api/auth',
      });
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fromCookie = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
      const fromBody = (req.body as { refreshToken?: string }).refreshToken;
      const token = fromCookie ?? fromBody;
      if (!token) throw new UnauthorizedError('Missing refresh token');
      const result = await authService.refresh(token);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const fromCookie = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
      await authService.logout(fromCookie, req.user.id, req.user.organizationId);
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      res.json({ success: true, data: { loggedOut: true } });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body, {
        userAgent: req.get('user-agent') ?? undefined,
        ipAddress: req.ip,
      });
      res.status(201).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await authService.me(req.user.id, req.user.organizationId);
      res.json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  },
};
