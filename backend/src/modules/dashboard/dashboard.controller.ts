/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     summary: Get organization summary stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary counts and recent audit activity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userCount: { type: number }
 *                     departmentCount: { type: number }
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           message: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — insufficient role }
 */
import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary(req.user!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
