import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.validation.js';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and issue tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 */
export const authRouter = Router();

authRouter.post('/login', authLimiter, validate(loginSchema), authController.login);
authRouter.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
authRouter.post('/register', authLimiter, validate(registerSchema), authController.register);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/me', authenticate, authController.me);
