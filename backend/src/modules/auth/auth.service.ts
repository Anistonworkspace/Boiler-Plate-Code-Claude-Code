import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../middleware/errorHandler.js';
import { audit } from '../../utils/auditLogger.js';
import { AuditAction, type AuthUser, type JwtPayload, UserRole, UserStatus } from '@boilerplate/shared';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const REFRESH_DAYS = 7;

function signAccess(user: AuthUser): string {
  const payload: JwtPayload & Pick<AuthUser, 'email' | 'fullName' | 'status'> = {
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as SignOptions);
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function toAuthUser(u: {
  id: string; organizationId: string; email: string; fullName: string; role: UserRole; status: UserStatus;
}): AuthUser {
  return {
    id: u.id,
    organizationId: u.organizationId,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
  };
}

export const authService = {
  async login(input: LoginInput, meta: { userAgent?: string; ipAddress?: string }) {
    const user = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError(`Account ${user.status.toLowerCase()}`);
    }

    const authUser = toAuthUser(user);
    const accessToken = signAccess(authUser);
    const { raw, hash } = generateRefreshToken();

    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000),
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { accessToken, refreshToken: raw, user: authUser };
  },

  async refresh(refreshTokenRaw: string) {
    const hash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    if (stored.user.deletedAt || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User inactive');
    }

    const authUser = toAuthUser(stored.user);
    const accessToken = signAccess(authUser);
    return { accessToken, user: authUser };
  },

  async logout(refreshTokenRaw: string | undefined, userId: string, organizationId: string) {
    if (refreshTokenRaw) {
      const hash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hash, userId, organizationId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await audit({
      organizationId,
      userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
    });
  },

  async register(input: RegisterInput, meta: { userAgent?: string; ipAddress?: string }) {
    const org = await prisma.organization.findUnique({ where: { slug: input.organizationSlug } });
    if (!org) throw new NotFoundError('Organization not found');

    const existing = await prisma.user.findFirst({
      where: { organizationId: org.id, email: input.email },
    });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
      },
    });

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: AuditAction.CREATE,
      resource: 'user',
      resourceId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return toAuthUser(user);
  },

  async me(userId: string, organizationId: string): Promise<AuthUser> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User not found');
    return toAuthUser(user);
  },
};
