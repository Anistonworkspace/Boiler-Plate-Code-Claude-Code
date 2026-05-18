import { Queue } from 'bullmq';
import { bullConnection } from '../lib/redis.js';
import { JobQueueName } from '@boilerplate/shared';

const defaultJobOptions = {
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

export const emailQueue = new Queue(JobQueueName.EMAIL, {
  connection: bullConnection,
  defaultJobOptions,
});

export const notificationQueue = new Queue(JobQueueName.NOTIFICATION, {
  connection: bullConnection,
  defaultJobOptions,
});

export async function closeQueues(): Promise<void> {
  await Promise.all([emailQueue.close(), notificationQueue.close()]);
}
