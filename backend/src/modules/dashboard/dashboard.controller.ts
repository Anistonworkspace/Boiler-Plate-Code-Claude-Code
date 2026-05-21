import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
