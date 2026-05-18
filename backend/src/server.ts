import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSocket } from './sockets/index.js';
import { storage } from './services/storage.service.js';
import { closeQueues } from './jobs/queues.js';
import './jobs/workers/email.worker.js';
import './jobs/workers/notification.worker.js';

async function main(): Promise<void> {
  await storage.ensureDir();
  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[server] Listening on http://localhost:${env.PORT}`);
    console.log(`[server] Swagger docs at http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[server] ${signal} received — shutting down`);
    httpServer.close();
    await closeQueues();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => {
    console.error('[server] unhandledRejection:', err);
  });
}

void main();
