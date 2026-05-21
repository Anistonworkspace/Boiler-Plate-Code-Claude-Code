import { Worker } from 'bullmq';
import { bullConnection } from '../../lib/redis.js';
import { JobQueueName } from '@boilerplate/shared';
import { getIo } from '../../sockets/index.js';
import { logger } from '../../lib/logger.js';

export interface NotificationPayload {
  userId: string;
  organizationId: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  body: string;
}

export const notificationWorker = new Worker<NotificationPayload>(
  JobQueueName.NOTIFICATION,
  async (job) => {
    const io = getIo();
    io?.to(`user:${job.data.userId}`).emit('notification', job.data);
  },
  { connection: bullConnection, concurrency: 10 },
);

notificationWorker.on('failed', (job, err) => {
  logger.error('Notification job failed', { jobId: job?.id, queue: JobQueueName.NOTIFICATION, error: err.message, stack: err.stack });
});
