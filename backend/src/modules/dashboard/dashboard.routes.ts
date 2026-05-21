import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { dashboardController } from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', authenticate, dashboardController.getSummary);
