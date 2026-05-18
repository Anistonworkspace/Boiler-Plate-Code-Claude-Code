import { Worker } from 'bullmq';
import { bullConnection } from '../../lib/redis.js';
import { JobQueueName } from '@boilerplate/shared';
import { emailService, type EmailPayload } from '../../services/email.service.js';

export const emailWorker = new Worker<EmailPayload>(
  JobQueueName.EMAIL,
  async (job) => {
    await emailService.sendNow(job.data);
  },
  { connection: bullConnection, concurrency: 5 },
);

emailWorker.on('failed', (job, err) => {
  console.error(`[email.worker] job ${job?.id} failed:`, err.message);
});
