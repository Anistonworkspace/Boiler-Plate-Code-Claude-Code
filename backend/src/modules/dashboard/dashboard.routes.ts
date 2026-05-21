import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';
import { dashboardController } from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  requirePermission('dashboard', 'read'),
  dashboardController.getSummary,
);
