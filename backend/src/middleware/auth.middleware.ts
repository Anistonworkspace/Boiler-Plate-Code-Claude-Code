import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, UnauthorizedError, ForbiddenError } from './errorHandler.js';
import { hasPermission, type PermissionAction, UserRole, type JwtPayload, type AuthUser } from '@boilerplate/shared';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    id?: string;
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & AuthUser;
    req.user = {
      id: decoded.sub,
      organizationId: decoded.organizationId,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      status: decoded.status,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export function requirePermission(resource: string, action: PermissionAction): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!hasPermission(req.user.role, resource, action)) {
      return next(new ForbiddenError(`Insufficient permission: ${resource}.${action}`));
    }
    next();
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient role'));
    }
    next();
  };
}
